# Contribuire a MyZubster

Grazie per voler contribuire a MyZubster. Questa guida spiega come segnalare problemi, proporre nuove funzionalità, configurare l'ambiente di sviluppo e inviare Pull Request.

## Segnalare un bug

Per segnalare un bug, apri una **Issue** su GitHub usando il template dedicato, se disponibile.

Includi sempre:

- versione dell'app o commit/branch usato
- dispositivo o ambiente di test
- passi chiari per riprodurre il problema
- comportamento atteso
- comportamento ottenuto
- screenshot, log o video se utili
- indicazione se il problema riguarda app Android, backend, pagamenti, chat o documentazione

Non inserire mai nella Issue:

- wallet privati
- seed phrase
- token API
- contenuti di `.env`
- chiavi Firebase o credenziali RPC

## Proporre una nuova funzionalità

Per proporre una funzionalità:

1. Apri una **Issue** di tipo feature request.
2. Descrivi il problema o il bisogno utente.
3. Spiega la soluzione proposta.
4. Indica eventuali alternative considerate.
5. Aggiungi mockup, esempi di UI o flussi se utili.

Prima di iniziare a sviluppare una feature grande, aspetta feedback nella Issue per evitare lavoro duplicato o fuori direzione.

## Configurare l'ambiente di sviluppo

### Prerequisiti

- Node.js 20+ consigliato
- npm
- Android Studio
- JDK 17 o JDK incluso in Android Studio
- MongoDB locale/remoto
- monero-wallet-rpc o MoneroPay per test pagamenti reali
- Git

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run check
npm start
```

Configura nel file `.env` solo valori locali e segreti server-side. Non committare `.env`.

Variabili tipiche:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/myzubster
MONERO_WALLET_RPC_URL=http://127.0.0.1:38082/json_rpc
MONERO_NODE_URL=http://127.0.0.1:18081/json_rpc
PAYMENT_PLATFORM_FEE_RATE=0.02
PLATFORM_FEE_WALLET_ADDRESS=
```

### App Android

Apri la root del progetto in Android Studio oppure compila da terminale:

```bash
./gradlew assembleDebug
```

Su Windows:

```powershell
.\gradlew.bat assembleDebug
```

L'APK debug viene generato in:

```text
app/build/outputs/apk/debug/app-debug.apk
```

## Inviare una Pull Request

Workflow consigliato:

1. Fai fork del repository.
2. Crea un branch descrittivo:

   ```bash
   git checkout -b feature/nome-funzionalita
   ```

3. Fai commit piccoli e leggibili:

   ```bash
   git add .
   git commit -m "Descrivi chiaramente la modifica"
   ```

4. Esegui i controlli prima di aprire la PR:

   ```bash
   cd backend
   npm run check
   ```

   ```bash
   ./gradlew assembleDebug
   ```

5. Pusha il branch:

   ```bash
   git push origin feature/nome-funzionalita
   ```

6. Apri una Pull Request su GitHub.

Nella PR includi:

- riepilogo delle modifiche
- Issue collegata, se esiste
- test eseguiti
- screenshot/video per modifiche UI
- note su migrazioni, configurazioni o breaking changes

## Codice di condotta

MyZubster fa riferimento al **Contributor Covenant** come codice di condotta per mantenere un ambiente collaborativo, rispettoso e inclusivo.

Riferimento ufficiale:

https://www.contributor-covenant.org/

Comportamenti attesi:

- rispetto reciproco
- discussioni tecniche senza attacchi personali
- feedback costruttivo
- attenzione alla privacy e alla sicurezza degli utenti

Comportamenti non accettati:

- molestie o insulti
- discriminazione
- pubblicazione di dati personali o segreti
- sabotaggio intenzionale del progetto
