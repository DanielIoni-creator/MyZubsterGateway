# Robot {{DISPLAY_NAME}}

> Generato da `npm run robot:create -- {{SLUG}} --template {{TEMPLATE}}` il {{GENERATED_AT}}.
> Template: **{{TEMPLATE}}** — {{TEMPLATE_DESCRIPTION}}

{{DESCRIPTION}}

## File

| File | |
|---|---|
| `{{MODULE_FILE}}` | logica del robot |
| `{{ROUTE_FILE}}` | API Express |
| `{{TEST_FILE}}` | test |
| `docs/robots/{{SLUG}}.md` | questo documento |

## Attivazione

Aggiungi la route in `server.js`, insieme agli altri robot:

```js
app.use('{{MOUNT_PATH}}', require('{{ROUTE_REQUIRE}}'));
```

## API

### `POST {{MOUNT_PATH}}/create`

Crea un job e blocca i fondi in escrow.

```bash
curl -X POST http://localhost:10000{{MOUNT_PATH}}/create \
  -H 'Content-Type: application/json' \
  -d '{
    "jobId": "job-1",
    "clientId": "alice",
    "robotId": "robot-1",
    "{{INPUT_FIELD}}": {{SAMPLE_INPUT}},
    "amount": {{DEFAULT_AMOUNT}},
    "currency": "MYZ"
  }'
```

| Campo | Obbligatorio | |
|---|---|---|
| `jobId` | sì | identificativo univoco del job |
| `clientId` | sì | committente |
| `robotId` | sì | robot incaricato |
| `{{INPUT_FIELD}}` | sì | {{INPUT_DESCRIPTION}} |
| `amount` | no | default `{{DEFAULT_AMOUNT}}` |
| `currency` | no | `MYZ` (default) o `XMR` |

Risponde `201`. Con payload incompleto o `jobId` già usato risponde `400`.

### `POST {{MOUNT_PATH}}/execute`

Esegue il job, salva il risultato in `{{OUTPUT_FIELD}}` e porta l'escrow a `DELIVERED`.

```bash
curl -X POST http://localhost:10000{{MOUNT_PATH}}/execute \
  -H 'Content-Type: application/json' -d '{"jobId":"job-1"}'
```

Un job già consegnato risponde `400`: l'esecuzione non è ripetibile.

### `GET {{MOUNT_PATH}}/jobs`

Elenco dei job, dal più recente.

### `GET {{MOUNT_PATH}}/job/:jobId`

Dettaglio di un job con lo stato aggiornato dell'escrow. `404` se non esiste.

## Implementare la logica

Tutto il cablaggio con escrow, notifiche e plugin è già fatto. L'unica funzione da riscrivere è `{{PERFORM_FN}}()` in `{{MODULE_FILE}}`:

```js
async function {{PERFORM_FN}}(job) {
  // job.{{INPUT_FIELD}} contiene l'input
  // il valore restituito finisce in job.{{OUTPUT_FIELD}}
  return await ilTuoServizio(job.{{INPUT_FIELD}});
}
```

Se lancia, il job passa a `failed`, viene emesso l'hook `job:failed` e il cliente riceve una notifica.

## Plugin

Il robot espone gli hook di `services/robotPlugins.js`:

| Hook | Quando |
|---|---|
| `job:created` | dopo la creazione del job e il lock dell'escrow |
| `job:executing` | prima di eseguire la logica |
| `job:delivered` | dopo la consegna e il `markDelivered` |
| `job:failed` | se la logica lancia |

```js
const robot = require('./{{MODULE_NAME}}');

robot.use({
  name: 'metrics',
  hooks: {
    'job:delivered': ({ jobId, job }) => {
      console.log(`job ${jobId} consegnato in ${job.deliveredAt - job.createdAt}ms`);
    }
  }
});
```

Un plugin che lancia viene loggato e ignorato: un plugin difettoso degrada l'osservabilità, non il lavoro del robot. Registrare un hook inesistente invece fallisce subito, perché sarebbe silenziosamente inerte.

## Test

```bash
node --test {{TEST_FILE}}
```

I test sostituiscono `escrow_robot` e `notifications` con dei mock, quindi girano senza wallet né database.
