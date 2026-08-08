# Escrow Dashboard

Dashboard completa per la gestione degli escrow nel MyZubster Gateway.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/escrow` | Lista escrow con filtri (status, buyer, seller, paginazione) |
| GET | `/escrow/stats` | Statistiche dashboard (totali, per status, volume) |
| GET | `/escrow/report` | Report escrow con periodo personalizzabile |
| GET | `/escrow/:id` | Dettaglio escrow con buyer/seller popolati |
| POST | `/escrow/:id/release` | Rilascia fondi al seller |
| POST | `/escrow/:id/refund` | Rimborsa fondi al buyer |
| POST | `/escrow/:id/dispute` | Apri disputa con motivo |
| GET | `/escrow/:id/timeline` | Timeline eventi escrow |

## Filtri

- `status`: pending, active, completed, refunded, disputed
- `buyer`: ID buyer
- `seller`: ID seller
- `page`, `limit`: Paginazione

## Report

- `from`, `to`: Date ISO per periodo
- `format`: json (default)

## Azioni

1. **Release**: Solo il buyer può rilasciare fondi (escrow attivo)
2. **Refund**: Buyer o seller possono richiedere rimborso
3. **Dispute**: Apre disputa con motivo, blocca i fondi

## Sicurezza

- Solo partecipanti autorizzati possono agire sull'escrow
- Validazione stato prima di ogni azione
- Log immutabile della timeline
