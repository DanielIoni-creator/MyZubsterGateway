// gateway/xmr_wallet.js – Real Monero (XMR) wallet backed by monero-wallet-rpc
//
// Replaces the previous mock stub. Talks to a monero-wallet-rpc endpoint over
// JSON-RPC. All network access goes through a single `rpc()` helper so the
// module is fully testable: callers (and tests) may inject their own `client`
// instead of the default axios instance.
const axios = require('axios');

// XMR has 12 decimal places; the wallet RPC expects the atomic unit (piconeros).
function toAtomic(amount) {
  return Math.round(Number(amount) * 1e12);
}

function createXmrWallet({ client, env = {} } = {}) {
  const E = env || {};
  const XMR_WALLET_URL = E.XMR_WALLET_URL || process.env.XMR_WALLET_URL || '';
  const XMR_WALLET_PASSWORD = E.XMR_WALLET_PASSWORD || process.env.XMR_WALLET_PASSWORD || '';

  const requiredConfirmations = parseInt(
    E.XMR_REQUIRED_CONFIRMATIONS || process.env.XMR_REQUIRED_CONFIRMATIONS || '10',
    10
  );
  const fcmpRequiredConfirmations = parseInt(
    E.XMR_FCMP_REQUIRED_CONFIRMATIONS || process.env.XMR_FCMP_REQUIRED_CONFIRMATIONS || '10',
    10
  );
  const fcmpPlusPlusConfigured =
    (E.XMR_FCMP_PLUS_PLUS_ENABLED || process.env.XMR_FCMP_PLUS_PLUS_ENABLED || '') === 'true';

  const rpcUrl = XMR_WALLET_URL.replace(/\/+$/, '') + '/json_rpc';

  // Default client: real monero-wallet-rpc. Tests inject a mock instead.
  const http =
    client ||
    axios.create({
      baseURL: XMR_WALLET_URL ? rpcUrl : undefined,
      auth: XMR_WALLET_PASSWORD ? { username: '', password: XMR_WALLET_PASSWORD } : undefined,
    });

  async function rpc(method, params) {
    const body = { jsonrpc: '2.0', id: 'myz-gateway', method, params };
    try {
      const resp = await http.post(rpcUrl, body);
      return resp.data.result;
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      throw new Error(`Monero wallet RPC ${method} failed: ${msg}`);
    }
  }

  const locks = new Map();

  function buildStatus(t, amount) {
    const protocol = t.protocol ?? t.proof_type ?? 'ringct';
    const isFcmp = protocol === 'fcmp++';
    const required = isFcmp ? fcmpRequiredConfirmations : requiredConfirmations;
    const confirmations = t.confirmations ?? 0;

    let status = 'confirmed';
    let reason = null;
    const inPool = t.in_pool === true || t.type === 'pool';

    if (inPool) {
      status = 'pending';
      reason = 'in_pool';
    } else if (t.double_spend_seen) {
      status = 'failed';
      reason = 'double_spend_seen';
    } else if ((t.amount ?? 0) < toAtomic(amount)) {
      status = 'pending';
      reason = 'underpaid';
    } else if (confirmations < required) {
      status = 'pending';
      reason = 'insufficient_confirmations';
    }

    return {
      status,
      txHash: t.txid,
      confirmations,
      amount,
      inPool,
      unlockTime: t.unlock_time ?? 0,
      protocol,
      isFcmpPlusPlus: isFcmp,
      requiredConfirmations: required,
      reason,
    };
  }

  async function lockXMR(userId, amount) {
    const result = await rpc('create_address', { account_index: 0, label: `escrow:${userId}` });
    locks.set(userId, result.address);
    return result.address;
  }

  async function releaseXMR(address, amount) {
    const result = await rpc('transfer', {
      destinations: [{ amount: toAtomic(amount), address }],
    });
    return result.tx_hash ?? result.tx_hash_list?.[0];
  }

  async function refundXMR(address, amount) {
    const result = await rpc('transfer', {
      destinations: [{ amount: toAtomic(amount), address }],
    });
    return result.tx_hash_list?.[0] ?? result.tx_hash;
  }

  async function getTransferStatus(txid, amount) {
    const result = await rpc('get_transfer_by_txid', { txid });
    return buildStatus(result.transfer, amount);
  }

  async function getLockStatus(userId) {
    const result = await rpc('get_transfers', { in: true, account_index: 0 });
    const transfers = result.in || [];
    const addr = locks.get(userId);
    const t = addr ? transfers.find((x) => x.address === addr) : transfers[0];
    if (!t) {
      return {
        status: 'unknown',
        txHash: null,
        confirmations: 0,
        amount: undefined,
        inPool: false,
        unlockTime: 0,
        protocol: 'ringct',
        isFcmpPlusPlus: false,
        requiredConfirmations,
        reason: 'no_transfer_found',
      };
    }
    return buildStatus(t, undefined);
  }

  async function getWalletCapabilities() {
    const versionRes = await rpc('get_version', {});
    const heightRes = await rpc('get_height', {});
    return {
      version: versionRes.version,
      height: heightRes.height,
      fcmpPlusPlusConfigured,
      supportedProtocols: ['ringct', 'fcmp++'],
      requiredConfirmations,
      fcmpRequiredConfirmations,
    };
  }

  return {
    lockXMR,
    releaseXMR,
    refundXMR,
    getTransferStatus,
    getLockStatus,
    getWalletCapabilities,
  };
}

module.exports = { createXmrWallet };
