import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

export default function Navbar() {
  const location = useLocation();
  const { user } = useAuth();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    if (path.startsWith('/subscribers')) return 'Subscribers';
    if (path.startsWith('/analytics')) return 'Analytics';
    if (path.startsWith('/campaigns/')) return 'Campaign Details';
    if (path.startsWith('/campaigns')) return 'Campaigns';
    return 'Mailtide';
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-background/80 px-8 backdrop-blur-md">
      <h1 className="text-lg font-semibold text-text m-0 tracking-tight">
        {getPageTitle()}
      </h1>
      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-xs text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            <span>{user.email}</span>
          </div>
        )}
      </div>
    </header>
  );
}
