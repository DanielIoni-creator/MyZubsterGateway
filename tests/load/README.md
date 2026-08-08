# Test di carico — MyZubsterGateway

Bounty P5 (#269). Scenari di carico per il gateway con **k6** e **Artillery**, più un runner **senza dipendenze** e un generatore di report automatico.

## Avvio rapido

Il runner Node non richiede di installare niente: usa solo il modulo `http` della standard library.

```bash
RATE_LIMIT_MAX=10000000 RATE_LIMIT_WINDOW=60 npm start   # in un terminale
npm run loadtest                                          # 100 utenti concorrenti per 60 s
```

> ⚠️ **Il rate limiter va alzato prima di misurare.** Il gateway monta un rate limiter globale (Bounty B15) che di default respinge oltre **100 richieste ogni 15 minuti per IP**. Un test di carico da una singola macchina lo satura in meno di un secondo: senza alzare `RATE_LIMIT_MAX` si misura il limiter, non il gateway. Tutti e tre i runner **rilevano i 429 e lo segnalano esplicitamente** invece di riportarli come normali fallimenti.

Con k6 installato, questo avvia anche il gateway se non è già attivo:

```bash
./scripts/run-load-test.sh
```

In entrambi i casi il report finisce in `reports/load/report.md` (più `summary.json`; con k6 anche `report.html`).

## Tre modi per eseguirlo

| Comando | Tool | Serve installare qualcosa? |
|---|---|---|
| `npm run loadtest` | Node (`scripts/load-test-node.js`) | **No** |
| `npm run loadtest:k6` | k6 | sì, il binario k6 |
| `npm run loadtest:artillery` | Artillery | no (`npx`), ma scarica il pacchetto |

I tre percorsi eseguono gli **stessi flussi** e producono lo **stesso report Markdown**, così i risultati sono confrontabili.

## Cosa viene simulato

Tre scenari concorrenti, pesati per assomigliare al traffico reale:

| Scenario | Peso | Endpoint |
|---|---|---|
| `browse` | alto | `GET /health` |
| `robotJob` | medio | `POST /api/robot/create` → `POST /api/robot/assign` (crea l'escrow) → `GET /api/robot/status/:id` |
| `payments` | medio | `POST /buy-myz`, `POST /escrow/create` |

Ogni utente virtuale genera id univoci: il gateway rifiuta i `robotId` duplicati, quindi riusarli trasformerebbe il test in una raffica di 400 e falserebbe le misure.

`POST /api/robot/execute` è volutamente escluso: contiene un `await sleep(2000)` simulato che misurerebbe la `setTimeout`, non il gateway.

## Profili k6

Il criterio del bounty chiede **almeno 100 utenti concorrenti**: il profilo di default arriva a 100 VU e mantiene il plateau per 2 minuti.

| Profilo | Picco | Durata | Uso |
|---|---|---|---|
| `smoke` | 5 VU | ~35 s | sanity check, gira ovunque |
| `load` *(default)* | `PEAK_VUS` (100) | ~4 min | test di carico nominale |
| `stress` | `PEAK_VUS × 2` | ~4 min | ricerca del punto di rottura |
| `spike` | `PEAK_VUS × 2` | ~80 s | picco improvviso e recupero |

```bash
k6 run tests/load/k6/gateway-load.js                       # load, 100 VU
PEAK_VUS=200 k6 run tests/load/k6/gateway-load.js          # load, 200 VU
k6 run -e PROFILE=stress tests/load/k6/gateway-load.js     # stress
k6 run -e PROFILE=smoke tests/load/k6/gateway-load.js      # smoke
BASE_URL=https://gateway.example k6 run tests/load/k6/gateway-load.js
```

Variabili d'ambiente: `BASE_URL`, `PROFILE`, `PEAK_VUS`, `REPORT_DIR`.

## Misure raccolte

Oltre alle metriche standard di k6 (`http_reqs`, `http_req_duration`, `http_req_failed`, `vus`), lo scenario registra una **trend di latenza per singolo endpoint**:

`flow_health_duration`, `flow_robot_create_duration`, `flow_robot_assign_duration`, `flow_robot_status_duration`, `flow_buy_myz_duration`, `flow_escrow_create_duration`.

Il report mostra throughput (req/s), utenti concorrenti massimi, percentuale di errori e latenza `avg / p(95) / p(99) / max`, sia complessiva sia per endpoint.

## Soglie

Definite in `options.thresholds`. Se non sono rispettate **k6 esce con codice ≠ 0**, quindi lo scenario è usabile come gate in CI.

| Soglia | Valore |
|---|---|
| `http_req_failed` | < 5% |
| `http_req_duration` | p(95) < 800 ms, p(99) < 2000 ms |
| `flow_health_duration` | p(95) < 200 ms |
| `flow_robot_assign_duration` | p(95) < 1500 ms |
| `checks` | > 95% superati |

## Runner Node (senza dipendenze)

`scripts/load-test-node.js` replica gli stessi flussi usando solo il modulo `http` di Node, e scrive un summary nello stesso formato di k6.

```bash
node scripts/load-test-node.js                                   # 100 VU, 60 s
node scripts/load-test-node.js --vus 200 --duration 120
node scripts/load-test-node.js --url https://gateway.example --vus 100
```

Opzioni: `--url`, `--vus`, `--duration`, `--ramp-up`, `--think`, `--report-dir`.

Esce con codice 1 se le soglie (`errori < 5%`, `p(95) < 800 ms`, `p(99) < 2000 ms`) non sono rispettate.

Esempio di run reale contro un gateway locale, **120 utenti concorrenti**:

```
  ── Test di carico MyZubsterGateway ──────────────────────
  target        http://localhost:10000
  utenti        120 concorrenti
  durata        20.6 s
  richieste     42420  (2061.22 req/s)
  fallite       0.00 %
  latenza avg   0.8 ms
  latenza p95   2.1 ms
  latenza p99   4.1 ms
  ─────────────────────────────────────────────────────────
```

## Report automatico

Il report viene generato **al termine del test, senza passaggi manuali**:

- `handleSummary()` in `tests/load/k6/gateway-load.js` scrive `summary.json`, `report.md` e `report.html` in `reports/load/`, e stampa un riepilogo su stdout. Nessun import remoto: funziona anche offline.
- Il runner Node scrive `summary.json` e `report.md` alla fine del run.
- `scripts/load-report.js` rigenera lo stesso report Markdown a partire da un summary salvato, e **accetta il formato k6, quello del runner Node e quello di Artillery**, così l'output è identico con tutti e tre.

```bash
node scripts/load-report.js reports/load/summary.json
node scripts/load-report.js reports/load/artillery.json -o reports/load/report.md
```

Anche `load-report.js` esce con codice 1 se qualche soglia non è rispettata.

## Artillery (alternativa)

```bash
./scripts/run-load-test.sh --tool artillery
# oppure a mano:
npx artillery run --output reports/load/artillery.json tests/load/artillery/gateway-load.yml
node scripts/load-report.js reports/load/artillery.json
```

Il profilo Artillery arriva a 50 nuovi utenti al secondo; con ~4 richieste e ~1.2 s di think time a testa restano stabilmente oltre 100 utenti virtuali concorrenti.

## Installazione dei tool

Né k6 né Artillery vengono aggiunti alle dipendenze del progetto: sono strumenti esterni, invocati solo quando si lancia un test di carico.

```bash
# k6 — https://k6.io/docs/get-started/installation/
brew install k6                 # macOS
sudo apt-get install k6         # Debian/Ubuntu (dopo aver aggiunto il repo k6)
docker run --rm -i -v "$PWD:/app" -w /app grafana/k6 run tests/load/k6/gateway-load.js

# Artillery — nessuna installazione necessaria
npx artillery run tests/load/artillery/gateway-load.yml
```

## Note

- I test creano robot ed escrow **in memoria** nel processo del gateway. Dopo una sessione lunga conviene riavviarlo per liberare le Map di stato.
- Contro un ambiente condiviso o di produzione, usare prima `PROFILE=smoke` e concordare la finestra di test.
- `reports/` è ignorato da git: gli artefatti dei run non vengono versionati.
