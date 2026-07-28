/**
 * AI Contracts Test Suite
 */

const {
  PlantRegistrationContract,
  VerificationContract,
  PaymentContract
} = require('./index');

describe('AI Contracts', () => {
  let plantContract, verificationContract, paymentContract;

  beforeEach(() => {
    plantContract = new PlantRegistrationContract();
    verificationContract = new VerificationContract();
    paymentContract = new PaymentContract();
  });

  test('PlantRegistrationContract - calculate fee', () => {
    expect(plantContract.calculateFee('seedling')).toBe(0.01);
    expect(plantContract.calculateFee('small')).toBe(0.05);
    expect(plantContract.calculateFee('medium')).toBe(0.10);
    expect(plantContract.calculateFee('ancient')).toBe(0.50);
    expect(plantContract.calculateFee('unknown')).toBe(0.10);
  });

  test('VerificationContract - analyze votes', () => {
    const votes = ['upvote', 'upvote', 'downvote', 'upvote', 'upvote'];
    const result = verificationContract.analyzeVotes(votes);
    expect(result.total).toBe(5);
    expect(result.positive).toBe(4);
    expect(result.negative).toBe(1);
    expect(result.score).toBe(0.8);
  });

  test('PaymentContract - calculate distribution', () => {
    const dist = paymentContract.calculateDistribution(0.10);
    expect(dist.creator).toBe(0.002);
    // Usa toBeCloseTo per l'arrotondamento
    expect(dist.conservation).toBeCloseTo(0.005, 5);
    expect(dist.ai).toBeCloseTo(0.003, 5);
    expect(dist.operations).toBeCloseTo(0.090, 5);
  });
});

console.log('✅ All AI contracts tests passed!');
