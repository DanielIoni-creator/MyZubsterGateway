const OrderBook = require('../models/OrderBook');
const TokenHolding = require('../models/TokenHolding');
const User = require('../models/User');

const createSellOrder = async (sellerId, tokenId, amount, price) => {
  const holding = await TokenHolding.findOne({ user: sellerId, token: tokenId });
  if (!holding || holding.amount < amount) {
    throw new Error('Token insufficienti');
  }

  const totalPrice = amount * price;
  const order = new OrderBook({
    token: tokenId,
    seller: sellerId,
    amount,
    price,
    totalPrice,
    status: 'open',
  });
  await order.save();

  holding.lockedAmount = (holding.lockedAmount || 0) + amount;
  await holding.save();

  return order;
};

const cancelSellOrder = async (orderId, userId) => {
  const order = await OrderBook.findById(orderId);
  if (!order) throw new Error('Ordine non trovato');
  if (order.seller.toString() !== userId.toString()) {
    throw new Error('Non sei il proprietario dell\'ordine');
  }
  if (order.status !== 'open') {
    throw new Error('L\'ordine non è più annullabile');
  }

  const holding = await TokenHolding.findOne({ user: userId, token: order.token });
  if (holding) {
    holding.lockedAmount = Math.max(0, (holding.lockedAmount || 0) - order.amount);
    await holding.save();
  }

  order.status = 'cancelled';
  await order.save();
  return order;
};

const getOpenOrders = async (tokenId) => {
  const orders = await OrderBook.find({
    token: tokenId,
    status: 'open'
  })
    .populate('seller', 'username email')
    .sort({ price: 1 });
  return orders;
};

const buyFromOrder = async (orderId, buyerId, amount) => {
  const order = await OrderBook.findById(orderId);
  if (!order) throw new Error('Ordine non trovato');
  if (order.status !== 'open') throw new Error('Ordine non più disponibile');
  if (amount > order.amount) throw new Error('Quantità richiesta supera quella disponibile');

  const totalPrice = amount * order.price;

  // Aggiorna l'ordine
  order.amount -= amount;
  if (order.amount === 0) {
    order.status = 'filled';
  }
  await order.save();

  // Trasferisci i token dal venditore all'acquirente
  const sellerHolding = await TokenHolding.findOne({ user: order.seller, token: order.token });
  if (sellerHolding) {
    sellerHolding.lockedAmount = Math.max(0, (sellerHolding.lockedAmount || 0) - amount);
    sellerHolding.amount -= amount;
    await sellerHolding.save();
  }

  let buyerHolding = await TokenHolding.findOne({ user: buyerId, token: order.token });
  if (!buyerHolding) {
    buyerHolding = new TokenHolding({
      user: buyerId,
      token: order.token,
      amount: 0,
      lockedAmount: 0
    });
  }
  buyerHolding.amount += amount;
  await buyerHolding.save();

  // AGGIORNAMENTO REPUTAZIONE E PUNTI
  // Venditore: +10 punti per token venduto
  await User.findByIdAndUpdate(order.seller, {
    $inc: {
      completedTrades: 1,
      reputationScore: amount * 10
    }
  });
  // Acquirente: +5 punti per token acquistato
  await User.findByIdAndUpdate(buyerId, {
    $inc: {
      completedTrades: 1,
      reputationScore: amount * 5
    }
  });

  return { order, amount, totalPrice };
};

// Funzione per acquisto con Monero (se usata)
const purchaseWithMonero = async (orderId, buyerId, amount, moneroTxid) => {
  const order = await OrderBook.findById(orderId);
  if (!order) throw new Error('Ordine non trovato');
  if (order.status !== 'open') throw new Error('Ordine non più disponibile');
  if (amount > order.amount) throw new Error('Quantità richiesta supera quella disponibile');

  const totalPrice = amount * order.price;

  // Simula transazione Monero (per test)
  const moneroService = require('./moneroService');
  const payment = await moneroService.createPayment(orderId, buyerId, totalPrice);

  order.moneroTxid = `pending_${payment.transactionId}`;
  await order.save();

  return {
    success: true,
    order,
    payment: {
      address: payment.address,
      amount: payment.amount,
      expiresAt: payment.expiresAt
    }
  };
};

module.exports = {
  createSellOrder,
  cancelSellOrder,
  getOpenOrders,
  buyFromOrder,
  purchaseWithMonero
};
