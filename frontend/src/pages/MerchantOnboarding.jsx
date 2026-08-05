import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/axiosConfig';
import Layout from '../components/Layout/Layout';

const MerchantOnboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    storeName: '',
    category: '',
    description: '',
    email: '',
    phone: '',
    address: '',
    photo: null,
    photoPreview: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        photo: file,
        photoPreview: URL.createObjectURL(file),
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Create FormData for photo upload
      const data = new FormData();
      data.append('name', formData.storeName);
      data.append('category', formData.category);
      data.append('description', formData.description);
      data.append('email', formData.email);
      data.append('phone', formData.phone);
      data.append('address', formData.address);
      if (formData.photo) {
        data.append('photo', formData.photo);
      }

      const response = await api.post('/api/robot/merchant/create', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccess('Negozio registrato con successo!');
      setTimeout(() => navigate('/merchant/dashboard'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Errore durante la registrazione del negozio.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Benvenuto, Negozio!</h1>
            <p className="text-gray-500 mt-2">Registra il tuo negozio per iniziare a generare post con i nostri robot social</p>
          </div>

          {/* Steps indicator */}
          <div className="flex items-center justify-center mb-8 space-x-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div className={\`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium \${
                  step === s ? 'bg-purple-600 text-white' :
                  step > s ? 'bg-green-500 text-white' :
                  'bg-gray-200 text-gray-500'
                }\`}>
                  {step > s ? '✓' : s}
                </div>
                {s < 3 && <div className={\`w-12 h-1 mx-2 rounded \${
                  step > s ? 'bg-green-500' : 'bg-gray-200'
                }\`} />}
              </div>
            ))}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Step 1: Store Info */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Informazioni del Negozio</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome del Negozio *</label>
                  <input
                    type="text"
                    name="storeName"
                    value={formData.storeName}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                    placeholder="es. Il mio negozio"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                  >
                    <option value="">Seleziona categoria</option>
                    <option value="abbigliamento">Abbigliamento</option>
                    <option value="alimentari">Alimentari</option>
                    <option value="artigianato">Artigianato</option>
                    <option value="elettronica">Elettronica</option>
                    <option value="servizi">Servizi</option>
                    <option value="altro">Altro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione *</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    required
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition resize-none"
                    placeholder="Descrivi il tuo negozio..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Foto del Negozio</label>
                  <div className="flex items-center space-x-4">
                    <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 rounded-lg px-4 py-2.5 border border-gray-300 transition">
                      <span className="text-sm text-gray-600">Carica Foto</span>
                      <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                    </label>
                    {formData.photoPreview && (
                      <img src={formData.photoPreview} alt="Preview" className="w-16 h-16 rounded-lg object-cover" />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Contact Info */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Contatti</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                    placeholder="negozio@esempio.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                    placeholder="+39 123 456 7890"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Indirizzo</label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition resize-none"
                    placeholder="Via Roma 123, Milano"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Preview & Confirm */}
            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Riepilogo</h2>
                <div className="bg-gray-50 rounded-xl p-6 space-y-3">
                  <div className="flex items-center space-x-3">
                    {formData.photoPreview && (
                      <img src={formData.photoPreview} alt="Store" className="w-16 h-16 rounded-lg object-cover" />
                    )}
                    <div>
                      <p className="font-semibold text-gray-900">{formData.storeName || '—'}</p>
                      <p className="text-sm text-gray-500">{formData.category || 'Nessuna categoria'}</p>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 pt-3">
                    <p className="text-sm text-gray-600"><span className="font-medium">Descrizione:</span> {formData.description || '—'}</p>
                    <p className="text-sm text-gray-600"><span className="font-medium">Email:</span> {formData.email || '—'}</p>
                    <p className="text-sm text-gray-600"><span className="font-medium">Telefono:</span> {formData.phone || '—'}</p>
                    <p className="text-sm text-gray-600"><span className="font-medium">Indirizzo:</span> {formData.address || '—'}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500 italic">
                  Confermando, il tuo negozio verrà registrato e potrai iniziare a generare post con i robot social.
                </p>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex justify-between mt-8">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  Indietro
                </button>
              ) : (
                <div />
              )}
              {step < 3 ? (
                <button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                >
                  Avanti
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                >
                  {loading ? 'Registrazione...' : 'Conferma e Registra'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default MerchantOnboarding;
