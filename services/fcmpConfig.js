// services/fcmpConfig.js
// FCMP++ Feature Flag and Network Configuration for MyZubsterGateway

require('dotenv').config();

/**
 * FCMP++ Configuration Module
 * Provides feature flags and network configuration for FCMP++ support
 */

const FCMP_CONFIG = {
  // Global feature flag - enables FCMP++ transaction support
  enabled: process.env.FCMP_ENABLED === 'true',

  // Network configuration
  network: process.env.FCMP_NETWORK || 'mainnet',

  // Proof format specification
  proofFormat: process.env.FCMP_PROOF_FORMAT || 'fcmp-plus-plus',

  // Activation height (0 = use network default)
  activationHeight: parseInt(process.env.FCMP_ACTIVATION_HEIGHT || '0', 10),

  // Fallback to RingCT if FCMP++ fails
  fallbackToRingCT: process.env.FCMP_FALLBACK_TO_RINGCT !== 'false',

  // Supported proof formats
  supportedProofFormats: ['seraphis', 'fcmp', 'fcmp-plus-plus'],

  // Supported networks
  supportedNetworks: ['mainnet', 'testnet', 'stagenet']
};

/**
 * Check if FCMP++ is enabled
 * Reads from environment variable each time for dynamic configuration
 * @returns {boolean}
 */
function isEnabled() {
  return process.env.FCMP_ENABLED === 'true';
}

/**
 * Get current FCMP++ configuration
 * @returns {Object}
 */
function getConfig() {
  return { ...FCMP_CONFIG };
}

/**
 * Check if a proof format is supported
 * @param {string} format - Proof format to check
 * @returns {boolean}
 */
function isProofFormatSupported(format) {
  return FCMP_CONFIG.supportedProofFormats.includes(format.toLowerCase());
}

/**
 * Check if a network is supported
 * @param {string} network - Network to check
 * @returns {boolean}
 */
function isNetworkSupported(network) {
  return FCMP_CONFIG.supportedNetworks.includes(network.toLowerCase());
}

/**
 * Get FCMP++ status for API response
 * @returns {Object}
 */
function getStatus() {
  return {
    enabled: isEnabled(),
    network: FCMP_CONFIG.network,
    proofFormat: FCMP_CONFIG.proofFormat,
    activationHeight: FCMP_CONFIG.activationHeight,
    fallbackToRingCT: FCMP_CONFIG.fallbackToRingCT,
    supportedProofFormats: FCMP_CONFIG.supportedProofFormats,
    supportedNetworks: FCMP_CONFIG.supportedNetworks
  };
}

/**
 * Validate FCMP++ configuration
 * @returns {Object} { valid: boolean, errors: string[] }
 */
function validateConfig() {
  const errors = [];

  if (!FCMP_CONFIG.supportedNetworks.includes(FCMP_CONFIG.network)) {
    errors.push(`Unsupported network: ${FCMP_CONFIG.network}`);
  }

  if (!FCMP_CONFIG.supportedProofFormats.includes(FCMP_CONFIG.proofFormat)) {
    errors.push(`Unsupported proof format: ${FCMP_CONFIG.proofFormat}`);
  }

  if (FCMP_CONFIG.activationHeight < 0) {
    errors.push('Activation height cannot be negative');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  FCMP_CONFIG,
  isEnabled,
  getConfig,
  isProofFormatSupported,
  isNetworkSupported,
  getStatus,
  validateConfig
};
