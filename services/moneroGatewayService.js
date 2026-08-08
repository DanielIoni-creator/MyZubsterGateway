const crypto = require('node:crypto');
const axios = require('axios');

const ATOMIC_PER_XMR = 1_000_000_000_000n;
const OPEN_STATES = new Set(['AWAITING_PAYMENT', 'PARTIALLY_PAID', 'CONFIRMING']);

/**
 * Money is handled as atomic piconero in BigInt and only formatted for display.
 * A float cannot hold 12 decimals without drift, and "close enough" is not a
 * property a payment gateway may have.
 */
function toAtomic(amountXmr) {
  const text = String(amountXmr).trim();
  if (!/^\d+(\.\d{1,12})?$/.test(text)) throw new Error('amount must be a positive decimal with at most 12 places');
  const [whole, fraction = ''] = text.split('.');
  const atomic = BigInt(whole) * ATOMIC_PER_XMR + BigInt(fraction.padEnd(12, '0'));
  if (atomic <= 0n) throw new Error('amount must be greater than zero');
  return atomic;
}

function formatXmr(atomic) {
  const value = BigInt(atomic);
  const whole = value / ATOMIC_PER_XMR;
  const fraction = (value % ATOMIC_PER_XMR).toString().padStart(12, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : String(whole);
}

/** Strips anything credential-shaped out of text that may reach a log or an API response. */
function redact(text, secrets = []) {
  let safe = String(text ?? '');
  for (const secret of secrets.filter(Boolean)) safe = safe.split(secret).join('***');
  // The separator is required, so the surrounding syntax survives redaction
  // and a redacted JSON blob stays parseable.
  return safe.replace(/(password|passwd|secret|viewkey|spendkey|seed)(\s*["']?\s*[:=]\s*["']?)([^"',\s}]+)/gi, '$1$2***');
}

class MemoryInvoiceStore {
  constructor() { this.items = new Map(); }
  async save(invoice) { this.items.set(invoice.orderId, structuredClone(invoice)); return structuredClone(invoice); }
  async get(orderId) { const item = this.items.get(orderId); return item ? structuredClone(item) : null; }
  async list() { return [...this.items.values()].map((item) => structuredClone(item)); }
}

class MongoInvoiceStore {
  constructor(model) { this.model = model; }
  async save(invoice) {
    const saved = await this.model.findOneAndUpdate({ orderId: invoice.orderId }, invoice, { upsert: true, new: true, lean: true });
    return this.strip(saved);
  }
  async get(orderId) { return this.strip(await this.model.findOne({ orderId }).lean()); }
  async list() { return (await this.model.find().lean()).map((doc) => this.strip(doc)); }
  strip(doc) { if (!doc) return null; const { _id, __v, ...rest } = doc; return rest; }
}

/**
 * monero-wallet-rpc client. Uses the wallet RPC — not the daemon — because
 * subaddress creation and per-address transfer lookup only exist there.
 * Digest auth is the default for monero-wallet-rpc, so it is supported here.
 */
function createWalletRpc({ url = process.env.MONERO_WALLET_RPC_URL, username = process.env.MONERO_RPC_USER, password = process.env.MONERO_RPC_PASSWORD, client = axios, timeoutMs = 15000 } = {}) {
  if (!url) throw new Error('MONERO_WALLET_RPC_URL is required');

  const secrets = [password];
  const http = client.create
    ? client.create({ baseURL: url, timeout: timeoutMs, ...(username ? { auth: { username, password } } : {}) })
    : client;

  return {
    async call(method, params = {}) {
      try {
        const response = await http.post('/json_rpc', { jsonrpc: '2.0', id: 'myz-gateway', method, params }, { timeout: timeoutMs });
        const body = response?.data;
        if (body?.error) throw new Error(`wallet rpc ${method}: ${body.error.message ?? 'unknown error'}`);
        return body?.result ?? {};
      } catch (error) {
        // The password lives in the axios config, which ends up inside axios
        // error objects. Never let it reach a log line or an HTTP response.
        throw new Error(redact(error.message, secrets));
      }
    },
  };
}

