import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout/Layout';
import api from '../utils/axiosConfig';

const OfferDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOffer = async () => {
      try {
        const res = await api.get(`/offers/${id}`);
        setOffer(res.data);
      } catch (err) {
        setError('Errore nel caricamento');
      } finally {
        setLoading(false);
      }
    };
    fetchOffer();
  }, [id]);

  if (loading) return <Layout><div>Caricamento...</div></Layout>;
  if (error) return <Layout><div>{error}</div></Layout>;
  if (!offer) return <Layout><div>Offerta non trovata</div></Layout>;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold">{offer.title}</h1>
        <p className="text-gray-600 mt-2">{offer.description}</p>
        <p className="text-lg font-semibold mt-4">Prezzo: {offer.price} XMR</p>
      </div>
    </Layout>
  );
};

export default OfferDetail;
