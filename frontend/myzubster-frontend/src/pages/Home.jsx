import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout/Layout';

const Home = () => {
  return (
    <Layout>
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold mb-4">Benvenuto su MyZubster</h1>
        <p className="text-xl text-gray-600 mb-8">
          Scambia competenze e servizi in modo sicuro e privato
        </p>
        <div className="space-x-4">
          <Link to="/register" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">
            Inizia ora
          </Link>
          <Link to="/skills" className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300">
            Esplora Skills
          </Link>
        </div>
      </div>
    </Layout>
  );
};

export default Home;
