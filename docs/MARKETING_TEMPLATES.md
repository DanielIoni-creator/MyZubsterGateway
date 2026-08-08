# Template marketing per negozi

Implementazione bounty #383: template di post pronti per cinque categorie di negozi, in italiano, separati in JSON e con metadati per A/B test.

## Categorie incluse

- Gelaterie
- Ristoranti
- Negozi di abbigliamento
- Farmacie
- Palestre

Ogni categoria contiene 10 template, per un totale di 50 template in `data/marketingTemplates.json`.

## Struttura template

Ogni voce include:

- `id`: identificatore stabile
- `category`: categoria negozio
- `language`: `it`
- `copy.headline`, `copy.body`, `copy.callToAction`: testo pronto per pubblicazione
- `hashtags`: tag di base
- `abTest`: due varianti A/B con hook e CTA

## API

- `GET /api/marketing-templates` — lista tutte le categorie e i template
- `GET /api/marketing-templates/categories` — lista categorie
- `GET /api/marketing-templates/categories/:category` — template per categoria
- `GET /api/marketing-templates/:templateId/ab-variant?seed=1` — variante A/B deterministica
- `GET /api/marketing-templates/health/validation` — validazione del dataset

## Validazione

```bash
node --test tests/marketingTemplates.test.js
```
