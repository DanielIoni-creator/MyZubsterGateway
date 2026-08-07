# Realtime API (WebSocket)

Push events to clients as they happen, instead of making them poll. Connect to `ws://<host>/ws`, subscribe to channels, receive events.

## Connecting

```
ws://localhost:3000/ws?userId=alice
```

The connection replies immediately with a welcome frame:

```json
{ "type": "welcome", "connectionId": "8f3c…", "userId": "alice", "at": "2026-08-07T10:00:00.000Z" }
```

An anonymous connection (no `userId`) is allowed, but it can only reach `public:` channels.

## Channels

Channels are named `<namespace>:<scope>` — for example `payments:alice`, `wallet:alice`, `public:network`.

`public:*` is readable by anyone. Every other channel is scoped to its owner: subscribing to another user's channel is **refused**, not silently accepted and then never delivered. A client that mistypes its own id finds out immediately rather than sitting in silence wondering why nothing arrives.

## Client messages

| Action | Payload | Reply |
| --- | --- | --- |
| `subscribe` | `{ "action": "subscribe", "channels": ["payments:alice"] }` | `{ "type": "subscribed", "accepted": [...], "rejected": [...] }` |
| `unsubscribe` | `{ "action": "unsubscribe", "channels": [...] }` | `{ "type": "unsubscribed", "channels": [...] }` |
| `list` | `{ "action": "list" }` | `{ "type": "subscriptions", "channels": [...] }` |
| `ping` | `{ "action": "ping" }` | `{ "type": "pong", "at": "…" }` |

Subscribe returns `accepted` and `rejected` separately, so a partly-authorised batch tells you exactly which channels went through.

Malformed JSON or an unknown action returns `{ "type": "error", "error": "…" }` rather than dropping the connection.

## Events

```json
{
  "type": "event",
  "channel": "payments:alice",
  "event": { "status": "COMPLETED", "paymentId": "…", "amount": 12 },
  "at": "2026-08-07T10:00:01.000Z"
}
```

## Publishing (server side)

Services publish through an in-process bus and never touch a socket:

```js
const { realtime } = require('./services/realtimeService');
realtime.publish(`payments:${payment.userId}`, { status: payment.status, paymentId: payment.id });
```

Keeping the transport behind the bus means the same events can later feed SSE, a queue, or an outbound webhook without changing a single publisher.

- `GET /api/realtime/stats` — live connection count and subscribers per channel.
- `POST /api/realtime/publish` — `{ "channel": "...", "event": {...} }`, for operators and integration tests.

## Connection health

The server pings every 30s and drops any connection that fails to pong before the next sweep, so half-open sockets do not accumulate.

Each connection has its own send buffer. If a client stops reading and its buffer passes 1 MB, that connection is closed with code `1013` — one stalled reader must never stall the others.

Clients should reconnect with exponential backoff and jitter, then re-subscribe, treating any gap as "refetch current state over HTTP, then resume streaming". Events are **not** replayed after a disconnect; the REST endpoints remain the source of truth.

## Browser example

```html
<script>
  const ws = new WebSocket('ws://localhost:3000/ws?userId=alice');
  ws.onopen = () => ws.send(JSON.stringify({ action: 'subscribe', channels: ['payments:alice'] }));
  ws.onmessage = (frame) => {
    const message = JSON.parse(frame.data);
    if (message.type === 'event') console.log(message.channel, message.event);
  };
  ws.onclose = () => setTimeout(connectAgain, 1000 + Math.random() * 1000);
</script>
```

## Tests

```
node --test tests/realtime.test.js
```

14 passing — handshake, channel authorisation, delivery to subscribers only, isolation between users, unsubscribe, malformed frames, stats, heartbeat eviction, slow-client eviction, bus decoupling, and clean shutdown. The transport tests run a real server on an ephemeral port.
