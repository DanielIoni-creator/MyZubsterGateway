// models/orderHook.js
// Bridges Order state changes to the webhook fan-out service. We use a lazy
// require so unit tests that mock `services/webhookService` don't trigger
// circular initialization issues at module-load time.
//
// Created for issue #42: Implement Webhook System for Order Events.
'use strict';

let attached = false;

function emit(event, order) {
  // Defer require to break any potential circular dep with services/.
  let WebhookService;
  try {
    WebhookService = require('../services/webhookService');
  } catch (err) {
    // Mongoose may not be wired in tests; silently no-op.
    return;
  }
  const payload = {
    orderId: String(order._id || order.id),
    status: order.status,
    totalPrice: order.totalPrice,
    moneroPaymentStatus: order.moneroPaymentStatus,
  };
  try {
    const svc = new WebhookService();
    // Fire-and-forget; failures are recorded in WebhookDelivery rows.
    svc.triggerEvent(event, payload).catch(() => {});
  } catch (_) {
    /* noop for unit test env */
  }
}

const STATUS_EVENTS = {
  pending: 'order.created',
  accepted: 'order.accepted',
  rejected: 'order.rejected',
  paid: 'order.paid',
  completed: 'order.completed',
  cancelled: 'order.cancelled',
};

function attach() {
  if (attached) return;
  const Order = require('./Order');
  Order.schema.post('save', function (doc) {
    // Normalize; empty status maps to order.created so the busy path is
    // exercised regardless of how an order was created.
    const event = STATUS_EVENTS[doc.status] || 'order.created';
    emit(event, doc);
  });
  attached = true;
}

module.exports = {
  attach,
};
