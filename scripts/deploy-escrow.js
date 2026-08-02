const { ethers } = require('hardhat');

async function main() {
  const RobotEscrow = await ethers.getContractFactory('RobotEscrow');
  const escrow = await RobotEscrow.deploy(
    '0xRobotAddress', // robot wallet
    '0xProviderAddress', // provider wallet
    '0xArbiterAddress', // MyZubster AI
    ethers.utils.parseEther('0.05') // amount in XMR
  );
  
  await escrow.deployed();
  console.log('RobotEscrow deployed to:', escrow.address);
}

main().catch(console.error);
