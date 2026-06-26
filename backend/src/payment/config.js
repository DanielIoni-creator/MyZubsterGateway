const path = require('path');

function cleanUrl(value) {
  if (!value) return '';
  return String(value).replace(/\/+$/, '');
}

function loadPaymentConfig(env) {
  const moneroPayUrl = cleanUrl(env.MONEROPAY_URL);
  const walletRpcUrl = cleanUrl(env.MONERO_WALLET_RPC_URL || env.MONERO_NODE_URL);
  const nodeUrl = cleanUrl(env.MONERO_NODE_URL);
  const provider = moneroPayUrl ? 'moneropay' : 'wallet-rpc';

  return {
    provider,
    moneroPayUrl,
    walletRpcUrl,
    nodeUrl,
    rpcUsername: env.MONERO_RPC_USERNAME || '',
    rpcPassword: env.MONERO_RPC_PASSWORD || '',
    accountIndex: Number(env.MONERO_ACCOUNT_INDEX || 0),
    defaultConfirmations: normalizeConfirmations(env.MONERO_CONFIRMATIONS_DEFAULT),
    storePath: path.resolve(process.cwd(), env.MONERO_PAYMENT_STORE || './data/payments.json'),
    webhookSecret: env.PAYMENT_WEBHOOK_SECRET || ''
  };
}

function normalizeConfirmations(value) {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.trunc(parsed);
}

module.exports = { loadPaymentConfig, normalizeConfirmations };
