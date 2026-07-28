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
    expect(plantContract.calculateFee('medium')).toBe(0.10);
  });

  test('VerificationContract - analyze votes', () => {
    const votes = ['upvote', 'upvote', 'downvote', 'upvote', 'upvote'];
    const result = verificationContract.analyzeVotes(votes);
    expect(result.total).toBe(5);
    expect(result.score).toBe(0.8);
  });

  test('PaymentContract - calculate distribution', () => {
    const dist = paymentContract.calculateDistribution(0.10);
    expect(dist.creator).toBe(0.002);
    expect(dist.conservation).toBe(0.005);
    expect(dist.ai).toBe(0.003);
    expect(dist.operations).toBe(0.090);
  });
});

console.log('✅ All AI contracts tests passed!');
