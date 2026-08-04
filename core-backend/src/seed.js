const mongoose = require('mongoose');
const Skill = require('./models/Skill');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/myzubster';

async function seedDatabase() {
    try {
        await mongoose.connect(mongoUri);
        console.log('✅ Connesso a MongoDB');

        // Pulisci la collezione (opzionale)
        // await Skill.deleteMany({});
        // console.log('🗑️ Vecchi dati rimossi');

        // Crea un documento di test
        const testSkill = new Skill({
            title: "Riparazione lavatrice",
            description: "Riparo lavatrici a domicilio, intervento veloce e prezzi trasparenti.",
            category: "Elettrodomestici",
            type: "offerta",
            userId: "test-user-123",
            location: {
                type: "Point",
                coordinates: [12.5, 44.1] // [lng, lat]
            },
            address: "Via Roma 1, Rimini",
            status: "approved"
        });

        await testSkill.save();
        console.log('✅ Dato di test inserito con successo!');
        console.log(testSkill);

        process.exit(0);
    } catch (error) {
        console.error('❌ Errore:', error);
        process.exit(1);
    }
}

seedDatabase();