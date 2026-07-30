const mongoose = require('mongoose');
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.MONERO_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

/**
 * Encrypt sensitive wallet data using AES-256-GCM.
 * @param {string} text - Plaintext to encrypt
 * @param {string} [key=ENCRYPTION_KEY] - Hex-encoded 32-byte key
 * @returns {string} iv:authTag:ciphertext (hex-encoded)
 */
function encrypt(text, key = ENCRYPTION_KEY) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key, 'hex'), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt sensitive wallet data using AES-256-GCM.
 * @param {string} encryptedText - iv:authTag:ciphertext from encrypt()
 * @param {string} [key=ENCRYPTION_KEY] - Hex-encoded 32-byte key
 * @returns {string} Original plaintext
 */
function decrypt(encryptedText, key = ENCRYPTION_KEY) {
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted text format');
  }
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(key, 'hex'), iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

const moneroWalletSchema = new mongoose.Schema({
  address: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
  },
  encryptedViewKey: {
    type: String,
    required: true,
  },
  encryptedSpendKey: {
    type: String,
    default: '',
  },
  networkType: {
    type: String,
    enum: ['mainnet', 'testnet', 'stagenet'],
    default: 'testnet',
    lowercase: true,
  },
  encryptedMnemonic: {
    type: String,
    default: '',
  },
  isMultisig: {
    type: Boolean,
    default: false,
  },
  multisigParticipants: {
    type: Number,
    min: 1,
    default: 0,
  },
  multisigThreshold: {
    type: Number,
    min: 1,
    default: 0,
  },
  label: {
    type: String,
    default: '',
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

moneroWalletSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

moneroWalletSchema.index({ isMultisig: 1 });
moneroWalletSchema.index({ networkType: 1 });

module.exports = mongoose.model('MoneroWallet', moneroWalletSchema);
module.exports.encrypt = encrypt;
module.exports.decrypt = decrypt;
