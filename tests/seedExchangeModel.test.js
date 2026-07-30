const mongoose = require('mongoose');
const SeedExchange = require('../models/SeedExchange');

describe('SeedExchange model', () => {
  const userId = new mongoose.Types.ObjectId();

  it.each(['seeds', 'cuttings', 'seedlings', 'bulbs'])(
    'accepts the canonical %s material type without requiring a location',
    (type) => {
      const listing = new SeedExchange({
        userId,
        plantName: 'Tomato',
        variety: 'San Marzano',
        type,
        quantity: 10,
        availability: 'immediate',
        exchangeType: 'free',
      });

      expect(listing.validateSync()).toBeUndefined();
      expect(listing.location).toBe('');
    }
  );

  it('rejects non-positive, fractional, boolean, and structured quantities', () => {
    for (const quantity of [0, -1, 1.5, true, { value: 1 }, [1]]) {
      const listing = new SeedExchange({
        userId,
        plantName: 'Basil',
        type: 'seeds',
        quantity,
      });

      expect(listing.validateSync().errors.quantity).toBeDefined();
    }
  });

  it('rejects unsupported availability and exchange modes', () => {
    const listing = new SeedExchange({
      userId,
      plantName: 'Rosemary',
      type: 'cuttings',
      quantity: 2,
      availability: 'later',
      exchangeType: 'sale',
    });
    const error = listing.validateSync();

    expect(error.errors.availability).toBeDefined();
    expect(error.errors.exchangeType).toBeDefined();
  });
});
