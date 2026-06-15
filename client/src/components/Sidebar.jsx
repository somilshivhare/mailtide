import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Mail, Users, BarChart3, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { cn } from '../lib/utils.js';

export default function Sidebar() {
  const location = useLocation();
  const { logout } = useAuth();

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Campaigns', path: '/campaigns', icon: Mail },
    { name: 'Subscribers', path: '/subscribers', icon: Users },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 }
  ];

  return (
    <div className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-border bg-surface">
      {/* Brand logo */}
      <div className="flex h-16 items-center px-6 border-b border-border">
        <Link to="/" className="flex items-center gap-2">
          <span className="bg-gradient-to-r from-accent to-[#b06aff] bg-clip-text text-xl font-bold tracking-tight text-transparent">
            🌊 Mailtide
          </span>
        </Link>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 space-y-1 px-4 py-6">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = 
            item.path === '/' 
              ? location.pathname === '/' 
              : location.pathname.startsWith(item.path);

          return (
            <Link
              key={item.name}
              to={item.path}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-accent/10 text-accent border border-accent/20 shadow-glow" 
                  : "text-muted hover:bg-white/5 hover:text-text border border-transparent"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Logout bottom */}
      <div className="border-t border-border p-4">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-md border border-transparent px-3 py-2 text-sm font-medium text-muted hover:bg-danger/10 hover:text-danger hover:border-danger/20 transition-all duration-200"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </div>
  );
}