class SimulatedWalletRpc {
  constructor() {
    this.nextIndex = 1;
    this.transfers = [];
    this.height = 3_000_000;
    this.calls = [];
  }
  credit({ addressIndex, amountXmr, confirmations = 0, txid = crypto.randomUUID().replace(/-/g, '') }) {
    this.transfers.push({ subaddr_index: { major: 0, minor: addressIndex }, amount: Number(toAtomic(amountXmr)), confirmations, txid, double_spend_seen: false, unlock_time: 0 });
    return txid;
  }
  async call(method, params = {}) {
    this.calls.push({ method, params });
    if (method === 'create_address') return { address: `8SIM${String(this.nextIndex).padStart(4, '0')}`, address_index: this.nextIndex++ };
    if (method === 'validate_address') return { valid: /^[48]/.test(params.address ?? ''), nettype: 'mainnet' };
    if (method === 'get_height') return { height: this.height };
    if (method === 'get_transfers') {
      const wanted = new Set(params.subaddr_indices ?? []);
      return { in: this.transfers.filter((t) => wanted.size === 0 || wanted.has(t.subaddr_index.minor)) };
    }
    throw new Error(`unsupported method ${method}`);
  }
}

class MoneroPaymentGateway {
  constructor({
    rpc,
    store = new MemoryInvoiceStore(),
    accountIndex = 0,
    requiredConfirmations = Number(process.env.XMR_MIN_CONFIRMATIONS || 10),
    invoiceTtlMinutes = 60,
    clock = () => new Date(),
  } = {}) {
    if (!rpc) throw new Error('An RPC client is required');
    this.rpc = rpc;
    this.store = store;
    this.accountIndex = accountIndex;
    this.requiredConfirmations = requiredConfirmations;
    this.invoiceTtlMinutes = invoiceTtlMinutes;
    this.clock = clock;
  }

  log(invoice, event, detail = {}) {
    invoice.events.push({ event, at: this.clock().toISOString(), ...detail });
    invoice.updatedAt = this.clock().toISOString();
    return invoice;
  }

  async health() {
    const { height } = await this.rpc.call('get_height');
    return { connected: true, height, requiredConfirmations: this.requiredConfirmations };
  }

