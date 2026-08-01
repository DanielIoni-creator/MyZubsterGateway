--- a/server.js
+++ b/server.js
@@ -10,6 +10,10 @@
 const i18nMiddleware = require('./middleware/i18n');

 const app = express();
+const axios = require('axios');
+const DeepSeek = require('deepseek');
+const multisigWallet = require('./multisigWallet');

 // ===== MIDDLEWARE =====
 app.use(helmet());
@@ -25,6 +29,30 @@
 app.use(express.json({ limit: '10mb' }));
 app.use(express.urlencoded({ extended: true }));

+// Endpoint for receiving order status notifications
+app.post('/api/order-status', async (req, res) => {
+  try {
+    const orderId = req.body.orderId;
+    const status = req.body.status;
+
+    // Analyze data using DeepSeek
+    const analysis = await DeepSeek.analyze(orderId, status);
+
+    // Verify work completion using external APIs and uploaded files
+    const verification = await verifyWorkCompletion(orderId, status);
+
+    // Sign or reject fund release using the multisig wallet
+    if (analysis.result === 'approved' && verification.result === 'verified') {
+      await multisigWallet.sign(orderId);
+      res.json({ message: 'Fund release signed' });
+    } else {
+      await multisigWallet.reject(orderId);
+      res.json({ message: 'Fund release rejected' });
+    }
+  } catch (error) {
+    console.error(error);
+    res.status(500).json({ message: 'Error processing order status' });
+  }
+});
+
 // Routes
 const routes = require('./routes');
 app.use('/api', routes);
