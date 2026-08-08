// src/monitoring/analytics.js
// Analisi pagamenti e trend temporali - Bounty #717 - 650 MYZ

class PaymentAnalytics {
  constructor(config = {}) {
    this.payments = [];
    this.dailyStats = new Map();
    this.weeklyStats = new Map();
    this.anomalyThreshold = config.anomalyThreshold || 2.5; // z-score
    this.trendWindow = config.trendWindow || 30; // giorni
  }

  /**
   * Registra un pagamento nel sistema di analytics
   */
  trackPayment(payment) {
    const entry = {
      ...payment,
      timestamp: payment.timestamp || new Date().toISOString(),
      tracked: new Date().toISOString()
    };
    this.payments.push(entry);
    this._updateDailyStats(entry);
    this._updateWeeklyStats(entry);
    return entry;
  }

  /**
   * Calcola trend giornalieri
   */
  getDailyTrends(days = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    const dailyData = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(cutoff);
      date.setDate(date.getDate() + i);
      const key = date.toISOString().split('T')[0];
      const stats = this.dailyStats.get(key) || { count: 0, volume: 0, avgAmount: 0 };
      dailyData.push({ date: key, ...stats });
    }
    
    // Calcola medie mobili (7 giorni)
    const withMA = dailyData.map((d, i) => {
      const window = dailyData.slice(Math.max(0, i - 6), i + 1);
      const maVolume = window.reduce((s, w) => s + w.volume, 0) / window.length;
      const maCount = window.reduce((s, w) => s + w.count, 0) / window.length;
      return { ...d, maVolume: +maVolume.toFixed(2), maCount: +maCount.toFixed(1) };
    });
    
