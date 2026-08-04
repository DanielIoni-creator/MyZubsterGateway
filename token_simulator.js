// token_simulator.js
const balances = new Map();

function mint(to, amount) {
    if (!balances.has(to)) balances.set(to, 0);
    const newBalance = balances.get(to) + amount;
    balances.set(to, newBalance);
    console.log(`✅ Minted ${amount} to ${to} (new balance: ${newBalance})`);
}

function transfer(from, to, amount) {
    console.log(`🔄 Transferring ${amount} from ${from} to ${to}`);
    const fromBalance = balances.get(from) || 0;
    if (fromBalance < amount) {
        console.error(`❌ Insufficient balance: ${fromBalance} < ${amount}`);
        throw new Error(`Insufficient balance: ${fromBalance} < ${amount}`);
    }
    balances.set(from, fromBalance - amount);
    const toBalance = (balances.get(to) || 0) + amount;
    balances.set(to, toBalance);
    console.log(`✅ Transfer complete. New balances: ${from}=${fromBalance - amount}, ${to}=${toBalance}`);
}

function balance(address) {
    return balances.get(address) || 0;
}

module.exports = { mint, transfer, balance };
