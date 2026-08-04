# 🏆 Guida ai Bounty – MyZubster Gateway

## Come funziona

I bounty sono ricompense in **$MYZ** (token su Tari) offerte per contributi al progetto. Ogni bounty ha una descrizione, criteri di accettazione e una ricompensa in MYZ.

---

## 🔍 Trovare un bounty

1. Vai alla [lista delle issue bounty](https://github.com/MyZubster-Ecosystem/MyZubsterGateway/issues?q=label%3Abounty)
2. Cerca quelle con label `good first issue` per iniziare
3. Scegli quella che preferisci

---

## 📝 Reclamare un bounty

1. **Commenta** sull'issue: `I claim this bounty`
2. **Attendi** l'assegnazione (entro 24h)
3. **Apri una PR** entro 48 ore
4. **Collega** la PR all'issue: `Closes #NUMERO`

---

## ✅ Criteri di accettazione

Ogni bounty ha una lista di requisiti da soddisfare. In generale:

- **Codice funzionante** – passare tutti i test
- **Documentazione** – aggiornare README/API docs
- **Test** – aggiungere test per le nuove funzionalità
- **Qualità** – codice pulito, ben commentato

---

## 💰 Pagamento

Le ricompense sono pagate in **$MYZ** via gateway:

- **Dopo il merge** della PR nel branch `main`
- **Entro 48 ore** dal merge
- **All'indirizzo** Tari wallet specificato nella PR

**Esempio di pagamento:**
```bash
curl -X POST http://localhost:3001/api/rewards/trigger \
  -H "Content-Type: application/json" \
  -d '{"userId":"GITHUB_USERNAME","amount":80,"reason":"Completed bounty #234 - Dashboard Rewards","source":"github_pr"}'
