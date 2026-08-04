// cleanup.js - Rimuove gli indici duplicati dal database
const mongoose = require('mongoose');

async function cleanup() {
  try {
    await mongoose.connect('mongodb://localhost:27017/myzubster');
    console.log('✅ Connesso a MongoDB');

    // Ottieni tutte le collection
    const collections = await mongoose.connection.db.collections();
    
    for (let collection of collections) {
      const indexes = await collection.indexes();
      console.log(`\n📁 Collection: ${collection.collectionName}`);
      console.log(`   Indici trovati: ${indexes.length}`);
      
      // Rimuovi TUTTI gli indici (tranne _id che è obbligatorio)
      await collection.dropIndexes();
      console.log(`   ✅ Indici rimossi da ${collection.collectionName}`);
    }

    console.log('\n✅ Pulizia completata! Ora riavvia il server.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Errore:', error.message);
    process.exit(1);
  }
}

cleanup();