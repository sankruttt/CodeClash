import React, { useState, useEffect } from 'react';
import { getTierDetails } from '../utils/tierUtils';
import { leaderboardAPI, problemAPI } from '../services/api';
import StreakCard from '../components/StreakCard';
import { formatGameTime } from './HistoryView';

export default function DashboardView({ navigate, queueing, setQueueing, onToggleQueue, currentUser }) {
  const rating = currentUser?.rating || 1500;
  const tierInfo = getTierDetails(rating, currentUser?.tier);
  const [queueSeconds, setQueueSeconds] = useState(0);

  const [matches, setMatches] = useState([]);
  const [topPlayers, setTopPlayers] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [bountyProblem, setBountyProblem] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!queueing) return;
    const interval = setInterval(() => {
      setQueueSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [queueing]);

  const toggleQueue = () => {
    if (onToggleQueue) {
      onToggleQueue({ questionCount: 1, duration: 10 });
    } else if (!queueing) {
      setQueueSeconds(0);
      setQueueing(true);
    } else {
      setQueueing(false);
      setQueueSeconds(0);
    }
  };

  // Fetch real matches, leaderboard snippet, user rank, and bounty from MongoDB
  useEffect(() => {
    let isCancelled = false;

    async function loadDashboardData() {
      setLoadingData(true);
      try {
        // 1. Fetch user match history
        const historyRes = await leaderboardAPI.getMatchHistory(5).catch(() => null);
        const rawHistory = historyRes?.data?.history || historyRes?.data || [];

        // 2. Fetch top 3 leaderboard entries
        const lbRes = await leaderboardAPI.getLeaderboard({ limit: 3 }).catch(() => null);
        const lbList = lbRes?.data?.leaderboard || lbRes?.data || [];

        // 3. Fetch user rank if authenticated
        let rankVal = null;
        if (currentUser?.id) {
          const rankRes = await leaderboardAPI.getUserRank(currentUser.id).catch(() => null);
          rankVal = rankRes?.data?.rank || rankRes?.data || null;
        }

        // 4. Fetch random coding problem for Algorithmic Bounty
        const probRes = await problemAPI.getRandomProblems(1).catch(() => null);
        const prob = probRes?.data?.problems?.[0] || probRes?.data?.[0] || null;

        if (!isCancelled) {
          if (Array.isArray(rawHistory) && rawHistory.length > 0) {
            setMatches(
              rawHistory.map((h, idx) => {
                const diff = h.difficulty || 'MED';
                const diffColor =
                  diff.toUpperCase() === 'HARD' ? 'indigo' : diff.toUpperCase() === 'EASY' ? 'emerald' : 'amber';
                const upperResult = (h.result || '').toUpperCase();
                const isWin = upperResult === 'WIN' || upperResult === 'VICTORY';
                const isDraw = upperResult === 'DRAW';
                const delta = h.ratingChange ?? (isWin ? 24 : isDraw ? 0 : -18);
                const lpStr = (delta >= 0 ? `+${delta}` : `${delta}`) + ' LP';

                return {
                  id: h._id || h.id || idx,
                  opponent: h.opponentName || 'Adversary',
                  tier: h.opponentTier || 'Diamond',
                  avatar: (h.opponentName || 'AD').slice(0, 2).toUpperCase(),
                  problem: h.problemTitle || 'Algorithmic Duel',
                  diff: diff.toUpperCase().slice(0, 4),
                  diffColor,
                  result: isWin ? 'VICTORY' : (isDraw ? 'DRAW' : 'DEFEAT'),
                  lp: lpStr,
                  time: h.duration ? `${Math.floor(h.duration / 60)}:${(h.duration % 60).toString().padStart(2, '0')}` : '00:30',
                  date: formatGameTime(h.startedAt || h.createdAt),
                };
              })
            );
          } else {
            setMatches([]);
          }

          if (Array.isArray(lbList)) {
            setTopPlayers(lbList.slice(0, 3));
          }

          if (rankVal) {
            setUserRank(rankVal);
          }

          if (prob) {
            setBountyProblem(prob);
          }
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        if (!isCancelled) setLoadingData(false);
      }
    }

    loadDashboardData();

    return () => {
      isCancelled = true;
    };
  }, [currentUser?.id]);

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
                WELCOME BACK, <span className="text-indigo-600 font-mono">{currentUser?.name?.toUpperCase() || 'COMBATANT'}</span>
              </h1>

              {/* Progress to Next Tier */}
              <div className="pt-2 max-w-md">
                <div className="flex justify-between text-xs font-mono text-slate-500 mb-1.5">
                  <span className="font-semibold text-slate-700">
                    TIER PROGRESSION ({tierInfo.currentTier} → {tierInfo.nextTier})
                  </span>
                  <span className="text-indigo-600 font-bold">{tierInfo.pct}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/60">
                  <div
                    className="bg-gradient-to-r from-sky-500 via-indigo-500 to-indigo-600 h-full rounded-full transition-all duration-500 shadow-2xs"
                    style={{ width: `${tierInfo.pct}%` }}
                  />
                </div>
                <div className="flex justify-between items-center mt-1 text-[11px] font-mono text-slate-400">
                  <span>{rating.toLocaleString()} LP</span>
                  <span>{tierInfo.nextTierLP.toLocaleString()} LP</span>
                </div>
              </div>
            </div>

            {/* Right Action Block (Ranked Queue) */}
            <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-3 w-full lg:w-auto">
              <div className="flex items-center gap-4 bg-slate-50 border border-slate-200/80 px-4 py-2.5 rounded-xl font-mono text-xs shadow-2xs">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-medium">LADDER RATING</div>
                  <div className="text-lg font-bold text-slate-900 leading-tight">
                    {rating.toLocaleString()} <span className="text-xs text-indigo-600 font-normal">LP</span>
                  </div>
                </div>
                <div className="h-7 w-[1px] bg-slate-200" />
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-medium">TIER STATUS</div>
                  <div className="text-sm font-bold text-indigo-600 leading-tight">{tierInfo.currentTier}</div>
                </div>
                <div className="h-7 w-[1px] bg-slate-200" />
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-medium">WIN RATIO</div>
                  <div className="text-sm font-bold text-emerald-600 leading-tight">
                    {currentUser?.wins || currentUser?.losses
                      ? `${Math.round(((currentUser.wins || 0) / ((currentUser.wins || 0) + (currentUser.losses || 0) || 1)) * 100)}%`
                      : '0%'}
                  </div>
                </div>
              </div>

              {/* Main Queue CTA */}
              <button
                onClick={toggleQueue}
                className={`w-full sm:w-auto px-6 py-3 rounded-xl font-mono text-xs font-bold tracking-wider uppercase transition-all duration-150 flex items-center justify-center gap-2 shadow-xs cursor-pointer ${queueing
                  ? 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 hover:border-rose-300 animate-pulse'
                  : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white shadow-indigo-500/20'
                  }`}
              >
                {queueing ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    <span>SEARCHING MATCH ({queueSeconds}s) • CANCEL</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">swords</span>
                    <span>ENTER 1v1 RANKED QUEUE</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* 2-Column Operational Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left Column (8 Cols): Recent Skirmishes & Challenge Vector */}
          <div className="lg:col-span-8 space-y-4">
            {/* Recent Match Feed */}
            <div className="rounded-xl border border-slate-200/80 bg-white p-5 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-indigo-600">history</span>
                  <h2 className="text-sm font-semibold tracking-tight text-slate-900">
                    Recent Combat Engagements
                  </h2>
                </div>
                <button
                  onClick={() => navigate('history')}
                  className="text-xs font-mono text-slate-400 hover:text-indigo-600 transition-colors font-medium cursor-pointer"
                >
                  View All Log
                </button>
              </div>

              {/* Matches Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100 text-[10px] uppercase">
                      <th className="pb-2.5 font-medium">Adversary</th>
                      <th className="pb-2.5 font-medium">Problem Vector</th>
                      <th className="pb-2.5 font-medium">Result</th>
                      <th className="pb-2.5 font-medium">Rating Delta</th>
                      <th className="pb-2.5 font-medium text-right">Solve Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {matches.length > 0 ? (
                      matches.map((m) => (
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
                                className={`text-[9px] font-mono px-1 py-0.2 rounded font-semibold border ${m.diffColor === 'amber'
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
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${m.result === 'VICTORY'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : m.result === 'DRAW'
                                  ? 'bg-slate-50 text-slate-600 border-slate-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                                }`}
                            >
                              {m.result}
                            </span>
                          </td>
                          <td className="py-3 pr-2">
                            <span
                              className={`font-semibold ${m.lp.startsWith('+') ? 'text-emerald-600' : 'text-rose-600'
                                }`}
                            >
                              {m.lp}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <span className="text-slate-700 font-medium font-mono text-xs block">{m.time}</span>
                            <span className="text-[10px] text-slate-400 font-sans block">{m.date}</span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-xs font-mono text-slate-400">
                          {loadingData ? 'Calibrating match history telemetry...' : 'No skirmishes logged yet. Enter the queue or private room to duel!'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Challenge Grid / Bounty */}
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
                    {bountyProblem?.title || 'Two Sum & Monotonic Search'}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 font-sans">
                    {bountyProblem?.description
                      ? (bountyProblem.description.slice(0, 110) + '...')
                      : 'Solve within 10 minutes with less than 2 submissions to claim the daily bonus.'}
                  </div>
                </div>
                <button
                  onClick={toggleQueue}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-xs font-semibold tracking-wider transition-colors shrink-0 cursor-pointer"
                >
                  {queueing ? 'QUEUE ACTIVE...' : 'QUEUE FOR BOUNTY'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column (4 Cols): Streak Tracker & Leaderboard Snippet */}
          <div className="lg:col-span-4 space-y-4">
            {/* User Daily Combat Streak Component */}
            <StreakCard currentUser={currentUser} />

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
                  className="text-xs font-mono text-slate-400 hover:text-indigo-600 transition-colors font-medium cursor-pointer"
                >
                  Full Ladder
                </button>
              </div>

              {/* Leaderboard entries */}
              <div className="space-y-2 font-mono text-xs">
                {topPlayers.length > 0 ? (
                  topPlayers.map((player, idx) => {
                    const rankNum = idx + 1;
                    const rankBadgeColor =
                      rankNum === 1
                        ? 'text-amber-600 bg-amber-100 text-amber-800'
                        : rankNum === 2
                          ? 'text-sky-600 bg-sky-100 text-sky-800'
                          : 'text-indigo-600 bg-indigo-100 text-indigo-800';
                    const tierLabel = getTierDetails(player.rating || 1500, player.tier).currentTier;

                    return (
                      <div
                        key={player.userId || player._id || idx}
                        className="px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between shadow-2xs hover:bg-slate-100/50 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`font-bold text-xs w-6 shrink-0 ${rankNum === 1 ? 'text-amber-600' : rankNum === 2 ? 'text-sky-600' : 'text-indigo-600'}`}>
                            #{rankNum}
                          </span>
                          <div className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${rankBadgeColor.slice(15)}`}>
                            {player.avatar || (player.username ? player.username.slice(0, 2).toUpperCase() : 'CC')}
                          </div>
                          <span className="font-sans font-medium text-slate-900 truncate text-xs">
                            {player.username || 'Combatant'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold uppercase">
                            {tierLabel}
                          </span>
                          <span className="text-xs font-semibold text-slate-800">
                            {(player.rating || 1500).toLocaleString()} LP
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 text-center text-xs font-mono text-slate-400">
                    {loadingData ? 'Retrieving leaderboard standings...' : 'No combatants on the ladder yet.'}
                  </div>
                )}

                {/* Your Rank Anchor */}
                <div className="mt-2.5 px-3.5 py-2.5 rounded-lg bg-indigo-50/90 border border-indigo-200 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-indigo-700 font-bold text-xs w-8 shrink-0">
                      {userRank ? `#${userRank}` : '#--'}
                    </span>
                    <span className="font-sans font-semibold text-indigo-950 truncate text-xs">
                      {currentUser?.name || 'You'} (You)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-semibold uppercase">
                      {tierInfo.currentTier}
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
