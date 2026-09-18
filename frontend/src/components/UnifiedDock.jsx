import React from 'react';

export default function UnifiedDock({ currentRoute, navigate, hasActiveMatch, onArenaLockedClick }) {
  const dockItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'grid_view' },
    { id: 'lobby', label: 'Lobby', icon: 'sports_esports' },
    { id: 'arena', label: 'Arena', icon: 'bolt', locked: !hasActiveMatch },
    { id: 'leaderboard', label: 'Rankings', icon: 'emoji_events' },
    { id: 'history', label: 'History', icon: 'history' },
  ];

  const handleClick = (item) => {
    if (item.id === 'arena' && !hasActiveMatch) {
      if (onArenaLockedClick) {
        onArenaLockedClick();
      }
      return;
    }
    navigate(item.id);
  };

  return (
    <nav
      aria-label="Unified Navigation Dock"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-2xl shadow-indigo-950/10 rounded-2xl px-2.5 py-1.5 flex items-center gap-1.5 transition-all duration-200"
    >
      {dockItems.map((item) => {
        const isActive = currentRoute === item.id;
        const isLocked = item.locked;

        return (
          <button
            key={item.id}
            onClick={() => handleClick(item)}
            title={isLocked ? 'Arena Locked (Match in Queue or Private Room Required)' : item.label}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-2 text-xs font-medium transition-all duration-150 relative ${
              isActive
                ? 'bg-indigo-50/90 text-indigo-600 font-bold shadow-sm shadow-indigo-500/10 border border-indigo-100'
                : isLocked
                ? 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/60 border border-transparent'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent'
            }`}
          >
            <span className="material-symbols-outlined text-[17px] leading-none">
              {isLocked ? 'lock' : item.icon}
            </span>
            <span>{item.label}</span>

            {/* Indicator when live match is active */}
            {item.id === 'arena' && hasActiveMatch && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse ml-0.5" />
            )}

            {item.id === 'lobby' && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
