const monerojs = require('monero-javascript');

/**
 * Generates a new Monero wallet and returns the keys.
 * This can be used for the buyer, seller, and AI agent.
 */
async function generateKeys(networkType = 'stagenet') {
    const wallet = await monerojs.createWalletRandom({
        networkType: networkType,
        language: 'English'
    });
    
    const address = await wallet.getPrimaryAddress();
    const mnemonic = await wallet.getMnemonic();
    const privateViewKey = await wallet.getPrivateViewKey();
    const privateSpendKey = await wallet.getPrivateSpendKey();

    return {
        address,
        mnemonic,
        privateViewKey,
        privateSpendKey,
        wallet
    };
}

/**
 * Setup a 2-of-3 multisig wallet.
 * We assume we have the 3 wallets already instantiated.
 * In a real scenario, they would exchange multisig info (key images, etc.) round by round.
 */
async function setupMultisig(wallet1, wallet2, wallet3) {
    // Round 1: Get multisig info from all wallets
    const info1 = await wallet1.getMultisigInfo();
    const info2 = await wallet2.getMultisigInfo();
    const info3 = await wallet3.getMultisigInfo();

    // Round 2: Exchange multisig info to create the 2/3 multisig wallets
    // Each wallet makes a multisig from the other two's info
    const multisigHex1 = await wallet1.makeMultisig([info2, info3], 2);
    const multisigHex2 = await wallet2.makeMultisig([info1, info3], 2);
    const multisigHex3 = await wallet3.makeMultisig([info1, info2], 2);

    // Round 3: Exchange multisig hex to finalize setup
    // Since it's a 2-of-3, we need an extra exchange round for the keys
    const extraHex1 = await wallet1.exchangeMultisigKeys([multisigHex2, multisigHex3]);
    const extraHex2 = await wallet2.exchangeMultisigKeys([multisigHex1, multisigHex3]);
    const extraHex3 = await wallet3.exchangeMultisigKeys([multisigHex1, multisigHex2]);
    
    // Finalize
    await wallet1.exchangeMultisigKeys([extraHex2, extraHex3]);
    await wallet2.exchangeMultisigKeys([extraHex1, extraHex3]);
    await wallet3.exchangeMultisigKeys([extraHex1, extraHex2]);

    const address = await wallet1.getPrimaryAddress(); // All wallets now share the same address
    return { address };
}

/**
 * Handle Order Creation
 * @param {object} buyerWallet - The buyer's wallet instance
 * @param {object} sellerWallet - The seller's wallet instance
 * @param {object} agentWallet - The AI agent's wallet instance
 */
async function createOrder(buyerWallet, sellerWallet, agentWallet) {
    const { address } = await setupMultisig(buyerWallet, sellerWallet, agentWallet);
    return {
        multisigAddress: address,
        status: 'AWAITING_FUNDS'
    };
}

/**
 * Sign and send a transaction (Funding is done externally by sending Monero to the multisig address)
 * This function releases funds to a given destination (e.g., seller's address or refund address)
 */
async function signAndSendTx(signerWallet1, signerWallet2, destinationAddress, amount) {
    // signerWallet1 initiates the transaction
    const tx = await signerWallet1.createTx({
        destinations: [{ address: destinationAddress, amount: amount }],
        relay: false // Do not relay yet, needs second signature
    });

    const txSet = await signerWallet1.describeTxSet(tx);
    const multisigTxHex = txSet.multisigTxHex;

    // signerWallet2 signs the transaction
    const signedTxSet = await signerWallet2.signMultisigTxHex(multisigTxHex);

    // Submit the fully signed transaction
    const txHashes = await signerWallet2.submitMultisigTxHex(signedTxSet.multisigTxHex);

    return txHashes;
}

/**
 * Fund Release (Buyer + Seller, or Agent + Seller)
 */
async function releaseFunds(signerWallet1, signerWallet2, sellerAddress, amount) {
    const txHashes = await signAndSendTx(signerWallet1, signerWallet2, sellerAddress, amount);
    return {
        status: 'FUNDS_RELEASED',
        txHashes
    };
}

/**
 * Refund (Buyer + Agent)
 */
async function refund(buyerWallet, agentWallet, buyerAddress, amount) {
    const txHashes = await signAndSendTx(buyerWallet, agentWallet, buyerAddress, amount);
    return {
        status: 'REFUNDED',
        txHashes
    };
}

module.exports = {
    generateKeys,
    setupMultisig,
    createOrder,
    signAndSendTx,
    releaseFunds,
    refund
};
