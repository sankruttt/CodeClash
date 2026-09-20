import React, { useState, useRef, useEffect } from 'react';
import logoImg from '../assets/codeclash-logo.png';
import { SCORING } from '../config/scoring';
import { leaderboardAPI } from '../services/api';

const STITCH_LOGO_URL =
  'https://lh3.googleusercontent.com/aida/AEtjO1VkaA6KQmBEfQfLHrYIjjR4oGKWIHp1_CurDV8dkUOLfm1wboPXJDDOmiO5_Q53SFKmerv3V5dASxAes2QZ-yTXXenCF6yKwyLIXHfUUPl8D8tSTN5le0QvrjWh8S6juas_AMrCR3zcvP88ujMW1j8OexMQ66cxqVtd5iNHn2TfzJFyMz6Y7pPsl3P16O_L7a-ZoUxxhgm52M3B-owITbZTNWjcuONl60VhdeU7hfHLiuFQ31CuCvkvAkk';

export default function TopAppBar({
  currentRoute,
  navigate,
  currentUser,
  onLogout,
  onUserSearch,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const searchRef = useRef(null);
  const searchBoxRef = useRef(null);

  // Cmd/Ctrl+K focuses the global search
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Live backend user search (debounced)
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setDropdownOpen(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await leaderboardAPI.getLeaderboard({ page: 1, limit: 6, search: q });
        setSearchResults(res?.data?.leaderboard || []);
        setDropdownOpen(true);
      } catch {
        setSearchResults([]);
        setDropdownOpen(false);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close the dropdown when clicking outside the search box
  useEffect(() => {
    const handler = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const applySearch = (raw) => {
    const q = String(raw || '').trim();
    if (!q) return;
    setSearchQuery(q);
    setSearchResults([]);
    setDropdownOpen(false);
    if (onUserSearch) onUserSearch(q);
    navigate('leaderboard');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    applySearch(searchQuery);
  };

  const handleResultSelect = (user) => {
    applySearch(user?.username || user?.name);
  };

  const getBreadcrumb = () => {
    switch (currentRoute) {
      case 'dashboard':
        return 'OPERATIONAL HQ';
      case 'lobby':
        return 'BATTLE LOBBY';
      case 'arena':
        return '1v1 LIVE ARENA';
      case 'private-room':
        return 'PRIVATE COMBAT ROOM';
      case 'leaderboard':
        return 'GLOBAL LEADERBOARD';
      case 'history':
        return 'MATCH HISTORY';
      case 'profile':
        return 'COMBATANT PROFILE';
      default:
        return 'ARENA';
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-white/90 backdrop-blur-md border-b border-slate-200/80 z-40 px-4 sm:px-6 flex items-center justify-between shadow-xs">
      {/* Brand & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('dashboard')}
          className="flex items-center gap-2.5 group cursor-pointer focus:outline-none"
        >
          <img
            src={STITCH_LOGO_URL}
            onError={(e) => {
              e.currentTarget.src = logoImg;
            }}
            alt="Code Clash Logo"
            className="h-7 w-auto object-contain transition-transform group-hover:scale-105"
          />
          <span className="font-black tracking-wider text-slate-900 text-lg font-mono leading-none select-none">
            CODE<span className="text-indigo-600">CLASH</span>
          </span>
        </button>

        <span className="text-slate-300 font-mono text-sm hidden sm:inline">
          /
        </span>
        <span className="font-mono text-xs text-slate-500 font-semibold tracking-wider uppercase hidden sm:inline">
          {getBreadcrumb()}
        </span>
      </div>

      {/* Center Search */}
      <div className="flex-1 max-w-md mx-6 hidden md:block">
        <div ref={searchBoxRef} className="relative">
          <form onSubmit={handleSearch} className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-3 text-slate-400 text-base pointer-events-none">
              search
            </span>
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search combatants by name or @handle..."
              className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-800 text-xs pl-9 pr-14 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors placeholder:text-slate-400 font-sans shadow-sm"
            />
            <kbd className="absolute right-2 font-mono text-[10px] px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-500 font-medium shadow-xs">⌘K</kbd>
          </form>

          {/* Live User Search Results Dropdown */}
          {dropdownOpen && (searching || searchResults.length > 0) && (
            <div className="absolute top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
              {searching ? (
                <div className="px-3 py-3 text-center text-xs text-slate-400 font-mono">Searching combatants...</div>
              ) : (
                <ul className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {searchResults.map((u) => (
                    <li key={u.userId || u.id}>
                      <button
                        type="button"
                        onClick={() => handleResultSelect(u)}
                        className="w-full text-left px-3 py-2.5 flex items-center gap-2.5 hover:bg-indigo-50/60 transition-colors cursor-pointer"
                      >
                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-sky-400 text-white font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                          {u.avatar || (u.username ? u.username.slice(0, 2).toUpperCase() : 'CC')}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-slate-900 truncate">
                            {u.name || u.username}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 truncate">@{u.username}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-[10px] font-mono text-indigo-600 font-bold">
                            {(u.rating || SCORING.defaultRating).toLocaleString()} LP
                          </div>
                          <div className="text-[9px] font-mono text-slate-400">
                            {u.wins || 0}W • {u.losses || 0}L
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                  {searchResults.length === 0 && (
                    <li className="px-3 py-3 text-center text-xs text-slate-400 font-mono">
                      No combatants found.
                    </li>
                  )}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {/* User Stats & Actions */}
      <div className="flex items-center gap-3">
        {/* Live Grid Status */}
        <div className="hidden xl:flex items-center gap-1.5 text-xs font-mono text-slate-500 mr-1">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] text-slate-600 font-medium">
            1,248 ONLINE
          </span>
        </div>

        <div className="h-5 w-[1px] bg-slate-200 hidden sm:block"></div>

        {/* LP & Rank Badge */}
        <div
          onClick={() => navigate('profile')}
          className="cursor-pointer flex items-center gap-2 pl-1 group"
          title="View Combatant Profile"
        >
          <div className="hidden lg:flex flex-col items-end leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono font-semibold text-sky-600">
                {currentUser?.tier?.toLowerCase() === 'diamond ii' ? 'Diamond' : (currentUser?.tier || 'Diamond')}
              </span>
              <span className="text-[11px] font-mono text-slate-300">•</span>
              <span className="text-[11px] font-mono text-slate-800 font-semibold">
                {currentUser?.rating || SCORING.defaultRating} LP
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider group-hover:text-indigo-600 transition-colors">
              {currentUser?.handle || 'Kaelen_V'}
            </span>
          </div>

          <div className="relative">
            <div className="w-8 h-8 rounded-full border border-slate-200 object-cover ring-2 ring-indigo-50 shadow-xs bg-gradient-to-tr from-indigo-500 to-sky-400 text-white font-mono font-bold flex items-center justify-center text-xs">
              {currentUser?.avatar || 'KV'}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
          </div>
        </div>

        {/* Settings / Dropdown Button */}
        <div className="relative">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center border border-slate-200 shadow-2xs"
            title="Settings & Profile"
          >
            <span className="material-symbols-outlined text-[17px]">
              settings
            </span>
          </button>

          {showSettings && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50 text-xs font-mono">
              <button
                onClick={() => {
                  setShowSettings(false);
                  navigate('profile');
                }}
                className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">person</span>
                Combatant Profile
              </button>
              <button
                onClick={() => {
                  setShowSettings(false);
                  navigate('private-room');
                }}
                className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">meeting_room</span>
                Private Room
              </button>
              <div className="my-1 border-t border-slate-100" />
              <button
                onClick={() => {
                  setShowSettings(false);
                  if (onLogout) onLogout();
                }}
                className="w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-semibold"
              >
                <span className="material-symbols-outlined text-sm">logout</span>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
