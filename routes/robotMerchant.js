const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Multer config for photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/merchants/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// In-memory store (replace with MongoDB in production)
let merchants = [];
let posts = [];
let postIdCounter = 1;

// GET /api/robot/merchant/profile - Get merchant profile
router.get('/profile', (req, res) => {
  const userId = req.user?.id || req.query.userId;
  const merchant = merchants.find(m => m.userId === userId);
  if (!merchant) {
    return res.status(404).json({ message: 'Nessun negozio registrato' });
  }
  res.json(merchant);
});

// POST /api/robot/merchant/create - Create/register a merchant
router.post('/create', upload.single('photo'), (req, res) => {
  try {
    const { name, category, description, email, phone, address } = req.body;
    if (!name || !description || !email) {
      return res.status(400).json({ message: 'Nome, descrizione ed email sono obbligatori' });
    }

    const merchant = {
      id: 'merchant_' + Date.now(),
      userId: req.user?.id || 'anonymous',
      name,
      category: category || '',
      description,
      email,
      phone: phone || '',
      address: address || '',
      photoUrl: req.file ? `/uploads/merchants/${req.file.filename}` : null,
      createdAt: new Date().toISOString(),
    };

    merchants.push(merchant);
    res.status(201).json(merchant);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET /api/robot/merchant/posts - Get all posts for the merchant
router.get('/posts', (req, res) => {
  const userId = req.user?.id || req.query.userId;
  const merchant = merchants.find(m => m.userId === userId);
  const merchantPosts = merchant
    ? posts.filter(p => p.merchantId === merchant.id)
    : [];
  res.json({ posts: merchantPosts });
});

// POST /api/robot/social/generate - Generate a new social post
router.post('/social/generate', (req, res) => {
  try {
    const { storeId } = req.body;
    const merchant = merchants.find(m => m.id === storeId);
    if (!merchant) {
      return res.status(404).json({ message: 'Negozio non trovato' });
    }

    // Generate AI-style post content based on merchant info
    const platforms = ['Facebook', 'Instagram', 'Twitter', 'LinkedIn'];
    const templates = [
      `Nuovo arrivo al ${merchant.name}! 🎉 Venite a scoprire le nostre ultime novità. #novità #${merchant.category || 'negozio'}`,
      `${merchant.name} è qui per voi! 🛍️ Offriamo prodotti di qualità con prezzi imbattibili. Venite a trovarci! #offerta #${merchant.category || 'shop'}`,
      `Sapevi che al ${merchant.name} trovi sempre il meglio? 🤔 Scopri la nostra selezione oggi stesso! #scopri #${merchant.category || 'qualità'}`,
      `Grazie ai nostri clienti per la fiducia! ❤️ ${merchant.name} continua a crescere grazie a voi. #grazie #clienti`,
      `Promozione speciale al ${merchant.name}! 🏷️ Sconti imperdibili per tutta la settimana. Non perdete l'occasione! #promozione #sconti`,
    ];

    const newPost = {
      id: 'post_' + (postIdCounter++),
      merchantId: merchant.id,
      storeName: merchant.name,
      content: templates[Math.floor(Math.random() * templates.length)],
      platform: platforms[Math.floor(Math.random() * platforms.length)],
      imageUrl: merchant.photoUrl || null,
      tags: [merchant.category || 'negozio', 'promozione', 'social'],
      status: 'pending',
      likes: Math.floor(Math.random() * 50),
      comments: Math.floor(Math.random() * 10),
      createdAt: new Date().toISOString(),
    };

    posts.unshift(newPost);
    res.status(201).json(newPost);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH /api/robot/social/posts/:postId/approve - Approve a post
router.patch('/social/posts/:postId/approve', (req, res) => {
  const post = posts.find(p => p.id === req.params.postId);
  if (!post) {
    return res.status(404).json({ message: 'Post non trovato' });
  }
  post.status = 'approved';
  res.json(post);
});

// PATCH /api/robot/social/posts/:postId/reject - Reject a post
router.patch('/social/posts/:postId/reject', (req, res) => {
  const post = posts.find(p => p.id === req.params.postId);
  if (!post) {
    return res.status(404).json({ message: 'Post non trovato' });
  }
  post.status = 'rejected';
  res.json(post);
});

module.exports = router;
