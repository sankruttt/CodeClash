import React, { useState } from 'react';
import logoImg from '../assets/codeclash-logo.png';

const STITCH_LOGO_URL =
  'https://lh3.googleusercontent.com/aida/AEtjO1VkaA6KQmBEfQfLHrYIjjR4oGKWIHp1_CurDV8dkUOLfm1wboPXJDDOmiO5_Q53SFKmerv3V5dASxAes2QZ-yTXXenCF6yKwyLIXHfUUPl8D8tSTN5le0QvrjWh8S6juas_AMrCR3zcvP88ujMW1j8OexMQ66cxqVtd5iNHn2TfzJFyMz6Y7pPsl3P16O_L7a-ZoUxxhgm52M3B-owITbZTNWjcuONl60VhdeU7hfHLiuFQ31CuCvkvAkk';

export default function TopAppBar({
  currentRoute,
  navigate,
  currentUser,
  onLogout,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const q = searchQuery.toLowerCase().trim();
    if (q.includes('rank') || q.includes('ladder') || q.includes('board') || q.includes('top') || q.includes('apex') || q.includes('master') || q.includes('diamond')) {
      navigate('leaderboard');
    } else if (q.includes('match') || q.includes('history') || q.includes('recent') || q.includes('duel') || q.includes('past')) {
      navigate('history');
    } else if (q.includes('lobby') || q.includes('queue') || q.includes('room') || q.includes('scrimmage')) {
      navigate('lobby');
    } else if (q.includes('profile') || q.includes('stat') || q.includes('xp') || q.includes('lp') || q.includes('tier')) {
      navigate('profile');
    } else {
      navigate('leaderboard');
    }
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
        <form onSubmit={handleSearch} className="relative flex items-center">
          <span className="material-symbols-outlined absolute left-3 text-slate-400 text-base pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search algorithms, matches, adversaries..."
            className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-800 text-xs pl-9 pr-20 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors placeholder:text-slate-400 font-sans shadow-2xs"
          />
          <button
            type="submit"
            className="absolute right-1.5 px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 active:scale-95 text-indigo-700 border border-indigo-200 font-mono text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
            title="Press Enter or click to search"
          >
            <span>Enter</span>
            <span className="material-symbols-outlined text-[12px]">keyboard_return</span>
          </button>
        </form>
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
                {currentUser?.rating || 1500} LP
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
