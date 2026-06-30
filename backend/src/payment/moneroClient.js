class MoneroClient {
  constructor(config) {
    this.config = config;
  }

  async createPaymentAddress({ label }) {
    if (this.config.provider === 'moneropay') {
      return this.createMoneroPayAddress({ label });
    }
    return this.createWalletRpcAddress({ label });
  }

  async checkPayment(payment) {
    if (this.config.provider === 'moneropay') {
      return this.checkMoneroPayPayment(payment);
    }
    return this.checkWalletRpcPayment(payment);
  }

  async sendPlatformFee({ address, amountAtomic }) {
    if (!address) throw new Error('platform fee wallet address is required');
    if (!amountAtomic || BigInt(String(amountAtomic)) <= 0n) throw new Error('platform fee amount must be greater than zero');
    if (this.config.provider === 'moneropay') {
      throw new Error('automatic platform fee payout requires wallet-rpc mode');
    }
    return this.transferWalletRpc({ address, amountAtomic });
  }

  async createMoneroPayAddress({ label }) {
    if (!this.config.moneroPayUrl) {
      throw new Error('MONEROPAY_URL is not configured');
    }

    // MoneroPay deployments differ slightly by version. Try common endpoints and normalize the response.
    const attempts = [
      { path: '/receive', body: { description: label } },
      { path: '/api/receive', body: { description: label } },
      { path: '/address', body: { description: label } },
      { path: '/api/address', body: { description: label } }
    ];

    let lastError;
    for (const attempt of attempts) {
      try {
        const response = await this.httpJson(`${this.config.moneroPayUrl}${attempt.path}`, {
          method: 'POST',
          body: attempt.body
        });
        const address = response.address || response.integrated_address || response.payment_address;
        if (address) {
          return {
            address,
            subaddressIndex: response.subaddress_index ?? response.index ?? null,
            externalId: response.id || response.payment_id || response.uuid || null,
            raw: response
          };
        }
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error('MoneroPay did not return a payment address');
  }

  async createWalletRpcAddress({ label }) {
    const result = await this.walletRpc('create_address', {
      account_index: this.config.accountIndex,
      label
    });

    return {
      address: result.address,
      subaddressIndex: result.address_index,
      externalId: null,
      raw: result
    };
  }

  async checkMoneroPayPayment(payment) {
    const identifiers = [payment.externalId, payment.address, payment.id].filter(Boolean);
    const paths = [];
    for (const id of identifiers) {
      paths.push(`/receive/${encodeURIComponent(id)}`);
      paths.push(`/api/receive/${encodeURIComponent(id)}`);
      paths.push(`/payment/${encodeURIComponent(id)}`);
      paths.push(`/api/payment/${encodeURIComponent(id)}`);
    }

    let lastError;
    for (const path of paths) {
      try {
        const response = await this.httpJson(`${this.config.moneroPayUrl}${path}`, { method: 'GET' });
        const amountValue = response.amount_received_atomic ?? response.paid_atomic ?? response.total_received_atomic ?? response.amount_received ?? response.paid ?? 0;
        const paidAtomic = BigInt(String(amountValue));
        const confirmations = Number(response.confirmations ?? response.unlocked_confirmations ?? (response.unlocked ? payment.requiredConfirmations : 0) ?? 0);
        const txIds = response.txids || response.transactions?.map((tx) => tx.txid).filter(Boolean) || [];
        return { paidAtomic, confirmations, txIds, raw: response };
      } catch (error) {
        lastError = error;
      }
    }

    if (lastError && lastError.status && lastError.status !== 404) throw lastError;
    return { paidAtomic: 0n, confirmations: 0, txIds: [], raw: null };
  }

  async checkWalletRpcPayment(payment) {
    const params = {
      in: true,
      pending: true,
      account_index: this.config.accountIndex,
      subaddr_indices: payment.subaddressIndex === null || payment.subaddressIndex === undefined ? [] : [Number(payment.subaddressIndex)]
    };

    const response = await this.walletRpc('get_transfers', params);

    const transfers = [
      ...(response.in || []),
      ...(response.pending || [])
    ].filter((tx) => {
      if (payment.subaddressIndex === null || payment.subaddressIndex === undefined) return true;
      const minor = tx.subaddr_index?.minor ?? tx.subaddr_indices?.[0]?.minor;
      return Number(minor) === Number(payment.subaddressIndex);
    });

    let paidAtomic = 0n;
    let confirmations = 0;
    const txIds = [];
    for (const tx of transfers) {
      paidAtomic += BigInt(String(tx.amount || 0));
      confirmations = Math.max(confirmations, Number(tx.confirmations || 0));
      if (tx.txid) txIds.push(tx.txid);
    }

    return { paidAtomic, confirmations, txIds, raw: response };
  }

  async walletRpc(method, params) {
    if (!this.config.walletRpcUrl) {
      throw new Error('MONERO_WALLET_RPC_URL or MONERO_NODE_URL is required for wallet-rpc mode');
    }
    const payload = { jsonrpc: '2.0', id: 'myzubster', method, params };
    const response = await this.httpJson(this.config.walletRpcUrl, { method: 'POST', body: payload });
    if (response.error) {
      throw new Error(`Monero wallet RPC error ${response.error.code}: ${response.error.message}`);
    }
    return response.result || {};
  }

  async transferWalletRpc({ address, amountAtomic }) {
    const atomic = BigInt(String(amountAtomic));
    const amount = Number(atomic);
    if (!Number.isSafeInteger(amount)) {
      throw new Error('platform fee amount is too large for this wallet-rpc JSON client');
    }

    const result = await this.walletRpc('transfer', {
      destinations: [{ address, amount }],
      account_index: this.config.accountIndex,
      priority: 0,
      get_tx_key: true
    });

    return {
      txId: result.tx_hash || result.txid || result.tx_hash_list?.[0] || null,
      txHashList: result.tx_hash_list || (result.tx_hash ? [result.tx_hash] : []),
      feeAtomic: result.fee?.toString?.() || (result.fee !== undefined ? String(result.fee) : null),
      raw: result
    };
  }

  async httpJson(url, options) {
    const headers = { Accept: 'application/json' };
    const init = { method: options.method || 'GET', headers };
    if (this.config.rpcUsername || this.config.rpcPassword) {
      const token = Buffer.from(`${this.config.rpcUsername}:${this.config.rpcPassword}`).toString('base64');
      headers.Authorization = `Basic ${token}`;
    }
    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, init);
    const text = await response.text();
    const json = text ? JSON.parse(text) : {};
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status} from ${url}`);
      error.status = response.status;
      error.body = json;
      throw error;
    }
    return json;
  }
}

module.exports = { MoneroClient };
