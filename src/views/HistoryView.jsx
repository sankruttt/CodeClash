import React, { useState } from 'react';

export default function HistoryView() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchFilter, setSearchFilter] = useState('');

  const historyMatches = [
    {
      id: 'm1',
      opponent: 'v0_Sniper',
      opponentAvatar: 'VS',
      opponentTier: 'Diamond I',
      result: 'VICTORY',
      score: '3 / 3',
      lp: '+24 LP',
      time: '04:12',
      problem: 'LRU Cache with TTL',
      diff: 'MED',
      diffColor: 'amber',
      date: 'Today, 14:22',
      type: 'Ranked',
    },
    {
      id: 'm2',
      opponent: 'NeuralByte',
      opponentAvatar: 'NB',
      opponentTier: 'Master',
      result: 'DEFEAT',
      score: '2 / 3',
      lp: '-18 LP',
      time: '09:45',
      problem: 'Graph Minimum Spanning Tree',
      diff: 'HARD',
      diffColor: 'indigo',
      date: 'Today, 11:05',
      type: 'Ranked',
    },
    {
      id: 'm3',
      opponent: 'SyntaxGod',
      opponentAvatar: 'SG',
      opponentTier: 'Diamond',
      result: 'VICTORY',
      score: '3 / 3',
      lp: '+28 LP',
      time: '03:02',
      problem: 'Binary Search Rotated Array',
      diff: 'EASY',
      diffColor: 'emerald',
      date: 'Yesterday, 19:40',
      type: 'Ranked',
    },
    {
      id: 'm4',
      opponent: 'GhostCoder',
      opponentAvatar: 'GC',
      opponentTier: 'Diamond III',
      result: 'VICTORY',
      score: '3 / 3',
      lp: '+19 LP',
      time: '06:14',
      problem: 'Merge K-Sorted Lists',
      diff: 'MED',
      diffColor: 'amber',
      date: 'Yesterday, 16:15',
      type: 'Ranked',
    },
    {
      id: 'm5',
      opponent: 'BitMaster',
      opponentAvatar: 'BM',
      opponentTier: 'Unranked',
      result: 'VICTORY',
      score: '3 / 3',
      lp: '±0 LP',
      time: '05:30',
      problem: 'Valid Parentheses Tree',
      diff: 'EASY',
      diffColor: 'emerald',
      date: 'Sep 14, 18:20',
      type: 'Scrimmage',
    },
  ];

  const filtered = historyMatches.filter((m) => {
    if (activeFilter !== 'All' && m.type !== activeFilter) return false;
    if (searchFilter && !m.opponent.toLowerCase().includes(searchFilter.toLowerCase()) && !m.problem.toLowerCase().includes(searchFilter.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex-1 min-w-0 px-4 pt-4 sm:px-6 sm:pt-6 pb-48 subtle-grid">
      <div className="max-w-[1440px] mx-auto space-y-6">
        {/* Header Banner */}
        <section className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-indigo-50/50 rounded-full blur-2xl pointer-events-none" />
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
                  • LEDGER // ARCHIVES
                </span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900">
                Match History
              </h1>
              <p className="text-xs lg:text-sm text-slate-500 max-w-2xl mt-1 font-sans">
                Comprehensive tracking, replay data, and performance analytics for ranked, private, and tournament duels.
              </p>
            </div>
          </div>

          {/* Season Summary Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100 font-mono">
            <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3.5 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>TOTAL DUELS</span>
                <span className="text-emerald-600 bg-emerald-100/60 font-semibold px-1.5 py-0.2 rounded text-[10px]">
                  +3.1% winrate
                </span>
              </div>
              <div className="text-xl font-bold text-slate-900 tracking-tight">
                208 <span className="text-xs font-normal text-slate-500">(142W - 66L)</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                <span className="font-bold text-emerald-600">68.3%</span> Win Rate Overall
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3.5 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>CURRENT RATING</span>
                <span className="text-indigo-600 font-semibold text-[10px]">Peak 2,210</span>
              </div>
              <div className="text-xl font-bold text-slate-900 tracking-tight">
                2,148 <span className="text-xs font-normal text-indigo-600">LP</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">252 LP to Grandmaster</div>
            </div>

            <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3.5 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>MEDIAN SOLVE TIME</span>
                <span className="text-emerald-600 font-semibold text-[10px]">-18s</span>
              </div>
              <div className="text-xl font-bold text-slate-900 tracking-tight">04:18m</div>
              <div className="text-[11px] text-slate-500 mt-1">Faster than 82% of diamond pool</div>
            </div>

            <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3.5 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>HOT STREAK</span>
                <span className="text-amber-600 font-semibold text-[10px]">ACTIVE</span>
              </div>
              <div className="text-xl font-bold text-amber-600 tracking-tight">7 WINS</div>
              <div className="text-[11px] text-slate-500 mt-1">Season Best: 12 Consecutive</div>
            </div>
          </div>
        </section>

        {/* Filter Controls */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-xs">
          <div className="flex items-center gap-1">
            {['All', 'Ranked', 'Scrimmage'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  activeFilter === tab
                    ? 'bg-indigo-50 text-indigo-600 font-bold border border-indigo-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {tab} Matches
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64 flex items-center">
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search adversary or problem..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-16 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 font-mono"
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

        {/* Matches Ledger Cards */}
        <div className="space-y-3">
          {filtered.map((match) => (
            <div
              key={match.id}
              className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs hover:border-slate-300 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-mono"
            >
              <div className="flex items-center gap-3.5 min-w-[220px]">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 font-bold flex items-center justify-center text-xs border border-slate-200">
                  {match.opponentAvatar}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-900 font-sans text-sm">{match.opponent}</span>
                    <span className="text-[10px] text-slate-400">({match.opponentTier})</span>
                  </div>
                  <div className="text-[11px] text-slate-400">{match.date}</div>
                </div>
              </div>

              <div className="flex-1 min-w-0 font-sans">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 text-sm">{match.problem}</span>
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold border ${
                      match.diffColor === 'amber'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : match.diffColor === 'indigo'
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {match.diff}
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-mono mt-0.5">
                  Solved in {match.time} • Tests: {match.score}
                </div>
              </div>

              <div className="flex items-center gap-4 self-end md:self-center">
                <div className="flex flex-col items-end">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      match.result === 'VICTORY'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {match.result}
                  </span>
                  <span
                    className={`text-xs font-bold mt-0.5 ${
                      match.lp.startsWith('+') ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {match.lp}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
