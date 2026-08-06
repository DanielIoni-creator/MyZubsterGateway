# AML/CFT transaction monitoring

The AML module screens parties, evaluates transactions as they arrive, emits alerts over server-sent events, and drafts or submits suspicious-transaction reports when the risk threshold is reached.

## Configuration

| Variable | Purpose |
| --- | --- |
| `AML_SCREENING_URL` | Sanctions and PEP screening endpoint |
| `AML_SCREENING_TOKEN` | Screening service bearer token |
| `AML_AUTHORITY_REPORT_URL` | Approved authority-reporting gateway |
| `AML_AUTHORITY_REPORT_TOKEN` | Reporting gateway bearer token |
| `AML_REPORT_THRESHOLD` | Automatic report score, default 70 |
| `AML_LARGE_TRANSFER_THRESHOLD` | Travel-rule and large-value threshold, default 10000 |

Without a reporting URL, reports remain drafts. A draft or simulated submission is not evidence that an authority received a report.

## API

- `POST /api/aml/transactions` screens and evaluates a transaction immediately.
- `GET /api/aml/stream` streams alerts to compliance clients.
- `GET /api/aml/transactions`, `/alerts`, and `/reports` provide monitoring data.
- `POST /api/aml/alerts/:id/resolve` records a compliance-officer decision.

Transactions include `from`, `to`, `amount`, `asset`, `originator`, and `beneficiary`. The default rules detect large transfers, high velocity, structuring, sanctions/PEP matches, and missing travel-rule data. Production deployments should persist records in an encrypted audit store and submit reports only through an approved institutional workflow.

Run the integration suite with `node --test tests/amlMonitoring.test.js`.
