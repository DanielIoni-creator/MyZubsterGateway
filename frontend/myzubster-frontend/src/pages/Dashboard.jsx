import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout/Layout';

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Benvenuto, {user?.name || user?.email}!</h2>
          <p className="text-gray-600">Questa è la tua area personale. Da qui puoi gestire le tue competenze, offerte e richieste.</p>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
