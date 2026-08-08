/**
 * Wallet Service Tests — Gestione Portafoglio MYZ/XMR
 * Bounty #722
 */
const WalletService = require('../services/walletService');

describe('WalletService', () => {
  let wallet;

  beforeEach(() => {
    wallet = new WalletService();
  });

  describe('getBalance', () => {
    it('should return zero balances for new user', async () => {
      const result = await wallet.getBalance('user1');
      expect(result.success).toBe(true);
      expect(result.userId).toBe('user1');
      expect(result.balances.MYZ).toBe(0);
      expect(result.balances.XMR).toBe(0);
    });

    it('should return updated balances after deposit', async () => {
      await wallet.deposit('user1', 100, 'MYZ');
      const result = await wallet.getBalance('user1');
      expect(result.balances.MYZ).toBe(100);
      expect(result.balances.XMR).toBe(0);
    });
  });

  describe('deposit', () => {
    it('should deposit MYZ and update balance', async () => {
      const result = await wallet.deposit('user1', 500, 'MYZ');
      expect(result.success).toBe(true);
      expect(result.amount).toBe(500);
      expect(result.currency).toBe('MYZ');
      expect(result.newBalance).toBe(500);
      expect(result.transactionId).toBeTruthy();
    });

    it('should deposit XMR and update balance', async () => {
      const result = await wallet.deposit('user1', 2.5, 'XMR');
      expect(result.success).toBe(true);
      expect(result.currency).toBe('XMR');
      expect(result.newBalance).toBe(2.5);
    });

    it('should reject negative amounts', async () => {
      await expect(wallet.deposit('user1', -10, 'MYZ'))
        .rejects.toThrow('Amount must be positive');
    });

    it('should reject zero amounts', async () => {
      await expect(wallet.deposit('user1', 0, 'MYZ'))
        .rejects.toThrow('Amount must be positive');
    });

    it('should reject unsupported currencies', async () => {
      await expect(wallet.deposit('user1', 100, 'USD'))
        .rejects.toThrow('Unsupported currency');
    });
  });

  describe('withdraw', () => {
    beforeEach(async () => {
      await wallet.deposit('user1', 500, 'MYZ');
    });

    it('should withdraw funds and update balance', async () => {
      const result = await wallet.withdraw('user1', 200, 'MYZ');
      expect(result.success).toBe(true);
      expect(result.amount).toBe(200);
      expect(result.newBalance).toBe(300);
    });

    it('should reject withdrawal exceeding balance', async () => {
      await expect(wallet.withdraw('user1', 1000, 'MYZ'))
        .rejects.toThrow('Insufficient MYZ balance');
    });

    it('should record destination address', async () => {
      const destination = '12Nbmmm5g6AU3Uk9CNHRdauTD4KzA8mmiAStqpcnHN3sDDrFcb4wtmsYXZq8rptAbwoAaBLq8K9RgUyrfFTmZGib1U4';
      const result = await wallet.withdraw('user1', 100, 'MYZ', destination);
      expect(result.destination).toBe(destination);
    });
  });

  describe('transfer', () => {
    beforeEach(async () => {
      await wallet.deposit('alice', 1000, 'MYZ');
    });

    it('should transfer funds between users', async () => {
      const result = await wallet.transfer('alice', 'bob', 300, 'MYZ');
      expect(result.success).toBe(true);
      expect(result.amount).toBe(300);
      expect(result.fromNewBalance).toBe(700);
      expect(result.toNewBalance).toBe(300);
    });

    it('should reject transfer to same user', async () => {
      await expect(wallet.transfer('alice', 'alice', 100, 'MYZ'))
        .rejects.toThrow('Cannot transfer to same user');
    });

    it('should reject transfer exceeding balance', async () => {
      await expect(wallet.transfer('alice', 'bob', 2000, 'MYZ'))
        .rejects.toThrow('Insufficient MYZ balance');
    });

    it('should create ledger entries for both users', async () => {
      await wallet.transfer('alice', 'bob', 100, 'MYZ');
      const alice = await wallet.getBalance('alice');
      const bob = await wallet.getBalance('bob');
      expect(alice.balances.MYZ).toBe(900);
      expect(bob.balances.MYZ).toBe(100);
    });
  });

  describe('getTransactions', () => {
    beforeEach(async () => {
      await wallet.deposit('user1', 100, 'MYZ');
      await wallet.deposit('user1', 50, 'XMR');
      await wallet.withdraw('user1', 30, 'MYZ');
    });

    it('should return all transactions', async () => {
      const result = await wallet.getTransactions('user1');
      expect(result.success).toBe(true);
      expect(result.transactions.length).toBe(3);
    });

    it('should filter by currency', async () => {
      const result = await wallet.getTransactions('user1', 50, 0, 'XMR');
      expect(result.transactions.length).toBe(1);
      expect(result.transactions[0].currency).toBe('XMR');
    });

    it('should respect pagination', async () => {
      const result = await wallet.getTransactions('user1', 2, 0);
      expect(result.transactions.length).toBe(2);
      expect(result.hasMore).toBe(true);
    });
  });

  describe('getHistory', () => {
    beforeEach(async () => {
      await wallet.deposit('user1', 100, 'MYZ');
      await wallet.withdraw('user1', 30, 'MYZ');
    });

    it('should return time-bucketed history', async () => {
      const result = await wallet.getHistory('user1', 'daily');
      expect(result.success).toBe(true);
      expect(result.period).toBe('daily');
      expect(result.totalTx).toBe(2);
      expect(result.csv).toBeTruthy();
      expect(result.csv).toContain('Period,Deposits');
    });
  });

  describe('getSummary', () => {
    beforeEach(async () => {
      await wallet.deposit('user1', 500, 'MYZ');
      await wallet.deposit('user1', 100, 'XMR');
      await wallet.withdraw('user1', 50, 'MYZ');
    });

    it('should return complete wallet summary', async () => {
      const result = await wallet.getSummary('user1');
      expect(result.success).toBe(true);
      expect(result.balances.MYZ).toBe(450);
      expect(result.balances.XMR).toBe(100);
      expect(result.stats.totalDeposits).toBe(600);
      expect(result.stats.totalWithdrawals).toBe(50);
      expect(result.recentTransactions.length).toBe(3);
      expect(result.totalTransactions).toBe(3);
    });
  });

  describe('getAllBalances', () => {
    it('should return all user balances', async () => {
      await wallet.deposit('alice', 100, 'MYZ');
      await wallet.deposit('bob', 200, 'XMR');
      const result = await wallet.getAllBalances();
      expect(result.success).toBe(true);
      expect(result.balances.length).toBe(2);
    });
  });

  describe('ledger invariants', () => {
    it('should maintain double-entry integrity across transfers', async () => {
      await wallet.deposit('alice', 1000, 'MYZ');
      await wallet.transfer('alice', 'bob', 300, 'MYZ');

      const alice = await wallet.getBalance('alice');
      const bob = await wallet.getBalance('bob');
      expect(alice.balances.MYZ + bob.balances.MYZ).toBe(1000);
    });

    it('should prevent negative balances', async () => {
      await wallet.deposit('user1', 100, 'MYZ');
      await expect(wallet.withdraw('user1', 101, 'MYZ'))
        .rejects.toThrow('Insufficient');
      const result = await wallet.getBalance('user1');
      expect(result.balances.MYZ).toBe(100); // Balance unchanged
    });

    it('should handle concurrent operations safely', async () => {
      await wallet.deposit('user1', 100, 'MYZ');
      const ops = [
        wallet.deposit('user1', 50, 'MYZ'),
        wallet.withdraw('user1', 30, 'MYZ'),
        wallet.deposit('user1', 20, 'MYZ')
      ];
      await Promise.all(ops);
      const result = await wallet.getBalance('user1');
      expect(result.balances.MYZ).toBe(140);
    });
  });
});
