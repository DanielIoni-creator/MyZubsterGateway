// Mock mongoose per evitare connessioni reali
jest.mock('mongoose', () => {
  const mockQuery = {
    exec: jest.fn().mockResolvedValue([]),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis()
  };

  const MockObjectId = jest.fn().mockImplementation(id => id || 'mock-id');

  const MockSchema = jest.fn().mockImplementation(() => ({
    pre: jest.fn().mockReturnThis(),
    post: jest.fn().mockReturnThis(),
    index: jest.fn().mockReturnThis(),
    virtual: jest.fn().mockReturnThis(),
    add: jest.fn().mockReturnThis(),
    path: jest.fn().mockReturnThis(),
    methods: {},
    statics: {}
  }));
  // Static props accessed as mongoose.Schema.Types.Mixed etc.
  MockSchema.Types = {
    Mixed: {},
    ObjectId: MockObjectId,
    String: String,
    Number: Number,
    Boolean: Boolean,
    Date: Date,
    Buffer: Buffer
  };

  const mockModel = jest.fn().mockImplementation(() => ({
    find: jest.fn().mockReturnValue(mockQuery),
    findOne: jest.fn().mockReturnValue(mockQuery),
    findById: jest.fn().mockReturnValue(mockQuery),
    findOneAndUpdate: jest.fn().mockReturnValue(mockQuery),
    findByIdAndUpdate: jest.fn().mockReturnValue(mockQuery),
    findOneAndDelete: jest.fn().mockReturnValue(mockQuery),
    findByIdAndDelete: jest.fn().mockReturnValue(mockQuery),
    save: jest.fn().mockResolvedValue({}),
    deleteOne: jest.fn().mockResolvedValue({}),
    deleteMany: jest.fn().mockResolvedValue({}),
    create: jest.fn().mockResolvedValue({}),
    updateOne: jest.fn().mockResolvedValue({}),
    updateMany: jest.fn().mockResolvedValue({}),
    insertMany: jest.fn().mockResolvedValue([]),
    countDocuments: jest.fn().mockResolvedValue(0),
    aggregate: jest.fn().mockResolvedValue([]),
    populate: jest.fn().mockReturnThis()
  }));

  return {
    connect: jest.fn().mockResolvedValue(true),
    connection: {
      close: jest.fn().mockResolvedValue(true),
      on: jest.fn(),
      once: jest.fn(),
      readyState: 1
    },
    Schema: MockSchema,
    model: mockModel,
    Types: {
      ObjectId: MockObjectId,
      Mixed: {}
    },
    isValidObjectId: jest.fn(() => true),
    startSession: jest.fn().mockResolvedValue({
      startTransaction: jest.fn().mockResolvedValue(true),
      commitTransaction: jest.fn().mockResolvedValue(true),
      abortTransaction: jest.fn().mockResolvedValue(true),
      endSession: jest.fn().mockResolvedValue(true)
    })
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
