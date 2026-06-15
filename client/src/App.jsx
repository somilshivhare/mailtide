import React from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Sidebar from './components/Sidebar.jsx';
import Navbar from './components/Navbar.jsx';

// Pages
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Subscribers from './pages/Subscribers.jsx';
import Campaigns from './pages/Campaigns.jsx';
import CampaignDetail from './pages/CampaignDetail.jsx';
import Analytics from './pages/Analytics.jsx';

/**
 * Layout wrapper providing sidebar navigation and scrollable main content.
 */
function Layout() {
  return (
    <div className="min-h-screen bg-background text-text">
      {/* Fixed Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="pl-64 flex flex-col min-h-screen">
        {/* Sticky Header */}
        <Navbar />

        {/* Scrollable page body */}
        <main className="flex-1 overflow-y-auto bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/subscribers" element={<Subscribers />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/campaigns/:id" element={<CampaignDetail />} />
          <Route path="/analytics" element={<Analytics />} />
        </Route>
      </Route>

      {/* Catch-all redirect to dashboard */}
      <Route path="*" element={<Dashboard />} />
    </Routes>
  );
}
