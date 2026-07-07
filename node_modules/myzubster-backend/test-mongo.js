require('dotenv').config();
const mongoose = require('mongoose');

const mongoUri = process.env.MONGODB_URI;

console.log('🔍 URI:', mongoUri);

async function testConnection() {
    try {
        await mongoose.connect(mongoUri);
        console.log('✅ Connessione a MongoDB Atlas riuscita!');
        await mongoose.disconnect();
    } catch (error) {
        console.error('❌ Errore:', error.message);
    }
}

testConnection();

testConnection();