    return {
      data: withMA,
      summary: this._getDailySummary(withMA)
    };
  }

  /**
   * Calcola trend settimanali
   */
  getWeeklyTrends(weeks = 12) {
    const weekly = [];
    const now = new Date();
    
    for (let i = 0; i < weeks; i++) {
      const end = new Date(now);
      end.setDate(end.getDate() - (i * 7));
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      
      const weekPayments = this.payments.filter(p => {
        const d = new Date(p.timestamp);
        return d >= start && d <= end;
      });
      
      const volume = weekPayments.reduce((s, p) => s + (p.amount || 0), 0);
      const uniqueUsers = new Set(weekPayments.map(p => p.userId || p.from)).size;
      
      weekly.unshift({
        weekStart: start.toISOString().split('T')[0],
        weekEnd: end.toISOString().split('T')[0],
        count: weekPayments.length,
        volume: +volume.toFixed(2),
        uniqueUsers,
        avgAmount: weekPayments.length > 0 ? +(volume / weekPayments.length).toFixed(2) : 0
      });
    }
    
    return {
      data: weekly,
      trend: this._calculateTrend(weekly.map(w => w.volume))
    };
  }

  /**
   * Rileva anomalie nei pagamenti
   */
  detectAnomalies() {
    if (this.payments.length < 10) return { anomalies: [], message: 'Dati insufficienti (minimo 10 pagamenti)' };
    
    // Raggruppa per giorno
    const dailyVolumes = [...this.dailyStats.entries()]
      .map(([date, stats]) => ({ date, volume: stats.volume }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    // Calcola media e deviazione standard
    const volumes = dailyVolumes.map(d => d.volume);
    const mean = volumes.reduce((s, v) => s + v, 0) / volumes.length;
    const variance = volumes.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / volumes.length;
    const stdDev = Math.sqrt(variance);
    
    // Z-score per ogni giorno
    const anomalies = dailyVolumes
      .map(d => ({
        ...d,
        zScore: stdDev > 0 ? Math.abs((d.volume - mean) / stdDev) : 0
      }))
      .filter(d => d.zScore > this.anomalyThreshold)
      .sort((a, b) => b.zScore - a.zScore);
    
    return {
      anomalies,
      stats: { mean: +mean.toFixed(2), stdDev: +stdDev.toFixed(2), totalDays: dailyVolumes.length },
      summary: anomalies.length > 0 
        ? `Rilevate ${anomalies.length} anomalie (soglia z-score > ${this.anomalyThreshold})`
        : 'Nessuna anomalia rilevata'
    };
  }

  /**
   * Genera previsioni basate su trend storici
   */
  forecast(days = 7) {
    const dailyData = this.getDailyTrends(this.trendWindow).data;
    if (dailyData.length < 7) return { forecast: [], message: 'Dati insufficienti per previsioni' };
    
    const volumes = dailyData.map(d => d.volume);
    
    // Regressione lineare semplice
    const n = volumes.length;
    const xMean = (n - 1) / 2;
    const yMean = volumes.reduce((s, v) => s + v, 0) / n;
    
    let slope = 0;
    let denom = 0;
    for (let i = 0; i < n; i++) {
      slope += (i - xMean) * (volumes[i] - yMean);
      denom += Math.pow(i - xMean, 2);
    }
    slope = denom > 0 ? slope / denom : 0;
    const intercept = yMean - slope * xMean;
    
    // Previsioni
    const forecast = [];
    for (let i = 0; i < days; i++) {
      const predicted = slope * (n + i) + intercept;
      forecast.push({
        day: i + 1,
        date: new Date(Date.now() + (i + 1) * 86400000).toISOString().split('T')[0],
        predictedVolume: +Math.max(0, predicted).toFixed(2),
        confidence: +Math.max(0.5, 1 - (i * 0.05)).toFixed(2)
      });
    }
    
    return {
      forecast,
      model: { slope: +slope.toFixed(4), intercept: +intercept.toFixed(2), r2: this._calculateR2(volumes, slope, intercept) },
      trend: slope > 0.1 ? 'crescita' : slope < -0.1 ? 'calo' : 'stabile'
    };
  }

  /**
   * Esporta report in formato strutturato
   */
  exportReport(format = 'json') {
    const report = {
      generatedAt: new Date().toISOString(),
      period: { from: this._getOldestDate(), to: new Date().toISOString() },
      totalPayments: this.payments.length,
      totalVolume: +this.payments.reduce((s, p) => s + (p.amount || 0), 0).toFixed(2),
      dailyTrends: this.getDailyTrends(30),
      weeklyTrends: this.getWeeklyTrends(12),
      anomalies: this.detectAnomalies(),
      forecast: this.forecast(7)
    };
    
    if (format === 'csv') {
      return this._toCSV(report);
    }
    
    return report;
  }

  // ==================== INTERNAL HELPERS ====================
  
  _updateDailyStats(payment) {
    const date = payment.timestamp.split('T')[0];
    if (!this.dailyStats.has(date)) {
      this.dailyStats.set(date, { count: 0, volume: 0, amounts: [], currencies: new Set() });
    }
    const stats = this.dailyStats.get(date);
    stats.count++;
    stats.volume += payment.amount || 0;
    stats.amounts.push(payment.amount || 0);
    stats.avgAmount = +(stats.volume / stats.count).toFixed(2);
    if (payment.currency) stats.currencies.add(payment.currency);
  }

  _updateWeeklyStats(payment) {
    const d = new Date(payment.timestamp);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().split('T')[0];
    
    if (!this.weeklyStats.has(key)) {
      this.weeklyStats.set(key, { count: 0, volume: 0 });
    }
    const ws = this.weeklyStats.get(key);
    ws.count++;
    ws.volume += payment.amount || 0;
  }

  _getDailySummary(data) {
    const volumes = data.map(d => d.volume);
    return {
      avgDailyVolume: +(volumes.reduce((s, v) => s + v, 0) / volumes.length).toFixed(2),
      maxDailyVolume: Math.max(...volumes),
      minDailyVolume: Math.min(...volumes),
      avgDailyCount: +(data.reduce((s, d) => s + d.count, 0) / data.length).toFixed(1)
    };
  }

  _calculateTrend(values) {
    if (values.length < 2) return 'insufficiente';
    const recent = values.slice(-4);
    const previous = values.slice(-8, -4);
    if (previous.length === 0) return 'nuovo';
    const recentAvg = recent.reduce((s, v) => s + v, 0) / recent.length;
    const previousAvg = previous.reduce((s, v) => s + v, 0) / previous.length;
    const change = ((recentAvg - previousAvg) / previousAvg) * 100;
    if (change > 10) return `crescita (+${change.toFixed(1)}%)`;
    if (change < -10) return `calo (${change.toFixed(1)}%)`;
    return 'stabile';
  }

  _calculateR2(values, slope, intercept) {
    const yMean = values.reduce((s, v) => s + v, 0) / values.length;
    let ssRes = 0, ssTot = 0;
    values.forEach((y, i) => {
      const predicted = slope * i + intercept;
      ssRes += Math.pow(y - predicted, 2);
      ssTot += Math.pow(y - yMean, 2);
    });
    return ssTot > 0 ? +(1 - ssRes / ssTot).toFixed(4) : 0;
  }

  _toCSV(report) {
    const lines = ['date,count,volume,avgAmount'];
    report.dailyTrends.data.forEach(d => {
      lines.push(`${d.date},${d.count},${d.volume},${d.avgAmount || 0}`);
    });
    return lines.join('\n');
  }

  _getOldestDate() {
    if (this.payments.length === 0) return new Date().toISOString();
    return this.payments.reduce((oldest, p) => 
      p.timestamp < oldest ? p.timestamp : oldest, 
      this.payments[0].timestamp
    );
  }

  getStatus() {
    return {
      totalTrackedPayments: this.payments.length,
      dailyStatsSize: this.dailyStats.size,
      weeklyStatsSize: this.weeklyStats.size,
      lastPayment: this.payments[this.payments.length - 1]?.timestamp || null
    };
  }
}

module.exports = { PaymentAnalytics };
