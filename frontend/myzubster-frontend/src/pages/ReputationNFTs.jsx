import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout/Layout';
import api from '../utils/axiosConfig';

const ReputationNFTs = () => {
  const { user } = useAuth();
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    const fetchNFTs = async () => {
      try {
        const res = await api.get('/reputation/nfts');
        setNfts(res.data);
      } catch (err) {
        setError('Errore nel caricamento NFT');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchNFTs();
  }, [user]);

  if (!user) return <Layout><div>Devi essere loggato</div></Layout>;
  if (loading) return <Layout><div>Caricamento...</div></Layout>;
  if (error) return <Layout><div className="text-red-500">{error}</div></Layout>;
  if (nfts.length === 0) return <Layout><div>Nessun NFT di reputazione trovato</div></Layout>;

  return (
    <Layout>
      <h1 className="text-2xl font-bold">🏆 I miei NFT</h1>
      {nfts.map(nft => (
        <div key={nft._id} className="bg-white p-4 rounded shadow my-2">
          <h2 className="text-xl">{nft.name}</h2>
          <p>{nft.description}</p>
        </div>
      ))}
    </Layout>
  );
};

export default ReputationNFTs;
