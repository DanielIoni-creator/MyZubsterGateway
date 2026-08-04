const balances = new Map();

function mint(wallet, amount) {
  const current = balances.get(wallet) || 0;
  balances.set(wallet, current + amount);
  console.log(`✅ Minted ${amount} to ${wallet} (new balance: ${balances.get(wallet)})`);
  return `tx_sim_${Date.now()}`;
}

function balance(wallet) {
  return balances.get(wallet) || 0;
}

module.exports = { mint, balance };
