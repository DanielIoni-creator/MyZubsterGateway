# Audit Logging

Bounty B14 (#279). Traccia automatica di tutte le azioni critiche del gateway: pagamenti, escrow, robot, bounty, webhook GitHub, stake, reward e reset del rate limiter.

## Come funziona

`middleware/auditLogger.js` è montato in `server.js` subito dopo `express.json()`, prima di tutte le route. Per ogni richiesta:

1. cerca nel catalogo di `services/auditService.js` un'azione critica che corrisponda a `method` + `path`;
2. se non c'è, la richiesta prosegue **senza alcun costo aggiuntivo** (le letture come `GET /health` non vengono tracciate);
3. se c'è, registra la voce su `res.on('finish')`, cioè **dopo** che la risposta è stata inviata al client.

Due garanzie volute:

- **Non blocca.** Il client non aspetta mai la scrittura sul database.
- **Non può rompere la richiesta.** Ogni errore dell'audit viene loggato e ignorato: un audit che fallisce non deve abbattere il pagamento che stava tracciando.

## Azioni tracciate

| Categoria | Azione | Endpoint |
|---|---|---|
| `payment` | `payment.buy_myz` | `POST /buy-myz` |
| `escrow` | `escrow.create` | `POST /escrow/create` |
| `escrow` | `escrow.house` | `POST /api/escrow/house/*` |
| `escrow` | `escrow.robot_create` | `POST /api/robot/escrow/create` |
| `escrow` | `escrow.robot_deliver` | `POST /api/robot/escrow/deliver` |
| `escrow` | `escrow.robot_dispute` | `POST /api/robot/escrow/dispute` |
| `robot` | `robot.create` | `POST /api/robot/create` |
| `robot` | `robot.assign_job` | `POST /api/robot/assign` |
| `robot` | `robot.deliver_job` | `POST /api/robot/deliver` |
| `robot` | `robot.complete_job` | `POST /api/robot/job/complete` |
| `robot` | `robot.dispute` | `POST /api/robot/dispute` |
| `bounty` | `bounty.create` / `bounty.assign` / `bounty.complete` | `POST /api/bounty/*` |
| `reward` | `reward.trigger` | `POST /api/rewards/trigger` |
| `stake` | `stake.create` | `POST /api/stake/stake` |
| `webhook` | `webhook.github_event` | `POST /api/webhooks/github` |
| `admin` | `admin.ratelimit_reset` | `POST /api/ratelimit/reset` |
| `backup` | `backup.create` / `backup.restore` / `backup.cleanup` | `POST /api/backup/*` ⚠️ route non montate |

L'elenco aggiornato è sempre disponibile su `GET /api/audit/actions`.

Per aggiungere un'azione basta una riga in `CRITICAL_ACTIONS` (`services/auditService.js`): non serve toccare le route.

## Modello

`models/AuditLog.js` — collection `auditlogs`.

| Campo | Note |
|---|---|
| `action` | `dominio.operazione`, es. `escrow.create` |
| `category` | `payment` · `escrow` · `robot` · `bounty` · `backup` · `stake` · `reward` · `webhook` · `admin` · `other` |
| `userId` | ricavato dal payload (`clientId`, `userId`, `buyer`, `username`…) |
| `resourceType` / `resourceId` | risorsa toccata, anche se l'id è generato dal server |
| `method` `path` `statusCode` `status` | `status` è `failure` per ogni risposta ≥ 400 |
| `ip` `userAgent` `durationMs` | `ip` rispetta `x-forwarded-for` |
| `metadata` | body della richiesta **ripulito dai segreti** |
| `error` | messaggio d'errore per le risposte ≥ 400 |
| `createdAt` | indicizzato |

Indici composti su `{userId, createdAt}`, `{action, createdAt}`, `{category, createdAt}` per le query dell'API.

### Redazione dei segreti

Un audit log che copia il body alla lettera finirebbe per archiviare proprio i dati che non vanno archiviati. Le chiavi che contengono `password`, `secret`, `token`, `apiKey`, `authorization`, `privateKey`, `seed`, `mnemonic` o `signature` — anche annidate — diventano `[REDACTED]`. Le stringhe oltre 512 caratteri vengono troncate, gli array oltre 20 elementi accorciati, gli oggetti oltre 50 chiavi troncati (i payload dei webhook GitHub ne hanno centinaia), i `Buffer` riassunti come `[buffer N byte]` invece di essere enumerati byte per byte, e la ricorsione si ferma a 4 livelli.

```jsonc
// richiesta
{ "robotId": "a1", "name": "A", "walletAddress": "w1", "privateKey": "SEGRETO" }
// metadata registrato
{ "robotId": "a1", "name": "A", "walletAddress": "w1", "privateKey": "[REDACTED]" }
```

## API

### `GET /api/audit`

Voci filtrate e paginate.

| Parametro | |
|---|---|
| `userId` | filtra per utente — `GET /api/audit?userId=xxx` |
| `action` | azione esatta, es. `escrow.create` |
| `category` | categoria |
| `resourceId` / `resourceType` | risorsa |
| `status` | `success` o `failure` |
| `from` / `to` | intervallo di date ISO 8601 |
| `page` / `limit` | paginazione (default 1 / 50, max 500) |

```bash
curl "http://localhost:10000/api/audit?userId=alice"
curl "http://localhost:10000/api/audit?category=escrow&status=failure&from=2025-01-01"
```

I filtri non validi (data non parsabile, intervallo invertito, status sconosciuto) rispondono **400**, non 500.

### `GET /api/audit/export`

Stessi filtri, export scaricabile.

```bash
curl -OJ "http://localhost:10000/api/audit/export?format=csv"
curl -OJ "http://localhost:10000/api/audit/export?format=json&userId=alice"
```

Il CSV segue RFC 4180 (virgolette raddoppiate, campi quotati quando contengono `,` `"` o newline, terminatori CRLF), quindi si apre correttamente in Excel.

### `GET /api/audit/stats`

Conteggi per categoria, azione ed esito sull'intervallo filtrato.

### `GET /api/audit/actions`

Catalogo delle azioni tracciate automaticamente.

## Configurazione

| Variabile | Default | |
|---|---|---|
| `AUDIT_LOG_TTL_DAYS` | *(nessuna)* | se impostata, MongoDB elimina da solo le voci più vecchie |
| `AUDIT_LOG_BUFFER_SIZE` | `500` | dimensione del buffer di fallback in memoria |

## Degrado senza MongoDB

Se la connessione non è attiva (o una scrittura fallisce), le voci finiscono in un **buffer circolare in memoria** e l'API continua a rispondere leggendo da lì. Il campo `source` della risposta indica quale sorgente è stata usata:

```jsonc
{ "success": true, "data": [ /* … */ ], "pagination": { /* … */ }, "source": "memory" }
```

Questo rende l'audit utilizzabile anche in sviluppo e nei test senza dover avviare un database.
