const express = require("express");
const router = express.Router();
const { body, query, validationResult } = require("express-validator");
const SeedListing = require("../models/SeedListing");

router.get("/", query("type").optional().isString(), query("category").optional().isString(), query("area").optional().isString(), async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.type) filter.seedType = new RegExp(req.query.type, "i");
    if (req.query.category) filter.category = req.query.category;
    if (req.query.area) filter.area = new RegExp(req.query.area, "i");
    const listings = await SeedListing.find(filter).sort({ createdAt: -1 }).limit(100).populate("owner", "username");
    res.json({ listings, total: listings.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/", body("title").isString().notEmpty(), body("seedType").isString().notEmpty(), body("quantity").isInt({ min: 1 }), body("category").isIn(["semi","talee","piantine","bulbi","altro"]), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const listing = new SeedListing({ title: req.body.title, seedType: req.body.seedType, quantity: req.body.quantity, category: req.body.category, description: req.body.description || "", area: req.body.area || "", exchangeFor: req.body.exchangeFor || [], owner: req.body.owner });
    await listing.save();
    res.status(201).json(listing);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get("/:id", async (req, res) => {
  try {
    const listing = await SeedListing.findById(req.params.id).populate("owner", "username");
    if (!listing) return res.status(404).json({ error: "Not found" });
    res.json(listing);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/:id/exchange", async (req, res) => {
  try {
    const listing = await SeedListing.findById(req.params.id);
    if (!listing) return res.status(404).json({ error: "Not found" });
    if (!listing.isActive) return res.status(400).json({ error: "Listing inactive" });
    listing.exchangeProposals.push({ fromUser: req.body.fromUser, offer: req.body.offer, message: req.body.message || "", status: "pending" });
    await listing.save();
    res.status(201).json(listing);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
