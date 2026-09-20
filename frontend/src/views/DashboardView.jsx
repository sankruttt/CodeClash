import React, { useState, useEffect } from 'react';
import { getTierDetails } from '../utils/tierUtils';
import { leaderboardAPI, problemAPI, bountyAPI } from '../services/api';
import StreakCard from '../components/StreakCard';
import { formatGameTime } from './HistoryView';
import { SCORING } from '../config/scoring';
import CombatBriefing from '../components/dashboard/CombatBriefing';
import WelcomeCard from '../components/dashboard/WelcomeCard';
import StatsGrid from '../components/dashboard/StatsGrid';
import RecentDuelHistory from '../components/dashboard/RecentDuelHistory';
import VanguardLeaderboard from '../components/dashboard/VanguardLeaderboard';

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export default function DashboardView({ navigate, queueing, setQueueing, onToggleQueue, currentUser, onStartBounty }) {
  const rating = currentUser?.rating || SCORING.defaultRating;
  const tierInfo = getTierDetails(rating, currentUser?.tier);
  const [queueSeconds, setQueueSeconds] = useState(0);

  const [matches, setMatches] = useState([]);
  const [topPlayers, setTopPlayers] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [meUser, setMeUser] = useState(null);
  const [totalDevs, setTotalDevs] = useState(null);
  const [bountyProblem, setBountyProblem] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState(null);

  useEffect(() => {
    if (!queueing) {
      setQueueSeconds(0);
      return;
    }
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

  // Fetch real dashboard data from MongoDB
  useEffect(() => {
    let isCancelled = false;

    async function loadDashboardData() {
      setLoadingData(true);
      setDataError(null);
      try {
        // 1. Duel history — full set feeds median solve time; recent 8 feed the table
        const historyRes = await leaderboardAPI.getMatchHistory(100).catch(() => null);
        const historyResData = historyRes?.data;
        const historyRaw =
          historyResData?.history && Array.isArray(historyResData.history)
            ? historyResData.history
            : Array.isArray(historyRes?.data)
              ? historyRes?.data
              : [];

        // 2. Top 3 leaderboard entries + total ranked users
        const lbRes = await leaderboardAPI.getLeaderboard({ limit: 3 }).catch(() => null);
        const lbList = lbRes?.data?.leaderboard || lbRes?.data?.top3 || lbRes?.data || [];
        const top3 = lbRes?.data?.top3 || lbList.slice(0, 3);
        const total = lbRes?.data?.pagination?.total ?? null;

        // 3. Authenticated user's live rank/position
        let rankVal = null;
        let meVal = null;
        const meRes = await leaderboardAPI.getMeRank().catch(() => null);
        if (meRes?.data?.rank != null) {
          rankVal = meRes.data.rank;
          meVal = meRes.data.user || null;
        }

        // 4. Bounty problem
        const probRes = await problemAPI.getRandomProblems(1).catch(() => null);
        const prob = probRes?.data?.problems?.[0] || probRes?.data?.[0] || null;

        if (!isCancelled) {
          if (Array.isArray(historyRaw)) {
            setMatches(
              historyRaw.map((h, idx) => {
                const upperResult = (h.result || '').toUpperCase();
                const isWin = upperResult === 'WIN' || upperResult === 'VICTORY';
                const isDraw = upperResult === 'DRAW';
                const result = isWin ? 'win' : isDraw ? 'draw' : 'loss';
                const duration = h.duration ?? null;
                const solveTime = typeof h.solveTime === 'number' ? h.solveTime : null;

                return {
                  id: h._id || h.id || idx,
                  opponentName: h.opponentName || 'Adversary',
                  opponentAvatar: h.opponentAvatar || (h.opponentName || 'VS').slice(0, 2).toUpperCase(),
                  problemTitle: h.problemTitle || 'Algorithmic Duel',
                  language: h.language || null,
                  duration,
                  solveTime,
                  result,
                  ratingChange: typeof h.ratingChange === 'number' ? h.ratingChange : 0,
                  startedLabel: formatGameTime(h.startedAt || h.createdAt),
                };
              })
            );
          } else {
            setMatches([]);
          }

          setTopPlayers(Array.isArray(top3) ? top3 : []);
          setTotalDevs(total);
          setUserRank(rankVal);
          setMeUser(meVal);

          if (prob) {
            setBountyProblem(prob);
          }
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        if (!isCancelled) setDataError('Some dashboard data is temporarily unavailable.');
      } finally {
        if (!isCancelled) setLoadingData(false);
      }
    }

    loadDashboardData();

    return () => {
      isCancelled = true;
    };
  }, [currentUser?.id]);

  // ---- KPI computations from real data ----
  const wins = currentUser?.wins || meUser?.wins || 0;
  const losses = currentUser?.losses || meUser?.losses || 0;
  const draws = currentUser?.draws || meUser?.draws || 0;
  const totalGames = wins + losses + draws;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

  const solveTimes = matches
    .filter((m) => m.solveTime != null && m.solveTime > 0)
    .map((m) => m.solveTime);
  const medianSolve = median(solveTimes);
  const solveCount = solveTimes.length;

  const rankPosition = userRank ?? meUser?.rank ?? null;
  const topPct =
    rankPosition != null && totalDevs != null && totalDevs > 0
      ? Math.max(0.1, Math.min(99.9, Math.round(((rankPosition - 1) / totalDevs) * 1000) / 10))
      : null;

  const yourTier = currentUser?.tier || getTierDetails(rating).currentTier;

  return (
    <div className="flex-1 min-w-0 px-4 pt-4 sm:px-5 sm:pt-5 pb-36 subtle-grid">
      <div className="max-w-[1440px] mx-auto space-y-4">
        {/* COMBAT BRIEFING */}
        <CombatBriefing />

        {/* WELCOME / USER PROGRESS */}
        <WelcomeCard
          currentUser={currentUser}
          rating={rating}
          tierInfo={tierInfo}
          queueing={queueing}
          queueSeconds={queueSeconds}
          onToggleQueue={toggleQueue}
        />

        {dataError && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-mono text-amber-800 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">warning</span>
            {dataError}
          </div>
        )}

        {/* KPI METRICS */}
        <StatsGrid
          winRate={{ pct: winRate, wins, losses, draws: totalGames > 0 ? draws : undefined }}
          lp={{ rating, tier: yourTier, nextTier: tierInfo.nextTier }}
          solveTime={{ median: medianSolve, count: solveCount }}
          rank={{ position: rankPosition, rating, total: totalDevs, topPct }}
        />

        {/* SPLIT TWO-COLUMN CONTENT GRID */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* LEFT: Recent Duel History + Bounty */}
          <div className="lg:col-span-8 space-y-4">
            <RecentDuelHistory history={matches.slice(0, 8)} loading={loadingData} onViewAll={() => navigate('history')} />

            {/* Daily Algorithmic Bounty */}
            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-sky-600">fitness_center</span>
                  <h2 className="text-sm font-semibold tracking-tight text-slate-900">Daily Algorithmic Bounty</h2>
                </div>
                <span className="text-xs font-mono text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  +50 LP REWARD
                </span>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 text-sm font-sans truncate">
                    {bountyProblem?.title || 'Loading bounty...'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 font-sans">
                    {bountyProblem?.description
                      ? bountyProblem.description.slice(0, 160) + '...'
                      : 'Solve within the match timer with fewer than 2 submissions to claim the daily bonus.'}
                  </div>
                </div>
                <button
                  onClick={onStartBounty}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-xs font-semibold tracking-wider transition-colors shrink-0 cursor-pointer"
                >
                  {queueing ? 'RESUME BOUNTY...' : 'START BOUNTY'}
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: Streak + Vanguard */}
          <div className="lg:col-span-4 space-y-4">
            {/* Daily Combat Streak */}
            <StreakCard currentUser={currentUser} />

            <VanguardLeaderboard
              top3={topPlayers}
              me={
                meUser || currentUser
                  ? {
                      rank: rankPosition,
                      name: meUser?.name || currentUser?.name || 'You',
                      avatar: meUser?.avatar || currentUser?.avatar || null,
                      tier: yourTier,
                      rating: meUser?.rating ?? rating,
                    }
                  : null
              }
              total={totalDevs}
              loading={loadingData}
              onViewAll={() => navigate('leaderboard')}
            />
          </div>
        </section>
      </div>
    </div>
  );
}