const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const WebSocket = require('ws');

const { RealtimeService, EventBus, ChannelRegistry, defaultAuthorize } = require('../services/realtimeService');

async function startServer(options = {}) {
  const server = http.createServer((_req, res) => res.end('ok'));
  const service = new RealtimeService(options);
  service.attach(server);
  await new Promise((resolve) => server.listen(0, resolve));
  return { server, service, port: server.address().port };
}

async function stopServer({ server, service }) {
  await service.shutdown();
  await new Promise((resolve) => server.close(resolve));
}

function connect(port, query = '') {
  const socket = new WebSocket(`ws://127.0.0.1:${port}/ws${query}`);
  const queue = [];
  const waiters = [];

  socket.on('message', (raw) => {
    const message = JSON.parse(raw.toString());
    const index = waiters.findIndex((waiter) => waiter.match(message));
    if (index >= 0) waiters.splice(index, 1)[0].resolve(message);
    else queue.push(message);
  });

  return {
    socket,
    opened: new Promise((resolve) => socket.on('open', resolve)),
    next(match = () => true, timeoutMs = 2000) {
      const index = queue.findIndex(match);
      if (index >= 0) return Promise.resolve(queue.splice(index, 1)[0]);
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('timed out waiting for a message')), timeoutMs);
        waiters.push({ match, resolve: (message) => { clearTimeout(timer); resolve(message); } });
      });
    },
    seen(match) { return queue.some(match); },
    send(payload) { socket.send(JSON.stringify(payload)); },
    close() { socket.close(); },
  };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 60));

test('greets a new connection with its id', async () => {
  const ctx = await startServer();
  const client = connect(ctx.port, '?userId=alice');
  await client.opened;

  const welcome = await client.next((m) => m.type === 'welcome');
  assert.equal(welcome.userId, 'alice');
  assert.ok(welcome.connectionId);

  client.close();
  await stopServer(ctx);
});

test('accepts own channels and refuses someone else\'s', async () => {
  const ctx = await startServer();
  const client = connect(ctx.port, '?userId=alice');
  await client.opened;
  await client.next((m) => m.type === 'welcome');

  client.send({ action: 'subscribe', channels: ['payments:alice', 'wallet:alice', 'payments:bob', 'public:network', 'nonsense'] });
  const reply = await client.next((m) => m.type === 'subscribed');

  assert.deepEqual(reply.accepted, ['payments:alice', 'wallet:alice', 'public:network']);
  assert.deepEqual(reply.rejected, ['payments:bob', 'nonsense']);

  client.close();
  await stopServer(ctx);
});

test('delivers published events to subscribers only', async () => {
  const ctx = await startServer();
  const alice = connect(ctx.port, '?userId=alice');
  const bob = connect(ctx.port, '?userId=bob');
  await Promise.all([alice.opened, bob.opened]);
  await Promise.all([alice.next((m) => m.type === 'welcome'), bob.next((m) => m.type === 'welcome')]);

  alice.send({ action: 'subscribe', channels: ['payments:alice'] });
  bob.send({ action: 'subscribe', channels: ['payments:bob'] });
  await Promise.all([alice.next((m) => m.type === 'subscribed'), bob.next((m) => m.type === 'subscribed')]);

  const delivered = ctx.service.publish('payments:alice', { status: 'COMPLETED', amount: 12 });
  assert.equal(delivered, 1);

  const event = await alice.next((m) => m.type === 'event');
  assert.equal(event.channel, 'payments:alice');
  assert.equal(event.event.status, 'COMPLETED');

  await settle();
  assert.equal(bob.seen((m) => m.type === 'event'), false);

  alice.close();
  bob.close();
  await stopServer(ctx);
});

test('stops delivering after unsubscribe', async () => {
  const ctx = await startServer();
  const client = connect(ctx.port, '?userId=alice');
  await client.opened;
  await client.next((m) => m.type === 'welcome');

  client.send({ action: 'subscribe', channels: ['wallet:alice'] });
  await client.next((m) => m.type === 'subscribed');
  client.send({ action: 'unsubscribe', channels: ['wallet:alice'] });
  await client.next((m) => m.type === 'unsubscribed');

  ctx.service.publish('wallet:alice', { balance: 1 });
  await settle();
  assert.equal(client.seen((m) => m.type === 'event'), false);

  client.close();
  await stopServer(ctx);
});

test('lists current subscriptions and answers ping', async () => {
  const ctx = await startServer();
  const client = connect(ctx.port, '?userId=alice');
  await client.opened;
  await client.next((m) => m.type === 'welcome');

  client.send({ action: 'subscribe', channels: ['payments:alice', 'public:network'] });
  await client.next((m) => m.type === 'subscribed');

  client.send({ action: 'list' });
  const list = await client.next((m) => m.type === 'subscriptions');
  assert.deepEqual(list.channels.sort(), ['payments:alice', 'public:network']);

  client.send({ action: 'ping' });
  assert.ok((await client.next((m) => m.type === 'pong')).at);

  client.close();
  await stopServer(ctx);
});

