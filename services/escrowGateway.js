// services/escrowGateway.js
// Coordinator for the escrow flow between wallet, AI agent, and marketplace.
// Pure, framework-free logic. Persistence (store), wallet, and AI agent are
// injected so the module is fully unit-testable without a DB or network.

const ORDER_STATES = Object.freeze({
  PENDING: 'pending',
  FUNDED: 'funded',
  COMPLETED: 'completed',
  DISPUTED: 'disputed',
  REFUNDED: 'refunded',
});

// Allowed state transitions for the escrow order lifecycle.
const ALLOWED_TRANSITIONS = Object.freeze({
  pending: ['funded', 'disputed', 'refunded'],
  funded: ['completed', 'disputed', 'refunded'],
  completed: [],
  disputed: ['refunded', 'completed'],
  refunded: [],
});

function defaultMemoryStore() {
  const map = new Map();
  const matches = (order, query) => {
    if (query.$or) return query.$or.some((clause) => Object.entries(clause).every(([k, v]) => order[k] === v));
    return Object.entries(query).every(([k, v]) => order[k] === v);
  };
  return {
    async save(order) {
      const copy = { ...order, _id: order._id || `mem_${Math.random().toString(36).slice(2)}` };
      map.set(copy.orderId, copy);
      return { ...copy };
    },
    async findOne(query) {
      if (!query.orderId) return null;
      const found = map.get(query.orderId);
      return found ? { ...found } : null;
    },
    async find(query) {
      return [...map.values()].filter((o) => matches(o, query)).map((o) => ({ ...o }));
    },
  };
}

function defaultMockWallet() {
  return {
    async lockXMR({ userId, amount }) { return `lock_${userId}_${amount}_${Date.now()}`; },
    async releaseXMR({ userId, amount }) { return `release_${userId}_${amount}_${Date.now()}`; },
    async refundXMR({ userId, amount }) { return `refund_${userId}_${amount}_${Date.now()}`; },
  };
}

function defaultMockAI() {
  return {
    async review(order) {
      return { approved: true, risk: 'low', notes: 'auto-approved (AI not configured)', at: new Date().toISOString() };
    },
  };
}

function assertValidState(state) {
  if (!Object.values(ORDER_STATES).includes(state)) throw new Error(`unknown state: ${state}`);
}

function nowISO() { return new Date().toISOString(); }

class EscrowGateway {
  constructor({ wallet, aiAgent, store } = {}) {
    this.wallet = wallet || defaultMockWallet();
    this.aiAgent = aiAgent || defaultMockAI();
    this.store = store || defaultMemoryStore();
  }

  async createOrder({ marketplaceOrderId, buyer, seller, amountXMR, multisig = {}, metadata = {} } = {}) {
    if (!buyer || !seller) throw new Error('buyer and seller are required');
    if (amountXMR == null || Number(amountXMR) <= 0) throw new Error('amountXMR must be a positive number');
    const orderId = `escrow_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const order = {
      orderId,
      marketplaceOrderId: marketplaceOrderId || null,
      buyer,
      seller,
      amountXMR: Number(amountXMR),
      state: ORDER_STATES.PENDING,
      multisig: {
        addresses: Array.isArray(multisig.addresses) ? multisig.addresses : [],
        requiredSignatures: Number(multisig.requiredSignatures) || 0,
      },
      signatures: [],
      fundingTx: null,
      releaseTx: null,
      refundTx: null,
      aiReview: null,
      dispute: null,
      completionProof: null,
      metadata,
      history: [{ state: ORDER_STATES.PENDING, at: nowISO(), note: 'order created' }],
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    return this.store.save(order);
  }

  async getOrder(orderId) {
    const order = await this.store.findOne({ orderId });
    if (!order) throw new Error(`escrow order ${orderId} not found`);
    return order;
  }

  async listForUser(user) {
    if (!user) throw new Error('user is required');
    return this.store.find({ $or: [{ buyer: user }, { seller: user }] });
  }

  _assertTransition(from, to) {
    const allowed = ALLOWED_TRANSITIONS[from];
    if (!allowed || !allowed.includes(to)) throw new Error(`invalid transition: ${from} -> ${to}`);
  }

  async _transition(orderId, to, { note, fields = {} } = {}) {
    const current = await this.getOrder(orderId);
    this._assertTransition(current.state, to);
    assertValidState(to);
    const next = {
      ...current,
      ...fields,
      state: to,
      updatedAt: nowISO(),
      history: [...(current.history || []), { state: to, at: nowISO(), note: note || `state -> ${to}` }],
    };
    return this.store.save(next);
  }

  async fund(orderId, { by, txId } = {}) {
    const current = await this.getOrder(orderId);
    this._assertTransition(current.state, ORDER_STATES.FUNDED);
    const lockTx = txId || await this.wallet.lockXMR({ userId: current.buyer, amount: current.amountXMR });
    const aiReview = await this.aiAgent.review({ ...current, fundingTx: lockTx });
    const next = {
      ...current,
      state: ORDER_STATES.FUNDED,
      fundingTx: lockTx,
      aiReview,
      updatedAt: nowISO(),
      history: [...(current.history || []), { state: ORDER_STATES.FUNDED, at: nowISO(), note: `funds locked via multisig wallet; AI risk ${aiReview.risk || 'n/a'}` }],
    };
    return this.store.save(next);
  }

  async sign(orderId, { signer, signature } = {}) {
    if (!signer || !signature) throw new Error('signer and signature are required');
    const current = await this.getOrder(orderId);
    if (![ORDER_STATES.PENDING, ORDER_STATES.FUNDED].includes(current.state)) {
      throw new Error(`cannot collect signature in state ${current.state}`);
    }
    const sig = { signer, signature, at: nowISO() };
    const next = {
      ...current,
      signatures: [...(current.signatures || []), sig],
      updatedAt: nowISO(),
      history: [...(current.history || []), { state: current.state, at: nowISO(), note: `signature collected from ${signer}` }],
    };
    return this.store.save(next);
  }

  async complete(orderId, { by, proof } = {}) {
    const current = await this.getOrder(orderId);
    const required = current.multisig?.requiredSignatures || 0;
    const have = (current.signatures || []).length;
    if (required > 0 && have < required) {
      throw new Error(`requires ${required} signatures, has ${have}`);
    }
    const releaseTx = await this.wallet.releaseXMR({ userId: current.seller, amount: current.amountXMR });
    return this._transition(orderId, ORDER_STATES.COMPLETED, {
      note: 'funds released to seller',
      fields: { releaseTx, completionProof: proof || null },
    });
  }

  async dispute(orderId, { by, reason } = {}) {
    if (!reason) throw new Error('dispute reason is required');
    return this._transition(orderId, ORDER_STATES.DISPUTED, {
      note: `dispute opened: ${reason}`,
      fields: { dispute: { reason, by: by || null, at: nowISO() } },
    });
  }

  async refund(orderId, { by, reason } = {}) {
    const current = await this.getOrder(orderId);
    const refundTx = await this.wallet.refundXMR({ userId: current.buyer, amount: current.amountXMR });
    return this._transition(orderId, ORDER_STATES.REFUNDED, {
      note: `refunded to buyer: ${reason || 'no reason provided'}`,
      fields: { refundTx },
    });
  }
}

module.exports = { EscrowGateway, ORDER_STATES, ALLOWED_TRANSITIONS };
