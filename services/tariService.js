const axios = require('axios');

const TARI_WALLET_RPC = process.env.TARI_WALLET_RPC || 'http://localhost:12820/json_rpc';

async function tariWalletRequest(method, params = {}) {
  try {
    const response = await axios.post(TARI_WALLET_RPC, {
      jsonrpc: '2.0',
      id: '0',
      method,
      params
    });
    return response.data.result;
  } catch (error) {
    console.error('❌ Errore Tari Wallet RPC:', error.message);
    throw error;
  }
}

async function getBalance() {
  return tariWalletRequest('get_balance');
}

async function mintNFT(name, description, owner, metadata) {
  return tariWalletRequest('mint_nft', {
    name,
    description,
    owner,
    metadata: JSON.stringify(metadata)
  });
}

async function createEscrow(amount, buyer, seller, arbiter) {
  return tariWalletRequest('create_multisig_escrow', {
    amount,
    buyer,
    seller,
    arbiter,
    timeout: 7 * 24 * 60 * 60
  });
}

module.exports = {
  getBalance,
  mintNFT,
  createEscrow
};
