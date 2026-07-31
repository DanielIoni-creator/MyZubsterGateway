# Garden Arduino Sensor API (issue #144)

Authenticated endpoints for ingesting Arduino garden sensor data and
querying historical statistics. Both routes live under `/api/garden`:

- `POST /api/garden/data` — receive an Arduino sensor reading
- `GET /api/garden/:id/stats` — historical readings + summary statistics

Authentication is JWT (`Authorization: Bearer <token>`), validated by the
shared `middleware/auth.js` filter that protects every route on the
garden router.

## POST /api/garden/data

Body:

```json
{
  "gardenId": "garden-1",
  "ph": 6.2,
  "ec": 1.8,
  "temperature": 22.5,
  "humidity": 65
}
```

Rules:

- `gardenId` — trimmed string, 1–80 characters
- `ph` — number 0–14
- `ec` — non-negative number
- `temperature` — number −50 to 100
- `humidity` — number 0–100

Returns `201` with the persisted reading, or `400` with `{ success: false, errors: [string, ...] }` when validation fails.

Example Arduino sketch (HTTP POST over WiFi):

```cpp
#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "YOUR_SSID";
const char* password = "YOUR_PASS";
const char* jwt = "YOUR_GARDEN_JWT";

void postReading(float ph, float ec, float temperature, float humidity) {
  HTTPClient http;
  http.begin("https://gateway.myzubster.example/api/garden/data");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + jwt);
  String body = String("{") +
    "\"gardenId\":\"garden-1\"," +
    "\"ph\":" + String(ph, 2) + "," +
    "\"ec\":" + String(ec, 2) + "," +
    "\"temperature\":" + String(temperature, 2) + "," +
    "\"humidity\":" + String(humidity, 2) +
    "}";
  int code = http.POST(body);
  http.end();
}
```

## GET /api/garden/:id/stats

Query parameters (all optional):

| Name  | Type | Default | Notes |
| ----- | ---- | ------- | ----- |
| from  | ISO 8601 date | — | inclusive lower bound on `receivedAt` |
| to    | ISO 8601 date | — | inclusive upper bound on `receivedAt` |
| page  | integer ≥ 1 | 1   | pagination |
| limit | integer 1–500 | 100 | capped at 500 |

Response shape:

```json
{
  "success": true,
  "data": {
    "gardenId": "garden-1",
    "pagination": { "page": 1, "limit": 100, "total": 12, "totalPages": 1, "hasMore": false },
    "stats": {
      "count": 12,
      "averages": { "ph": 6.4, "ec": 1.7, "temperature": 22.1, "humidity": 64 },
      "min":     { "ph": 6.0, "ec": 1.4, "temperature": 20.0, "humidity": 60 },
      "max":     { "ph": 7.0, "ec": 2.0, "temperature": 24.0, "humidity": 70 },
      "latest":  { "gardenId": "garden-1", "ph": 6.6, "ec": 1.9, "temperature": 22.5, "humidity": 65, "receivedAt": "2026-07-30T11:35:00.000Z" }
    },
    "readings": [ { "gardenId": "...", "ph": 6.6, "...": "..." } ]
  }
}
```

When the garden has no readings, `stats.count` is 0, `latest` is `null`,
`averages`/`min`/`max` are `null`, and `readings` is `[]`.

Validation errors return `400` with `{ success: false, errors: [...] }`.