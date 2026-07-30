--- a/server.js
+++ b/server.js
@@ -14,6 +14,14 @@
 const app = express();

 // ===== MIDDLEWARE =====
+const jwt = require('express-jwt');
+const mongoose = require('mongoose');
+const seedExchangeModel = require('./models/seedExchange');
+
 app.use(helmet());
 app.use(cors());
 app.use(compression());
 app.use(morgan('dev'));
@@ -22,6 +30,124 @@
 app.use(express.json({ limit: '10mb' }));
 app.use(express.urlencoded({ extended: true }));

+// Autenticazione JWT
+app.use(jwt({
+  secret: process.env.SECRET_KEY,
+  algorithms: ['HS256'],
+  requestProperty: 'auth',
+  getToken: (req) => req.cookies.auth,
+}).unless({
+  path: ['/api/seed-exchange'],
+}));
+
+// Connetti a MongoDB
+mongoose.connect('mongodb://localhost:27017/myzubster', { useNewUrlParser: true, useUnifiedTopology: true });
+
+// Endpoint per creare un annuncio
+app.post('/api/seed-exchange', async (req, res) => {
+  try {
+    const { type, quantity, location } = req.body;
+    const newSeedExchange = new seedExchangeModel({ type, quantity, location, user: req.auth.sub });
+    await newSeedExchange.save();
+    res.status(201).json(newSeedExchange);
+  } catch (error) {
+    res.status(400).json({ error: 'Invalid request' });
+  }
+});
+
+// Endpoint per elencare gli annunci
+app.get('/api/seed-exchange', async (req, res) => {
+  try {
+    const { type, location } = req.query;
+    let filter = {};
+    if (type) filter.type = type;
+    if (location) filter.location = location;
+    const seedExchanges = await seedExchangeModel.find(filter).populate('user');
+    res.json(seedExchanges);
+  } catch (error) {
+    res.status(500).json({ error: 'Internal server error' });
+  }
+});
+
+// Endpoint per visualizzare un annuncio
+app.get('/api/seed-exchange/:id', async (req, res) => {
+  try {
+    const seedExchange = await seedExchangeModel.findById(req.params.id).populate('user');
+    if (!seedExchange) return res.status(404).json({ error: 'Not found' });
+    res.json(seedExchange);
+  } catch (error) {
+    res.status(500).json({ error: 'Internal server error' });
+  }
+});
+
+// Endpoint per modificare un annuncio
+app.put('/api/seed-exchange/:id', async (req, res) => {
+  try {
+    const seedExchange = await seedExchangeModel.findById(req.params.id);
+    if (!seedExchange) return res.status(404).json({ error: 'Not found' });
+    if (seedExchange.user.toString() !== req.auth.sub) return res.status(403).json({ error: 'Forbidden' });
+    const updatedSeedExchange = await seedExchangeModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
+    res.json(updatedSeedExchange);
+  } catch (error) {
+    res.status(400).json({ error: 'Invalid request' });
+  }
+});
+
+// Endpoint per eliminare un annuncio
+app.delete('/api/seed-exchange/:id', async (req, res) => {
+  try {
+    const seedExchange = await seedExchangeModel.findById(req.params.id);
+    if (!seedExchange) return res.status(404).json({ error: 'Not found' });
+    if (seedExchange.user.toString() !== req.auth.sub) return res.status(403).json({ error: 'Forbidden' });
+    await seedExchangeModel.findByIdAndRemove(req.params.id);
+    res.status(204).json({ message: 'Deleted successfully' });
+  } catch (error) {
+    res.status(500).json({ error: 'Internal server error' });
+  }
+});
+
 // Start server
 const port = process.env.PORT || 3000;
 app.listen(port, () => {
