const express = require('express');
const router = express.Router();

const batchStore = [];

// POST /api/batch-payments/parse-csv - Parse CSV string for batch payments
router.post('/parse-csv', (req, res) => {
  const { csvContent } = req.body;

  if (!csvContent || typeof csvContent !== 'string') {
    return res.status(400).json({ error: 'csvContent string is required' });
  }

  const lines = csvContent.trim().split('\n');
  const items = [];

  lines.forEach((line, index) => {
    if (index === 0 && line.toLowerCase().includes('recipient')) return; // skip header
    const [recipient, amountStr, asset] = line.split(',').map((s) => s.trim());
    if (recipient && amountStr) {
      items.push({
        recipient,
        amount: parseFloat(amountStr) || 0,
        asset: asset || 'MYZ',
      });
    }
  });

  res.json({ success: true, count: items.length, items });
});

// POST /api/batch-payments/process - Create multi-payment batch
router.post('/process', (req, res) => {
  const { name, items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items array is required' });
  }

  const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const batch = {
    id: `batch_${Date.now()}`,
    name: name || 'Batch Payment',
    totalItems: items.length,
    totalAmount,
    items,
    status: 'PENDING_APPROVAL',
    createdAt: new Date().toISOString(),
  };

  batchStore.push(batch);
  res.status(201).json({ success: true, batch });
});

// POST /api/batch-payments/:id/approve - Approve batch payment
router.post('/:id/approve', (req, res) => {
  const { id } = req.params;
  const batch = batchStore.find((b) => b.id === id);

  if (!batch) {
    return res.status(404).json({ error: 'Batch not found' });
  }

  batch.status = 'APPROVED';
  batch.approvedAt = new Date().toISOString();
  res.json({ success: true, message: 'Batch payment approved', batch });
});

// GET /api/batch-payments/:id/report - Batch summary report
router.get('/:id/report', (req, res) => {
  const { id } = req.params;
  const batch = batchStore.find((b) => b.id === id);

  if (!batch) {
    return res.status(404).json({ error: 'Batch not found' });
  }

  res.json({
    report: {
      batchId: batch.id,
      name: batch.name,
      status: batch.status,
      totalItems: batch.totalItems,
      totalAmount: batch.totalAmount,
      items: batch.items,
      executedAt: batch.approvedAt || null,
    },
  });
});

module.exports = router;
