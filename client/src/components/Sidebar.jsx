import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Mail, Users, BarChart3, LogOut,
  ChevronLeft, ChevronRight, Layers, Settings, User,
  Zap
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { cn } from '../lib/utils.js';

const NAV_ITEMS = [
  { name: 'Dashboard',    path: '/',            icon: LayoutDashboard },
  { name: 'Campaigns',   path: '/campaigns',    icon: Mail },
  { name: 'Subscribers', path: '/subscribers',  icon: Users },
  { name: 'Analytics',   path: '/analytics',    icon: BarChart3 },
  { name: 'Queue',       path: '/queue',        icon: Zap },
];

const BOTTOM_ITEMS = [
  { name: 'Profile',  path: '/profile',  icon: User },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation();
  const { logout, user } = useAuth();

  const isActive = (path) =>
    path === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(path);

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex flex-col bg-white border-r border-border transition-all duration-200 ease-in-out",
        collapsed ? "w-[60px]" : "w-[220px]"
      )}
    >
      {/* ── Brand ── */}
      <div className={cn(
        "flex h-14 items-center border-b border-border shrink-0",
        collapsed ? "justify-center px-0" : "px-4 gap-2"
      )}>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-white shrink-0">
          <Layers className="h-4 w-4" />
        </div>
        {!collapsed && (
          <span className="text-sm font-semibold text-text tracking-tight">
            Mailtide
          </span>
        )}
      </div>

      {/* ── Primary nav ── */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.name}
              to={item.path}
              title={collapsed ? item.name : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-150",
                active
                  ? "bg-accent text-white shadow-sm"
                  : "text-muted hover:bg-gray-100 hover:text-text",
                collapsed && "justify-center px-2"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* ── Bottom section ── */}
      <div className="border-t border-border py-3 px-2 space-y-0.5">
        {BOTTOM_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.name}
              to={item.path}
              title={collapsed ? item.name : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-150",
                active
                  ? "bg-accent text-white shadow-sm"
                  : "text-muted hover:bg-gray-100 hover:text-text",
                collapsed && "justify-center px-2"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}

        {/* User pill */}
        {!collapsed && user && (
          <div className="mt-2 pt-2 border-t border-border/60">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name || 'User'}
                  className="h-6 w-6 rounded-full object-cover border border-accent/20 shrink-0"
                />
              ) : (
                <div className="h-6 w-6 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-accent uppercase">
                    {(user.email || user.name || 'U')[0]}
                  </span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-text truncate leading-tight">
                  {user.name || 'Account'}
                </p>
                <p className="text-[10px] text-muted truncate leading-tight">
                  {user.email}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={logout}
          title={collapsed ? "Logout" : undefined}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-muted hover:bg-red-50 hover:text-red-600 transition-all duration-150",
            collapsed && "justify-center px-2"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>

      {/* ── Collapse toggle ── */}
      <button
        onClick={onToggle}
        className={cn(
          "absolute top-[52px] -right-3 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-white shadow-dropdown text-muted hover:text-text transition-colors duration-150"
        )}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed
          ? <ChevronRight className="h-3 w-3" />
          : <ChevronLeft className="h-3 w-3" />
        }
      </button>
    </aside>
  );
}