  /**
   * One fresh subaddress per invoice. A shared static address makes it
   * impossible to tell whose payment arrived — two customers paying the same
   * amount are indistinguishable — so attribution has to come from the address.
   */
  async createInvoice({ orderId, amountXmr, stationId = null, pumpId = null, metadata = {} }) {
    if (!orderId) throw new Error('orderId is required');
    const expectedAtomic = toAtomic(amountXmr);

    const existing = await this.store.get(orderId);
    if (existing) return existing;

    const { address, address_index: addressIndex } = await this.rpc.call('create_address', {
      account_index: this.accountIndex,
      label: `order:${orderId}`,
    });
    if (!address || addressIndex === undefined) throw new Error('wallet did not return a subaddress');

    const now = this.clock();
    const invoice = {
      orderId,
      stationId,
      pumpId,
      address,
      addressIndex,
      accountIndex: this.accountIndex,
      expectedAtomic: expectedAtomic.toString(),
      expectedXmr: formatXmr(expectedAtomic),
      paidAtomic: '0',
      paidXmr: '0',
      confirmations: 0,
      requiredConfirmations: this.requiredConfirmations,
      state: 'AWAITING_PAYMENT',
      transactions: [],
      metadata,
      expiresAt: new Date(now.getTime() + this.invoiceTtlMinutes * 60_000).toISOString(),
      events: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    this.log(invoice, 'INVOICE_CREATED', { address, expectedXmr: invoice.expectedXmr });
    return this.store.save(invoice);
  }

  /**
   * Reads every transfer that landed on this invoice's subaddress and decides
   * the state. Fuel is only dispensed on PAID, which requires the confirmation
   * threshold — a zero-confirmation transaction is reversible, and handing out
   * fuel against one is a free tank.
   */
  async checkInvoice(orderId) {
    const invoice = await this.require(orderId);
    if (!OPEN_STATES.has(invoice.state)) return invoice;

    const { in: transfers = [] } = await this.rpc.call('get_transfers', {
      in: true,
      account_index: invoice.accountIndex,
      subaddr_indices: [invoice.addressIndex],
    });

    const mine = transfers.filter((transfer) => transfer.subaddr_index?.minor === invoice.addressIndex);
    let paid = 0n;
    let minConfirmations = null;
    const seen = [];

    for (const transfer of mine) {
      if (transfer.double_spend_seen) {
        this.log(invoice, 'DOUBLE_SPEND_IGNORED', { txid: transfer.txid });
        continue;
      }
      paid += BigInt(transfer.amount);
      minConfirmations = minConfirmations === null ? (transfer.confirmations ?? 0) : Math.min(minConfirmations, transfer.confirmations ?? 0);
      seen.push({ txid: transfer.txid, atomic: String(transfer.amount), xmr: formatXmr(transfer.amount), confirmations: transfer.confirmations ?? 0 });
    }

    const expected = BigInt(invoice.expectedAtomic);
    invoice.paidAtomic = paid.toString();
    invoice.paidXmr = formatXmr(paid);
    invoice.confirmations = minConfirmations ?? 0;
    invoice.transactions = seen;

    const previousState = invoice.state;
    if (paid === 0n) {
      invoice.state = new Date(invoice.expiresAt).getTime() <= this.clock().getTime() ? 'EXPIRED' : 'AWAITING_PAYMENT';
    } else if (paid < expected) {
      // Partial payment keeps the invoice open rather than expiring it, so the
      // customer can top up instead of losing what they already sent.
      invoice.state = 'PARTIALLY_PAID';
    } else if ((minConfirmations ?? 0) < this.requiredConfirmations) {
      invoice.state = 'CONFIRMING';
    } else {
      invoice.state = 'PAID';
      if (paid > expected) this.log(invoice, 'OVERPAID', { overpaidXmr: formatXmr(paid - expected) });
    }

    if (invoice.state !== previousState) this.log(invoice, invoice.state, { paidXmr: invoice.paidXmr, confirmations: invoice.confirmations });
    return this.store.save(invoice);
  }

  /** Idempotent sweep for a scheduler; settled invoices are skipped. */
  async sweep() {
    const results = [];
    for (const invoice of await this.store.list()) {
      if (!OPEN_STATES.has(invoice.state)) continue;
      try {
        results.push(await this.checkInvoice(invoice.orderId));
      } catch (error) {
        results.push({ orderId: invoice.orderId, state: 'ERROR', error: error.message });
      }
    }
    return results;
  }

  /** Never trust an address supplied by a caller; the wallet decides if it is real. */
  async validateAddress(address) {
    if (!address) throw new Error('address is required');
    const result = await this.rpc.call('validate_address', { address, any_net_type: false });
    return { address, valid: Boolean(result.valid), nettype: result.nettype ?? null };
  }

  async require(orderId) {
    const invoice = await this.store.get(orderId);
    if (!invoice) throw new Error('Invoice not found');
    return invoice;
  }

  async get(orderId) { return this.require(orderId); }

  async summary() {
    const invoices = await this.store.list();
    const byState = {};
    let settled = 0n;
    for (const invoice of invoices) {
      byState[invoice.state] = (byState[invoice.state] || 0) + 1;
      if (invoice.state === 'PAID') settled += BigInt(invoice.paidAtomic);
    }
    return { generatedAt: this.clock().toISOString(), total: invoices.length, byState, settledXmr: formatXmr(settled) };
  }
}

module.exports = {
  MoneroPaymentGateway,
  MemoryInvoiceStore,
  MongoInvoiceStore,
  SimulatedWalletRpc,
  createWalletRpc,
  toAtomic,
  formatXmr,
  redact,
  ATOMIC_PER_XMR,
};
