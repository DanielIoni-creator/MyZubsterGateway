import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout/Layout';
import api from '../utils/axiosConfig';

const CreateOffer = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
    deliveryTime: '3',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/offers', {
        ...formData,
        price: parseFloat(formData.price),
        deliveryTime: parseInt(formData.deliveryTime),
      });
      navigate('/offers');
    } catch (err) {
      setError(err.response?.data?.message || 'Errore nella creazione dell\'offerta');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-xl">Devi essere loggato per creare un'offerta.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold mb-6">Nuova Offerta</h1>
        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Titolo *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Descrizione *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="4"
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-gray-700 mb-2">Prezzo (XMR) *</label>
              <input
                type="number"
                name="price"
                step="0.01"
                min="0.01"
                value={formData.price}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Categoria</label>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="es. Sviluppo, Design, Scrittura"
              />
            </div>
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 mb-2">Tempo di consegna (giorni)</label>
            <select
              name="deliveryTime"
              value={formData.deliveryTime}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1">1 giorno</option>
              <option value="2">2 giorni</option>
              <option value="3">3 giorni</option>
              <option value="5">5 giorni</option>
              <option value="7">7 giorni</option>
              <option value="14">14 giorni</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Creazione...' : 'Pubblica Offerta'}
          </button>
        </form>
      </div>
    </Layout>
  );
};

export default CreateOffer;
