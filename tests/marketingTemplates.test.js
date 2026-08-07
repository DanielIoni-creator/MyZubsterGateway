const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const {
  loadMarketingTemplates,
  listCategories,
  getTemplatesByCategory,
  chooseAbVariant,
  validateMarketingTemplates,
} = require('../services/marketingTemplateService');

describe('marketing templates bounty #383', () => {
  it('include 5 categorie negozio con almeno 10 template ciascuna', () => {
    const categories = listCategories();
    assert.deepEqual(categories, ['gelaterie', 'ristoranti', 'abbigliamento', 'farmacie', 'palestre']);

    for (const category of categories) {
      assert.equal(getTemplatesByCategory(category).length, 10, `${category} deve avere 10 template`);
    }
  });

  it('tutti i template sono in italiano e hanno copy pronta per post social', () => {
    const data = loadMarketingTemplates();
    assert.equal(data.templates.length, 50);

    for (const template of data.templates) {
      assert.equal(template.language, 'it');
      assert.ok(template.copy.headline.length > 10);
      assert.ok(template.copy.body.includes('MyZubster'));
      assert.ok(template.copy.callToAction.length > 10);
    }
  });

  it('ogni template integra un test A/B con due varianti selezionabili', () => {
    const [template] = getTemplatesByCategory('gelaterie');
    assert.equal(template.abTest.enabled, true);
    assert.equal(template.abTest.variants.length, 2);
    assert.equal(chooseAbVariant(template, 0).name, 'A');
    assert.equal(chooseAbVariant(template, 1).name, 'B');
  });

  it('validazione dati passa senza errori', () => {
    assert.deepEqual(validateMarketingTemplates(), { valid: true, errors: [] });
  });
});
