const test = require('node:test');
const assert = require('node:assert/strict');

const { createXmrWallet } = require('../gateway/xmr_wallet');

function rpcClient(responses) {
  const calls = [];
  return {
    calls,
    async post(url, body) {
      calls.push({ url, body });
      const response = responses.shift();
      if (response instanceof Error) {
        throw response;
      }
      return { data: response };
    },
  };
}

test('creates a wallet-rpc subaddress for an escrow lock', async () => {
  const client = rpcClient([{ result: { address: '86ESCROW', address_index: 7 } }]);
  const wallet = createXmrWallet({ client, env: { XMR_WALLET_URL: 'http://wallet:18083' } });

  assert.equal(await wallet.lockXMR('client-1', 0.25), '86ESCROW');
  assert.deepEqual(client.calls[0], {
    url: 'http://wallet:18083/json_rpc',
    body: {
      jsonrpc: '2.0',
      id: 'myz-gateway',
      method: 'create_address',
      params: { account_index: 0, label: 'escrow:client-1' },
    },
  });
});

test('keeps FCMP++ transfers pending until their confirmation target', async () => {
  const txid = 'a'.repeat(64);
  const client = rpcClient([{ result: { transfer: {
    txid,
    type: 'in',
    protocol: 'fcmp++',
    amount: 250000000000,
    confirmations: 12,
  } } }]);
  const wallet = createXmrWallet({
    client,
    env: { XMR_FCMP_REQUIRED_CONFIRMATIONS: '20' },
  });

  const status = await wallet.getTransferStatus(txid, 0.25);
  assert.deepEqual(status, {
    status: 'pending',
    txHash: txid,
    confirmations: 12,
    amount: 0.25,
    inPool: false,
    unlockTime: 0,
    protocol: 'fcmp++',
    isFcmpPlusPlus: true,
    requiredConfirmations: 20,
    reason: 'insufficient_confirmations',
  });
});

test('confirms a RingCT transfer at the configured target', async () => {
  const txid = 'b'.repeat(64);
  const client = rpcClient([{ result: { transfer: {
    txid,
    type: 'in',
    amount: 100000000000,
    confirmations: 4,
  } } }]);
  const wallet = createXmrWallet({ client, env: { XMR_REQUIRED_CONFIRMATIONS: '4' } });

  const status = await wallet.getTransferStatus(txid, 0.1);
  assert.equal(status.status, 'confirmed');
  assert.equal(status.protocol, 'ringct');
});

test('does not confirm pool, underpaid, or double-spend transfers', async (t) => {
  const cases = [
    [{ type: 'pool', in_pool: true, amount: 100000000000 }, 'pending', 'in_pool'],
    [{ type: 'in', confirmations: 20, amount: 50000000000 }, 'pending', 'underpaid'],
    [{ type: 'failed', double_spend_seen: true, amount: 100000000000 }, 'failed', 'double_spend_seen'],
  ];
  for (const [transfer, expectedStatus, expectedReason] of cases) {
    await t.test(expectedReason, async () => {
      const txid = 'c'.repeat(64);
      const client = rpcClient([{ result: { transfer: { txid, ...transfer } } }]);
      const wallet = createXmrWallet({ client, env: {} });
      const status = await wallet.getTransferStatus(txid, 0.1);
      assert.equal(status.status, expectedStatus);
      assert.equal(status.reason, expectedReason);
    });
  }
});

test('monitors a lock by subaddress and detects FCMP++ metadata', async () => {
  const client = rpcClient([
    { result: { address: '86LOCK', address_index: 3 } },
    { result: { in: [{
      address: '86LOCK',
      txid: 'd'.repeat(64),
      proof_type: 'fcmp++',
      amount: 300000000000,
      confirmations: 10,
    }] } },
  ]);
  const wallet = createXmrWallet({ client, env: {} });
  await wallet.lockXMR('client-2', 0.3);

  const status = await wallet.getLockStatus('client-2');
  assert.equal(status.status, 'confirmed');
  assert.equal(status.protocol, 'fcmp++');
});

test('release and refund submit atomic-unit transfers', async () => {
  const client = rpcClient([
    { result: { tx_hash: 'release-tx' } },
    { result: { tx_hash_list: ['refund-tx'] } },
  ]);
  const wallet = createXmrWallet({ client, env: {} });

  assert.equal(await wallet.releaseXMR('48ROBOT', 0.02), 'release-tx');
  assert.equal(await wallet.refundXMR('48CLIENT', 0.01), 'refund-tx');
  assert.equal(client.calls[0].body.params.destinations[0].amount, 20000000000);
  assert.equal(client.calls[1].body.params.destinations[0].amount, 10000000000);
});

test('reports FCMP++ wallet capability configuration', async () => {
  const client = rpcClient([
    { result: { version: 196621 } },
    { result: { height: 3210000 } },
  ]);
  const wallet = createXmrWallet({
    client,
    env: { XMR_FCMP_PLUS_PLUS_ENABLED: 'true', XMR_FCMP_REQUIRED_CONFIRMATIONS: '15' },
  });

  assert.deepEqual(await wallet.getWalletCapabilities(), {
    version: 196621,
    height: 3210000,
    fcmpPlusPlusConfigured: true,
    supportedProtocols: ['ringct', 'fcmp++'],
    requiredConfirmations: 10,
    fcmpRequiredConfirmations: 15,
  });
});

test('wraps wallet-rpc failures with operation context', async () => {
  const client = rpcClient([new Error('connection refused')]);
  const wallet = createXmrWallet({ client, env: {} });

  await assert.rejects(
    wallet.lockXMR('client-3', 0.1),
    /Monero wallet RPC create_address failed: connection refused/
  );
});
