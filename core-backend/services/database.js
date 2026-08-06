// backend/services/database.js
const { Pool } = require('pg');

class DatabaseService {
    constructor() {
        this.pool = null;
    }

    async connect() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });

        try {
            await this.pool.query('SELECT NOW()');
            console.log('✅ Database connesso');
        } catch (error) {
            console.error('❌ Errore connessione database:', error);
            throw error;
        }
    }

    async disconnect() {
        if (this.pool) {
            await this.pool.end();
            console.log('✅ Database disconnesso');
        }
    }

    async saveTransaction(data) {
        const query = `
            INSERT INTO transactions (
                booking_id, amount, net_amount, fee, distribution, 
                fee_config, tx_hash, user_address, professional_address, 
                status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id
        `;

        const values = [
            data.bookingId,
            data.amount,
            data.netAmount,
            JSON.stringify(data.fee),
            JSON.stringify(data.distribution),
            JSON.stringify(data.feeConfig),
            data.txHash,
            data.userAddress,
            data.professionalAddress,
            data.status,
            data.createdAt
        ];

        const result = await this.pool.query(query, values);
        return { id: result.rows[0].id, ...data };
    }

    async getFeeStats() {
        const query = `
            SELECT 
                COUNT(*) as total_transactions,
                SUM(amount) as total_fees,
                AVG(amount) as average_fee
            FROM transactions
            WHERE status = 'completed'
        `;

        const result = await this.pool.query(query);
        return {
            totalTransactions: parseInt(result.rows[0].total_transactions) || 0,
            totalFees: parseFloat(result.rows[0].total_fees) || 0,
            averageFee: parseFloat(result.rows[0].average_fee) || 0,
            treasuryBalance: 0, // Da implementare con blockchain
            communityPool: 0,   // Da implementare con blockchain
            stakingPool: 0,     // Da implementare con blockchain
            activeProposals: 0  // Da implementare con blockchain
        };
    }
}

module.exports = new DatabaseService();