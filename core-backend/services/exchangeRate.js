// services/exchangeRate.js - Tasso di cambio Monero (XMR)
const axios = require('axios');

/**
 * Ottiene il prezzo di Monero in una valuta specifica
 * @param {string} currency - Codice valuta (es. 'usd', 'eur')
 * @returns {number} - Prezzo di Monero nella valuta richiesta
 */
async function getXMRPrice(currency = 'usd') {
  try {
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=monero&vs_currencies=${currency}`
    );
    
    if (response.data && response.data.monero) {
      const price = response.data.monero[currency.toLowerCase()];
      if (price) {
        console.log(`💰 Tasso XMR/${currency.toUpperCase()}: ${price}`);
        return price;
      }
    }
    
    throw new Error('Risposta API non valida');
  } catch (error) {
    console.error('❌ Errore tasso di cambio:', error.message);
    // Valore di fallback (150 USD ≈ 1 XMR - da aggiornare)
    console.warn('⚠️  Utilizzo tasso di fallback: 150 USD/XMR');
    return 150;
  }
}

/**
 * Converte un importo USD in XMR
 * @param {number} usdAmount - Importo in USD
 * @returns {number} - Importo in XMR
 */
async function convertUSDToXMR(usdAmount) {
  const price = await getXMRPrice('usd');
  const xmrAmount = usdAmount / price;
  console.log(`💱 ${usdAmount} USD = ${xmrAmount.toFixed(8)} XMR (tasso: ${price})`);
  return xmrAmount;
}

module.exports = { getXMRPrice, convertUSDToXMR };