import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout/Layout';
import api from '../utils/axiosConfig';

const CreateToken = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    symbol: '',
    totalSupply: '',
    assetValue: '',
    tokenPrice: '',
    assetType: 'realestate',
    assetDescription: '',
    assetLocation: '',
    contractAddress: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const res = await api.post('/tokens', {
        ...form,
        totalSupply: Number(form.totalSupply),
        assetValue: Number(form.assetValue),
        tokenPrice: Number(form.tokenPrice),
        contractAddress: form.contractAddress || '0x0000000000000000000000000000000000000000'
      });
      setMessage('✅ Token creato con successo!');
      setForm({
        name: '',
        symbol: '',
        totalSupply: '',
        assetValue: '',
        tokenPrice: '',
        assetType: 'realestate',
        assetDescription: '',
        assetLocation: '',
        contractAddress: ''
      });
      setTimeout(() => navigate('/tokens'), 2000);
    } catch (err) {
      console.error('Errore creazione token:', err);
      setError('❌ ' + (err.response?.data?.error || err.message || 'Errore nella creazione del token'));
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Crea Nuovo Token</h1>
        {message && <div className="bg-green-100 text-green-700 p-3 rounded mb-4">{message}</div>}
        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nome *</label>
              <input name="name" value={form.name} onChange={handleChange} className="w-full border p-2 rounded" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Simbolo *</label>
              <input name="symbol" value={form.symbol} onChange={handleChange} className="w-full border p-2 rounded" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Supply totale *</label>
              <input type="number" name="totalSupply" value={form.totalSupply} onChange={handleChange} className="w-full border p-2 rounded" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Valore asset (USD) *</label>
              <input type="number" name="assetValue" value={form.assetValue} onChange={handleChange} className="w-full border p-2 rounded" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Prezzo token (USD) *</label>
              <input type="number" step="0.01" name="tokenPrice" value={form.tokenPrice} onChange={handleChange} className="w-full border p-2 rounded" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tipo asset *</label>
              <select name="assetType" value={form.assetType} onChange={handleChange} className="w-full border p-2 rounded">
                <option value="realestate">Real Estate</option>
                <option value="equity">Equity</option>
                <option value="art">Art</option>
                <option value="commodity">Commodity</option>
                <option value="debt">Debt</option>
                <option value="revenue">Revenue</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Descrizione *</label>
              <textarea name="assetDescription" value={form.assetDescription} onChange={handleChange} className="w-full border p-2 rounded" rows="2" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Posizione</label>
              <input name="assetLocation" value={form.assetLocation} onChange={handleChange} className="w-full border p-2 rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Indirizzo contratto</label>
              <input name="contractAddress" value={form.contractAddress} onChange={handleChange} className="w-full border p-2 rounded" placeholder="0x0000000000000000000000000000000000000000" />
            </div>
          </div>
          <button type="submit" disabled={loading} className="mt-6 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Creazione in corso...' : 'Crea Token'}
          </button>
        </form>
      </div>
    </Layout>
  );
};

export default CreateToken;
