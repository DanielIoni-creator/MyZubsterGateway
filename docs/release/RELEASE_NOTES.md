# MyZubster v1.0.0-beta - Release Notes

**Data release:** 2026-06-29  
**Versione Android:** `versionName 0.2.0`, `versionCode 2`  
**Release GitHub:** `v1.0.0-beta`  
**Branch:** `test/reviews-apk`

## Novità principali

- Home dell'app aggiornata con accesso rapido a ricerca, profilo, pubblicazione, pagamento, chat e impostazioni.
- Nuova schermata **Crea profilo** con salvataggio locale di nome/nickname, zona, bio, competenze e wallet Monero opzionale.
- Prezzi delle competenze/servizi mostrati in **euro (€)**.
- Banner sponsor cliccabili per **Mullvad VPN** e **SimpleSwap.io**.
- Backend aggiornato con commissione piattaforma configurabile tramite `PAYMENT_PLATFORM_FEE_RATE`.
- Supporto a wallet piattaforma tramite `PLATFORM_FEE_WALLET_ADDRESS` configurato solo lato server.
- Documentazione root aggiunta con installazione backend/app Android e guida contributi.
- `.gitignore` aggiornato per build, ambiente, log, file temporanei e file Android Studio.

## Pagamenti Monero

- Il backend crea pagamenti Monero con indirizzi one-shot.
- La fee piattaforma predefinita è `2%` (`PAYMENT_PLATFORM_FEE_RATE=0.02`).
- Il wallet del creatore/piattaforma va configurato nel `.env` backend con `PLATFORM_FEE_WALLET_ADDRESS`.
- Nessun wallet reale o segreto deve essere inserito nell'APK Android.

## APK

Asset APK pubblicato nella GitHub Release:

```text
myzubster-reviews-test-debug.apk
```

Link download:

```text
https://github.com/h4x0rmyzubster/MyZubsterh4x0r/releases/download/v1.0.0-beta/myzubster-reviews-test-debug.apk
```

Pagina release:

```text
https://github.com/h4x0rmyzubster/MyZubsterh4x0r/releases/tag/v1.0.0-beta
```

## Verifiche release

Comandi da eseguire prima della pubblicazione finale:

```bash
cd backend
npm run check
```

```powershell
.\gradlew.bat assembleDebug
```

## Note

Questa release è pubblicata come prerelease/beta su GitHub con APK allegato.