test('reports malformed frames and unknown actions', async () => {
  const ctx = await startServer();
  const client = connect(ctx.port, '?userId=alice');
  await client.opened;
  await client.next((m) => m.type === 'welcome');

  client.socket.send('not json');
  assert.match((await client.next((m) => m.type === 'error')).error, /must be JSON/);

  client.send({ action: 'teleport' });
  assert.match((await client.next((m) => m.type === 'error')).error, /unknown action: teleport/);

  client.close();
  await stopServer(ctx);
});

test('an anonymous connection gets public channels only', async () => {
  const ctx = await startServer();
  const client = connect(ctx.port);
  await client.opened;
  await client.next((m) => m.type === 'welcome');

  client.send({ action: 'subscribe', channels: ['public:network', 'payments:alice'] });
  const reply = await client.next((m) => m.type === 'subscribed');
  assert.deepEqual(reply.accepted, ['public:network']);
  assert.deepEqual(reply.rejected, ['payments:alice']);

  client.close();
  await stopServer(ctx);
});

test('stats counts connections and subscribers per channel', async () => {
  const ctx = await startServer();
  const alice = connect(ctx.port, '?userId=alice');
  const bob = connect(ctx.port, '?userId=bob');
  await Promise.all([alice.opened, bob.opened]);
  await Promise.all([alice.next((m) => m.type === 'welcome'), bob.next((m) => m.type === 'welcome')]);

  alice.send({ action: 'subscribe', channels: ['public:network'] });
  bob.send({ action: 'subscribe', channels: ['public:network'] });
  await Promise.all([alice.next((m) => m.type === 'subscribed'), bob.next((m) => m.type === 'subscribed')]);

  const stats = ctx.service.stats();
  assert.equal(stats.connections, 2);
  assert.deepEqual(stats.channels[0], { channel: 'public:network', subscribers: 2 });

  alice.close();
  bob.close();
  await stopServer(ctx);
});

test('shutdown closes live connections', async () => {
  const ctx = await startServer();
  const client = connect(ctx.port, '?userId=alice');
  await client.opened;
  await client.next((m) => m.type === 'welcome');

  const closed = new Promise((resolve) => client.socket.on('close', resolve));
  await stopServer(ctx);
  await closed;
  assert.equal(client.socket.readyState, WebSocket.CLOSED);
});

test('the heartbeat drops a connection that never pongs', () => {
  const service = new RealtimeService();
  const closes = [];
  const connection = { id: 'c1', alive: false, socket: { readyState: 1, OPEN: 1, bufferedAmount: 0, close: (code, reason) => closes.push({ code, reason }), ping: () => {} } };
  service.connections.set('c1', connection);
  service.registry.add('c1', 'public:network');

  service.sweep();

  assert.equal(service.connections.size, 0);
  assert.deepEqual(service.registry.subscribersOf('public:network'), []);
  assert.equal(closes[0].reason, 'heartbeat timeout');
});

test('a connection whose buffer runs away is dropped instead of queued', () => {
  const service = new RealtimeService({ maxBufferedBytes: 10 });
  const closes = [];
  const connection = { id: 'c1', alive: true, socket: { readyState: 1, OPEN: 1, bufferedAmount: 999, close: (code, reason) => closes.push({ code, reason }), send: () => { throw new Error('should not send'); } } };
  service.connections.set('c1', connection);

  assert.equal(service.send(connection, { type: 'event' }), false);
  assert.equal(closes[0].reason, 'client too slow');
});

test('the bus decouples publishers from the socket layer', () => {
  const bus = new EventBus();
  const seen = [];
  const unsubscribe = bus.subscribe((channel, event) => seen.push([channel, event]));

  bus.publish('public:network', { hello: 'world' });
  unsubscribe();
  bus.publish('public:network', { ignored: true });

  assert.deepEqual(seen, [['public:network', { hello: 'world' }]]);
});

test('registry tracks and releases subscriptions', () => {
  const registry = new ChannelRegistry();
  registry.add('c1', 'public:network');
  registry.add('c2', 'public:network');
  registry.add('c1', 'wallet:alice');

  assert.deepEqual(registry.subscribersOf('public:network').sort(), ['c1', 'c2']);
  registry.remove('c1', 'public:network');
  assert.deepEqual(registry.subscribersOf('public:network'), ['c2']);
  registry.drop('c2');
  assert.deepEqual(registry.subscribersOf('public:network'), []);
  assert.equal(registry.size, 1);
});

test('channel authorisation rules', () => {
  assert.equal(defaultAuthorize('public:network', { userId: null }), true);
  assert.equal(defaultAuthorize('payments:alice', { userId: 'alice' }), true);
  assert.equal(defaultAuthorize('payments:alice', { userId: 'bob' }), false);
  assert.equal(defaultAuthorize('payments:alice', { userId: null }), false);
  assert.equal(defaultAuthorize('Payments:alice', { userId: 'alice' }), false);
  assert.equal(defaultAuthorize('missing-colon', { userId: 'alice' }), false);
});
