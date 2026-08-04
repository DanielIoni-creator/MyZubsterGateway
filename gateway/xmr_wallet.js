const axios = require('axios');

const ATOMIC_UNITS_PER_XMR = 1e12;
const DEFAULT_CONFIRMATIONS = 10;

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function rpcUrl(value) {
  const base = value || 'http://127.0.0.1:18083';
  return base.endsWith('/json_rpc') ? base : `${base.replace(/\/$/, '')}/json_rpc`;
}

function isFcmpTransfer(transfer = {}) {
  const markers = [
    transfer.protocol,
    transfer.proof_type,
    transfer.proofType,
    transfer.tx_type,
    transfer.txType,
    transfer.transaction_type,
    transfer.transactionType,
  ];

  return transfer.fcmp === true ||
    transfer.fcmp_plus_plus === true ||
    transfer.fcmpPlusPlus === true ||
    markers.some((value) => typeof value === 'string' && /fcmp/i.test(value));
}

function confirmationPolicy(transfer, config) {
  const fcmp = isFcmpTransfer(transfer);
  return {
    protocol: fcmp ? 'fcmp++' : 'ringct',
    isFcmpPlusPlus: fcmp,
    requiredConfirmations: fcmp
      ? config.fcmpRequiredConfirmations
      : config.requiredConfirmations,
  };
}

function normalizeTransfer(transfer = {}, expectedAmount = 0, config) {
  const policy = confirmationPolicy(transfer, config);
  const confirmations = Number(transfer.confirmations || 0);
  const amount = Number(transfer.amount || 0) / ATOMIC_UNITS_PER_XMR;
  const type = String(transfer.type || '').toLowerCase();
  const inPool = ['pool', 'pending'].includes(type) || transfer.in_pool === true;
  const failed = type === 'failed' || transfer.failed === true || transfer.double_spend_seen === true;
  const underpaid = Number(expectedAmount) > 0 && amount + 1e-12 < Number(expectedAmount);

  let status = 'confirmed';
  let reason;
  if (failed) {
    status = 'failed';
    reason = transfer.double_spend_seen ? 'double_spend_seen' : 'failed';
  }
  else if (inPool) {
    status = 'pending';
    reason = 'in_pool';
  }
  else if (underpaid) {
    status = 'pending';
    reason = 'underpaid';
  }
  else if (confirmations < policy.requiredConfirmations) {
    status = 'pending';
    reason = 'insufficient_confirmations';
  }

  return {
    status,
    txHash: transfer.txid || transfer.tx_hash || transfer.hash || null,
    confirmations,
    amount,
    inPool,
    unlockTime: transfer.unlock_time || 0,
    ...policy,
    ...(reason ? { reason } : {}),
  };
}

function createXmrWallet(options = {}) {
  const env = options.env || process.env;
  const client = options.client || axios;
  const locks = options.locks || new Map();
  const config = {
    url: rpcUrl(env.XMR_WALLET_URL || env.MONERO_WALLET_RPC_URL),
    requiredConfirmations: positiveInteger(env.XMR_REQUIRED_CONFIRMATIONS, DEFAULT_CONFIRMATIONS),
    fcmpRequiredConfirmations: positiveInteger(
      env.XMR_FCMP_REQUIRED_CONFIRMATIONS,
      DEFAULT_CONFIRMATIONS
    ),
    fcmpEnabled: ['1', 'true', 'yes', 'on'].includes(
      String(env.XMR_FCMP_PLUS_PLUS_ENABLED || '').toLowerCase()
    ),
  };

  async function callRpc(method, params = {}) {
    try {
      const response = await client.post(config.url, {
        jsonrpc: '2.0',
        id: 'myz-gateway',
        method,
        ...(Object.keys(params).length ? { params } : {}),
      });
      if (response.data && response.data.error) {
        throw new Error(response.data.error.message || `Monero RPC error ${response.data.error.code}`);
      }
      return (response.data && response.data.result) || {};
    }
    catch (error) {
      const detail = error.response?.data?.error?.message || error.message;
      throw new Error(`Monero wallet RPC ${method} failed: ${detail}`);
    }
  }

  async function lockXMR(userId, amount) {
    if (!userId || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      throw new Error('userId and a positive XMR amount are required');
    }
    const result = await callRpc('create_address', {
      account_index: 0,
      label: `escrow:${userId}`,
    });
    if (!result.address) {
      throw new Error('Monero wallet RPC did not return an escrow address');
    }
    locks.set(userId, {
      address: result.address,
      addressIndex: result.address_index,
      amount: Number(amount),
      createdAt: Date.now(),
    });
    return result.address;
  }

  async function transferXMR(address, amount) {
    if (!address || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      throw new Error('destination address and a positive XMR amount are required');
    }
    const result = await callRpc('transfer', {
      account_index: 0,
      destinations: [{
        address,
        amount: Math.round(Number(amount) * ATOMIC_UNITS_PER_XMR),
      }],
      priority: 1,
      do_not_relay: false,
    });
    return result.tx_hash || result.tx_hash_list?.[0];
  }

  async function releaseXMR(address, amount) {
    return transferXMR(address, amount);
  }

  async function refundXMR(address, amount) {
    return transferXMR(address, amount);
  }

  async function getTransferStatus(txid, expectedAmount = 0) {
    if (!/^[a-f0-9]{64}$/i.test(String(txid || ''))) {
      throw new Error('A valid Monero transaction hash is required');
    }
    const result = await callRpc('get_transfer_by_txid', { txid, account_index: 0 });
    if (!result.transfer) {
      return { status: 'pending', txHash: txid, confirmations: 0 };
    }
    return normalizeTransfer(result.transfer, expectedAmount, config);
  }

  async function getLockStatus(userId) {
    const lock = locks.get(userId);
    if (!lock) {
      throw new Error(`No XMR escrow lock found for ${userId}`);
    }
    const result = await callRpc('get_transfers', {
      account_index: 0,
      subaddr_indices: Number.isInteger(lock.addressIndex) ? [lock.addressIndex] : undefined,
      in: true,
      pool: true,
      pending: true,
      failed: true,
    });
    const transfers = [
      ...(result.in || []),
      ...(result.pool || []),
      ...(result.pending || []),
      ...(result.failed || []),
    ];
    const transfer = transfers.find((item) =>
      item.address === lock.address || item.subaddr_index?.minor === lock.addressIndex
    );
    return transfer
      ? normalizeTransfer(transfer, lock.amount, config)
      : { status: 'pending', address: lock.address, confirmations: 0 };
  }

  async function getWalletCapabilities() {
    const [version, height] = await Promise.all([
      callRpc('get_version'),
      callRpc('get_height'),
    ]);
    return {
      version: version.version || version.release || null,
      height: height.height || 0,
      fcmpPlusPlusConfigured: config.fcmpEnabled,
      supportedProtocols: config.fcmpEnabled ? ['ringct', 'fcmp++'] : ['ringct'],
      requiredConfirmations: config.requiredConfirmations,
      fcmpRequiredConfirmations: config.fcmpRequiredConfirmations,
    };
  }

  return {
    callRpc,
    lockXMR,
    releaseXMR,
    refundXMR,
    getTransferStatus,
    getLockStatus,
    getWalletCapabilities,
    config,
  };
}

const wallet = createXmrWallet();

module.exports = {
  ...wallet,
  createXmrWallet,
  isFcmpTransfer,
  normalizeTransfer,
};
