import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout/Layout';
import { saveShopProfile, getShopStatus, uploadShopPhoto } from '../api/shop';

const steps = [
  { id: 1, label: 'Info Negozio' },
  { id: 2, label: 'Foto & Logo' },
  { id: 3, label: 'Collega Robot' },
  { id: 4, label: 'Conferma' },
];

const ShopOnboarding = () => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [shopData, setShopData] = useState({
    name: '',
    description: '',
    category: 'ristorazione',
    email: user?.email || '',
    phone: '',
    address: '',
    website: '',
  });
  const [photos, setPhotos] = useState([]);
  const [preview, setPreview] = useState(null);
  const [generatedPost, setGeneratedPost] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setShopData({ ...shopData, [e.target.name]: e.target.value });
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    const newPhotos = files.map((f) => ({
      file: f,
      preview: URL.createObjectURL(f),
    }));
    setPhotos([...photos, ...newPhotos]);
  };

  const removePhoto = (index) => {
    URL.revokeObjectURL(photos[index].preview);
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSimulatePost = () => {
    const mockPost = {
      content: `🎉 Scopri ${shopData.name}! ${shopData.description?.slice(0, 80) || 'Prodotti e servizi di qualità'} — visita il nostro sito ${shopData.website || 'online'}! #MyZubster #Shop`,
      imageCount: photos.length,
      platform: 'social',
      generatedAt: new Date().toISOString(),
    };
    setGeneratedPost(mockPost);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('shop', JSON.stringify(shopData));
      photos.forEach((p) => formData.append('photos', p.file));

      const res = await saveShopProfile(shopData);
      if (res.status === 200 || res.status === 201) {
        setSuccess(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Errore durante il salvataggio');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step < 4) setStep(step + 1);
    else handleSubmit();
  };
  const prevStep = () => { if (step > 1) setStep(step - 1); };

  if (success) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto text-center py-12">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-3xl font-bold mb-4">Negozio Registrato!</h1>
          <p className="text-gray-600 mb-6">Il tuo negozio è stato creato con successo. Ora puoi generare post e gestire la tua presenza social.</p>
          <a href="/shop" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">Vai alla Dashboard</a>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Registra il tuo Negozio</h1>
        <p className="text-gray-600 mb-6">Compila i dati per iniziare a generare post social con il tuo robot</p>

        {/* Step indicator */}
        <div className="flex justify-between mb-8">
          {steps.map((s) => (
            <div key={s.id} className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                step >= s.id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>{s.id}</div>
              <span className="text-xs mt-1 text-gray-500">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Step 1: Shop Info */}
        {step === 1 && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-4">
            <h2 className="text-xl font-semibold">Informazioni Negozio</h2>
            <div>
              <label className="block text-sm font-medium mb-1">Nome Negozio *</label>
              <input name="name" value={shopData.name} onChange={handleChange} placeholder="es. Panetteria Bio" className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Descrizione</label>
              <textarea name="description" value={shopData.description} onChange={handleChange} placeholder="Descrivi il tuo negozio..." rows={3} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Categoria</label>
                <select name="category" value={shopData.category} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600">
                  <option value="ristorazione">Ristorazione</option>
                  <option value="moda">Moda</option>
                  <option value="servizi">Servizi</option>
                  <option value="tecnologia">Tecnologia</option>
                  <option value="artigianato">Artigianato</option>
                  <option value="altro">Altro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input name="email" value={shopData.email} onChange={handleChange} type="email" className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Telefono</label>
                <input name="phone" value={shopData.phone} onChange={handleChange} placeholder="+39 123 456 7890" className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Sito Web</label>
                <input name="website" value={shopData.website} onChange={handleChange} placeholder="https://" className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Indirizzo</label>
              <input name="address" value={shopData.address} onChange={handleChange} placeholder="Via Roma 1, Milano" className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600" />
            </div>
          </div>
        )}

        {/* Step 2: Photos & Logo */}
        {step === 2 && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-4">
            <h2 className="text-xl font-semibold">Foto e Logo</h2>
            <p className="text-sm text-gray-500">Carica foto del tuo negozio e prodotti. La prima foto sarà usata come logo.</p>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-400 transition cursor-pointer"
              onClick={() => document.getElementById('photo-upload').click()}>
              <p className="text-gray-500">Clicca per caricare foto</p>
              <p className="text-xs text-gray-400">PNG, JPG, WebP — max 5MB</p>
              <input id="photo-upload" type="file" multiple accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </div>
            {photos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                {photos.map((p, i) => (
                  <div key={i} className="relative group">
                    <img src={p.preview} alt={`Foto ${i + 1}`} className="w-full h-32 object-cover rounded-lg" />
                    <button onClick={() => removePhoto(i)} className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full text-xs opacity-0 group-hover:opacity-100 transition">✕</button>
                    {i === 0 && <span className="absolute bottom-1 left-1 bg-blue-600 text-white text-xs px-2 py-0.5 rounded">Logo</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Connect Robot */}
        {step === 3 && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-4">
            <h2 className="text-xl font-semibold">Collega il Robot Social</h2>
            <p className="text-sm text-gray-500">Il robot social genererà post automaticamente per il tuo negozio. Clicca "Genera Post" per vedere un'anteprima.</p>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h3 className="font-medium mb-2">Dati di Input</h3>
              <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-300">
                <li><strong>Nome:</strong> {shopData.name || '—'}</li>
                <li><strong>Descrizione:</strong> {shopData.description?.slice(0, 60) || '—'}</li>
                <li><strong>Foto:</strong> {photos.length} caricate</li>
              </ul>
            </div>
            <button onClick={handleSimulatePost} className="w-full bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 transition font-medium">
              🤖 Genera Post (Anteprima)
            </button>
            {generatedPost && (
              <div className="border border-purple-200 dark:border-purple-800 rounded-lg p-4 bg-purple-50 dark:bg-purple-900/20">
                <h3 className="font-medium text-purple-700 dark:text-purple-300 mb-2">📝 Post Generato</h3>
                <p className="text-sm mb-2">{generatedPost.content}</p>
                <div className="flex gap-2 text-xs text-gray-500">
                  <span>🖼️ {generatedPost.imageCount} immagini</span>
                  <span>📅 {new Date(generatedPost.generatedAt).toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 4 && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-4">
            <h2 className="text-xl font-semibold">Conferma Dati</h2>
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <span className="text-gray-500">Nome:</span><span className="font-medium">{shopData.name}</span>
                <span className="text-gray-500">Categoria:</span><span className="font-medium">{shopData.category}</span>
                <span className="text-gray-500">Email:</span><span className="font-medium">{shopData.email}</span>
                <span className="text-gray-500">Telefono:</span><span className="font-medium">{shopData.phone || '—'}</span>
                <span className="text-gray-500">Sito:</span><span className="font-medium">{shopData.website || '—'}</span>
                <span className="text-gray-500">Foto:</span><span className="font-medium">{photos.length} caricata(e)</span>
              </div>
              {generatedPost && (
                <div className="mt-4 border-t pt-4">
                  <span className="text-gray-500">Post generato:</span>
                  <p className="mt-1 text-gray-700 dark:text-gray-300 italic">"{generatedPost.content.slice(0, 100)}..."</p>
                </div>
              )}
            </div>
            {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">{error}</div>}
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between mt-6">
          <button onClick={prevStep} disabled={step === 1} className="px-6 py-2 border rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Indietro</button>
          <button onClick={nextStep} disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
            {loading ? 'Salvataggio...' : step === 4 ? 'Conferma e Salva' : 'Avanti'}
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default ShopOnboarding;