
---

### 🇪🇸 `README.es.md` (Español)

```markdown
# 🌐 MyZubster – Pasarela de Pago Monero Self-Hosted & Ecosistema Offshore

**MyZubster** es un ecosistema completo y autoalojado para aceptar pagos en Monero (XMR), gestionar un marketplace de habilidades y manejar pedidos – todo sin intermediarios. Diseñado para darte el control total sobre tus fondos, tus datos y tu negocio.

---

## 🎯 ¿Qué Hace Único a MyZubster?

- 🔒 **Realmente Self-Hosted** – Tú posees la infraestructura. Sin cuotas mensuales, sin intermediarios.
- 🌊 **Pasarela Offshore** – Acepta Monero desde cualquier parte, liquida al instante y mantén la privacidad.
- 🧩 **Arquitectura Modular** – Core Gateway, Marketplace y App Móvil funcionan juntos o por separado.
- 💰 **Sistema de Comisiones Integrado** – Gana en cada transacción (establece tu propio porcentaje).
- 📱 **Mobile-First** – App Android incluida para compradores y vendedores.
- 🔓 **100% Open Source** – Audita, bifurca y personaliza según tus necesidades.

---

## 🔥 Cómo Funciona la Pasarela Offshore de Pagos Monero

El corazón de MyZubster es la **pasarela offshore** – un conjunto de servicios que convierten Monero en un método de pago fluido para tu marketplace.

### 1️⃣ Subaddress Únicos por Pedido

Cada pedido recibe su propio subaddress Monero. Esto significa:

- ✅ **Privacidad** – Los clientes envían a una dirección única, no a tu wallet principal.
- ✅ **Rastreo** – Sabes exactamente a qué pedido pertenece un pago.
- ✅ **Cumplimiento** – Sin exponer tu saldo o historial de transacciones.

### 2️⃣ Monitoreo Automático de Pagos

La pasarela escanea pagos entrantes cada 60 segundos usando `get_bulk_payments` de Monero RPC. Sin comprobaciones manuales, sin polling desde el frontend – funciona solo.

- 📡 **Monitoreo Siempre Activo** – Ejecutado en segundo plano con PM2.
- ⚡ **Casi en Tiempo Real** – Los pedidos se actualizan en segundos desde la confirmación.
- 🔐 **Umbral de Confirmaciones** – Tú defines el mínimo (ej. 10 para mainnet).

### 3️⃣ Actualizaciones de Pedidos vía Webhook

Cuando un pago se confirma, la pasarela notifica al marketplace instantáneamente mediante un webhook. Elimina la necesidad de polling constante y mantiene el sistema receptivo.

### 4️⃣ Integración del Tipo de Cambio

La pasarela convierte automáticamente importes en USD a XMR usando tasas de cambio en tiempo real (configurables). Los clientes ven el importe exacto a pagar en Monero.

---

## 🧩 Componentes del Ecosistema

| Componente | Descripción | Stack Tecnológico |
|-----------|-------------|-------------------|
| **Core Gateway** (`MyZubsterAPP`) | RPC, subaddress, monitoreo, webhooks | Node.js, Express, Sequelize |
| **Marketplace** (`MyZubster-Marketplace`) | Habilidades, usuarios, pedidos, comisiones | Node.js, Express, JWT |
| **App Móvil** (`MyZubster-App`) | Cliente Android para compradores/vendedores | React Native, Expo |

---

## 🚀 Guía Rápida

### Prerrequisitos

- Un VPS (DigitalOcean, Hetzner, Contabo) o servidor local
- Monero Wallet RPC (testnet o mainnet)
- Node.js 18+, PostgreSQL (o SQLite para desarrollo)

### Instalación Rápida (Todos los Componentes)

```bash
git clone https://github.com/DanielIoni-creator/MyZubster.git
cd MyZubster

# Core Gateway
cd MyZubsterAPP/backend
npm install
cp .env.example .env
node app.js

# Marketplace (en otra terminal)
cd ../MyZubster-Marketplace
npm install
cp .env.example .env
node server.js
🏗️ Visión General de la Arquitectura
text

                     ┌─────────────────────────────┐
                     │    Monero Wallet RPC         │
                     │   (testnet/mainnet)          │
                     └──────────────┬──────────────┘
                                    │
                                    ▼
                     ┌─────────────────────────────┐
                     │        CORE GATEWAY          │
                     │  - Generación de Subaddress  │
                     │  - Monitoreo de Pagos        │
                     │  - Envío de Webhook          │
                     │  - Autenticación JWT         │
                     └──────────────┬──────────────┘
                                    │
                                    │   Webhook
                                    ▼
                     ┌─────────────────────────────┐
                     │      MARKETPLACE             │
                     │  - Usuarios / Habilidades / Pedidos│
                     │  - JWT Auth                  │
                     │  - Comisiones                │
                     │  - Recepción de Webhook      │
                     └──────────────┬──────────────┘
                                    │
                                    │   REST API
                                    ▼
                     ┌─────────────────────────────┐
                     │     APP MÓVIL (Android)      │
                     │  - Navegar y Comprar         │
                     │  - Dashboard de Pedidos      │
                     └─────────────────────────────┘

💰 Flujo del Pago Offshore (Paso a Paso)

    El comprador crea un pedido – El Marketplace solicita un subaddress al Core Gateway.

    El Gateway genera un subaddress único – Lo devuelve al Marketplace.

    El comprador envía Monero a esa dirección.

    El Gateway monitorea cada 60 segundos.

    Pago detectado – Verifica el importe y las confirmaciones.

    Pedido confirmado – El Gateway envía un webhook al Marketplace.

    El Marketplace actualiza el estado – El comprador ve "completado".

    Los fondos están disponibles – El vendedor puede retirarlos.

🔐 Seguridad y Privacidad

    Sin Datos Centralizados – Todos los datos permanecen en tu servidor.

    Comunicación Cifrada – Los webhooks usan secretos compartidos; todo el tráfico puede ser HTTPS.

    Acceso Basado en Roles – Permisos granulares (usuario, vendedor, admin).

    Privacidad de Transacciones – La privacidad inherente de Monero protege a compradores y vendedores.

🛠️ Personalización

    Establece Tu Comisión – Modifica COMMISSION_PERCENTAGE en el .env del Marketplace.

    Cambia las Confirmaciones – Ajusta MONERO_MIN_CONFIRMATIONS en el .env del Core Gateway.

    Rebranding – Toda la UI es open source – puedes cambiar logos, colores y textos.

    Añadir Nuevas Funcionalidades – La arquitectura modular facilita la extensión.

🤝 Contribuir

¡Las contribuciones son bienvenidas! Correcciones de errores, nuevas funcionalidades o mejoras de documentación:

        Haz un fork del repositorio.

    Crea una rama para la funcionalidad.

    Envía una pull request.

📄 Licencia

MIT License
👨‍💻 El Autor

Daniel Ioni – Desarrollador Full-Stack & Entusiasta Open Source

Soy un desarrollador que cree en la libertad financiera y las soluciones self-hosted. Construí MyZubster para dar a todos la capacidad de aceptar Monero sin intermediarios.

    🌐 Basado en Europa

    💻 Node.js, React, React Native, Android

    🔒 Privacidad primero
🌟 Apoya el Proyecto

    ⭐ Da una estrella a los repositorios.

    🐛 Reporta problemas.

    📝 Escribe tutoriales o posts.

    🧑‍💻 Contribuye con código.

MyZubster – Tu puerta de entrada a pagos sin fronteras, privados y self-hosted.

Hecho con ❤️ para la comunidad Monero
