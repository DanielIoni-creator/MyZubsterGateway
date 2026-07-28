import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout/Layout';

const Profile = () => {
  const { user } = useAuth();

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Il mio Profilo</h1>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="space-y-4">
            <div>
              <label className="block text-gray-600 text-sm">Nome</label>
              <p className="text-lg font-medium">{user?.name || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-gray-600 text-sm">Email</label>
              <p className="text-lg font-medium">{user?.email || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-gray-600 text-sm">Data di registrazione</label>
              <p className="text-lg font-medium">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
