const { PgpService } = require('../services/pgp.service');

describe('PgpService', () => {
  test('generates RSA keys and round-trips encrypted order data', async () => {
    const service = new PgpService({ encryptedOrderModel: {} });
    const { publicKey, privateKey } = await service.generateKeyPair({
      name: 'Tester',
      email: 'tester@example.com'
    });

    expect(publicKey).toContain('BEGIN PGP PUBLIC KEY BLOCK');
    expect(privateKey).toContain('BEGIN PGP PRIVATE KEY BLOCK');

    const data = {
      email: 'customer@example.com',
      shippingAddress: { street: '1 Privacy Way' },
      paymentDetails: { txHash: 'abc123' }
    };

    const encrypted = await service.encryptData(data, publicKey);
    expect(encrypted).toContain('BEGIN PGP MESSAGE');

    const decrypted = await service.decryptData(encrypted, privateKey);
    expect(decrypted).toEqual(data);
  });

  test('encryptOrder stores encrypted payload and key fingerprint', async () => {
    const stored = [];
    const EncryptedOrder = {
      findOneAndUpdate: jest.fn(async (query, update) => {
        stored.push({ query, update });
        return { ...update, _id: 'encrypted-1' };
      })
    };
    const service = new PgpService({ encryptedOrderModel: EncryptedOrder });
    const { publicKey } = await service.generateKeyPair();

    const encryptedOrder = await service.encryptOrder({
      _id: 'order-1',
      email: 'customer@example.com',
      shippingAddress: { city: 'Singapore' },
      paymentDetails: { moneroAddress: '4abc' },
      total: 100
    }, publicKey);

    expect(EncryptedOrder.findOneAndUpdate).toHaveBeenCalledWith(
      { order: 'order-1', payloadType: 'order.sensitive' },
      expect.objectContaining({
        order: 'order-1',
        payloadType: 'order.sensitive',
        encryptedData: expect.stringContaining('BEGIN PGP MESSAGE'),
        keyFingerprint: expect.any(String),
        algorithm: 'openpgp-rsa4096'
      }),
      { new: true, upsert: true, runValidators: true }
    );
    expect(encryptedOrder.encryptedData).toContain('BEGIN PGP MESSAGE');
    expect(stored[0].update.keyFingerprint).toHaveLength(64);
  });
});
