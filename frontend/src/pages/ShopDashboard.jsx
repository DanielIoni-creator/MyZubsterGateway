import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout/Layout';
import { getShopProfile, getPostHistory, generatePost, approvePost, deletePost, getShopPhotos } from '../api/shop';

const ShopDashboard = () => {
  const { user } = useAuth();
  const [shop, setShop] = useState(null);
  const [posts, setPosts] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [postPreview, setPostPreview] = useState(null);
  const [message, setMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [shopRes, postsRes, photosRes] = await Promise.all([
        getShopProfile().catch(() => null),
        getPostHistory().catch(() => ({ data: [] })),
        getShopPhotos().catch(() => ({ data: [] })),
      ]);
      if (shopRes?.data) setShop(shopRes.data);
      if (postsRes?.data) setPosts(Array.isArray(postsRes.data) ? postsRes.data : []);
      if (photosRes?.data) setPhotos(Array.isArray(photosRes.data) ? photosRes.data : []);
    } catch (err) {
      console.error('Load error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleGeneratePost = async () => {
    if (!newPostContent.trim()) return;
    setGenerating(true);
    setMessage(null);
    try {
      const res = await generatePost({ content: newPostContent, imageIds: photos.slice(0, 3).map((p) => p.id).filter(Boolean) });
      if (res.data) {
        setPostPreview(res.data);
        setMessage({ type: 'success', text: 'Post generato con successo!' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Errore durante la generazione' });
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async (postId) => {
    try {
      await approvePost(postId);
      setPosts(posts.map((p) => p.id === postId ? { ...p, status: 'approved' } : p));
      setMessage({ type: 'success', text: 'Post approvato!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Errore nell\'approvazione' });
    }
  };

  const handleDelete = async (postId) => {
    if (!confirm('Eliminare questo post?')) return;
    try {
      await deletePost(postId);
      setPosts(posts.filter((p) => p.id !== postId));
      setMessage({ type: 'success', text: 'Post eliminato' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Errore nell\'eliminazione' });
    }
  };

  const generateQuickPost = (template) => {
    setNewPostContent(template);
  };

  const quickTemplates = [
    '🎉 Nuovo arrivo! Venite a scoprire le nostre ultime novità...',
    '🔥 Offerta speciale oggi! Sconto del 20% su tutti i prodotti...',
    '📸 Ecco una foto dei nostri prodotti freschi di oggi...',
    '💬 I nostri clienti dicono: "Servizio eccellente!"',
  ];

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (!shop) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto text-center py-12">
          <div className="text-6xl mb-4">🏪</div>
          <h1 className="text-3xl font-bold mb-4">Nessun Negozio</h1>
          <p className="text-gray-600 mb-6">Non hai ancora registrato un negozio. Inizia ora!</p>
          <a href="/shop/onboarding" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition">Registra Negozio</a>
        </div>
      </Layout>
    );
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'posts', label: 'Storico Post', icon: '📝' },
    { id: 'generate', label: 'Genera Post', icon: '🤖' },
    { id: 'photos', label: 'Foto', icon: '🖼️' },
  ];

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Shop Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-2xl font-bold text-blue-600 dark:text-blue-300">
              {shop.name?.[0] || 'S'}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{shop.name}</h1>
              <p className="text-gray-500 text-sm">{shop.description?.slice(0, 120)}</p>
              <div className="flex gap-3 mt-2 text-xs text-gray-400">
                <span>📁 {shop.category}</span>
                <span>📧 {shop.email}</span>
                {shop.website && <span>🌐 {shop.website}</span>}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{posts.length}</div>
              <div className="text-xs text-gray-500">Post generati</div>
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${
            message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
          }`}>
            {message.text}
            <button onClick={() => setMessage(null)} className="float-right font-bold">✕</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
              activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
            }`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-md">
              <div className="text-3xl mb-2">📝</div>
              <div className="text-2xl font-bold">{posts.length}</div>
              <div className="text-sm text-gray-500">Post Totali</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-md">
              <div className="text-3xl mb-2">✅</div>
              <div className="text-2xl font-bold">{posts.filter((p) => p.status === 'approved').length}</div>
              <div className="text-sm text-gray-500">Approvati</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-md">
              <div className="text-3xl mb-2">🖼️</div>
              <div className="text-2xl font-bold">{photos.length}</div>
              <div className="text-sm text-gray-500">Foto</div>
            </div>
            <div className="sm:col-span-2 lg:col-span-3 bg-white dark:bg-gray-800 p-5 rounded-lg shadow-md">
              <h3 className="font-semibold mb-3">Azioni Rapide</h3>
              <div className="flex flex-wrap gap-2">
                <a href="/shop/generate" className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition" onClick={(e) => { e.preventDefault(); setActiveTab('generate'); }}>🤖 Genera Post</a>
                <a href="/shop/posts" className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-sm hover:bg-gray-300 transition" onClick={(e) => { e.preventDefault(); setActiveTab('posts'); }}>📝 Vedi Storico</a>
              </div>
            </div>
          </div>
        )}

        {/* Posts Tab */}
        {activeTab === 'posts' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div className="p-4 border-b dark:border-gray-700">
              <h2 className="text-lg font-semibold">Storico Post</h2>
            </div>
            {posts.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="text-4xl mb-3">📭</div>
                <p>Nessun post ancora generato. Crea il tuo primo post!</p>
              </div>
            ) : (
              <div className="divide-y dark:divide-gray-700">
                {posts.map((post) => (
                  <div key={post.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm mb-1">{post.content}</p>
                        <div className="flex gap-3 text-xs text-gray-400">
                          <span>📅 {new Date(post.createdAt).toLocaleDateString()}</span>
                          <span className={`px-2 py-0.5 rounded-full ${
                            post.status === 'approved' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' :
                            post.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300' :
                            'bg-gray-100 dark:bg-gray-700 text-gray-500'
                          }`}>{post.status || 'bozza'}</span>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {post.status !== 'approved' && (
                          <button onClick={() => handleApprove(post.id)} className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition">Approva</button>
                        )}
                        <button onClick={() => handleDelete(post.id)} className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition">Elimina</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Generate Tab */}
        {activeTab === 'generate' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-2">Genera un Nuovo Post</h2>
            <p className="text-sm text-gray-500 mb-4">Scrivi il contenuto o usa un template per generare un post social automaticamente.</p>

            {/* Quick templates */}
            <div className="flex flex-wrap gap-2 mb-4">
              {quickTemplates.map((t, i) => (
                <button key={i} onClick={() => generateQuickPost(t)} className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition">{t.slice(0, 30)}...</button>
              ))}
            </div>

            <textarea
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder="Scrivi il contenuto del post..."
              rows={4}
              className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 mb-4"
            />

            <div className="flex gap-2 items-center">
              <button onClick={handleGeneratePost} disabled={generating || !newPostContent.trim()}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition">
                {generating ? '⏳ Generazione...' : '🤖 Genera con Robot'}
              </button>
              {photos.length > 0 && <span className="text-xs text-gray-400">🖼️ {Math.min(photos.length, 3)} foto incluse</span>}
            </div>

            {/* Post Preview */}
            {postPreview && (
              <div className="mt-6 border border-purple-200 dark:border-purple-800 rounded-lg p-4 bg-purple-50 dark:bg-purple-900/20">
                <h3 className="font-medium text-purple-700 dark:text-purple-300 mb-2">📝 Anteprima Post</h3>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm mb-3">
                  <p className="text-sm">{postPreview.content || newPostContent}</p>
                  {photos.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {photos.slice(0, 3).map((p, i) => (
                        <div key={i} className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center text-xs text-gray-400">Foto</div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { handleApprove(postPreview.id); setPostPreview(null); setNewPostContent(''); }} className="px-4 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition">✅ Approva e Pubblica</button>
                  <button onClick={() => setPostPreview(null)} className="px-4 py-1.5 text-sm border rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition">✏️ Modifica</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Photos Tab */}
        {activeTab === 'photos' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-2">Foto del Negozio</h2>
            <p className="text-sm text-gray-500 mb-4">Le foto caricate saranno usate nei post generati automaticamente.</p>
            {photos.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-3">📸</div>
                <p>Nessuna foto caricata</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {photos.map((photo, i) => (
                  <div key={i} className="relative group">
                    <img src={photo.url || '/placeholder.svg'} alt={photo.name || `Foto ${i + 1}`} className="w-full h-32 object-cover rounded-lg" />
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4">
              <a href="/shop/onboarding" className="text-sm text-blue-600 hover:underline">+ Aggiungi altre foto</a>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ShopDashboard;