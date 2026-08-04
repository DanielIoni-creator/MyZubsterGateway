const PaymentTransaction = require('../models/PaymentTransaction');
const Booking = require('../models/Booking');
const User = require('../models/User');
const MoneroClient = require('./moneroClient');
const FeeService = require('./feeService');

class PaymentService {
  /**
   * 1. CLIENTE INIZIA PAGAMENTO - Genera indirizzo Monero
   */
  async initiatePayment(bookingId, clientId, professionalId, amount) {
    // Verifica se esiste già una transazione
    const existing = await PaymentTransaction.findOne({ bookingId });
    if (existing && existing.status !== 'failed' && existing.status !== 'refunded') {
      throw new Error('Payment already initiated for this booking');
    }

    // Calcola fee
    const feeInfo = FeeService.calculateFee(amount);

    // Genera indirizzo Monero dedicato
    const addressInfo = await MoneroClient.createPaymentAddress(
      bookingId,
      amount,
      `Booking_${bookingId}_${clientId}`
    );

    // Crea la transazione
    const payment = new PaymentTransaction({
      bookingId,
      clientId,
      professionalId,
      amount: amount,
      feeAmount: feeInfo.feeAmount,
      platformFeePercent: feeInfo.feePercent,
      platformFeeWalletAddress: feeInfo.feeWallet,
      status: 'waiting_payment',
      clientAddress: addressInfo.address,
      addressIndex: addressInfo.addressIndex,
      label: addressInfo.label
    });

    await payment.save();

    // Aggiorna il booking
    await Booking.findByIdAndUpdate(bookingId, { 
      status: 'pending_payment',
      paymentId: payment._id
    });

    return {
      payment,
      feeInfo,
      address: addressInfo.address,
      amount: amount,
      message: `Send ${amount} XMR to the address above`
    };
  }

  /**
   * 2. BACKEND VERIFICA PAGAMENTO
   */
  async checkPaymentStatus(paymentId) {
    const payment = await PaymentTransaction.findById(paymentId);
    if (!payment) throw new Error('Payment not found');

    // Se già confermato o completato, salta
    if (payment.status === 'confirmed' || 
        payment.status === 'released' || 
        payment.status === 'refunded' ||
        payment.status === 'work_completed') {
      return payment;
    }

    // Se in attesa di pagamento, verifica transazioni recenti
    if (payment.status === 'waiting_payment' || payment.status === 'pending') {
      // Verifica pagamenti in ingresso per questo indirizzo
      const incomingPayments = await MoneroClient.checkIncomingPayments(payment.clientAddress);

      if (incomingPayments && incomingPayments.length > 0) {
        const matchingTx = incomingPayments[0];
        payment.paymentTxId = matchingTx.txid;
        payment.amountReceived = matchingTx.amount || payment.amount;
        payment.confirmations = matchingTx.confirmations || 0;
        payment.status = 'payment_detected';
        
        // Verifica se ha abbastanza conferme
        if (payment.confirmations >= 10) {
          payment.status = 'confirmed';
          payment.confirmedAt = new Date();
          
          // Aggiorna il booking
          await Booking.findByIdAndUpdate(payment.bookingId, { 
            status: 'confirmed_payment'
          });
        }
        
        await payment.save();
      }
    }

    return payment;
  }

  /**
   * 3. OFFERENTE COMPLETA IL LAVORO
   */
  async completeWork(paymentId, professionalId) {
    const payment = await PaymentTransaction.findById(paymentId);
    if (!payment) throw new Error('Payment not found');

    // Verifica che l'offerente sia legittimo
    if (payment.professionalId.toString() !== professionalId) {
      throw new Error('Unauthorized: Not your booking');
    }

    // Verifica che il pagamento sia confermato
    if (payment.status !== 'confirmed') {
      throw new Error('Payment not confirmed yet');
    }

    // Aggiorna stato
    payment.status = 'work_completed';
    await payment.save();

    // Aggiorna il booking
    await Booking.findByIdAndUpdate(payment.bookingId, { 
      status: 'work_completed',
      professionalCompletedAt: new Date()
    });

    return payment;
  }

