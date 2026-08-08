# Scaffolding robot

Bounty BOT-7 (#344). Genera un nuovo robot completo — modulo, API, test e documentazione — già cablato con escrow, notifiche e plugin. Nessuna dipendenza npm.

## Uso

```bash
npm run robot:templates                                  # elenca i template
npm run robot:create -- traduzione                       # template basic
npm run robot:create -- traduzione --template translation
npm run robot:create -- meteo --wire                     # monta anche la route in server.js
npm run robot:create -- meteo --dry-run                  # mostra cosa farebbe
```

> Con npm serve il `--` prima del nome: separa gli argomenti dello script da quelli di npm. Chiamando direttamente lo script non serve: `node scripts/create-robot.js meteo`.

### Opzioni

| Opzione | |
|---|---|
| `-t, --template <nome>` | template da usare (default `basic`) |
| `-l, --list` | elenca i template disponibili |
| `-f, --force` | sovrascrive i file esistenti |
| `--dry-run` | mostra cosa verrebbe generato, senza scrivere |
| `--wire` | inserisce la route in `server.js` accanto agli altri robot |
| `--no-test` | non genera il file di test |

## Cosa genera

Per `npm run robot:create -- traduzione --template translation`:

```
robot_traduzione.js              logica del robot
routes/robotTraduzione.js        API Express con annotazioni @openapi
tests/robotTraduzione.test.js    11 test, con escrow e notifiche mockati
docs/robots/traduzione.md        documentazione con esempi curl
```

I nomi sono derivati da un unico slug, quindi restano coerenti fra file, route e simboli. `Robot Traduzione`, `robot-traduzione` e `robotTraduzione` producono tutti lo stesso risultato: il prefisso `robot` ridondante viene rimosso.

Il robot generato è **subito funzionante**: crea job con escrow reale, li esegue, li consegna. L'unica cosa da riscrivere è `performTraduzione()`.

## Template inclusi

| Template | Input → Output | |
|---|---|---|
| `basic` | `input` → `output` | base generica, da cui ereditano gli altri |
| `translation` | `text` → `translation` | robot di traduzione (50 MYZ) |
| `logo` | `prompt` → `imageUrl` | generazione loghi (100 MYZ) |
| `code` | `prompt` → `code` | generazione codice (150 MYZ) |

## Aggiungere un template

Un template è una cartella in `scripts/robot-templates/` con un `template.json`. Con `extends` eredita tutto da un altro template e dichiara **solo ciò che cambia**:

```jsonc
// scripts/robot-templates/meteo/template.json
{
  "name": "meteo",
  "extends": "basic",
  "description": "Robot meteo: riceve una città, restituisce le previsioni.",
  "vars": {
    "TASK_LABEL": "previsione",
    "TASK_NOUN": "meteo",
    "INPUT_FIELD": "city",
    "INPUT_DESCRIPTION": "Città di cui vuoi le previsioni",
    "OUTPUT_FIELD": "forecast",
    "DEFAULT_AMOUNT": "30",
    "SAMPLE_INPUT": "\"Roma\""
  }
}
```

Aggiungendo un `perform.snippet` nella stessa cartella si personalizza solo il corpo della funzione principale, senza duplicare il resto del modulo. Per cambiare di più, basta mettere nella cartella un `robot.js.tpl`, `route.js.tpl`, `test.js.tpl` o `doc.md.tpl`: i file assenti vengono presi dal template genitore.

Se un segnaposto resta senza valore il generatore **fallisce**, invece di produrre un file con `{{VAR}}` dentro.

## Plugin

Ogni robot generato espone gli hook di `services/robotPlugins.js`:

| Hook | Quando |
|---|---|
| `job:created` | dopo la creazione del job e il lock dell'escrow |
| `job:executing` | prima di eseguire la logica |
| `job:delivered` | dopo la consegna |
| `job:failed` | se la logica lancia |

```js
const robot = require('./robot_traduzione');

robot.use({
  name: 'metrics',
  hooks: {
    'job:delivered': ({ jobId, job }) =>
      console.log(`job ${jobId} in ${job.deliveredAt - job.createdAt}ms`)
  }
});
```

Un plugin che lancia viene loggato e ignorato: deve degradare l'osservabilità, non il lavoro del robot. Registrare un hook inesistente invece fallisce subito, perché sarebbe silenziosamente inerte.

## Test

```bash
node --test tests/createRobot.test.js
```

I test generano davvero un robot, verificano che non restino segnaposto, che il JavaScript prodotto sia valido (`node --check`) e che **i test generati passino**.
