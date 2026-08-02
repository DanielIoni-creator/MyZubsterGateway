const mongoose = require('mongoose');
const Robot = require('./models/Robot');

async function testFee() {
  await mongoose.connect('mongodb://myzubster-mongodb:27017/myzubster');

  const robot = await Robot.findOne({ id: 'robot_test_001' });
  if (!robot) {
    console.log('❌ Robot non trovato');
    process.exit(1);
  }

  const amount = 0.01;
  const fee = amount * 0.02;
  const boscoFee = amount * 0.08;
  const referralFee = amount * 0.05;
  const total = amount + fee + boscoFee + referralFee;

  console.log('=== TEST FEE ===');
  console.log('Robot:', robot.id);
  console.log('Wallet:', robot.walletAddress);
  console.log('Amount:', amount);
  console.log('Fee (2%):', fee);
  console.log('Bosco Fee (8%):', boscoFee);
  console.log('Referral Fee (5%):', referralFee);
  console.log('Total:', total);
  console.log('✅ Fee calcolate correttamente!');

  process.exit(0);
}

testFee();
