const mongoose = require('mongoose');

beforeAll(async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/myzubster_test';
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  console.log('✅ Test database connected');
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  console.log('✅ Test database closed');
});

afterEach(async () => {
  const collections = await mongoose.connection.db.collections();
  for (let collection of collections) {
    await collection.deleteMany({});
  }
});