import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/axiosConfig';
import Layout from '../components/Layout/Layout';

const STATUS_META = {
  idle:       { label: 'Idle',         color: 'bg-gray-100 text-gray-700 border-gray-300', dot: 'bg-gray-400' },
  working:    { label: 'In lavorazione', color: 'bg-blue-100 text-blue-700 border-blue-300', dot: 'bg-blue-500 animate-pulse' },
  delivering: { label: 'Consegna',     color: 'bg-amber-100 text-amber-700 border-amber-300', dot: 'bg-amber-500' },
  dispute:    { label: 'Disputa',      color: 'bg-red-100 text-red-700 border-red-300', dot: 'bg-red-500' },
};
const DEFAULT_STATUS = { label: 'Sconosciuto', color: 'bg-gray-100 text-gray-700 border-gray-300', dot: 'bg-gray-400' };

const formatDate = (ts) => {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    return d.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
};

const RobotDashboard = () => {
  const [robots, setRobots] = useState([]);
  const [stats, setStats] = useState(null);
  const [selected, setSelected] = useState(null);
  const [robotDetail, setRobotDetail] = useState(null);
  const [escrow, setEscrow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(() => {
      if (autoRefresh) fetchStats();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const fetchStats = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get('/robot/stats');
      const data = res.data?.data || {};
      setStats(data);
      setRobots(data.topRobots || []);
      // If a robot is selected, refresh its detail too
      if (selected) {
        fetchRobotDetail(selected.robotId);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Errore nel caricamento dei robot');
    } finally {
      setLoading(false);
    }
  }, [selected]);

  const fetchRobotDetail = useCallback(async (robotId) => {
    try {
      const res = await api.get(`/robot/status/${robotId}`);
      setRobotDetail(res.data?.data || null);
      setEscrow(null);
      const jobId = res.data?.data?.currentJob?.jobId;
      if (jobId && res.data?.data?.currentJob?.escrow) {
        setEscrow(res.data.data.currentJob.escrow);
      } else if (jobId) {
        try {
          const escRes = await api.get(`/robot/escrow/${jobId}`);
          setEscrow(escRes.data?.data || null);
        } catch {
          setEscrow(null);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Errore nel caricamento del robot');
    }
  }, []);

  const handleSelect = (robot) => {
    setSelected(robot);
    fetchRobotDetail(robot.robotId);
  };

  const statusMeta = (s) => (s && STATUS_META[s]) ? STATUS_META[s] : DEFAULT_STATUS;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🤖 Robot Dashboard</h1>
            <p className="text-gray-500 mt-1">Monitoraggio dei robot attivi, job in corso e storico lavori</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <span>Auto refresh 30s</span>
            <button
              type="button"
              onClick={() => setAutoRefresh(v => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors ${autoRefresh ? 'bg-green-500' : 'bg-gray-300'}`}
              aria-pressed={autoRefresh}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${autoRefresh ? 'translate-x-5' : ''}`} />
            </button>
          </label>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
            ⚠️ {error}
          </div>
        )}

        {/* Stat cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
              <div className="text-sm text-gray-500">Robot totali</div>
              <div className="text-3xl font-bold text-gray-900 mt-1">{stats.totalRobots ?? '—'}</div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
              <div className="text-sm text-gray-500">Attivi</div>
              <div className="text-3xl font-bold text-blue-600 mt-1">{stats.activeRobots ?? '—'}</div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
              <div className="text-sm text-gray-500">Job completati</div>
              <div className="text-3xl font-bold text-green-600 mt-1">{stats.totalJobsCompleted ?? '—'}</div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
              <div className="text-sm text-gray-500">Guadagno totale</div>
              <div className="text-3xl font-bold text-amber-600 mt-1">{(stats.totalEarned ?? 0).toLocaleString('it-IT')} MYZ</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Robot list */}
          <div className="lg:col-span-1">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Robot ({robots.length})</h2>
            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-gray-100 rounded-xl p-4 animate-pulse h-16" />
                ))}
              </div>
            ) : robots.length === 0 ? (
              <div className="bg-white p-6 rounded-xl border border-gray-100 text-center text-gray-500">
                Nessun robot trovato
              </div>
            ) : (
              <div className="space-y-3">
                {robots.map((r) => {
                  const meta = statusMeta(r.status);
                  const isSel = selected?.robotId === r.robotId;
                  return (
                    <button
                      key={r.robotId}
                      type="button"
                      onClick={() => handleSelect(r)}
                      className={`w-full text-left bg-white p-4 rounded-xl border shadow-sm transition-all hover:shadow-md ${isSel ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-100'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-gray-900">{r.name || r.robotId}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{r.robotId}</div>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${meta.color}`}>
                          <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                          {meta.label}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="text-sm font-bold text-gray-900">{r.jobsCompleted ?? 0}</div>
                          <div className="text-[10px] text-gray-500">Job</div>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-900">{(r.reputation ?? 0).toFixed(1)}</div>
                          <div className="text-[10px] text-gray-500">Reputazione</div>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-amber-600">{(r.totalEarned ?? 0).toLocaleString('it-IT')}</div>
                          <div className="text-[10px] text-gray-500">Earned</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detail panel */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Dettaglio Robot</h2>
            {!selected ? (
              <div className="bg-white p-10 rounded-xl border border-gray-100 text-center text-gray-500">
                <div className="text-4xl mb-3">🤖</div>
                Seleziona un robot per vedere i dettagli, lo storico e l'escrow
              </div>
            ) : !robotDetail ? (
              <div className="bg-white p-10 rounded-xl border border-gray-100 animate-pulse text-center text-gray-400">
                Caricamento dettagli...
              </div>
            ) : (
              <div className="space-y-6">
                {/* Header */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">{robotDetail.name || robotDetail.robotId}</h3>
                      <div className="text-sm text-gray-500 mt-1">{robotDetail.robotId}</div>
                    </div>
                    {(() => {
                      const meta = statusMeta(robotDetail.status);
                      return (
                        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border ${meta.color}`}>
                          <span className={`w-2.5 h-2.5 rounded-full ${meta.dot}`} />
                          {meta.label}
                        </span>
                      );
                    })()}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-xs text-gray-500">Reputazione</div>
                      <div className="text-2xl font-bold text-gray-900 mt-1">{(robotDetail.reputation ?? 0).toFixed(1)}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-xs text-gray-500">Job completati</div>
                      <div className="text-2xl font-bold text-gray-900 mt-1">{robotDetail.jobsCompleted ?? 0}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-xs text-gray-500">Guadagno totale</div>
                      <div className="text-2xl font-bold text-amber-600 mt-1">{(robotDetail.totalEarned ?? 0).toLocaleString('it-IT')} MYZ</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-xs text-gray-500">Job corrente</div>
                      <div className="text-2xl font-bold text-gray-900 mt-1">{robotDetail.currentJob?.jobId || 'Nessuno'}</div>
                    </div>
                  </div>
                </div>

                {/* Escrow */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">💰 Escrow</h4>
                  {escrow ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-indigo-50 rounded-lg p-4">
                        <div className="text-xs text-indigo-600">Amount</div>
                        <div className="text-xl font-bold text-indigo-700 mt-1">{escrow.amount ?? '—'} {escrow.currency || ''}</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-xs text-gray-500">Fee (2%)</div>
                        <div className="text-xl font-bold text-gray-900 mt-1">{escrow.fee ?? '—'} {escrow.currency || ''}</div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                        <div className="text-xs text-green-600">Net Amount</div>
                        <div className="text-xl font-bold text-green-700 mt-1">{escrow.netAmount ?? '—'} {escrow.currency || ''}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-500 text-sm">Nessun escrow attivo per questo robot</div>
                  )}
                </div>

                {/* Job history */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">📋 Cronologia job (ultimi 20)</h4>
                  {robotDetail.history && robotDetail.history.length > 0 ? (
                    <div className="space-y-2">
                      {robotDetail.history.slice().reverse().map((h, i) => {
                        const eventLabel = {
                          job_assigned:  '✅ Job assegnato',
                          job_executed:  '🔧 Job eseguito',
                          job_delivered: '📦 Job consegnato',
                          dispute_opened:'⚠️ Disputa aperta',
                        }[h.event] || h.event;
                        return (
                          <div key={i} className="flex items-center justify-between gap-4 py-2 border-b border-gray-50 last:border-0">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-lg">{['✅','🔧','📦','⚠️'][['job_assigned','job_executed','job_delivered','dispute_opened'].indexOf(h.event)] ?? '•'}</span>
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-gray-800 truncate">{eventLabel}</div>
                                <div className="text-xs text-gray-500">{h.jobId ? `Job ${h.jobId}` : ''}{h.amount ? ` • ${h.amount} ${h.currency || ''}` : ''}</div>
                              </div>
                            </div>
                            <div className="text-xs text-gray-400 whitespace-nowrap">{formatDate(h.timestamp)}</div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-gray-500 text-sm">Nessuna attività registrata</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default RobotDashboard;