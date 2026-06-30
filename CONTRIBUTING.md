# Come contribuire a MyZubster

Grazie per l'interesse nel contribuire a MyZubster.

## Workflow consigliato

1. Fai fork o crea un branch dedicato dal branch principale di sviluppo.
2. Dai al branch un nome descrittivo, per esempio:

   ```text
   feature/profilo-utente
   fix/pagamenti-monero
   docs/readme-installazione
   ```

3. Mantieni le modifiche piccole e leggibili.
4. Aggiungi o aggiorna la documentazione quando cambi comportamento visibile.
5. Apri una pull request con:
   - descrizione del problema
   - riepilogo della soluzione
   - test eseguiti
   - screenshot o note UI se tocchi l'app Android

## Check prima della pull request

### Backend

```bash
cd backend
npm run check
```

### Android

```bash
./gradlew assembleDebug
```

Su Windows:

```powershell
.\gradlew.bat assembleDebug
```

## Regole sui segreti

Non committare mai:

- file `.env`
- wallet reali
- seed phrase
- chiavi private
- service account Firebase
- token API
- credenziali RPC

Usa `.env.example` per documentare le variabili necessarie lasciando i valori vuoti o placeholder.

## Stile codice

- Preferisci nomi chiari e funzioni piccole.
- Mantieni la UI Android semplice e verificabile.
- Per il backend, gestisci errori e stati in modo esplicito.
- Non mettere log con dati sensibili.

## Pagamenti

Le funzioni di pagamento Monero devono rimanere server-side. L'app Android può ricevere indirizzo, URI, importo e stato, ma non deve contenere segreti o wallet sensibili.

## Segnalare problemi

Quando segnali un bug, includi:

- versione dell'app/backend
- dispositivo o ambiente
- passi per riprodurre
- risultato atteso
- risultato ottenuto
- eventuali log rilevanti senza dati sensibili
