const hre = require("hardhat");

async function main() {
    console.log("=========================================");
    console.log("  DEPLOY CONTRATTI MyZubster");
    console.log("=========================================");

    const [deployer] = await hre.ethers.getSigners();
    console.log(`👤 Deployer: ${deployer.address}`);
    console.log(`💰 Balance: ${hre.ethers.utils.formatEther(await deployer.getBalance())} ETH\n`);

    // 1. DEPLOY GOVERNANCE TOKEN
    console.log("📦 Deploying Governance Token...");
    const GovernanceToken = await hre.ethers.getContractFactory("GovernanceToken");
    const token = await GovernanceToken.deploy("MyZubster Governance", "MZG", 1000000);
    await token.deployed();
    console.log(`✅ Governance Token: ${token.address}`);

    // 2. DEPLOY FEE MANAGER
    console.log("📦 Deploying FeeManager...");
    const FeeManager = await hre.ethers.getContractFactory("FeeManager");
    const feeManager = await FeeManager.deploy(token.address);
    await feeManager.deployed();
    console.log(`✅ FeeManager: ${feeManager.address}\n`);

    // 3. CONFIGURAZIONE INIZIALE
    console.log("⚙️  Configurazione iniziale...");
    await feeManager.createProposal(
        "Initial fee configuration: 2% variable rate",
        100,
        200
    );
    console.log("   ✅ Proposta iniziale creata\n");

    console.log("=========================================");
    console.log("  ✅ DEPLOY COMPLETATO!");
    console.log("=========================================");
    console.log(`📊 FeeManager: ${feeManager.address}`);
    console.log(`🎯 Governance Token: ${token.address}`);
    console.log("=========================================");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Errore:", error);
        process.exit(1);
    });