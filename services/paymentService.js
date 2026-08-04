// services/paymentService.js
// Servizio di pagamento - Versione MOCK per sviluppo

class PaymentService {
  // Metodi base (da implementare nelle sottoclassi)
  async createPayment(orderId, amount, currency) {
    throw new Error('Metodo non implementato');
  }

  async confirmPayment(paymentId) {
    throw new Error('Metodo non implementato');
  }

  async getPaymentStatus(paymentId) {
    throw new Error('Metodo non implementato');
  }
}

class MockPaymentService extends PaymentService {
  constructor() {
    super();
    this.payments = new Map();
    this.counter = 1;
  }

  /**
   * Crea un pagamento fittizio.
   * @param {string} orderId - ID dell'ordine associato
   * @param {number} amount - Importo da pagare
   * @param {string} currency - Valuta (default 'XMR')
   * @returns {Promise<Object>} Dettagli del pagamento
   */
  async createPayment(orderId, amount, currency = 'XMR') {
    const paymentId = `mock_${Date.now()}_${this.counter++}`;
    const payment = {
      id: paymentId,
      orderId,
      amount,
      currency,
      status: 'pending',
      createdAt: new Date().toISOString(),
      address: `4${Math.random().toString(36).substring(2, 15)}...`,
      qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${paymentId}`
    };

    this.payments.set(paymentId, payment);
    console.log(`[Mock] Pagamento creato: ${paymentId} per ordine ${orderId}`);

    // Simula conferma automatica dopo 5 secondi
    setTimeout(() => {
      this.confirmPayment(paymentId).catch(err =>
        console.error(`[Mock] Errore conferma pagamento ${paymentId}:`, err)
      );
    }, 5000);

    return payment;
  }

  /**
   * Conferma un pagamento (cambia stato da 'pending' a 'confirmed').
   * @param {string} paymentId 
   * @returns {Promise<Object>} Pagamento aggiornato
   */
  async confirmPayment(paymentId) {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      throw new Error('Pagamento non trovato');
    }

    if (payment.status === 'pending') {
      payment.status = 'confirmed';
      payment.confirmedAt = new Date().toISOString();
      console.log(`[Mock] ✅ Pagamento confermato: ${paymentId}`);

      // Notifica il servizio ordini
      await this._onPaymentConfirmed(payment);
    }

    return payment;
  }

  /**
   * Recupera lo stato di un pagamento.
   * @param {string} paymentId 
   * @returns {Promise<Object>} Dettagli del pagamento
   */
  async getPaymentStatus(paymentId) {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      throw new Error('Pagamento non trovato');
    }
    return payment;
  }

  /**
   * Metodo interno chiamato quando un pagamento viene confermato.
   * @param {Object} payment 
   */
  async _onPaymentConfirmed(payment) {
    // Qui puoi aggiornare lo stato dell'ordine nel database
    console.log(`[Mock] Ordine ${payment.orderId} pagato con successo!`);
  }
}

// Esporta un'istanza singleton del servizio mock
module.exports = new MockPaymentService();