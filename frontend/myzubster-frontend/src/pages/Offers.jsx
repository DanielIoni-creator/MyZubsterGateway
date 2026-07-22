import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout/Layout';
import api from '../utils/axiosConfig';

const Offers = () => {
  const { user } = useAuth();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/offers');
      setOffers(response.data);
      setError('');
    } catch (err) {
      setError('Errore nel caricamento delle offerte');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-xl">Devi essere loggato per vedere questa pagina.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Offerte Disponibili</h1>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">Caricamento...</div>
        ) : offers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Nessuna offerta disponibile al momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {offers.map((offer) => (
              <div key={offer._id} className="bg-white p-4 rounded-lg shadow-md border">
                <h3 className="text-lg font-semibold">{offer.title}</h3>
                <p className="text-gray-600 text-sm mt-1">{offer.description}</p>
                <div className="mt-2 flex justify-between items-center">
                  <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    {offer.price} XMR
                  </span>
                  <span className="text-sm text-gray-500">
                    {offer.seller?.name || 'Anonimo'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Offers;
