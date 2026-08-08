const axios = require('axios');

const users = ['admin', 'test', 'investor', 'user', 'danielioni'];
const passwords = ['Admin@2024', 'password123', 'admin123', 'test123', 'investor123'];

async function testLogin(username, password) {
  try {
    const response = await axios.post('http://localhost:3000/api/auth/login', {
      email: username,
      password: password
    });
    
    if (response.status === 200) {
      console.log(`✅ SUCCESS: ${username}:${password}`);
      return true;
    }
  } catch (error) {
    if (error.response?.status === 401) {
      console.log(`❌ FAILED: ${username}:${password}`);
    } else {
      console.log(`⚠️ ERROR: ${username}:${password} - ${error.message}`);
    }
  }
  return false;
}

async function runBruteforce() {
  console.log('🚀 Starting API brute-force test...\n');
  
  let found = false;
  for (const user of users) {
    for (const pass of passwords) {
      if (await testLogin(user, pass)) {
        found = true;
        break;
      }
    }
    if (found) break;
  }
  
  console.log('\n✅ Test completed!');
}

runBruteforce();
