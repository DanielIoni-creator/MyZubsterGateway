
---

### 🇫🇷 `README.fr.md` (Français)

```markdown
# 🌐 MyZubster – Passerelle de Paiement Monero Self-Hosted & Écosystème Offshore

**MyZubster** est un écosystème complet et auto‑hébergé pour accepter les paiements en Monero (XMR), gérer un marché de compétences et traiter des commandes – le tout sans intermédiaires. Conçu pour vous donner le contrôle total sur vos fonds, vos données et votre entreprise.

---

## 🎯 Ce Qui Rend MyZubster Unique

- 🔒 **Vraiment Self-Hosted** – Vous possédez l'infrastructure. Pas de frais mensuels, pas d'intermédiaires.
- 🌊 **Passerelle Offshore** – Acceptez Monero de n'importe où, réglez instantanément et gardez votre vie privée.
- 🧩 **Architecture Modulaire** – Core Gateway, Marketplace et App Mobile fonctionnent ensemble ou séparément.
- 💰 **Système de Commission Intégré** – Gagnez sur chaque transaction (définissez votre propre taux).
- 📱 **Mobile-First** – Application Android incluse pour acheteurs et vendeurs.
- 🔓 **100% Open Source** – Auditez, forkez et personnalisez selon vos besoins.

---

## 🔥 Comment Fonctionne la Passerelle Offshore de Paiement Monero

Le cœur de MyZubster est la **passerelle offshore** – un ensemble de services qui transforment Monero en un moyen de paiement fluide pour votre marketplace.

### 1️⃣ Subaddress Uniques par Commande

Chaque commande reçoit son propre subaddress Monero. Cela signifie :

- ✅ **Confidentialité** – Les clients envoient à une adresse unique, pas à votre portefeuille principal.
- ✅ **Traçabilité** – Vous savez exactement à quelle commande appartient un paiement.
- ✅ **Conformité** – Pas d'exposition de votre solde ou de votre historique de transactions.

### 2️⃣ Surveillance Automatique des Paiements

La passerelle analyse les paiements entrants toutes les 60 secondes via `get_bulk_payments` de Monero RPC. Pas de vérification manuelle, pas de polling depuis le frontend – ça fonctionne tout seul.

- 📡 **Surveillance Permanente** – Exécutée en arrière-plan via PM2.
- ⚡ **Presque en Temps Réel** – Les commandes sont mises à jour en quelques secondes après la confirmation.
- 🔐 **Seuil de Confirmations** – Vous définissez le nombre minimum de confirmations (ex. 10 pour mainnet).

### 3️⃣ Mises à Jour des Commandes via Webhook

Lorsqu'un paiement est confirmé, la passerelle notifie instantanément votre marketplace via un webhook. Cela élimine le besoin de polling constant et rend le système réactif.

### 4️⃣ Intégration du Taux de Change

La passerelle convertit automatiquement les montants en USD en XMR en utilisant des taux de change en temps réel (configurables). Les clients voient le montant exact à payer en Monero.

---

## 🧩 Composants de l'Écosystème

| Composant | Description | Stack Technologique |
|-----------|-------------|---------------------|
| **Core Gateway** (`MyZubsterAPP`) | RPC, subaddress, surveillance, webhooks | Node.js, Express, Sequelize |
| **Marketplace** (`MyZubster-Marketplace`) | Compétences, utilisateurs, commandes, commissions | Node.js, Express, JWT |
| **App Mobile** (`MyZubster-App`) | Client Android pour acheteurs/vendeurs | React Native, Expo |

---

## 🚀 Guide de Démarrage Rapide

### Prérequis

- Un VPS (DigitalOcean, Hetzner, Contabo) ou un serveur local
- Monero Wallet RPC (testnet ou mainnet)
- Node.js 18+, PostgreSQL (ou SQLite pour le développement)

### Installation Rapide (Tous les Composants)

```bash
git clone https://github.com/DanielIoni-creator/MyZubster.git
cd MyZubster

