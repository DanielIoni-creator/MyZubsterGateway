import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout/Layout';
import { getBounty, claimBounty } from '../api/bounty';

const STATUS_BADGE = {
  open: 'bg-green-100 text-green-800',
  claimed: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-blue-100 text-blue-800',
  closed: 'bg-gray-100 text-gray-600',
};

const BountyDetail = () => {
  const { id } = useParams();
  const [bounty, setBounty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [claimMsg, setClaimMsg] = useState(null);

  useEffect(() => {
    fetchBounty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchBounty = async () => {
    try {
      setLoading(true);
      const response = await getBounty(id);
      setBounty(response.data);
      setError('');
    } catch (err) {
      setError('Errore nel caricamento del bounty');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    try {
      setClaiming(true);
      setClaimMsg(null);
      const response = await claimBounty(id);
      setBounty(response.data);
      setClaimMsg({ type: 'success', text: 'Bounty rivendicato con successo!' });
    } catch (err) {
      setClaimMsg({
        type: 'error',
        text: err.response?.data?.message || 'Errore durante la rivendicazione',
      });
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">Caricamento...</div>
      </Layout>
    );
  }

  if (error || !bounty) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-xl text-red-600">{error || 'Bounty non trovato'}</p>
          <Link to="/bounties" className="text-blue-600 hover:underline mt-2 inline-block">
            ← Torna al Bounty Board
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <Link to="/bounties" className="text-blue-600 hover:underline mb-4 inline-block">
          ← Torna al Bounty Board
        </Link>

        <div className="bg-white rounded-lg shadow-md border overflow-hidden">
          <div className="p-6 border-b">
            <div className="flex justify-between items-start">
              <h1 className="text-2xl font-bold">{bounty.title}</h1>
              <span className={`text-sm px-3 py-1 rounded-full ${STATUS_BADGE[bounty.status] || STATUS_BADGE.open}`}>
                {bounty.status || 'open'}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-4">
              <span className="text-lg font-semibold text-emerald-700">
                🏆 {bounty.reward} MYZ
              </span>
              <span className="text-sm px-2 py-1 rounded-full bg-gray-100 text-gray-700 capitalize">
                {bounty.level || 'intermediate'}
              </span>
              {bounty.labels?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {bounty.labels.map((l) => (
                    <span key={l} className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700">
                      {l}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="p-6">
            <h2 className="text-lg font-semibold mb-2">Descrizione</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{bounty.description}</p>

            {bounty.acceptanceCriteria?.length > 0 && (
              <div className="mt-6">
                <h2 className="text-lg font-semibold mb-2">Criteri di accettazione</h2>
                <ul className="space-y-1">
                  {bounty.acceptanceCriteria.map((c, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-green-600">✓</span>
                      <span className="text-gray-700">{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {bounty.deadline && (
              <div className="mt-6 text-sm text-gray-500">
                <strong>Scadenza:</strong> {new Date(bounty.deadline).toLocaleDateString()}
              </div>
            )}

            {claimMsg && (
              <div
                className={`mt-6 p-3 rounded ${
                  claimMsg.type === 'success'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {claimMsg.text}
              </div>
            )}

            <div className="mt-6">
              {bounty.status === 'open' ? (
                <button
                  onClick={handleClaim}
                  disabled={claiming}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-medium transition"
                >
                  {claiming ? 'Rivendicazione...' : 'Rivendica questo bounty'}
                </button>
              ) : bounty.status === 'claimed' ? (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded">
                  Questo bounty è già stato rivendicato da qualcuno.
                </div>
              ) : (
                <div className="bg-gray-100 p-3 rounded text-gray-600">
                  Questo bounty non è più disponibile.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default BountyDetail;