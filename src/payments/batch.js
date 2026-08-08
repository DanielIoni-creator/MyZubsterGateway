// src/payments/batch.js
// Sistema pagamenti batch multipli - Bounty #740 - 500 MYZ

const crypto = require('crypto');

class BatchPaymentSystem {
  constructor(config = {}) {
    this.batches = new Map();
    this.maxBatchSize = config.maxBatchSize || 100;
  }

  createBatch(meta = {}) {
    const id = crypto.randomBytes(6).toString('hex');
    const batch = {
      id,
      name: meta.name || ('Batch ' + id.substring(0, 6)),
      status: 'draft',
      payments: [],
      totalAmount: 0,
      totalPayments: 0,
      completedPayments: 0,
      failedPayments: 0,
      createdAt: new Date().toISOString(),
      approval: null,
      report: null
    };
    this.batches.set(id, batch);
    return batch;
  }

  addPayment(batchId, payment) {
    const batch = this.batches.get(batchId);
    if (!batch || batch.status !== 'draft') return { error: 'Invalid batch' };
    if (batch.payments.length >= this.maxBatchSize) return { error: 'Max size' };
    
    const entry = {
      id: crypto.randomBytes(4).toString('hex'),
      recipient: payment.recipient,
      amount: parseFloat(payment.amount),
      currency: payment.currency || 'MYZ',
      reference: payment.reference || '',
      status: 'pending'
    };
    
    if (isNaN(entry.amount) || entry.amount <= 0) return { error: 'Invalid amount' };
    
    batch.payments.push(entry);
    batch.totalPayments = batch.payments.length;
    batch.totalAmount = +batch.payments.reduce((s, p) => s + p.amount, 0).toFixed(2);
    return { success: true, payment: entry };
  }

  importCSV(batchId, csvContent) {
    const batch = this.batches.get(batchId);
    if (!batch) return { error: 'Batch not found' };
    
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) return { error: 'Empty CSV' };
    
    const header = lines[0].toLowerCase().split(',').map(h => h.trim());
    const recipientIdx = header.indexOf('recipient');
    const amountIdx = header.indexOf('amount');
    
    if (recipientIdx === -1 || amountIdx === -1) return { error: 'Need recipient,amount columns' };
    
    let imported = 0, errors = 0;
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim());
      if (cols.length < 2) continue;
      const result = this.addPayment(batchId, {
        recipient: cols[recipientIdx],
        amount: parseFloat(cols[amountIdx])
      });
      result.success ? imported++ : errors++;
    }
    return { success: true, imported, errors };
  }

  importFromArray(batchId, payments) {
    let imported = 0, errors = 0;
    payments.forEach(p => {
      const r = this.addPayment(batchId, p);
      r.success ? imported++ : errors++;
    });
    return { success: true, imported, errors };
  }

  requestApproval(batchId) {
    const batch = this.batches.get(batchId);
    if (!batch || batch.payments.length === 0) return { error: 'Invalid batch' };
    batch.status = 'pending_approval';
    batch.approval = { requestedAt: new Date().toISOString(), approvedBy: [] };
    return { success: true, batch };
  }

  approve(batchId, approverId) {
    const batch = this.batches.get(batchId);
    if (!batch || batch.status !== 'pending_approval') return { error: 'Not pending' };
    if (!batch.approval.approvedBy.includes(approverId)) {
      batch.approval.approvedBy.push(approverId);
    }
    batch.status = 'processing';
    return { success: true, batch };
  }

  async processBatch(batchId, processFn) {
    const batch = this.batches.get(batchId);
    if (!batch || batch.status !== 'processing') return { error: 'Not processing' };
    
    let completed = 0, failed = 0;
    for (const payment of batch.payments) {
      try {
        const result = await processFn(payment);
        payment.status = result.success ? 'completed' : 'failed';
        payment.transactionId = result.txId || null;
        result.success ? completed++ : failed++;
        if (!result.success) payment.error = result.error;
      } catch (e) {
        payment.status = 'failed';
        payment.error = e.message;
        failed++;
      }
    }
    
    batch.completedPayments = completed;
    batch.failedPayments = failed;
    batch.status = failed > 0 ? 'completed_with_errors' : 'completed';
    batch.report = {
      batchId: batch.id,
      total: batch.totalPayments,
      completed, failed,
      totalAmount: batch.totalAmount,
      details: batch.payments.map(p => ({
        id: p.id, recipient: p.recipient, amount: p.amount, status: p.status, error: p.error
      }))
    };
    
    return { success: true, summary: { total: batch.totalPayments, completed, failed } };
  }

  getReport(batchId) {
    const batch = this.batches.get(batchId);
    return batch ? batch.report : null;
  }

  exportReportCSV(batchId) {
    const report = this.getReport(batchId);
    if (!report) return null;
    const lines = ['id,recipient,amount,status,error'];
    report.details.forEach(p => {
      lines.push([p.id, p.recipient, p.amount, p.status, p.error || ''].join(','));
    });
    return lines.join('\n');
  }

  listBatches(filters = {}) {
    let batches = [...this.batches.values()];
    if (filters.status) batches = batches.filter(b => b.status === filters.status);
    return batches.map(b => ({
      id: b.id, name: b.name, status: b.status,
      totalPayments: b.totalPayments, totalAmount: b.totalAmount,
      completed: b.completedPayments, failed: b.failedPayments
    }));
  }

  getStatus() {
    const batches = [...this.batches.values()];
    return {
      totalBatches: batches.length,
      activeBatches: batches.filter(b => ['draft', 'pending_approval', 'processing'].includes(b.status)).length,
      completedBatches: batches.filter(b => b.status === 'completed').length
    };
  }
}

module.exports = { BatchPaymentSystem };
