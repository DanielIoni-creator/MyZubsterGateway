--- a/server.js
+++ b/server.js
@@ -1,6 +1,7 @@
 require('dotenv').config();
 const express = require('express');
 const mongoose = require('mongoose');
+const moneroJs = require('monero-javascript');
 const cors = require('cors');
 const helmet = require('helmet');
 const morgan = require('morgan');
@@ -15,6 +16,30 @@
 app.use(express.json({ limit: '10mb' }));
 app.use(express.urlencoded({ limit: '10mb', extended: true }));
 app.use(i18nMiddleware);
+
+// Connect to MongoDB
+mongoose.connect('mongodb://localhost:27017/myzubster', { useNewUrlParser: true, useUnifiedTopology: true });
+
+// Define order states
+const orderStates = ['pending', 'funded', 'completed', 'disputed', 'refunded'];
+
+// Define EscrowOrder model
+const escrowOrderSchema = new mongoose.Schema({
+  orderId: String,
+  buyer: String,
+  seller: String,
+  amount: Number,
+  state: { type: String, enum: orderStates, default: 'pending' }
+});
+const EscrowOrder = mongoose.model('EscrowOrder', escrowOrderSchema);
+
+// Expose REST API to create escrow-enabled orders
+app.post('/api/orders', async (req, res) => {
+  try {
+    const order = new EscrowOrder(req.body);
+    await order.save();
+    res.json(order);
+  } catch (error) {
+    res.status(500).json({ error: 'Failed to create order' });
+  }
+});
+
 // Start server
 const PORT = process.env.PORT || 3000;
 app.listen(PORT, () => {
