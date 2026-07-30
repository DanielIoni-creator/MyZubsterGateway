--- a/server.js
+++ b/server.js
@@ -15,6 +15,17 @@
 const app = express();

 // ===== MIDDLEWARE =====
+const csv = require('csv-express');
+const geojson = require('geojson');
+const mongoose = require('mongoose');
+const SeedExchange = require('./models/SeedExchange');
+
 app.use(helmet());
 app.use(cors());
 app.use(compression());
 app.use(morgan('dev'));
@@ -34,6 +45,34 @@
 app.use('/api/seed-exchange', seedExchangeRoutes);

+// Endpoint per esportare le liste come CSV
+app.get('/api/seed-exchange/export/csv', async (req, res) => {
+  const filters = req.query;
+  const seedExchanges = await SeedExchange.find(filters);
+  res.csv(seedExchanges, true);
+});
+
+// Endpoint per esportare le liste come GeoJSON
+app.get('/api/seed-exchange/export/geojson', async (req, res) => {
+  const filters = req.query;
+  const seedExchanges = await SeedExchange.find(filters);
+  const geojsonSeedExchanges = seedExchanges.map((seedExchange) => {
+    return {
+      type: 'Feature',
+      geometry: {
+        type: 'Point',
+        coordinates: [seedExchange.location.longitude, seedExchange.location.latitude]
+      },
+      properties: seedExchange
+    };
+  });
+  res.json(geojsonSeedExchanges);
+});
+
 app.listen(PORT, () => {
   console.log(`🚀 Server listening on port ${PORT}`);
 });
