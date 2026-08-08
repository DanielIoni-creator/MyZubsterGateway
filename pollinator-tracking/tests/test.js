const axios = require('axios');

const BASE_URL = 'http://localhost:8085';

async function testPollinatorTracking() {
  console.log('🐝 Testing Pollinator Tracking API...\n');

  // Test 1: Health
  console.log('📋 Test 1: Health check');
  try {
    const health = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health:', health.data.status);
  } catch (err) {
    console.error('❌ Health failed:', err.message);
  }

  // Test 2: Track pollinator
  console.log('\n📋 Test 2: Track pollinator');
  try {
    const observation = {
      species: 'apis_mellifera',
      location: { lat: 44.067, lng: 12.569 },
      observedBy: 'eva-ioni-001',
      notes: 'Osservato su fiori di lavanda',
      confidence: 0.95
    };
    
    const response = await axios.post(`${BASE_URL}/api/pollinators/track`, observation);
    console.log('✅ Tracked:', response.data.observation.species);
    console.log('📊 Stats:', response.data.stats);
  } catch (err) {
    console.error('❌ Track failed:', err.response?.data || err.message);
  }

  // Test 3: Get observations
  console.log('\n📋 Test 3: Get observations');
  try {
    const response = await axios.get(`${BASE_URL}/api/pollinators/observations`);
    console.log('✅ Observations:', response.data.count);
  } catch (err) {
    console.error('❌ Get observations failed:', err.message);
  }

  // Test 4: Get stats
  console.log('\n📋 Test 4: Get stats');
  try {
    const response = await axios.get(`${BASE_URL}/api/pollinators/stats`);
    console.log('✅ Stats:', response.data.stats);
  } catch (err) {
    console.error('❌ Get stats failed:', err.message);
  }

  console.log('\n✅ Tests completed!');
}

testPollinatorTracking();
