import React from 'react';
import { BookOpen, Sparkles, Plus, History, LogOut, Bell, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  currentTab: 'studio' | 'archive';
  onSelectTab: (tab: 'studio' | 'archive') => void;
  onNewSession: () => void;
  sessionCount: number;
  onOpenNotifications: () => void;
  onOpenAdmin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onNewSession,
  sessionCount,
  onOpenNotifications,
  onOpenAdmin,
}) => {
  const { user, isAdmin, signOut } = useAuth();

  return (
    <header 
      id="main-header" 
      className="sticky top-0 z-30 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 tracking-tight text-base sm:text-lg">
                AI Journal
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200/60">
                <Sparkles className="w-3 h-3 text-blue-500" />
                Reflective Companion
              </span>
            </div>
          </div>
        </div>

        {/* Center Tabs */}
        <nav className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200/80">
          <button
            id="tab-btn-studio"
            type="button"
            onClick={() => onSelectTab('studio')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${
              currentTab === 'studio'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Studio</span>
          </button>
          <button
            id="tab-btn-archive"
            type="button"
            onClick={() => onSelectTab('archive')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${
              currentTab === 'archive'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Archive</span>
            {sessionCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 font-semibold text-slate-700">
                {sessionCount}
              </span>
            )}
          </button>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Slack Notifications configuration */}
          <button
            id="btn-nav-notifications"
            type="button"
            onClick={onOpenNotifications}
            title="Slack Integration (Milestone & Breakthrough Alerts)"
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors relative"
            aria-label="Slack Integration"
          >
            <Bell className="w-4 h-4" />
          </button>

          {/* Admin Dashboard / RBAC */}
          <button
            id="btn-nav-admin"
            type="button"
            onClick={onOpenAdmin}
            title="Admin Dashboard (RBAC)"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              isAdmin
                ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span className="hidden sm:inline">Admin</span>
            {isAdmin && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
            )}
          </button>

          <button
            id="btn-nav-new-session"
            type="button"
            onClick={onNewSession}
            className="hidden md:flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Entry</span>
          </button>

          {/* User profile & sign out */}
          <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-slate-200">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-8 h-8 rounded-full border border-slate-200 object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-medium text-xs">
                {(user?.displayName || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <button
              id="btn-nav-sign-out"
              type="button"
              onClick={signOut}
              title="Sign Out"
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
