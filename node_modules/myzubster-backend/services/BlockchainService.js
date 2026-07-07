// backend/services/BlockchainService.js
const { Web3 } = require('web3');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

class BlockchainService {
    constructor() {
        // Usa la sintassi corretta per Web3 v4+
        this.web3 = new Web3(process.env.WEB3_PROVIDER || 'http://localhost:8545');
        
        // Carica l'ABI
        const abiPath = path.join(__dirname, '../abi/FeeManager.json');
        let abi;
        try {
            abi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
        } catch (error) {
            console.warn('⚠️ FeeManager ABI non trovato, uso ABI minima');
            // ABI minima di fallback
            abi = [
                {
                    "inputs": [
                        { "internalType": "uint256", "name": "amount", "type": "uint256" },
                        { "internalType": "uint256", "name": "volume", "type": "uint256" }
                    ],
                    "name": "calculateFee",
                    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [],
                    "name": "currentFee",
                    "outputs": [
                        { "internalType": "uint256", "name": "baseFee", "type": "uint256" },
                        { "internalType": "uint256", "name": "variableRate", "type": "uint256" },
                        { "internalType": "uint256", "name": "discountThreshold", "type": "uint256" },
                        { "internalType": "uint256", "name": "discountRate", "type": "uint256" },
                        { "internalType": "uint256", "name": "timestamp", "type": "uint256" }
                    ],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [
                        { "internalType": "uint256", "name": "totalFee", "type": "uint256" }
                    ],
                    "name": "calculateDistribution",
                    "outputs": [
                        { "internalType": "uint256", "name": "treasuryAmount", "type": "uint256" },
                        { "internalType": "uint256", "name": "stakingAmount", "type": "uint256" },
                        { "internalType": "uint256", "name": "communityAmount", "type": "uint256" }
                    ],
                    "stateMutability": "view",
                    "type": "function"
                }
            ];
        }
        
        // Indirizzo del contratto
        this.contractAddress = process.env.FEE_CONTRACT_ADDRESS;
        
        if (!this.contractAddress) {
            console.warn('⚠️ FEE_CONTRACT_ADDRESS non configurato in .env');
        }
        
        // Crea l'istanza del contratto
        this.contract = new this.web3.eth.Contract(abi, this.contractAddress);
        
        console.log(`✅ BlockchainService inizializzato`);
        console.log(`📊 Contract: ${this.contractAddress}`);
        console.log(`🌐 Provider: ${process.env.WEB3_PROVIDER}`);
    }

    // ─── CALCOLA FEE ───
    async calculateFee(amount, volume = 0) {
        try {
            const fee = await this.contract.methods.calculateFee(amount, volume).call();
            return {
                fee: parseInt(fee),
                feeFormatted: (parseInt(fee) / 100).toFixed(2),
                amount: amount,
                volume: volume
            };
        } catch (error) {
            console.error('Errore calculateFee:', error);
            // Fallback: 2%
            const fallbackFee = Math.floor(amount * 0.02 * 100);
            return {
                fee: fallbackFee,
                feeFormatted: (fallbackFee / 100).toFixed(2),
                amount: amount,
                volume: volume,
                isFallback: true
            };
        }
    }

    // ─── LEGGI CONFIGURAZIONE CORRENTE ───
    async getCurrentFee() {
        try {
            const feeData = await this.contract.methods.currentFee().call();
            return {
                baseFee: parseInt(feeData.baseFee),
                baseFeeFormatted: (parseInt(feeData.baseFee) / 100).toFixed(2),
                variableRate: parseInt(feeData.variableRate),
                variableRateFormatted: (parseInt(feeData.variableRate) / 100).toFixed(2),
                discountThreshold: parseInt(feeData.discountThreshold),
                discountThresholdFormatted: (parseInt(feeData.discountThreshold) / 100).toFixed(2),
                discountRate: parseInt(feeData.discountRate),
                discountRateFormatted: (parseInt(feeData.discountRate) / 100).toFixed(2),
                timestamp: new Date(parseInt(feeData.timestamp) * 1000).toISOString()
            };
        } catch (error) {
            console.error('Errore getCurrentFee:', error);
            throw new Error(`Errore lettura fee: ${error.message}`);
        }
    }

    // ─── CALCOLA DISTRIBUZIONE ───
    async calculateDistribution(totalFee) {
        try {
            const dist = await this.contract.methods.calculateDistribution(totalFee).call();
            return {
                treasury: parseInt(dist.treasuryAmount),
                treasuryFormatted: (parseInt(dist.treasuryAmount) / 100).toFixed(2),
                staking: parseInt(dist.stakingAmount),
                stakingFormatted: (parseInt(dist.stakingAmount) / 100).toFixed(2),
                community: parseInt(dist.communityAmount),
                communityFormatted: (parseInt(dist.communityAmount) / 100).toFixed(2),
                total: parseInt(totalFee),
                totalFormatted: (parseInt(totalFee) / 100).toFixed(2)
            };
        } catch (error) {
            console.error('Errore calculateDistribution:', error);
            throw new Error(`Errore calcolo distribuzione: ${error.message}`);
        }
    }

    // ─── CREA PROPOSTA ───
    async createProposal(fromAddress, description, newBaseFee, newVariableRate) {
        try {
            const tx = await this.contract.methods.createProposal(
                description,
                newBaseFee,
                newVariableRate
            ).send({
                from: fromAddress,
                gas: 200000
            });
            
            return {
                success: true,
                transactionHash: tx.transactionHash,
                blockNumber: tx.blockNumber,
                gasUsed: tx.gasUsed
            };
        } catch (error) {
            console.error('Errore createProposal:', error);
            throw new Error(`Errore creazione proposta: ${error.message}`);
        }
    }

    // ─── DISTRIBUISCI FEE ───
    async distributeFees(fromAddress, totalFee) {
        try {
            const tx = await this.contract.methods.distributeFees(totalFee).send({
                from: fromAddress,
                gas: 150000
            });
            
            return {
                success: true,
                transactionHash: tx.transactionHash,
                blockNumber: tx.blockNumber,
                gasUsed: tx.gasUsed
            };
        } catch (error) {
            console.error('Errore distributeFees:', error);
            throw new Error(`Errore distribuzione fee: ${error.message}`);
        }
    }

    // ─── OTTIENI INFORMAZIONI COMPLETE ───
    async getCompleteFeeInfo(amount, volume = 0) {
        try {
            const fee = await this.calculateFee(amount, volume);
            const distribution = await this.calculateDistribution(fee.fee);
            const config = await this.getCurrentFee();
            
            return {
                amount,
                volume,
                fee,
                distribution,
                config,
                netAmount: (amount - fee.fee / 100).toFixed(2),
                feePercentage: ((fee.fee / 100) / amount * 100).toFixed(2)
            };
        } catch (error) {
            console.error('Errore getCompleteFeeInfo:', error);
            throw error;
        }
    }
}

module.exports = new BlockchainService();