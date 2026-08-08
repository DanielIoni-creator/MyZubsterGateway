const test = require('node:test');
const assert = require('node:assert/strict');
const { HydrogenRefuelingService, REFUEL_STATUS } = require('../services/hydrogenRefuelingService');

const makeService = () => new HydrogenRefuelingService({ now: () => new Date('2026-08-08T00:00:00.000Z'), id: () => 'refuel-1' });
const setup = () => { const service = makeService(); service.registerStation({ stationId: 'h2-rimini', name: 'Rimini H2', priceMyzPerKg: 12, availableKg: 50 }); service.setWalletBalance('wallet-1', 500); return service; };

test('authorizes MYZ payment and reserves hydrogen', () => {
  const service = setup(); const refuel = service.beginRefuel({ stationId: 'h2-rimini', walletId: 'wallet-1', kg: 10 });
  assert.equal(refuel.totalMyz, 120); assert.equal(refuel.status, REFUEL_STATUS.AUTHORIZED); assert.equal(service.wallets.get('wallet-1'), 380); assert.equal(service.stations.get('h2-rimini').availableKg, 40);
});
test('rejects offline stations, stock shortages, and insufficient MYZ', () => {
  const service = setup(); service.setStationStatus('h2-rimini', { online: false }); assert.throws(() => service.beginRefuel({ stationId: 'h2-rimini', walletId: 'wallet-1', kg: 1 }), /offline/);
  service.setStationStatus('h2-rimini', { online: true }); assert.throws(() => service.beginRefuel({ stationId: 'h2-rimini', walletId: 'wallet-1', kg: 51 }), /hydrogen/); assert.throws(() => service.beginRefuel({ stationId: 'h2-rimini', walletId: 'poor', kg: 1 }), /MYZ/);
});
test('tracks dispensing and completed history', () => {
  const service = setup(); const created = service.beginRefuel({ stationId: 'h2-rimini', walletId: 'wallet-1', kg: 5 }); const complete = service.recordProgress(created.refuelId, { dispensedKg: 5, complete: true });
  assert.equal(complete.status, REFUEL_STATUS.COMPLETED); assert.equal(service.history({ walletId: 'wallet-1' }).length, 1); assert.equal(service.monitoring().collectedMyz, 60);
});
test('refunds unused hydrogen when a refuel is cancelled', () => {
  const service = setup(); const created = service.beginRefuel({ stationId: 'h2-rimini', walletId: 'wallet-1', kg: 5 }); service.recordProgress(created.refuelId, { dispensedKg: 2 }); const cancelled = service.cancelRefuel(created.refuelId);
  assert.equal(cancelled.refundedMyz, 36); assert.equal(service.wallets.get('wallet-1'), 476); assert.equal(service.stations.get('h2-rimini').availableKg, 48); assert.equal(service.monitoring().collectedMyz, 24);
});
test('monitoring reports active refuels and station availability', () => {
  const service = setup(); service.beginRefuel({ stationId: 'h2-rimini', walletId: 'wallet-1', kg: 1 }); const report = service.monitoring();
  assert.equal(report.onlineStations, 1); assert.equal(report.activeRefuels, 1); assert.equal(report.stations[0].availableKg, 49);
});
