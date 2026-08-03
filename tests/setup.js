// Mock mongoose per evitare connessioni reali
jest.mock('mongoose', () => {
  const mockQuery = {
    exec: jest.fn().mockResolvedValue([]),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis()
  };

  return {
    connect: jest.fn().mockResolvedValue(true),
    connection: {
      close: jest.fn().mockResolvedValue(true),
      on: jest.fn(),
      once: jest.fn()
    },
    Schema: jest.fn().mockImplementation(() => ({
      pre: jest.fn().mockReturnThis(),
      post: jest.fn().mockReturnThis(),
      index: jest.fn().mockReturnThis(),
      virtual: jest.fn().mockReturnThis(),
      Types: {
        ObjectId: jest.fn().mockImplementation(id => id || 'mock-id')
      }
    })),
    model: jest.fn().mockImplementation(() => ({
      find: jest.fn().mockReturnValue(mockQuery),
      findOne: jest.fn().mockReturnValue(mockQuery),
      findById: jest.fn().mockReturnValue(mockQuery),
      save: jest.fn().mockResolvedValue({}),
      deleteOne: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({}),
      updateOne: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({})
    })),
    Types: {
      ObjectId: jest.fn().mockImplementation(id => id || 'mock-id')
    }
  };
});

// Mock per i modelli
jest.mock('../../models/WebhookSubscription', () => ({
  find: jest.fn().mockReturnThis(),
  findOne: jest.fn().mockReturnThis(),
  save: jest.fn().mockResolvedValue({}),
  deleteOne: jest.fn().mockResolvedValue({}),
  deleteMany: jest.fn().mockResolvedValue({})
}));

jest.mock('../../models/WebhookDelivery', () => ({
  find: jest.fn().mockReturnThis(),
  findOne: jest.fn().mockReturnThis(),
  save: jest.fn().mockResolvedValue({}),
  deleteOne: jest.fn().mockResolvedValue({}),
  deleteMany: jest.fn().mockResolvedValue({})
}));
