const express = require('express');
const {
  loadMarketingTemplates,
  listCategories,
  getTemplatesByCategory,
  chooseAbVariant,
  validateMarketingTemplates,
} = require('../services/marketingTemplateService');

const router = express.Router();

router.get('/', (req, res) => {
  const data = loadMarketingTemplates();
  res.json({
    categories: data.categories,
    total: data.templates.length,
    templates: data.templates,
  });
});

router.get('/categories', (req, res) => {
  res.json({ categories: listCategories() });
});

router.get('/categories/:category', (req, res) => {
  const templates = getTemplatesByCategory(req.params.category);
  if (!templates.length) {
    return res.status(404).json({ error: 'Categoria non trovata' });
  }
  res.json({ category: req.params.category.toLowerCase(), total: templates.length, templates });
});

router.get('/:templateId/ab-variant', (req, res) => {
  const data = loadMarketingTemplates();
  const template = data.templates.find((item) => item.id === req.params.templateId);
  if (!template) {
    return res.status(404).json({ error: 'Template non trovato' });
  }
  res.json({ templateId: template.id, variant: chooseAbVariant(template, req.query.seed) });
});

router.get('/health/validation', (req, res) => {
  const result = validateMarketingTemplates();
  res.status(result.valid ? 200 : 500).json(result);
});

module.exports = router;
