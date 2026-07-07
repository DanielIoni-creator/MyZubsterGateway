// backend/services/FeeService.js
const { Web3 } = require('web3');
const dotenv = require('dotenv');

dotenv.config();

class FeeService {
    constructor() {
        // Inizializza Web3
        this.web3 = new Web3(process.env.WEB3_PROVIDER || 'http://localhost:8545');
        this.contractAddress = process.env.FEE_CONTRACT_ADDRESS;
        
        // ABI minima per il contratto
        this.abi = [
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
            },
            {
                "inputs": [
                    { "internalType": "string", "name": "description", "type": "string" },
                    { "internalType": "uint256", "name": "newBaseFee", "type": "uint256" },
                    { "internalType": "uint256", "name": "newVariableRate", "type": "uint256" }
                ],
                "name": "createProposal",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            }
        ];
        
        if (!this.contractAddress) {
            console.warn('⚠️ FEE_CONTRACT_ADDRESS non configurato in .env');
        }
        
        // Crea il contratto
        this.contract = new this.web3.eth.Contract(this.abi, this.contractAddress);
        
        console.log('✅ FeeService inizializzato');
        console.log(`📊 Contract: ${this.contractAddress}`);
        console.log(`🌐 Provider: ${process.env.WEB3_PROVIDER}`);
    }

    // ─── CALCOLA FEE ───
    async calculateAffineFee(amount, volume = 0) {
        try {
            const fee = await this.contract.methods.calculateFee(amount, volume).call();
            const currentFee = await this.contract.methods.currentFee().call();
            
            return {
                totalFee: parseInt(fee),
                baseFee: parseInt(currentFee.baseFee),
                variableFee: parseInt(fee) - parseInt(currentFee.baseFee),
                isDiscounted: volume >= parseInt(currentFee.discountThreshold),
                amount: amount,
                volume: volume,
                feeFormatted: (parseInt(fee) / 100).toFixed(2)
            };
        } catch (error) {
            console.error('Errore calcolo fee:', error);
            // Fallback: fee del 2%
            const fallbackFee = Math.floor(amount * 0.02 * 100);
            return {
                totalFee: fallbackFee,
                baseFee: 0,
                variableFee: fallbackFee,
                isDiscounted: false,
                isFallback: true,
                amount: amount,
                volume: volume,
                feeFormatted: (fallbackFee / 100).toFixed(2)
            };
        }
    }

    // ─── LEGGI CONFIGURAZIONE CORRENTE ───
    async getCurrentFeeConfig() {
        try {
            const fee = await this.contract.methods.currentFee().call();
            return {
                baseFee: parseInt(fee.baseFee),
                baseFeeFormatted: (parseInt(fee.baseFee) / 100).toFixed(2),
                variableRate: parseInt(fee.variableRate),
                variableRateFormatted: (parseInt(fee.variableRate) / 100).toFixed(2),
                discountThreshold: parseInt(fee.discountThreshold),
                discountThresholdFormatted: (parseInt(fee.discountThreshold) / 100).toFixed(2),
                discountRate: parseInt(fee.discountRate),
                discountRateFormatted: (parseInt(fee.discountRate) / 100).toFixed(2),
                timestamp: parseInt(fee.timestamp)
            };
        } catch (error) {
            console.error('Errore get config:', error);
            return null;
        }
    }

    // ─── CALCOLA DISTRIBUZIONE ───
    async calculateDistribution(totalFee) {
        try {
            const dist = await this.contract.methods.calculateDistribution(totalFee).call();
            return {
                treasuryAmount: parseInt(dist.treasuryAmount),
                treasuryFormatted: (parseInt(dist.treasuryAmount) / 100).toFixed(2),
                stakingAmount: parseInt(dist.stakingAmount),
                stakingFormatted: (parseInt(dist.stakingAmount) / 100).toFixed(2),
                communityAmount: parseInt(dist.communityAmount),
                communityFormatted: (parseInt(dist.communityAmount) / 100).toFixed(2),
                total: parseInt(totalFee),
                totalFormatted: (parseInt(totalFee) / 100).toFixed(2)
            };
        } catch (error) {
            console.error('Errore calcolo distribuzione:', error);
            return null;
        }
    }

    // ─── CREA PROPOSTA ───
    async createProposal(proposerAddress, description, newBaseFee, newVariableRate) {
        try {
            const tx = await this.contract.methods
                .createProposal(description, newBaseFee, newVariableRate)
                .send({
                    from: proposerAddress,
                    gas: 200000
                });
            
            return {
                success: true,
                txHash: tx.transactionHash,
                blockNumber: tx.blockNumber
            };
        } catch (error) {
            console.error('Errore creazione proposta:', error);
            throw new Error(`Errore creazione proposta: ${error.message}`);
        }
    }

    // ─── MONITORA CAMBIAMENTI FEE (versione semplificata) ───
    async monitorFeeChanges() {
        console.log('👁️ Monitoraggio fee: funzionalità disponibile in Web3 v4+');
        // Nota: in Web3 v4+ gli eventi si gestiscono diversamente
        // Per ora il monitoraggio è disabilitato
    }
}

module.exports = new FeeService();