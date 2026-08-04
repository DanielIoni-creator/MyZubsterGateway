import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout/Layout';
import api from '../utils/axiosConfig';

const Tokens = () => {
  const { user } = useAuth();
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { fetchTokens(); }, []);

  const fetchTokens = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tokens');
      setTokens(response.data);
    } catch (err) {
      setError('Errore nel caricamento dei token');
    } finally {
      setLoading(false);
    }
  };

  const assetTypeMap = {
    realestate: '🏠 Immobile',
    equity: '📈 Azioni',
    commodity: '🥇 Materia Prima',
    art: '🎨 Arte',
    debt: '💳 Debito',
    revenue: '💰 Ricavi',
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">💎 Token Finanziari</h1>
          {user && (
            <Link to="/tokens/create" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              + Crea Token
            </Link>
          )}
        </div>
        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
        {loading ? (
          <div className="text-center py-8">Caricamento...</div>
        ) : tokens.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Nessun token disponibile.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tokens.map((token) => (
              <div key={token._id} className="bg-white p-6 rounded-lg shadow-md border hover:shadow-lg transition">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold">{token.name}</h2>
                    <p className="text-sm text-gray-500">{token.symbol}</p>
                  </div>
                  <span className="text-sm bg-gray-200 px-2 py-1 rounded-full">{assetTypeMap[token.assetType]}</span>
                </div>
                <p className="text-gray-600 mt-2 text-sm">{token.assetDescription}</p>
                <div className="mt-4 space-y-1 text-sm">
                  <p><span className="font-medium">Prezzo:</span> €{token.tokenPrice}</p>
                  <p><span className="font-medium">Supply:</span> {token.totalSupply}</p>
                  <p><span className="font-medium">Valore Asset:</span> €{token.assetValue}</p>
                  {token.assetLocation && <p><span className="font-medium">Posizione:</span> {token.assetLocation}</p>}
                </div>
                <div className="mt-4">
                  <Link to={`/tokens/${token._id}`} className="block bg-blue-600 text-white text-center py-2 rounded-lg hover:bg-blue-700">
                    Dettaglio
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Tokens;
