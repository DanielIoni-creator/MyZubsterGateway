# AI Signer Agent — MyZubster Gateway — Bounty #65 (15 XMR)

Autonomous third-party signer for MyZubster 2/3 multisig escrow.

## Features
- Multi-signal risk assessment (AML, reputation, value, history, market, temporal)
- Weighted risk scoring with configurable thresholds
- Webhook handler for order notifications
- HMAC-based deterministic signatures
- Decision audit log (JSON/CSV)
- Event-driven architecture

## Usage
```js
const { AISignerAgent } = require('./ai-signer');
const agent = new AISignerAgent({ secretKey: process.env.SIGNER_SECRET, maxOrderValue: 500 });
const decision = await agent.analyseOrder(order, { userHistory, marketData });
```

## Config
| Option | Default | Description |
|--------|---------|-------------|
| riskThreshold | 0.7 | Max risk (0-1) |
| minConfidence | 0.85 | Min confidence for approval |
| maxOrderValue | Infinity | Max auto-approve value |
| blacklistedAddresses | [] | Always-reject addresses |

## Test
```bash
npm test  # 10 tests
```