  /**
   * 4. CLIENTE RILASCIA I FONDI (DALL'APP!)
   */
  async releaseFunds(paymentId, clientId) {
    const payment = await PaymentTransaction.findById(paymentId);
    if (!payment) throw new Error('Payment not found');

    // Verifica che il cliente sia legittimo
    if (payment.clientId.toString() !== clientId) {
      throw new Error('Unauthorized: Not your payment');
    }

    // Verifica che il lavoro sia completato
    if (payment.status !== 'work_completed') {
      throw new Error('Work not completed yet');
    }

    // Verifica che i fondi non siano già rilasciati
    if (payment.status === 'released') {
      throw new Error('Funds already released');
    }

    // Calcola importi
    const netAmount = payment.amount - payment.feeAmount;
    const professional = await User.findById(payment.professionalId).select('moneroWallet');
    const client = await User.findById(payment.clientId).select('moneroWallet');

    if (!professional.moneroWallet) {
      throw new Error('Professional has not set their Monero wallet address');
    }

    // 4a. Rilascia i fondi all'offerente
    const releaseTx = await MoneroClient.sendPayment(
      professional.moneroWallet,
      netAmount
    );

    // 4b. Invia la fee al wallet amministratore
    const feeTx = await MoneroClient.sendPayment(
      payment.platformFeeWalletAddress,
      payment.feeAmount
    );

    // Aggiorna transazione
    payment.status = 'released';
    payment.releaseTxId = releaseTx.tx_hash;
    payment.feeTxId = feeTx.tx_hash;
    payment.releasedAt = new Date();
    payment.releaseConfirmedByClient = true;
    await payment.save();

    // Aggiorna il booking
    await Booking.findByIdAndUpdate(payment.bookingId, { 
      status: 'completed',
      completedAt: new Date()
    });

    return payment;
  }

  /**
   * 5. RIMBORSO (in caso di disputa)
   */
  async refundPayment(paymentId, adminId) {
    // Verifica che sia admin
    const admin = await User.findById(adminId);
    if (!admin || admin.role !== 'admin') {
      throw new Error('Unauthorized: Only admin can refund');
    }

    const payment = await PaymentTransaction.findById(paymentId);
    if (!payment) throw new Error('Payment not found');

    if (payment.status === 'released') {
      throw new Error('Funds already released, cannot refund');
    }

    // Rimborsa al cliente
    const clientWallet = await User.findById(payment.clientId).select('moneroWallet');
    if (!clientWallet.moneroWallet) {
      throw new Error('Client has not set their Monero wallet address');
    }

    const refundTx = await MoneroClient.sendPayment(
      clientWallet.moneroWallet,
      payment.amountReceived || payment.amount
    );

    payment.status = 'refunded';
    payment.refundTxId = refundTx.tx_hash;
    await payment.save();

    await Booking.findByIdAndUpdate(payment.bookingId, { 
      status: 'refunded'
    });

    return payment;
  }

  /**
   * 6. Ottieni storico pagamenti utente
   */
  async getUserPayments(userId, role = 'client') {
    const filter = role === 'client' ? { clientId: userId } : { professionalId: userId };
    return await PaymentTransaction.find(filter)
      .populate('bookingId', 'date timeSlot status')
      .populate('clientId', 'name email')
      .populate('professionalId', 'name email')
      .sort({ createdAt: -1 });
  }

  /**
   * 7. Ottieni statistiche della piattaforma
   */
  async getPlatformStats() {
    const totalPayments = await PaymentTransaction.countDocuments();
    const pendingPayments = await PaymentTransaction.countDocuments({ status: 'waiting_payment' });
    const confirmedPayments = await PaymentTransaction.countDocuments({ status: 'confirmed' });
    const releasedPayments = await PaymentTransaction.countDocuments({ status: 'released' });
    
    const released = await PaymentTransaction.find({ status: 'released' });
    const totalFees = released.reduce((sum, p) => sum + p.feeAmount, 0);
    const totalReleased = released.reduce((sum, p) => sum + p.amount, 0);

    return {
      totalPayments,
      pendingPayments,
      confirmedPayments,
      releasedPayments,
      totalFees,
      totalReleased,
      platformWallet: process.env.PLATFORM_FEE_WALLET_ADDRESS
    };
  }
}

module.exports = new PaymentService();