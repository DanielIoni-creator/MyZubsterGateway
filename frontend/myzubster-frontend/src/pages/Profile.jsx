import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout/Layout';

const Profile = () => {
  const { user } = useAuth();
  return (
    <Layout>
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold">Profilo</h1>
        <p className="mt-4"><strong>Nome:</strong> {user?.name || 'N/A'}</p>
        <p><strong>Email:</strong> {user?.email || 'N/A'}</p>
      </div>
    </Layout>
  );
};

export default Profile;
