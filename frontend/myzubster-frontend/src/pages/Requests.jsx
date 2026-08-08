import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout/Layout';
import api from '../utils/axiosConfig';

const Requests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await api.get('/requests');
        setRequests(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, []);

  if (!user) return <Layout><div>Devi essere loggato</div></Layout>;

  return (
    <Layout>
      <h1 className="text-2xl font-bold">Le mie Richieste</h1>
      {loading ? <div>Caricamento...</div> : (
        <div className="mt-4 space-y-4">
          {requests.length === 0 ? <p>Nessuna richiesta</p> : requests.map(r => (
            <div key={r._id} className="bg-white p-4 rounded shadow">
              <p>Offerta: {r.offer?.title || 'N/A'}</p>
              <p>Stato: {r.status}</p>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
};

export default Requests;
