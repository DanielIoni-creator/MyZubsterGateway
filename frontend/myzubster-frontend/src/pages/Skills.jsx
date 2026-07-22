import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout/Layout';
import api from '../utils/axiosConfig';

const Skills = () => {
  const { user } = useAuth();
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    experienceLevel: 'intermediate',
  });

  useEffect(() => {
    fetchSkills();
  }, []);

  const fetchSkills = async () => {
    try {
      setLoading(true);
      const response = await api.get('/skills');
      setSkills(response.data);
      setError('');
    } catch (err) {
      setError('Errore nel caricamento delle competenze');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/skills/${editingId}`, formData);
      } else {
        await api.post('/skills', formData);
      }
      setFormData({ name: '', description: '', category: '', experienceLevel: 'intermediate' });
      setShowForm(false);
      setEditingId(null);
      fetchSkills();
    } catch (err) {
      setError('Errore nel salvare la competenza');
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Sei sicuro di voler eliminare questa competenza?')) return;
    try {
      await api.delete(`/skills/${id}`);
      fetchSkills();
    } catch (err) {
      setError('Errore nell\'eliminare la competenza');
      console.error(err);
    }
  };

  const handleEdit = (skill) => {
    setFormData({
      name: skill.name,
      description: skill.description || '',
      category: skill.category || '',
      experienceLevel: skill.experienceLevel || 'intermediate',
    });
    setEditingId(skill._id);
    setShowForm(true);
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Le mie Competenze</h1>
          <button
            onClick={() => { setShowForm(!showForm); setEditingId(null); setFormData({ name: '', description: '', category: '', experienceLevel: 'intermediate' }); }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            {showForm ? 'Annulla' : '+ Nuova Competenza'}
          </button>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
            {error}
          </div>
        )}

        {showForm && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingId ? 'Modifica Competenza' : 'Nuova Competenza'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2">Nome *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">Categoria</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-gray-700 mb-2">Descrizione</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">Livello di esperienza</label>
                  <select
                    value={formData.experienceLevel}
                    onChange={(e) => setFormData({ ...formData, experienceLevel: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="beginner">Principiante</option>
                    <option value="intermediate">Intermedio</option>
                    <option value="advanced">Avanzato</option>
                    <option value="expert">Esperto</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="mt-4 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
              >
                {editingId ? 'Aggiorna' : 'Crea'}
              </button>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">Caricamento...</div>
        ) : skills.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Non hai ancora competenze. Creane una!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {skills.map((skill) => (
              <div key={skill._id} className="bg-white p-4 rounded-lg shadow-md border">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold">{skill.name}</h3>
                    {skill.category && (
                      <span className="text-sm bg-gray-200 px-2 py-1 rounded-full">
                        {skill.category}
                      </span>
                    )}
                    {skill.experienceLevel && (
                      <span className="text-sm ml-2 bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        {skill.experienceLevel}
                      </span>
                    )}
                    {skill.description && (
                      <p className="text-gray-600 mt-2 text-sm">{skill.description}</p>
                    )}
                  </div>
                  <div className="space-x-2">
                    <button
                      onClick={() => handleEdit(skill)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Modifica
                    </button>
                    <button
                      onClick={() => handleDelete(skill._id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Elimina
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Skills;
