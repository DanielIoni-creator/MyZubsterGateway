const crypto = require('node:crypto');

const REFUEL_STATUS = Object.freeze({
  AUTHORIZED: 'AUTHORIZED',
  DISPENSING: 'DISPENSING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
});

class HydrogenRefuelingService {
  constructor({ now = () => new Date(), id = () => crypto.randomUUID() } = {}) {
    this.now = now;
    this.id = id;
    this.stations = new Map();
    this.wallets = new Map();
    this.refuels = new Map();
  }

  setWalletBalance(walletId, myz) {
    if (!walletId || !Number.isFinite(myz) || myz < 0) throw new Error('A non-negative MYZ balance is required');
    this.wallets.set(walletId, myz);
    return { walletId, myz };
  }

  registerStation({ stationId, name, priceMyzPerKg, availableKg = 0 }) {
    if (!stationId || !name) throw new Error('stationId and name are required');
    if (!Number.isFinite(priceMyzPerKg) || priceMyzPerKg <= 0) throw new Error('priceMyzPerKg must be positive');
    if (!Number.isFinite(availableKg) || availableKg < 0) throw new Error('availableKg must be non-negative');
    const station = { stationId, name, priceMyzPerKg, availableKg, online: true, updatedAt: this.now().toISOString() };
    this.stations.set(stationId, station);
    return { ...station };
  }

  setStationStatus(stationId, { online, availableKg }) {
    const station = this.#station(stationId);
    if (online !== undefined && typeof online !== 'boolean') throw new Error('online must be boolean');
    if (availableKg !== undefined && (!Number.isFinite(availableKg) || availableKg < 0)) throw new Error('availableKg must be non-negative');
    if (online !== undefined) station.online = online;
    if (availableKg !== undefined) station.availableKg = availableKg;
    station.updatedAt = this.now().toISOString();
    return { ...station };
  }

  beginRefuel({ stationId, walletId, kg }) {
    const station = this.#station(stationId);
    if (!station.online) throw new Error('Station is offline');
    if (!walletId || !Number.isFinite(kg) || kg <= 0) throw new Error('walletId and a positive kg amount are required');
    if (station.availableKg < kg) throw new Error('Insufficient hydrogen at station');
    const totalMyz = Number((kg * station.priceMyzPerKg).toFixed(6));
    const balance = this.wallets.get(walletId) || 0;
    if (balance < totalMyz) throw new Error('Insufficient MYZ balance');
    this.wallets.set(walletId, Number((balance - totalMyz).toFixed(6)));
    station.availableKg = Number((station.availableKg - kg).toFixed(6));
    const refuel = {
      refuelId: this.id(), stationId, walletId, requestedKg: kg, dispensedKg: 0,
      totalMyz, status: REFUEL_STATUS.AUTHORIZED, createdAt: this.now().toISOString(), events: [],
    };
    this.#event(refuel, 'PAYMENT_AUTHORIZED');
    this.refuels.set(refuel.refuelId, refuel);
    return this.#copy(refuel);
  }

  recordProgress(refuelId, { dispensedKg, complete = false }) {
    const refuel = this.#refuel(refuelId);
    if ([REFUEL_STATUS.COMPLETED, REFUEL_STATUS.CANCELLED].includes(refuel.status)) throw new Error('Refuel is closed');
    if (!Number.isFinite(dispensedKg) || dispensedKg < refuel.dispensedKg || dispensedKg > refuel.requestedKg) throw new Error('Invalid dispensedKg');
    refuel.status = complete ? REFUEL_STATUS.COMPLETED : REFUEL_STATUS.DISPENSING;
    refuel.dispensedKg = dispensedKg;
    this.#event(refuel, complete ? 'REFUEL_COMPLETED' : 'DISPENSING');
    return this.#copy(refuel);
  }

  cancelRefuel(refuelId) {
    const refuel = this.#refuel(refuelId);
    if (refuel.status === REFUEL_STATUS.COMPLETED) throw new Error('Completed refuels cannot be cancelled');
    if (refuel.status === REFUEL_STATUS.CANCELLED) return this.#copy(refuel);
    const unusedKg = refuel.requestedKg - refuel.dispensedKg;
    const refund = Number((unusedKg * this.#station(refuel.stationId).priceMyzPerKg).toFixed(6));
    const station = this.#station(refuel.stationId);
    station.availableKg = Number((station.availableKg + unusedKg).toFixed(6));
    this.wallets.set(refuel.walletId, Number(((this.wallets.get(refuel.walletId) || 0) + refund).toFixed(6)));
    refuel.refundedMyz = refund;
    refuel.status = REFUEL_STATUS.CANCELLED;
    this.#event(refuel, 'REFUEL_CANCELLED');
    return this.#copy(refuel);
  }

  history({ stationId, walletId } = {}) {
    return [...this.refuels.values()]
      .filter((item) => (!stationId || item.stationId === stationId) && (!walletId || item.walletId === walletId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((item) => this.#copy(item));
  }

  monitoring() {
    const stations = [...this.stations.values()].map((station) => ({ ...station }));
    const refuels = [...this.refuels.values()];
    return {
      stations,
      onlineStations: stations.filter((station) => station.online).length,
      activeRefuels: refuels.filter((item) => [REFUEL_STATUS.AUTHORIZED, REFUEL_STATUS.DISPENSING].includes(item.status)).length,
      completedRefuels: refuels.filter((item) => item.status === REFUEL_STATUS.COMPLETED).length,
      dispensedKg: Number(refuels.reduce((sum, item) => sum + item.dispensedKg, 0).toFixed(6)),
      collectedMyz: Number(refuels.reduce((sum, item) => sum + item.totalMyz - (item.refundedMyz || 0), 0).toFixed(6)),
    };
  }

  #station(stationId) { const station = this.stations.get(stationId); if (!station) throw new Error('Station not found'); return station; }
  #refuel(refuelId) { const refuel = this.refuels.get(refuelId); if (!refuel) throw new Error('Refuel not found'); return refuel; }
  #event(refuel, type) { refuel.events.push({ type, at: this.now().toISOString() }); }
  #copy(refuel) { return { ...refuel, events: refuel.events.map((event) => ({ ...event })) }; }
}

module.exports = { HydrogenRefuelingService, REFUEL_STATUS };
