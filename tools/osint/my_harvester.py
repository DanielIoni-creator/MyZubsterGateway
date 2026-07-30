--- a/server.js
+++ b/server.js
@@ -13,6 +13,8 @@
 const app = express();
 
 // ===== MIDDLEWARE =====
+const jwt = require('jsonwebtoken');
+const seedExchangeModel = require('./models/seedExchange');
 app.use(helmet());
 app.use(cors());
 app.use(compression());
@@ -25,6 +27,123 @@
 app.use(express.json({ limit: '10mb' }));
 app.use(express.urlencoded({ extended: true }));
 
+// API endpoints for seed and cutting exchange
+app.post('/api/seed-exchange', authenticate, (req, res) => {
+  const { plant, type, location, quantity } = req.body;
+  if (!plant || !type || !location || !quantity) {
+    return res.status(400).json({ error: 'Missing required fields' });
+  }
+  const newListing = new seedExchangeModel({ plant, type, location, quantity, owner: req.user._id });
+  newListing.save((err, listing) => {
+    if (err) {
+      return res.status(500).json({ error: 'Failed to create listing' });
+    }
+    res.json(listing);
+  });
+});
+
+app.get('/api/seed-exchange', (req, res) => {
+  const query = {};
+  if (req.query.plant) query.plant = req.query.plant;
+  if (req.query.type) query.type = req.query.type;
+  if (req.query.location) query.location = req.query.location;
+  seedExchangeModel.find(query).populate('owner', '_id username').exec((err, listings) => {
+    if (err) {
+      return res.status(500).json({ error: 'Failed to retrieve listings' });
+    }
+    res.json(listings);
+  });
+});
+
+app.get('/api/seed-exchange/:id', (req, res) => {
+  seedExchangeModel.findById(req.params.id).populate('owner', '_id username').exec((err, listing) => {
+    if (err || !listing) {
+      return res.status(404).json({ error: 'Listing not found' });
+    }
+    res.json(listing);
+  });
+});
+
+app.put('/api/seed-exchange/:id', authenticate, (req, res) => {
+  seedExchangeModel.findById(req.params.id).exec((err, listing) => {
+    if (err || !listing) {
+      return res.status(404).json({ error: 'Listing not found' });
+    }
+    if (listing.owner.toString() !== req.user._id.toString()) {
+      return res.status(403).json({ error: 'Unauthorized' });
+    }
+    listing.set(req.body);
+    listing.save((err, updatedListing) => {
+      if (err) {
+        return res.status(500).json({ error: 'Failed to update listing' });
+      }
+      res.json(updatedListing);
+    });
+  });
+});
+
+app.delete('/api/seed-exchange/:id', authenticate, (req, res) => {
+  seedExchangeModel.findById(req.params.id).exec((err, listing) => {
+    if (err || !listing) {
+      return res.status(404).json({ error: 'Listing not found' });
+    }
+    if (listing.owner.toString() !== req.user._id.toString()) {
+      return res.status(403).json({ error: 'Unauthorized' });
+    }
+    listing.remove((err) => {
+      if (err) {
+        return res.status(500).json({ error: 'Failed to delete listing' });
+      }
+      res.json({ message: 'Listing deleted successfully' });
+    });
+  });
+});
+
+function authenticate(req, res, next) {
+  const token = req.headers['x-access-token'];
+  if (!token) return res.status(401).json({ error: 'No token provided' });
+  jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
+    if (err) return res.status(500).json({ error: 'Failed to authenticate' });
+    req.user = decoded;
+    next();
+  });
+}
+
 // ===== ROUTES =====
 app.use('/api', require('./routes/api'));
 
--- /dev/null
+++ b/models/seedExchange.js
@@ -0,0 +1,10 @@
+const mongoose = require('mongoose');
+
+const seedExchangeSchema = new mongoose.Schema({
+  plant: { type: String, required: true },
+  type: { type: String, required: true },
+  location: { type: String, required: true },
+  quantity: { type: Number, required: true },
+  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
+});
+
+module.exports = mongoose.model('SeedExchange', seedExchangeSchema);
