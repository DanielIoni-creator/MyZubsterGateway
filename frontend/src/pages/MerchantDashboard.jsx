import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/axiosConfig';
import Layout from '../components/Layout/Layout';

const PostPreview = ({ post, onClose, onApprove }) => {
  if (!post) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Preview header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h3 className="font-semibold text-gray-900">Anteprima Post</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Post content preview */}
        <div className="p-6">
          {/* Social media card mockup */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center p-4 space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {post.storeName?.[0] || 'N'}
              </div>
              <div>
                <p className="font-semibold text-sm text-gray-900">{post.storeName || 'Il mio negozio'}</p>
                <p className="text-xs text-gray-500">{post.platform || 'Social Media'}</p>
              </div>
            </div>
            {/* Image */}
            {post.imageUrl && (
              <div className="bg-gray-100 aspect-video flex items-center justify-center">
                <img src={post.imageUrl} alt="Post" className="w-full h-full object-cover" />
              </div>
            )}
            {/* Content */}
            <div className="p-4">
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{post.content}</p>
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {post.tags.map((tag, i) => (
                    <span key={i} className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {/* Actions */}
            <div className="border-t border-gray-100 px-4 py-3 flex items-center space-x-6 text-gray-400">
              <span className="flex items-center space-x-1 text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span>{post.likes || 0}</span>
              </span>
              <span className="flex items-center space-x-1 text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>{post.comments || 0}</span>
              </span>
            </div>
          </div>

          {/* Approve button */}
          {post.status === 'pending' && (
            <button
              onClick={() => onApprove(post.id)}
              className="mt-4 w-full py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-medium"
            >
              Approva e Pubblica
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const PostCard = ({ post, onPreview, onApprove }) => {
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    published: 'bg-blue-100 text-blue-800',
    rejected: 'bg-red-100 text-red-800',
  };

  const statusLabels = {
    pending: 'In attesa',
    approved: 'Approvato',
    published: 'Pubblicato',
    rejected: 'Rifiutato',
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
      {/* Post image */}
      {post.imageUrl ? (
        <div className="aspect-video bg-gray-100">
          <img src={post.imageUrl} alt="Post" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="aspect-video bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
          <svg className="w-12 h-12 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}

      <div className="p-4">
        {/* Status badge */}
        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[post.status] || 'bg-gray-100 text-gray-600'}`}>
          {statusLabels[post.status] || post.status}
        </span>

        {/* Content preview */}
        <p className="mt-2 text-sm text-gray-700 line-clamp-2">{post.content}</p>

        {/* Date and platform */}
        <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
          <span>{post.createdAt ? new Date(post.createdAt).toLocaleDateString('it-IT') : '—'}</span>
          <span className="bg-gray-100 px-2 py-0.5 rounded">{post.platform || 'Social'}</span>
        </div>

        {/* Actions */}
        <div className="mt-3 flex space-x-2">
          <button
            onClick={() => onPreview(post)}
            className="flex-1 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition text-gray-700"
          >
            Anteprima
          </button>
          {post.status === 'pending' && (
            <button
              onClick={() => onApprove(post.id)}
              className="flex-1 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              Approva
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const MerchantDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [store, setStore] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [previewPost, setPreviewPost] = useState(null);
  const [storeStats, setStoreStats] = useState({ totalPosts: 0, published: 0, pending: 0, likes: 0 });

  const fetchStoreData = useCallback(async () => {
    try {
      const response = await api.get('/api/robot/merchant/profile');
      setStore(response.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setStore(null);
      }
    }
  }, []);

  const fetchPosts = useCallback(async () => {
    try {
      const response = await api.get('/api/robot/merchant/posts');
      const postsData = response.data?.posts || response.data || [];
      setPosts(postsData);
      const published = postsData.filter((p) => p.status === 'published').length;
      const pending = postsData.filter((p) => p.status === 'pending').length;
      const totalLikes = postsData.reduce((sum, p) => sum + (p.likes || 0), 0);
      setStoreStats({
        totalPosts: postsData.length,
        published,
        pending,
        likes: totalLikes,
      });
    } catch (err) {
      console.error('Failed to fetch posts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStoreData();
    fetchPosts();
  }, [fetchStoreData, fetchPosts]);

  const handleGeneratePost = async () => {
    setGenerating(true);
    setError('');
    try {
      const response = await api.post('/api/robot/social/generate', {
        storeId: store?.id,
      });
      setSuccess('Post generato con successo!');
      setPosts((prev) => [response.data, ...prev]);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Errore durante la generazione del post.');
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async (postId) => {
    try {
      const response = await api.patch(`/api/robot/social/posts/${postId}/approve`);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, status: 'approved' } : p))
      );
      setPreviewPost(null);
      setSuccess('Post approvato e pubblicato!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Errore durante l'approvazione.');
    }
  };

  const handleReject = async (postId) => {
    try {
      await api.patch(`/api/robot/social/posts/${postId}/reject`);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, status: 'rejected' } : p))
      );
      setSuccess('Post rifiutato.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Errore durante il rifiuto.');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
        </div>
      </Layout>
    );
  }

  // If no store registered, show onboarding prompt
  if (!store && activeTab !== 'new') {
    return (
      <Layout>
        <div className="max-w-lg mx-auto text-center py-12">
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Nessun negozio registrato</h2>
          <p className="text-gray-500 mb-6">Registra il tuo negozio per iniziare a generare post con i robot social.</p>
          <Link
            to="/merchant/onboarding"
            className="inline-block px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition font-medium"
          >
            Registra Negozio
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard Negozio</h1>
            <p className="text-gray-500 mt-1">Gestisci i tuoi post e monitora le performance</p>
          </div>
          <div className="flex space-x-3 mt-4 sm:mt-0">
            <button
              onClick={handleGeneratePost}
              disabled={generating}
              className="px-5 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition disabled:opacity-50 font-medium text-sm flex items-center space-x-2"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  <span>Generazione...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Genera Post</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error / Success messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
            {success}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Post Totali', value: storeStats.totalPosts, color: 'bg-blue-500', icon: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z' },
            { label: 'Pubblicati', value: storeStats.published, color: 'bg-green-500', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
            { label: 'In attesa', value: storeStats.pending, color: 'bg-yellow-500', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
            { label: 'Mi Piace', value: storeStats.likes, color: 'bg-pink-500', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center`}>
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Store info card */}
        {store && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-8 flex items-center space-x-4">
            {store.photoUrl ? (
              <img src={store.photoUrl} alt={store.name} className="w-12 h-12 rounded-lg object-cover" />
            ) : (
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 font-bold text-lg">{store.name?.[0] || 'N'}</span>
              </div>
            )}
            <div>
              <p className="font-semibold text-gray-900">{store.name}</p>
              <p className="text-sm text-gray-500">{store.category || 'Negozio'}</p>
            </div>
          </div>
        )}

        {/* Post Grid */}
        {posts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Nessun post generato</h3>
            <p className="text-gray-500 mb-4">Clicca su "Genera Post" per creare il tuo primo post con il robot social.</p>
            <button
              onClick={handleGeneratePost}
              disabled={generating}
              className="px-5 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition disabled:opacity-50"
            >
              {generating ? 'Generazione...' : 'Genera il primo Post'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onPreview={setPreviewPost}
                onApprove={handleApprove}
              />
            ))}
          </div>
        )}

        {/* Post Preview Modal */}
        {previewPost && (
          <PostPreview
            post={previewPost}
            onClose={() => setPreviewPost(null)}
            onApprove={handleApprove}
          />
        )}
      </div>
    </Layout>
  );
};

export default MerchantDashboard;
