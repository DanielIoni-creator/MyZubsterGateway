# MyZubsterGateway API Documentation

## Base URL
\`\`\`
https://your-domain.com/api/v1
\`\`\`

## Authentication
Tutte le richieste richiedono un token JWT nell'header:
\`\`\`
Authorization: Bearer <your-token>
\`\`\`

## Endpoints

### Generate Payment Address
Crea un nuovo indirizzo Monero per un ordine.

**Endpoint:** \`POST /generate-address\`

**Payload:**
\`\`\`json
{
  "order_id": "12345",
  "amount": "0.5",
  "description": "Servizio di consulenza"
}
\`\`\`

**Response:**
\`\`\`json
{
  "address": "4...",
  "payment_id": "...",
  "expected_amount": "0.5"
}
\`\`\`

### Check Payment Status
Verifica lo stato di un pagamento.

**Endpoint:** \`GET /payment-status/{order_id}\`

**Response:**
\`\`\`json
{
  "status": "confirmed",
  "amount_received": "0.5",
  "confirmations": 10
}
\`\`\`
