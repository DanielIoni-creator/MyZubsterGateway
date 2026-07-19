

\---



\### 📝 `README.it.md` (Italian – Root)



```markdown

\# 🌐 MyZubster – L'Ecosistema Open Source per lo Scambio di Servizi



\*\*MyZubster\*\* è più di un semplice gateway di pagamento o un marketplace. È un ecosistema completo, self-hosted per lo scambio di servizi, competenze e valore – basato su Monero, costruito con la privacy e progettato per la libertà.



> \*\*"Possiedi le tue competenze. Possiedi i tuoi pagamenti. Possiedi il tuo futuro."\*\*



\---



\## 📖 La Mia Storia – Perché Ho Costruito Questo



Sono uno sviluppatore che crede nella \*\*libertà finanziaria\*\* e nella \*\*sovranità personale\*\*. Per anni ho visto piattaforme centralizzate trattenere una percentuale da ogni transazione, controllare i dati degli utenti e dettare le regole. Volevo costruire qualcosa di diverso.



Qualcosa che restituisse il potere alle persone.



\*\*MyZubster è quella visione.\*\* È una piattaforma dove chiunque può:

\- Offrire le proprie competenze a un pubblico globale

\- Ricevere pagamenti istantanei in Monero – senza banche, senza confini

\- Mantenere i propri dati privati e sotto il proprio controllo

\- Guadagnare dal proprio marketplace impostando le proprie commissioni



Ho costruito questo perché credo nello \*\*scambio peer‑to‑peer\*\*. Credo che il valore debba fluire liberamente tra le persone, non attraverso intermediari. E credo che l'open source sia l'unico modo per costruire fiducia.



Questo è il mio contributo a un mondo più libero e più privato.



\---



\## 🧩 L'Ecosistema



MyZubster è composto da tre componenti indipendenti ma integrati:

┌─────────────────────────────────────────────────────────────┐

│ ECOSISTEMA MYZUBSTER │

├─────────────────────────────────────────────────────────────┤

│ │

│ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐ │

│ │ Monero │ │ Core │ │ Marketplace │ │

│ │ Wallet │──▶│ Gateway │──▶│ (Competenze, │ │

│ │ RPC │ │ (Node.js) │ │ Utenti, Ordini) │ │

│ └─────────────┘ └─────────────┘ └──────────┬──────────┘ │

│ │ │

│ ▼ │

│ ┌─────────────────────┐ │

│ │ App Mobile │ │

│ │ (Android/React │ │

│ │ Native) │ │

│ └─────────────────────┘ │

└─────────────────────────────────────────────────────────────┘



\---



\## 🚀 Guida Rapida



```bash

git clone https://github.com/DanielIoni-creator/MyZubster.git

cd MyZubster

git submodule update --init --recursive



\# Avvia il Gateway

cd gateway

npm install

cp .env.example .env

node app.js



\# Avvia il Marketplace

cd ../marketplace

npm install

cp .env.example .env

node server.js



\# Avvia l'App

cd ../app

npm install

npx expo start

📄 Licenza



MIT License

👨‍💻 L'Autore



Daniel Ioni – Sviluppatore Autodidatta \& Monero Advocate



Sono uno sviluppatore italiano di 38 anni, basato a Rimini, con una profonda passione per la privacy, la libertà finanziaria e la tecnologia open source.



Il mio viaggio è iniziato con il mining di Bitcoin e si è evoluto in un coinvolgimento profondo con la comunità Monero. Ho fondato "Monero Italia" su Facebook, un gruppo dedicato a diffondere la consapevolezza sulle criptovalute incentrate sulla privacy in Italia.



Oltre al codice, amo gli animali – ho una piccola compagna di nome Chanel che mi tiene compagnia durante le sessioni di programmazione notturne. 🐱



La mia visione per MyZubster è creare un ecosistema libero, aperto e accessibile dove chiunque possa scambiare servizi e competenze senza intermediari. L'unica regola? Usalo per il bene. Niente attività illegali.



&#x20;   🌐 Basato a Rimini, Italia



&#x20;   💻 Sviluppatore Full‑Stack Autodidatta



&#x20;   🔒 Monero Advocate \& Appassionato di Privacy



&#x20;   📱 Fondatore di "Monero Italia" (gruppo Facebook)



&#x20;   🐱 Papà di Chanel



Realizzato con ❤️ per la community Monero.

Follow the development of MyZubster and connect with me on social media:

- 📖 **Blog & Articles**: [DEV.to - Daniel Ioni](https://dev.to/danielioni)
- 🐦 **X (Twitter)**: [@myzubster](https://x.com/myzubster)
- 💼 **LinkedIn**: [Daniel Ioni](https://www.linkedin.com/in/daniel-ioni-62b2b9423/)
- 🐙 **GitHub**: [DanielIoni-creator](https://github.com/DanielIoni-creator)
- 🎵 **TikTok**: [@h4x0r_23](https://www.tiktok.com/@h4x0r_23)


**Stay updated on the journey!** 🚀



