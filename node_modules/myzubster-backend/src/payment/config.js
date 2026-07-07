require('dotenv').config();

module.exports = {
  // Monero Node
  moneroNodeUrl: process.env.MONERO_NODE_URL || 'http://localhost:18081/json_rpc',

  // Monero Wallet RPC
  walletRpcUrl: process.env.MONERO_WALLET_RPC_URL || 'http://localhost:18083/json_rpc',
  walletRpcUsername: process.env.MONERO_RPC_USERNAME || '',
  walletRpcPassword: process.env.MONERO_RPC_PASSWORD || '',

  // Platform Fee (2%)
  platformFeePercent: parseFloat(process.env.PLATFORM_FEE_PERCENT) || 2,
  platformFeeWallet: process.env.PLATFORM_FEE_WALLET_ADDRESS,

  // Escrow
  escrowWalletAddress: process.env.ESCROW_WALLET_ADDRESS,

  // Confirmations
  minConfirmations: parseInt(process.env.MONERO_CONFIRMATIONS_DEFAULT) || 10,

  // Payment Simulation (per test)
  simulationDelayMs: parseInt(process.env.MONERO_PAYMENT_SIMULATION_MS) || 10000,

  // Store
  paymentStorePath: process.env.MONERO_PAYMENT_STORE || './data/payments.json',
};