/**
 * MyZubsterGateway — Wallet Module
 * 
 * Exports the multisig wallet implementation and utilities.
 */

const MultisigWallet = require('./multisig');

// Singleton instance (shared config)
const multisigWallet = new MultisigWallet();

module.exports = {
  MultisigWallet,
  multisigWallet,
  generateMultisigId: MultisigWallet.generateMultisigId,
  generateParticipantKey: MultisigWallet.generateParticipantKey,
};
