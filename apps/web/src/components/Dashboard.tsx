import React from 'react';

const Dashboard = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Eco-Herd Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 shadow rounded-lg border-l-4 border-green-500">
          <h2 className="text-gray-500">Total Cattle</h2>
          <p className="text-3xl font-bold">12</p>
        </div>
        <div className="bg-white p-4 shadow rounded-lg border-l-4 border-blue-500">
          <h2 className="text-gray-500">Active</h2>
          <p className="text-3xl font-bold">7</p>
        </div>
        <div className="bg-white p-4 shadow rounded-lg border-l-4 border-yellow-500">
          <h2 className="text-gray-500">Needs Attention</h2>
          <p className="text-3xl font-bold">1</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
