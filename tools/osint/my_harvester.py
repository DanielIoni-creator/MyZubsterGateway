--- a/server.js
+++ b/server.js
@@ -15,6 +15,15 @@
 const express = require('express');
 const mongoose = require('mongoose');
+const gardenRoutes = require('./routes/garden');
 const cors = require('cors');
+const jwt = require('jsonwebtoken');
+const bcrypt = require('bcryptjs');
+const garden = require('./models/Garden');
+const gardenData = require('./models/GardenData');

 const app = express();

 // ===== MIDDLEWARE =====
@@ -24,6 +33,7 @@
 app.use(express.json({ limit: '10mb' }));
 app.use(express.urlencoded
 );

+app.use('/api/garden', gardenRoutes);
 app.use('/api/auth', authRoutes);

 app.listen(port, () => {
