import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Settings, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { cn } from '../lib/utils.js';

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/subscribers': 'Subscribers',
  '/analytics': 'Analytics',
  '/campaigns': 'Campaigns',
  '/profile': 'Profile',
  '/settings': 'Settings',
  '/queue': 'Queue Monitor',
};

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef(null);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/campaigns/')) return 'Campaign Details';
    return PAGE_TITLES[path] || 'Mailtide';
  };

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [searchOpen]);

  // Quick search — navigate to pages matching query
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Escape') {
      setSearchOpen(false);
      setSearchQuery('');
    }
    if (e.key === 'Enter' && searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (q.includes('camp')) navigate('/campaigns');
      else if (q.includes('sub')) navigate('/subscribers');
      else if (q.includes('analy')) navigate('/analytics');
      else if (q.includes('queue')) navigate('/queue');
      else if (q.includes('profile')) navigate('/profile');
      else if (q.includes('set')) navigate('/settings');
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-white/95 backdrop-blur-sm px-6 shrink-0">
      {/* Left: Page title */}
      <div className="flex items-center gap-2 min-w-0">
        <h1 className="text-sm font-semibold text-text tracking-tight">
          {getPageTitle()}
        </h1>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1.5">
        {/* Search */}
        {searchOpen ? (
          <div className="flex items-center gap-2 border border-border rounded-lg px-3 h-8 bg-white shadow-sm w-64">
            <Search className="h-3.5 w-3.5 text-muted shrink-0" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search pages... (Enter to go)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="flex-1 text-sm bg-transparent outline-none text-text placeholder:text-muted min-w-0"
            />
            <button
              onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
              className="text-muted hover:text-text transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 h-8 px-3 text-xs text-muted hover:text-text border border-border rounded-lg hover:bg-gray-50 transition-all duration-150"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:block">Search</span>
            <kbd className="hidden sm:block text-[10px] font-mono bg-gray-100 px-1 py-0.5 rounded border border-gray-200">⌘K</kbd>
          </button>
        )}


        {/* Settings shortcut */}
        <button
          onClick={() => navigate('/settings')}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:text-text hover:bg-gray-100 transition-all duration-150"
          title="Settings"
        >
          <Settings className="h-4 w-4" />
        </button>

        {/* User avatar */}
        {user && (
          <button
            onClick={() => navigate('/profile')}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 border border-accent/20 hover:bg-accent/20 transition-all duration-150 shrink-0"
            title={user.email}
          >
            <span className="text-xs font-bold text-accent uppercase">
              {(user.email || user.name || 'U')[0]}
            </span>
          </button>
        )}
      </div>
    </header>
  );
}
