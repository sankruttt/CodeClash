import React, { useState, useEffect } from 'react';
import { getTierDetails } from '../utils/tierUtils';

export default function DashboardView({ navigate, queueing, setQueueing, currentUser }) {
  const rating = currentUser?.rating || 2148;
  const tierInfo = getTierDetails(rating, currentUser?.tier);
  const [queueSeconds, setQueueSeconds] = useState(0);

  useEffect(() => {
    if (!queueing) return;
    const interval = setInterval(() => {
      setQueueSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [queueing]);

  const toggleQueue = () => {
    if (!queueing) {
      setQueueSeconds(0);
      setQueueing(true);
    } else {
      setQueueing(false);
      setQueueSeconds(0);
    }
  };

  const matches = [
    {
      id: 1,
      opponent: 'v0_Sniper',
      tier: 'Diamond I',
      avatar: 'VS',
      problem: 'LRU Cache with TTL',
      diff: 'MED',
      diffColor: 'amber',
      result: 'VICTORY',
      lp: '+24 LP',
      time: '04:12',
      date: '12m ago',
    },
    {
      id: 2,
      opponent: 'NeuralByte',
      tier: 'Master',
      avatar: 'NB',
      problem: 'Graph Minimum Spanning Tree',
      diff: 'HARD',
      diffColor: 'indigo',
      result: 'DEFEAT',
      lp: '-18 LP',
      time: '09:45',
      date: '1h ago',
    },
    {
      id: 3,
      opponent: 'SyntaxGod',
      tier: 'Diamond',
      avatar: 'SG',
      problem: 'Binary Search Rotated Array',
      diff: 'EASY',
      diffColor: 'emerald',
      result: 'VICTORY',
      lp: '+28 LP',
      time: '03:02',
      date: '3h ago',
    },
    {
      id: 4,
      opponent: 'GhostCoder',
      tier: 'Diamond III',
      avatar: 'GC',
      problem: 'Merge K-Sorted Lists',
      diff: 'MED',
      diffColor: 'amber',
      result: 'VICTORY',
      lp: '+19 LP',
      time: '06:14',
      date: 'Yesterday',
    },
  ];

  return (
    <div className="flex-1 min-w-0 px-4 pt-4 sm:px-6 sm:pt-6 pb-48 subtle-grid">
      <div className="max-w-[1440px] mx-auto space-y-4">
        {/* Hero Operational Banner */}
        <section className="rounded-xl border border-slate-200/80 bg-white p-5 relative overflow-hidden shadow-xs">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 relative z-10">
            {/* Left Info Block */}
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                  RANKED CLIMB ACTIVE
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                WELCOME BACK, <span className="text-indigo-600 font-mono">{currentUser?.name?.toUpperCase() || 'KAELEN'}</span>
              </h1>

              {/* Progress to Next Tier */}
              <div className="pt-2 max-w-md">
                <div className="flex flex-wrap items-center justify-between text-[11px] font-mono mb-1.5 gap-2">
                  <span className="text-slate-600">
                    Tier Path: <strong className="text-sky-600 font-semibold">{tierInfo.currentTier}</strong> →{' '}
                    <strong className="text-indigo-600 font-semibold">{tierInfo.nextTier}</strong>
                  </span>
                  <span className="text-slate-500 font-medium whitespace-nowrap">
                    {rating.toLocaleString()} / {tierInfo.nextTierLP.toLocaleString()} LP ({tierInfo.pct}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 via-indigo-600 to-indigo-700 rounded-full"
                    style={{ width: `${tierInfo.pct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Right CTA Action Box */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 self-stretch lg:self-center">
              <button
                onClick={toggleQueue}
                className={`px-5 py-3.5 rounded-lg font-mono text-xs font-bold tracking-wider flex items-center justify-center gap-2 border shadow-sm transition-all duration-200 active:scale-[0.98] ${
                  queueing
                    ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-700 shadow-rose-600/20'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700 shadow-indigo-600/20'
                }`}
              >
                <span className="material-symbols-outlined text-base">
                  {queueing ? 'hourglass_top' : 'swords'}
                </span>
                <span>
                  {queueing
                    ? `SEARCHING MATCH (${queueSeconds}s)... [CANCEL]`
                    : 'ENTER QUEUE (1v1 RANKED)'}
                </span>
              </button>

              <button
                onClick={() => navigate('private-room')}
                className="px-4 py-3.5 rounded-lg font-mono text-xs font-semibold tracking-wider flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition-colors"
                title="Create or Join Private Scrimmage"
              >
                <span className="material-symbols-outlined text-base text-indigo-600">meeting_room</span>
                <span>PRIVATE ROOM</span>
              </button>
            </div>
          </div>
        </section>

        {/* 4 Metric KPI Tiles */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* KPI 1 */}
          <div className="p-4 rounded-xl border border-slate-200/80 bg-white flex flex-col justify-between shadow-xs hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-mono">
              <span className="uppercase tracking-wider font-medium">Win Rate</span>
              <span className="material-symbols-outlined text-sm text-emerald-600">trending_up</span>
            </div>
            <div className="my-2 flex items-baseline justify-between">
              <div className="text-2xl font-bold font-mono tracking-tight text-slate-900">68.4%</div>
              <span className="text-xs font-mono text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                +3.1%
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-500">142W - 66L across 208 duels</div>
          </div>

          {/* KPI 2 */}
          <div className="p-4 rounded-xl border border-slate-200/80 bg-white flex flex-col justify-between shadow-xs hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-mono">
              <span className="uppercase tracking-wider font-medium">Global Rank</span>
              <span className="material-symbols-outlined text-sm text-sky-600">public</span>
            </div>
            <div className="my-2 flex items-baseline justify-between">
              <div className="text-2xl font-bold font-mono tracking-tight text-slate-900">#142</div>
              <span className="text-xs font-mono text-sky-600 font-semibold bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
                Top 0.8%
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-500">Active Pool: 42,910 Combatants</div>
          </div>

          {/* KPI 3 */}
          <div className="p-4 rounded-xl border border-slate-200/80 bg-white flex flex-col justify-between shadow-xs hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-mono">
              <span className="uppercase tracking-wider font-medium">Rating LP</span>
              <span className="material-symbols-outlined text-sm text-indigo-600">workspace_premium</span>
            </div>
            <div className="my-2 flex items-baseline justify-between">
              <div className="text-2xl font-bold font-mono tracking-tight text-slate-900">{rating.toLocaleString()} LP</div>
              <span className="text-xs font-mono text-indigo-600 font-semibold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                Peak 2,210
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-500">{tierInfo.lpNeeded} LP to {tierInfo.nextTier}</div>
          </div>

          {/* KPI 4 */}
          <div className="p-4 rounded-xl border border-slate-200/80 bg-white flex flex-col justify-between shadow-xs hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-mono">
              <span className="uppercase tracking-wider font-medium">Momentum</span>
              <span className="material-symbols-outlined text-sm text-amber-500">local_fire_department</span>
            </div>
            <div className="my-2 flex items-baseline justify-between">
              <div className="text-2xl font-bold font-mono tracking-tight text-amber-600">7 STREAK</div>
              <span className="text-xs font-mono text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                Hot
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-500">x1.5 LP Boost Multiplier Active</div>
          </div>
        </section>

        {/* Main 2-Column Operational Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left Column (8 Cols): Recent Combat Engagements */}
          <div className="lg:col-span-8 space-y-4">
            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-indigo-600">history</span>
                  <h2 className="text-sm font-semibold tracking-tight text-slate-900">
                    Recent Combat Engagements
                  </h2>
                </div>
                <button
                  onClick={() => navigate('history')}
                  className="text-xs font-mono text-indigo-600 hover:text-indigo-800 transition-colors font-medium flex items-center gap-1"
                >
                  <span>Full Ledger</span>
                  <span>↗</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100 text-[11px] uppercase">
                      <th className="pb-2.5 font-medium">Adversary</th>
                      <th className="pb-2.5 font-medium">Problem Vector</th>
                      <th className="pb-2.5 font-medium">Result</th>
                      <th className="pb-2.5 font-medium">Rating Delta</th>
                      <th className="pb-2.5 font-medium text-right">Solve Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {matches.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 pr-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-mono font-bold flex items-center justify-center text-[10px]">
                              {m.avatar}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-900 font-sans">{m.opponent}</span>
                              <span className="text-[10px] text-slate-400">{m.tier}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-2 font-sans">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-800 text-xs font-medium">{m.problem}</span>
                            <span
                              className={`text-[9px] font-mono px-1 py-0.2 rounded font-semibold border ${
                                m.diffColor === 'amber'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : m.diffColor === 'indigo'
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              {m.diff}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 pr-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              m.result === 'VICTORY'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {m.result}
                          </span>
                        </td>
                        <td className="py-3 pr-2">
                          <span
                            className={`font-semibold ${
                              m.lp.startsWith('+') ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {m.lp}
                          </span>
                        </td>
                        <td className="py-3 text-right text-slate-500 font-medium">
                          {m.time}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Challenge Grid */}
            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-sky-600">fitness_center</span>
                  <h2 className="text-sm font-semibold tracking-tight text-slate-900">
                    Daily Algorithmic Bounty
                  </h2>
                </div>
                <span className="text-xs font-mono text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  +50 LP REWARD
                </span>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-900 text-sm font-sans">
                    Sliding Window Maximum (O(n) Monotonic Queue)
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 font-sans">
                    Solve within 10 minutes with less than 2 submissions to claim the daily bonus.
                  </div>
                </div>
                <button
                  onClick={toggleQueue}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-xs font-semibold tracking-wider transition-colors shrink-0"
                >
                  {queueing ? 'QUEUE ACTIVE...' : 'QUEUE FOR BOUNTY'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column (4 Cols): Leaderboard Snippet & System Status */}
          <div className="lg:col-span-4 space-y-4">
            {/* Leaderboard Snippet */}
            <div className="rounded-xl border border-slate-200/80 bg-white p-5 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-amber-500">military_tech</span>
                  <h2 className="text-sm font-semibold tracking-tight text-slate-900">
                    Leaderboard Snippet
                  </h2>
                </div>
                <button
                  onClick={() => navigate('leaderboard')}
                  className="text-xs font-mono text-slate-400 hover:text-indigo-600 transition-colors font-medium"
                >
                  Full Ladder
                </button>
              </div>

              {/* Leaderboard entries */}
              <div className="space-y-2 font-mono text-xs">
                {/* Rank 1 */}
                <div className="px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between shadow-2xs hover:bg-slate-100/50 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-amber-600 font-bold text-xs w-6 shrink-0">#1</span>
                    <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                      NP
                    </div>
                    <span className="font-sans font-medium text-slate-900 truncate text-xs">
                      NullPointer
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                      APEX
                    </span>
                    <span className="text-xs font-semibold text-slate-800">2,914 LP</span>
                  </div>
                </div>

                {/* Rank 2 */}
                <div className="px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between shadow-2xs hover:bg-slate-100/50 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-sky-600 font-bold text-xs w-6 shrink-0">#2</span>
                    <div className="w-6 h-6 rounded-full bg-sky-100 text-sky-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                      AQ
                    </div>
                    <span className="font-sans font-medium text-slate-900 truncate text-xs">
                      AlgoQueen
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 font-semibold">
                      APEX
                    </span>
                    <span className="text-xs font-semibold text-slate-800">2,882 LP</span>
                  </div>
                </div>

                {/* Rank 3 */}
                <div className="px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between shadow-2xs hover:bg-slate-100/50 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-indigo-600 font-bold text-xs w-6 shrink-0">#3</span>
                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                      XR
                    </div>
                    <span className="font-sans font-medium text-slate-900 truncate text-xs">
                      X_Recursive
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
                      APEX
                    </span>
                    <span className="text-xs font-semibold text-slate-800">2,840 LP</span>
                  </div>
                </div>

                {/* Your Rank Anchor */}
                <div className="mt-2.5 px-3.5 py-2.5 rounded-lg bg-indigo-50/90 border border-indigo-200 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-indigo-700 font-bold text-xs w-8 shrink-0">#142</span>
                    <span className="font-sans font-semibold text-indigo-950 truncate text-xs">
                      {currentUser?.name || 'KAELEN'} (You)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-semibold uppercase">
                      {currentUser?.tier || 'DIAMOND'}
                    </span>
                    <span className="text-xs font-bold text-indigo-900">{rating.toLocaleString()} LP</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
