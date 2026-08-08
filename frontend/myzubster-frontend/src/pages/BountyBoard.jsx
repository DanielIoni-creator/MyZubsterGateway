import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout/Layout';
import { getBounties, getBountyAnalytics } from '../api/bounty';

const STATUS_COLORS = {
  open: 'bg-green-100 text-green-800',
  claimed: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-blue-100 text-blue-800',
  closed: 'bg-gray-100 text-gray-600',
};

const LEVEL_COLORS = {
  beginner: 'bg-emerald-100 text-emerald-700',
  intermediate: 'bg-amber-100 text-amber-700',
  advanced: 'bg-red-100 text-red-700',
  expert: 'bg-purple-100 text-purple-700',
};

const BountyBoard = () => {
  const [bounties, setBounties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    fetchBounties();
    fetchAnalytics();
  }, []);

  const fetchBounties = async () => {
    try {
      setLoading(true);
      const response = await getBounties();
      setBounties(response.data);
      setError('');
    } catch (err) {
      setError('Errore nel caricamento dei bounty');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await getBountyAnalytics();
      setAnalytics(response.data);
    } catch (err) {
      console.error('Analytics unavailable', err);
    }
  };

  const filteredBounties = useMemo(() => {
    return bounties.filter((b) => {
      const matchesSearch =
        !search ||
        b.title?.toLowerCase().includes(search.toLowerCase()) ||
        b.description?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
      const matchesLevel = levelFilter === 'all' || b.level === levelFilter;
      return matchesSearch && matchesStatus && matchesLevel;
    });
  }, [bounties, search, statusFilter, levelFilter]);

  const stats = analytics || {
    total: bounties.length,
    open: bounties.filter((b) => b.status === 'open').length,
    claimed: bounties.filter((b) => b.status === 'claimed').length,
    completed: bounties.filter((b) => b.status === 'completed').length,
    totalReward: bounties.reduce((acc, b) => acc + (b.reward || 0), 0),
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Bounty Board</h1>
            <p className="text-gray-600 mt-1">
              Contribuisci al progetto e guadagna ricompense in MYZ
            </p>
          </div>
          <div className="mt-3 md:mt-0 text-sm text-gray-500">
            Ricompense totali: <span className="font-semibold text-gray-800">{stats.totalReward} MYZ</span>
          </div>
        </div>

        {/* Analytics cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-md border">
            <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
            <div className="text-sm text-gray-500">Bounty totali</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md border">
            <div className="text-2xl font-bold text-green-600">{stats.open}</div>
            <div className="text-sm text-gray-500">Aperti</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md border">
            <div className="text-2xl font-bold text-yellow-600">{stats.claimed}</div>
            <div className="text-sm text-gray-500">In lavorazione</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md border">
            <div className="text-2xl font-bold text-blue-600">{stats.completed}</div>
            <div className="text-sm text-gray-500">Completati</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-md border mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ricerca</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cerca bounty..."
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stato</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tutti</option>
                <option value="open">Aperti</option>
                <option value="claimed">In lavorazione</option>
                <option value="completed">Completati</option>
                <option value="closed">Chiusi</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Difficoltà</label>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tutte</option>
                <option value="beginner">Principiante</option>
                <option value="intermediate">Intermedio</option>
                <option value="advanced">Avanzato</option>
                <option value="expert">Esperto</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>
        )}

        {loading ? (
          <div className="text-center py-8">Caricamento...</div>
        ) : filteredBounties.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Nessun bounty trovato con i filtri selezionati.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredBounties.map((bounty) => (
              <Link
                to={`/bounties/${bounty._id}`}
                key={bounty._id}
                className="bg-white p-4 rounded-lg shadow-md border hover:shadow-lg transition"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-blue-700 hover:underline">
                    {bounty.title}
                  </h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${LVL_COLOR(bounty.level)}`}>
                    {bounty.level || 'intermediate'}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">{bounty.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-emerald-700">
                    {bounty.reward} MYZ
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLOR(bounty.status)}`}>
                    {bounty.status || 'open'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

const STATUS_COLOR = (s) => STATUS_COLORS[s] || STATUS_COLORS.open;
const LVL_COLOR = (l) => LEVEL_COLORS[l] || LEVEL_COLORS.intermediate;

export default BountyBoard;