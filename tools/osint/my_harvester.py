@@ -0,0 +1,16 @@
+ const express = require('express');
+ const router = express.Router();
+ const mongoose = require('mongoose');
+
+ const Order = require('../models/Order');
+
+ router.post('/', async (req, res) => {
+   try {
+     const order = new Order(req.body);
+     await order.save();
+     res.json({
+       status: 'ok',
+       data: order,
+     });
+   } catch (error) {
+     res.status(500).json({
+       error: error.message,
+     });
+   }
+ });
