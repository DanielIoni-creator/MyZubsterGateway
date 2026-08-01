// scripts/importDatasets.js - CLI Runner for Dataset Import
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { importBotanicalData } = require('../services/datasetImporter');
const User = require('../models/User');

dotenv.config();

async function runCLI() {
  const args = process.argv.slice(2);
  let source = 'gbif';
  let query = 'plant';
  let limit = 10;

  args.forEach(arg => {
    if (arg.startsWith('--source=')) source = arg.split('=')[1];
    if (arg.startsWith('--query=')) query = arg.split('=')[1];
    if (arg.startsWith('--limit=')) limit = parseInt(arg.split('=')[1], 10);
  });

  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/myzubster';
  console.log(`📡 Connecting to DB for dataset import (${source})...`);
  await mongoose.connect(MONGODB_URI);

  let owner = await User.findOne({ role: 'admin' });
  if (!owner) {
    owner = await User.findOne();
  }

  if (!owner) {
    console.error('❌ No user found in DB to assign dataset ownership.');
    process.exit(1);
  }

  console.log(`🌿 Importing ${limit} records from ${source} for query "${query}"...`);
  const result = await importBotanicalData({
    source,
    query,
    limit,
    ownerId: owner._id
  });

  console.log(`✅ Successfully imported ${result.count} botanical map entities!`);
  await mongoose.disconnect();
}

if (require.main === module) {
  runCLI().catch(err => {
    console.error('❌ CLI import error:', err);
    process.exit(1);
  });
}

module.exports = runCLI;