# Core Gateway
cd MyZubsterAPP/backend
npm install
cp .env.example .env
node app.js

# Marketplace (dans un autre terminal)
cd ../MyZubster-Marketplace
npm install
cp .env.example .env
node server.js
🏗️ Aperçu de l'Architecture
text

                     ┌─────────────────────────────┐
                     │    Monero Wallet RPC         │
                     │   (testnet/mainnet)          │
                     └──────────────┬──────────────┘
                                    │
                                    ▼
                     ┌─────────────────────────────┐
                     │        CORE GATEWAY          │
                     │  - Génération de Subaddress  │
                     │  - Surveillance des Paiements│
                     │  - Envoi de Webhook          │
                     │  - Authentification JWT      │
                     └──────────────┬──────────────┘
                                    │
                                    │   Webhook
                                    ▼
                     ┌─────────────────────────────┐
                     │      MARKETPLACE             │
                     │  - Utilisateurs / Compétences / Commandes│
                     │  - JWT Auth                  │
                     │  - Commissions               │
                     │  - Réception de Webhook      │
                     └──────────────┬──────────────┘
                                    │
                                    │   REST API
                                    ▼
                     ┌─────────────────────────────┐
                     │     APP MOBILE (Android)     │
                     │  - Naviguer et Acheter       │
                     │  - Tableau de Bord des Commandes│
                     └─────────────────────────────┘

💰 Flux du Paiement Offshore (Étape par Étape)

    L'acheteur crée une commande – Le Marketplace demande un subaddress au Core Gateway.

    Le Gateway génère un subaddress unique – Le renvoie au Marketplace.

    L'acheteur envoie Monero à cette adresse.

    Le Gateway surveille toutes les 60 secondes.

    Paiement détecté – Vérifie le montant et les confirmations.

    Commande confirmée – Le Gateway envoie un webhook au Marketplace.

    Le Marketplace met à jour le statut – L'acheteur voit "terminé".

    Les fonds sont disponibles – Le vendeur peut les retirer.
🔐 Sécurité et Confidentialité

    Pas de Données Centralisées – Toutes les données restent sur votre serveur.

    Communication Chiffrée – Les webhooks utilisent des secrets partagés ; tout le trafic peut être en HTTPS.

    Accès Basé sur les Rôles – Permissions granulaires (utilisateur, vendeur, admin).

    Confidentialité des Transactions – La confidentialité inhérente de Monero protège acheteurs et vendeurs.

🛠️ Personnalisation

    Définissez Votre Commission – Modifiez COMMISSION_PERCENTAGE dans le .env du Marketplace.

    Changez les Confirmations – Ajustez MONERO_MIN_CONFIRMATIONS dans le .env du Core Gateway.

    Rebranding – Toute l'UI est open source – vous pouvez changer les logos, couleurs et textes.

    Ajouter de Nouvelles Fonctionnalités – L'architecture modulaire facilite l'extension.

🤝 Contribuer

Les contributions sont les bienvenues ! Corrections de bugs, nouvelles fonctionnalités ou améliorations de la documentation :

    Forkez le dépôt.

    Créez une branche pour la fonctionnalité.

    Soumettez une pull request.
📄 Licence

MIT License
👨‍💻 L'Auteur

Daniel Ioni – Développeur Full-Stack & Passionné Open Source

Je suis un développeur qui croit en la liberté financière et les solutions auto‑hébergées. J'ai construit MyZubster pour donner à chacun la capacité d'accepter Monero sans intermédiaires.

    🌐 Basé en Europe

    💻 Node.js, React, React Native, Android

    🔒 Confidentialité d'abord
🌟 Soutenir le Projet

    ⭐ Mettez une étoile aux dépôts.

    🐛 Signalez des problèmes.

    📝 Écrivez des tutoriels ou des articles.

    🧑‍💻 Contribuez au code.

MyZubster – Votre passerelle vers des paiements sans frontières, privés et auto‑hébergés.

Réalisé avec ❤️ pour la communauté Monero.
