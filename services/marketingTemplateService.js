const fs = require('fs');
const path = require('path');

const TEMPLATE_PATH = path.join(__dirname, '..', 'data', 'marketingTemplates.json');

function loadMarketingTemplates() {
  const raw = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  return JSON.parse(raw);
}

function listCategories() {
  return loadMarketingTemplates().categories;
}

function getTemplatesByCategory(category) {
  const normalized = String(category || '').trim().toLowerCase();
  return loadMarketingTemplates().templates.filter((template) => template.category === normalized);
}

function chooseAbVariant(template, seed = Date.now()) {
  if (!template || !template.abTest || !Array.isArray(template.abTest.variants)) {
    throw new Error('Template senza configurazione A/B valida');
  }
  const variants = template.abTest.variants;
  const index = Math.abs(Number(seed) || 0) % variants.length;
  return variants[index];
}

function validateMarketingTemplates(data = loadMarketingTemplates()) {
  const errors = [];
  const requiredCategories = ['gelaterie', 'ristoranti', 'abbigliamento', 'farmacie', 'palestre'];

  for (const category of requiredCategories) {
    const templates = data.templates.filter((template) => template.category === category);
    if (templates.length < 10) {
      errors.push(`${category}: richiesti almeno 10 template, trovati ${templates.length}`);
    }
  }

  data.templates.forEach((template) => {
    if (template.language !== 'it') errors.push(`${template.id}: language deve essere it`);
    if (!template.copy?.headline || !template.copy?.body || !template.copy?.callToAction) {
      errors.push(`${template.id}: copy incompleta`);
    }
    if (template.abTest?.enabled !== true || !Array.isArray(template.abTest.variants) || template.abTest.variants.length < 2) {
      errors.push(`${template.id}: A/B test non configurato con almeno 2 varianti`);
    }
  });

  return { valid: errors.length === 0, errors };
}

module.exports = {
  loadMarketingTemplates,
  listCategories,
  getTemplatesByCategory,
  chooseAbVariant,
  validateMarketingTemplates,
};
