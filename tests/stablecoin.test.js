const request = require('supertest');
const mongoose = require('mongoose');
const StablecoinPayment = require('../models/StablecoinPayment');
const stablecoinService = require('../services/stablecoinService');

describe('Stablecoin Service', () => {
  describe('createPaymentIntent', () => {
    it('should create a USDC payment intent', async () => {
      const intent = await stablecoinService.createPaymentIntent({
        amount: 100,
        currency: 'USDC',
        recipient: '0xTest',
        metadata: { network: 'ethereum' }
      });
      expect(intent.paymentId).toBeDefined();
      expect(intent.currency).toBe('USDC');
      expect(intent.amount).toBe(100);
      expect(intent.status).toBe('pending');
      expect(intent.contractAddress).toBe('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
    });

    it('should create a USDT payment intent on polygon', async () => {
      const intent = await stablecoinService.createPaymentIntent({
        amount: 50,
        currency: 'USDT',
        recipient: '0xPoly',
        metadata: { network: 'polygon' }
      });
      expect(intent.currency).toBe('USDT');
      expect(intent.network).toBe('polygon');
    });
  });

  describe('getConversionRates', () => {
    it('should return rates for both stablecoins', async () => {
      const rates = await stablecoinService.getConversionRates();
      expect(rates.USDC).toBeDefined();
      expect(rates.USDT).toBeDefined();
      expect(rates.USDC.USD).toBe(1.00);
    });
  });

  describe('getUnifiedDashboard', () => {
    it('should return dashboard with totals', async () => {
      await StablecoinPayment.create({ amount: 100, currency: 'USDC', status: 'completed', recipient: '0xA' });
      await StablecoinPayment.create({ amount: 50, currency: 'USDT', status: 'pending', recipient: '0xB' });
      
      const dashboard = await stablecoinService.getUnifiedDashboard();
      expect(dashboard.totalPayments).toBe(2);
      expect(dashboard.byCurrency.length).toBe(2);
      expect(dashboard.recentVolume).toBe(100);
    });
  });
});
