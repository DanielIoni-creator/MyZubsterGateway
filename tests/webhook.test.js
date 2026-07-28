const { WebhookService } = require('../services/webhook.service');

class MemoryRecord {
  constructor(data = {}) {
    Object.assign(this, data);
    this.saved = 0;
  }

  async save() {
    this.saved += 1;
    return this;
  }
}

describe('WebhookService', () => {
  test('signPayload creates deterministic sha256 HMAC signatures', () => {
    const service = new WebhookService({ webhookModel: class {}, deliveryModel: class {}, httpClient: {} });
    const payload = { event: 'order.paid', orderId: '123' };

    expect(service.signPayload('secret', payload)).toBe(service.signPayload('secret', payload));
    expect(service.signPayload('secret', payload)).not.toBe(service.signPayload('other-secret', payload));
    expect(service.buildHeaders({ secret: 'secret' }, 'order.paid', payload)).toMatchObject({
      'Content-Type': 'application/json',
      'X-MyZubster-Event': 'order.paid'
    });
    expect(service.buildHeaders({ secret: 'secret' }, 'order.paid', payload)['X-MyZubster-Signature']).toMatch(/^sha256=/);
  });

  test('triggerEvent creates signed deliveries for matching active webhooks', async () => {
    const webhook = new MemoryRecord({
      _id: 'webhook-1',
      url: 'https://example.com/webhook',
      events: ['order.paid'],
      secret: 'secret',
      maxRetries: 0,
      timeoutMs: 1000
    });
    const Webhook = {
      find: jest.fn().mockResolvedValue([webhook])
    };
    class Delivery extends MemoryRecord {}
    const httpClient = {
      post: jest.fn().mockResolvedValue({ status: 204, data: '' })
    };
    const service = new WebhookService({ webhookModel: Webhook, deliveryModel: Delivery, httpClient });

    const [delivery] = await service.triggerEvent('order.paid', { orderId: '123' });

    expect(Webhook.find).toHaveBeenCalledWith({ active: true, events: 'order.paid' });
    expect(httpClient.post).toHaveBeenCalledWith(
      'https://example.com/webhook',
      { orderId: '123' },
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-MyZubster-Event': 'order.paid',
          'X-MyZubster-Signature': expect.stringMatching(/^sha256=/)
        }),
        timeout: 1000
      })
    );
    expect(delivery.status).toBe('success');
    expect(delivery.responseStatus).toBe(204);
    expect(webhook.lastDeliveryStatus).toBe('success');
  });

  test('deliver retries with exponential backoff and records final failure', async () => {
    const webhook = new MemoryRecord({
      _id: 'webhook-1',
      url: 'https://example.com/webhook',
      secret: 'secret',
      maxRetries: 2,
      timeoutMs: 1000
    });
    const delivery = new MemoryRecord({
      webhook: webhook._id,
      event: 'order.cancelled',
      payload: { orderId: '123' }
    });
    const httpClient = {
      post: jest.fn().mockRejectedValue(new Error('network down'))
    };
    const service = new WebhookService({ webhookModel: {}, deliveryModel: class {}, httpClient });

    const result = await service.deliver(webhook, delivery);

    expect(httpClient.post).toHaveBeenCalledTimes(3);
    expect(result.status).toBe('failed');
    expect(result.attempts).toBe(3);
    expect(result.error).toBe('network down');
    expect(webhook.lastDeliveryStatus).toBe('failed');
  });
});
