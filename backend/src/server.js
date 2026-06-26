require('dotenv').config();

const cors = require('cors');
const express = require('express');
const { loadPaymentConfig } = require('./payment/config');
const { PaymentStore } = require('./payment/paymentStore');
const { MoneroClient } = require('./payment/moneroClient');
const { PaymentService } = require('./payment/paymentService');
const { createPaymentRouter } = require('./payment/routes');

const app = express();
const config = loadPaymentConfig(process.env);
const paymentStore = new PaymentStore(config.storePath);
const moneroClient = new MoneroClient(config);
const paymentService = new PaymentService({ config, paymentStore, moneroClient });

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'myzubster-backend' });
});

app.use('/api/payment', createPaymentRouter(paymentService, config));

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`MyZubster backend listening on http://0.0.0.0:${port}`);
  console.log(`Monero provider: ${config.provider}`);
});
