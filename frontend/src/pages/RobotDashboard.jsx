import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import Layout from '../components/Layout/Layout';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { Activity, Briefcase, DollarSign, AlertCircle } from 'lucide-react';

const SOCKET_SERVER_URL = window.location.hostname === 'localhost' ? 'http://localhost:10000' : '/';

const RobotDashboard = () => {
  const [robots, setRobots] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [filter, setFilter] = useState('all'); // all, idle, working, delivering, dispute
  const [escrows, setEscrows] = useState([]);

  useEffect(() => {
    // Fetch initial data
    fetch('/api/robot/all')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setRobots(data.data);
        }
      })
      .catch(err => console.error('Error fetching initial robots:', err));

    const socket = io(SOCKET_SERVER_URL);

    socket.on('connect', () => {
      console.log('Connected to WebSocket server');
    });

    socket.on('robot:status', (data) => {
      setRobots((prev) => {
        const existing = prev.find(r => r.robotId === data.robotId);
        if (existing) {
          return prev.map(r => r.robotId === data.robotId ? { ...r, status: data.status, timestamp: data.timestamp } : r);
        }
        return [...prev, { robotId: data.robotId, status: data.status, timestamp: data.timestamp }];
      });
    });

    socket.on('job:progress', (data) => {
      setJobs((prev) => {
        const existing = prev.find(j => j.jobId === data.jobId);
        if (existing) {
          return prev.map(j => j.jobId === data.jobId ? { ...j, progress: data.progress, timestamp: data.timestamp } : j);
        }
        return [...prev, { jobId: data.jobId, progress: data.progress, timestamp: data.timestamp }];
      });
    });

    socket.on('escrow:update', (data) => {
      setEscrows((prev) => {
        const existing = prev.find(e => e.escrowId === data.escrowId);
        if (existing) {
          return prev.map(e => e.escrowId === data.escrowId ? { ...e, status: data.status, amount: data.amount, timestamp: data.timestamp } : e);
        }
        return [...prev, { escrowId: data.escrowId, status: data.status, amount: data.amount, timestamp: data.timestamp }];
      });
    });

    return () => socket.disconnect();
  }, []);

  const filteredRobots = robots.filter(r => filter === 'all' || r.status === filter);
  
  const activeRobotsCount = robots.filter(r => ['working', 'delivering'].includes(r.status)).length;
  const inProgressJobsCount = jobs.filter(j => j.progress < 100).length;
  const totalMyzEarned = escrows.filter(e => e.status === 'COMPLETED').reduce((acc, curr) => acc + (curr.amount || 0), 0);
  
  // Data for charts
  const robotStatusData = [
    { name: 'Idle', count: robots.filter(r => r.status === 'idle').length },
    { name: 'Working', count: robots.filter(r => r.status === 'working').length },
    { name: 'Delivering', count: robots.filter(r => r.status === 'delivering').length },
    { name: 'Dispute', count: robots.filter(r => r.status === 'dispute').length },
  ];

  const jobsData = jobs.slice(-10).map((j, i) => ({
    name: `Job ${j.jobId || i}`,
    progress: j.progress
  }));

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">Real-Time Robot Dashboard</h1>
        
        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex items-center space-x-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
              <Activity size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active Robots</p>
              <h3 className="text-2xl font-bold dark:text-white">{activeRobotsCount}</h3>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex items-center space-x-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-full">
              <Briefcase size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Jobs in Progress</p>
              <h3 className="text-2xl font-bold dark:text-white">{inProgressJobsCount}</h3>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex items-center space-x-4">
            <div className="p-3 bg-yellow-100 text-yellow-600 rounded-full">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">MYZ Earned (Completed)</p>
              <h3 className="text-2xl font-bold dark:text-white">{totalMyzEarned}</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex items-center space-x-4">
            <div className="p-3 bg-red-100 text-red-600 rounded-full">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Disputes</p>
              <h3 className="text-2xl font-bold dark:text-white">{robots.filter(r => r.status === 'dispute').length}</h3>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 dark:text-white">Robot Status Distribution</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={robotStatusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 dark:text-white">Recent Jobs Progress</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={jobsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="progress" stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Filter and List */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
            <h2 className="text-xl font-semibold dark:text-white">Robot Fleet Status</h2>
            <div className="flex space-x-2 mt-4 sm:mt-0">
              {['all', 'idle', 'working', 'delivering', 'dispute'].map(status => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${filter === status ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300'}`}
                >
                  {status.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Robot ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Last Update</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredRobots.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="px-6 py-4 text-center text-gray-500">No robots found for this status.</td>
                  </tr>
                ) : (
                  filteredRobots.map(r => (
                    <tr key={r.robotId}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{r.robotId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${r.status === 'idle' ? 'bg-gray-100 text-gray-800' : 
                            r.status === 'working' ? 'bg-blue-100 text-blue-800' : 
                            r.status === 'delivering' ? 'bg-yellow-100 text-yellow-800' : 
                            r.status === 'dispute' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {r.timestamp ? new Date(r.timestamp).toLocaleTimeString() : 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default RobotDashboard;
