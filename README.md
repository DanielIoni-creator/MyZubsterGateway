# MyZubster

[![APK Download](https://img.shields.io/badge/APK-download-v1.0.0--beta-orange?style=for-the-badge&logo=android)](https://github.com/h4x0rmyzubster/MyZubsterh4x0r/releases/download/v1.0.0-beta/myzubster-reviews-test-debug.apk)

**Versione:** 0.2.0  
**Ultimo aggiornamento:** 2026-06-29

MyZubster è un'app Android con backend Node.js pensata per pubblicare e trovare competenze/servizi locali, chattare tra utenti, gestire recensioni e supportare pagamenti Monero con commissione piattaforma configurabile.

## Download APK

L'APK beta è disponibile nella release GitHub:

- [Scarica MyZubster v1.0.0-beta APK](https://github.com/h4x0rmyzubster/MyZubsterh4x0r/releases/download/v1.0.0-beta/myzubster-reviews-test-debug.apk)
- [Pagina release v1.0.0-beta](https://github.com/h4x0rmyzubster/MyZubsterh4x0r/releases/tag/v1.0.0-beta)

## Funzionalità

- **Autenticazione** — base utenti e integrazione backend pronta per token/dispositivi e notifiche.
- **Competenze** — ricerca, visualizzazione e pubblicazione di servizi/competenze con prezzi in euro.
- **Chat** — conversazione tra cliente e venditore, con richiesta pagamento collegata al servizio.
- **Pagamenti Monero** — checkout Monero via backend, indirizzi one-shot, tracking conferme, QR/URI e fee piattaforma del 2% configurabile.
- **Recensioni** — sistema di recensioni e rating collegato a utenti e competenze.

## Installazione

### Prerequisiti

- Node.js 20+ consigliato
- npm
- Android Studio
- JDK 17, oppure il JDK incluso in Android Studio
- MongoDB locale o remoto
- Monero wallet RPC o MoneroPay per i pagamenti reali

### Backend

1. Entra nella cartella backend:

   ```bash
   cd backend
   ```

2. Installa le dipendenze:

   ```bash
   npm install
   ```

3. Crea il file `.env` partendo dall'esempio:

   ```bash
   cp .env.example .env
   ```

4. Configura almeno:

   ```env
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/myzubster
   MONERO_WALLET_RPC_URL=http://127.0.0.1:38082/json_rpc
   MONERO_NODE_URL=http://127.0.0.1:18081/json_rpc
   PAYMENT_PLATFORM_FEE_RATE=0.02
   PLATFORM_FEE_WALLET_ADDRESS=
   ```

   Nota: `PLATFORM_FEE_WALLET_ADDRESS` va tenuto solo nel `.env` del server. Non inserirlo nell'app Android.

5. Verifica la sintassi del backend:

   ```bash
   npm run check
   ```

6. Avvia il backend:

   ```bash
   npm start
   ```

   Il backend parte di default su:

   ```text
   http://localhost:3000
   ```

### App Android

1. Apri la root del progetto in Android Studio.

2. Controlla l'URL API in `app/build.gradle`:

   ```gradle
   buildConfigField 'String', 'API_BASE_URL', '"http://10.0.2.2:3000"'
   ```

   - Usa `10.0.2.2` per l'emulatore Android.
   - Usa l'IP LAN del PC se installi l'app su un telefono fisico.

3. Compila l'APK debug:

   ```bash
   ./gradlew assembleDebug
   ```

   Su Windows:

   ```powershell
   .\gradlew.bat assembleDebug
   ```

4. L'APK generato si trova in:

   ```text
   app/build/outputs/apk/debug/app-debug.apk
   ```

5. Per installarlo su un telefono collegato via ADB:

   ```bash
   adb install -r app/build/outputs/apk/debug/app-debug.apk
   ```

## Come contribuire

Le linee guida per contribuire sono nel file [CONTRIBUTING.md](CONTRIBUTING.md).

In breve:

1. Crea un branch dedicato.
2. Mantieni segreti e wallet fuori da git.
3. Esegui i check prima della pull request.
4. Descrivi chiaramente cosa cambia e come è stato testato.

## Note di sicurezza

- Non committare `.env`, wallet reali, chiavi private o service account Firebase.
- L'app Android deve comunicare con il backend: non deve contenere segreti di pagamento.
- I pagamenti Monero reali devono essere gestiti server-side con wallet RPC/MoneroPay configurati in modo sicuro.

## Licenza

Licenza non ancora definita.
