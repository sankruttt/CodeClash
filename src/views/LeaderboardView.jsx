import React, { useState } from 'react';

export default function LeaderboardView({ currentUser }) {
  const [stackFilter, setStackFilter] = useState('All Stacks');
  const [searchQuery, setSearchQuery] = useState('');

  const ladderList = [
    { rank: '01', name: 'NullPointer', clan: 'APEX', rating: 2914, winRate: '84.2%', duels: 242, stack: 'Rust', tier: 'APEX', avatar: 'NP' },
    { rank: '02', name: 'Valkyrie_X', clan: 'ZERO', rating: 2780, winRate: '81.2%', duels: 194, stack: 'C++', tier: 'APEX', avatar: 'VX' },
    { rank: '03', name: 'AlgoQueen', clan: 'BYTE', rating: 2740, winRate: '79.4%', duels: 210, stack: 'TypeScript', tier: 'APEX', avatar: 'AQ' },
    { rank: '04', name: 'X_Recursive', clan: 'STACK', rating: 2680, winRate: '76.8%', duels: 180, stack: 'Python', tier: 'MASTER', avatar: 'XR' },
    { rank: '05', name: 'BitShift', clan: 'CORE', rating: 2610, winRate: '74.2%', duels: 165, stack: 'Rust', tier: 'MASTER', avatar: 'BS' },
    { rank: '06', name: 'Maya Chen', clan: 'DEV', rating: 2540, winRate: '72.1%', duels: 152, stack: 'TypeScript', tier: 'MASTER', avatar: 'MC' },
    { rank: '07', name: 'Theo Brooks', clan: 'LITE', rating: 2490, winRate: '70.5%', duels: 138, stack: 'Go', tier: 'DIAMOND I', avatar: 'TB' },
    { rank: '08', name: 'Nia Okafor', clan: 'NODE', rating: 2450, winRate: '69.8%', duels: 144, stack: 'Python', tier: 'DIAMOND I', avatar: 'NO' },
  ];

  const filteredLadder = ladderList.filter((item) => {
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase()) && !item.clan.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (stackFilter !== 'All Stacks' && item.stack !== stackFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex-1 min-w-0 px-4 pt-4 sm:px-6 sm:pt-6 pb-48 subtle-grid">
      <div className="max-w-[1440px] mx-auto space-y-5">
        {/* Header Title */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Global Leaderboard
            </h1>
            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed mt-1 font-sans">
              Real-time deterministic ratings across competitive clusters. Calibrations run continuously on sub-millisecond execution telemetry.
            </p>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between font-mono text-xs">
          <div className="flex flex-wrap items-center gap-2">

            {/* Stack Filter */}
            <div className="flex items-center gap-1 overflow-x-auto py-0.5">
              {['All Stacks', 'Rust', 'C++', 'TypeScript', 'Python'].map((stk) => (
                <button
                  key={stk}
                  onClick={() => setStackFilter(stk)}
                  className={`px-2.5 py-0.5 rounded transition-colors text-[11px] ${
                    stackFilter === stk
                      ? 'bg-slate-900 text-white font-medium shadow-2xs'
                      : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {stk}
                </button>
              ))}
            </div>
          </div>

          {/* Search Input */}
          <div className="relative sm:w-64 flex items-center">
            <span className="material-symbols-outlined absolute left-2.5 text-slate-400 text-sm pointer-events-none">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search combatant or clan..."
              className="w-full bg-slate-50 text-slate-900 placeholder:text-slate-400 font-sans text-xs pl-8 pr-16 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-2xs"
            />
            <button
              type="button"
              className="absolute right-1 px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 font-mono text-[10px] font-medium flex items-center gap-0.5 transition-colors cursor-pointer"
              title="Search"
            >
              <span>Enter</span>
              <span className="material-symbols-outlined text-[10px]">keyboard_return</span>
            </button>
          </div>
        </div>

        {/* Top 3 Podium Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch pt-1">
          {/* Rank 2 Podium Card */}
          <div className="order-2 md:order-1 bg-white rounded-xl p-4 flex flex-col justify-between border border-slate-200 hover:border-slate-300 shadow-xs transition-all relative">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 font-mono text-[10px]">
                <span className="text-slate-600 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Rank #02
                </span>
                <span className="text-slate-500 font-medium">Tier: Apex</span>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <div className="w-11 h-11 rounded-lg bg-slate-800 text-white font-mono font-bold flex items-center justify-center text-sm">
                  VX
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm text-slate-900">Valkyrie_X</span>
                    <span className="px-1 py-0.2 rounded bg-slate-100 border border-slate-200 font-mono text-[10px] text-slate-600">
                      [ZERO]
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400">Fast-Execution Matrix</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100 mt-3.5 font-mono">
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-400 uppercase font-medium">Rating</span>
                  <span className="text-sm font-bold text-slate-900 mt-0.5">2,780</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-400 uppercase font-medium">Win Rate</span>
                  <span className="text-sm font-semibold text-emerald-600 mt-0.5">81.2%</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-400 uppercase font-medium">Stack</span>
                  <span className="text-xs font-semibold text-slate-700 mt-0.5">C++23</span>
                </div>
              </div>
            </div>
          </div>

          {/* Rank 1 Center Podium Card (Dominator Highlight) */}
          <div className="order-1 md:order-2 bg-gradient-to-b from-indigo-50/50 via-white to-white rounded-xl p-5 flex flex-col justify-between border-2 border-indigo-500/80 shadow-md relative">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-indigo-100 font-mono text-[10px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                  <span className="text-indigo-700 uppercase tracking-wider font-bold">
                    Rank #01 Dominator
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold border border-indigo-200">
                  APEX PRIME
                </span>
              </div>

              <div className="flex items-center gap-3 mt-3">
                <div className="w-13 h-13 rounded-xl bg-gradient-to-tr from-amber-500 via-indigo-600 to-sky-500 text-white font-mono font-black flex items-center justify-center text-lg shadow-sm">
                  NP
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-base text-slate-900">NullPointer</span>
                    <span className="px-1.5 py-0.2 rounded bg-indigo-50 border border-indigo-200 font-mono text-[10px] text-indigo-700 font-semibold">
                      [APEX]
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-indigo-600 font-medium">
                    Grandmaster Champion • 18 W-Streak
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-indigo-50/50 border border-indigo-100 mt-3.5 font-mono">
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-500 uppercase font-medium">Rating</span>
                  <span className="text-base font-black text-indigo-900 mt-0.5">2,914</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-500 uppercase font-medium">Win Rate</span>
                  <span className="text-base font-bold text-emerald-600 mt-0.5">84.2%</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-500 uppercase font-medium">Stack</span>
                  <span className="text-xs font-bold text-slate-800 mt-0.5">Rust 1.77</span>
                </div>
              </div>
            </div>
          </div>

          {/* Rank 3 Podium Card */}
          <div className="order-3 bg-white rounded-xl p-4 flex flex-col justify-between border border-slate-200 hover:border-slate-300 shadow-xs transition-all relative">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 font-mono text-[10px]">
                <span className="text-slate-600 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Rank #03
                </span>
                <span className="text-slate-500 font-medium">Tier: Apex</span>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <div className="w-11 h-11 rounded-lg bg-slate-800 text-white font-mono font-bold flex items-center justify-center text-sm">
                  AQ
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm text-slate-900">AlgoQueen</span>
                    <span className="px-1 py-0.2 rounded bg-slate-100 border border-slate-200 font-mono text-[10px] text-slate-600">
                      [BYTE]
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400">Algorithmic Architect</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100 mt-3.5 font-mono">
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-400 uppercase font-medium">Rating</span>
                  <span className="text-sm font-bold text-slate-900 mt-0.5">2,740</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-400 uppercase font-medium">Win Rate</span>
                  <span className="text-sm font-semibold text-emerald-600 mt-0.5">79.4%</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-400 uppercase font-medium">Stack</span>
                  <span className="text-xs font-semibold text-slate-700 mt-0.5">TypeScript</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Full Ladder Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-5 sm:px-6 py-3.5 border-b border-slate-200 flex items-center justify-between font-mono text-xs">
            <span className="font-bold text-slate-900 uppercase tracking-wide">Competitive Pool Ladder</span>
            <span className="text-slate-400">Showing top active duelists</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-5 sm:px-6 font-semibold whitespace-nowrap w-20">Rank</th>
                  <th className="py-3.5 px-5 sm:px-6 font-semibold whitespace-nowrap">Combatant</th>
                  <th className="py-3.5 px-5 sm:px-6 font-semibold whitespace-nowrap">Tier</th>
                  <th className="py-3.5 px-5 sm:px-6 font-semibold whitespace-nowrap">Rating</th>
                  <th className="py-3.5 px-5 sm:px-6 font-semibold whitespace-nowrap">Win Rate</th>
                  <th className="py-3.5 px-5 sm:px-6 font-semibold whitespace-nowrap">Duels</th>
                  <th className="py-3.5 px-5 sm:px-6 font-semibold whitespace-nowrap">Primary Stack</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLadder.map((item) => (
                  <tr key={item.rank} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-5 sm:px-6 font-bold text-slate-800 whitespace-nowrap">#{item.rank}</td>
                    <td className="py-3.5 px-5 sm:px-6 font-sans font-medium text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                          {item.avatar}
                        </div>
                        <span className="font-semibold">{item.name}</span>
                        <span className="font-mono text-[10px] text-slate-400">[{item.clan}]</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 sm:px-6 whitespace-nowrap">
                      <span className="inline-flex items-center whitespace-nowrap px-2.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {item.tier}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 sm:px-6 font-bold text-slate-900 whitespace-nowrap">{item.rating} LP</td>
                    <td className="py-3.5 px-5 sm:px-6 text-emerald-600 font-semibold whitespace-nowrap">{item.winRate}</td>
                    <td className="py-3.5 px-5 sm:px-6 text-slate-600 whitespace-nowrap">{item.duels}</td>
                    <td className="py-3.5 px-5 sm:px-6 text-slate-600 whitespace-nowrap">{item.stack}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Your Rank Anchor */}
          <div className="px-5 sm:px-6 py-3.5 bg-indigo-50/80 border-t border-indigo-200 flex items-center justify-between font-mono text-xs">
            <div className="flex items-center gap-3">
              <span className="text-indigo-700 font-bold">#142</span>
              <span className="font-sans font-bold text-indigo-950">
                {currentUser?.name || 'KAELEN'} (You)
              </span>
              <span className="inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-semibold">
                {currentUser?.tier?.toLowerCase() === 'diamond ii' ? 'DIAMOND' : (currentUser?.tier?.toUpperCase() || 'DIAMOND')}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-indigo-900">{currentUser?.rating || 2148} LP</span>
              <span className="text-slate-400">•</span>
              <span className="text-emerald-600 font-semibold">68.4% WR</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
