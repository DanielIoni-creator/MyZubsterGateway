const crypto = require('crypto');

class AIMultisigAgent {
  constructor() {
    // Generate a dummy key pair for the AI agent for testing/mocking
    this.keyPair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });
  }

  async analyzeWork(orderId, data) {
    // Mock structure for AI analysis (e.g., calling OpenAI/DeepSeek API)
    console.log(`[AI Agent] Analyzing work for order ${orderId}...`);
    console.log(`[AI Agent] Data provided:`, data);
    
    // Simulate AI decision logic
    const isWorkComplete = data && data.logs && data.logs.length > 0;
    const confidence = isWorkComplete ? 0.95 : 0.2;
    
    return {
      orderId,
      isWorkComplete,
      confidence,
      reasoning: isWorkComplete ? 'Logs indicate successful completion of the task.' : 'Insufficient data to verify work completion.',
      timestamp: new Date().toISOString()
    };
  }

  async signRelease(orderId, analysis) {
    if (!analysis.isWorkComplete) {
      console.log(`[AI Agent] Rejecting fund release for order ${orderId}.`);
      return {
        action: 'REJECT',
        orderId,
        reasoning: analysis.reasoning,
        signature: null
      };
    }

    console.log(`[AI Agent] Signing fund release for order ${orderId}.`);
    
    // Sign the decision
    const sign = crypto.createSign('SHA256');
    sign.update(`RELEASE_FUNDS_${orderId}`);
    sign.end();
    const signature = sign.sign(this.keyPair.privateKey, 'hex');

    return {
      action: 'APPROVE',
      orderId,
      reasoning: analysis.reasoning,
      signature
    };
  }

  async processWebhook(payload) {
    const { orderId, eventType, data } = payload;
    
    console.log(`[AI Agent] Received webhook for order ${orderId}, event: ${eventType}`);
    
    if (eventType !== 'WORK_SUBMITTED') {
      return { status: 'IGNORED', message: 'Event type not supported for AI analysis.' };
    }

    const analysis = await this.analyzeWork(orderId, data);
    const decision = await this.signRelease(orderId, analysis);

    // Logging AI decisions for traceability
    console.log(`[AI Agent] Decision recorded:`, decision);

    return decision;
  }
}

module.exports = new AIMultisigAgent();
