import React, { useState, useEffect } from 'react';
import { getTierDetails } from '../utils/tierUtils';
import { authAPI, leaderboardAPI } from '../services/api';

export default function ProfileView({ navigate, currentUser }) {
  const [profileData, setProfileData] = useState(currentUser || null);
  const [liveRank, setLiveRank] = useState(currentUser?.rank || null);

  useEffect(() => {
    let isCancelled = false;

    async function loadFreshProfile() {
      try {
        const res = await authAPI.getMe().catch(() => null);
        const u = res?.data?.user || res?.data;
        const streakRes = await authAPI.getStreak().catch(() => null);
        const s = streakRes?.data || streakRes;
        if (u && !isCancelled) {
          setProfileData((prev) => ({
            ...prev,
            ...u,
            ...(s && typeof s.streak === 'number' ? {
              streak: s.streak,
              longestStreak: s.longestStreak,
              todayCompleted: s.todayCompleted,
              activityHistory: s.activityHistory,
              weeklyIndicators: s.weeklyIndicators
            } : {})
          }));
          const targetId = u._id || u.id;
          if (targetId) {
            const rankRes = await leaderboardAPI.getUserRank(targetId).catch(() => null);
            const rank = rankRes?.data?.rank || rankRes?.data;
            if (rank && !isCancelled) {
              setLiveRank(rank);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load fresh profile in ProfileView:', err.message);
      }
    }

    loadFreshProfile();
    return () => {
      isCancelled = true;
    };
  }, [currentUser]);

  const user = profileData || currentUser;
  const rating = user?.rating || 1500;
  const tierInfo = getTierDetails(rating, user?.tier);
  const wins = user?.wins ?? 0;
  const losses = user?.losses ?? 0;
  const totalMatches = wins + losses;
  const winRate = totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(1) : '0.0';
  const streak = user?.streak ?? 0;
  const longestStreak = user?.longestStreak ?? user?.bestStreak ?? streak;
  const todayCompleted = Boolean(user?.todayCompleted);
  const streakDisplay = `${streak} ${streak === 1 ? 'DAY' : 'DAYS'}`;
  const rankDisplay = liveRank ? `#${liveRank}` : user?.rank ? `#${user.rank}` : 'Unranked';

  const masteryCategories = [
    { name: 'Dynamic Programming & Memoization', tier: 'Grandmaster', pct: 96, color: 'bg-indigo-600' },
    { name: 'Graph Theory & Network Flow', tier: 'Apex', pct: 91, color: 'bg-sky-500' },
    { name: 'Advanced Data Structures (Trie, Segment)', tier: 'Diamond', pct: 88, color: 'bg-emerald-500' },
    { name: 'Concurrency & Locks', tier: 'Master', pct: 82, color: 'bg-purple-600' },
    { name: 'Greedy & Monotonic Queues', tier: 'Diamond', pct: 79, color: 'bg-amber-500' },
  ];

  return (
    <div className="flex-1 min-w-0 px-4 pt-4 sm:px-6 sm:pt-6 pb-48 subtle-grid">
      <div className="max-w-[1440px] mx-auto space-y-6">
        {/* Combatant Hero Profile Header */}
        <section className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs relative overflow-hidden">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-sky-400 text-white font-mono font-black flex items-center justify-center text-2xl shadow-md ring-4 ring-indigo-50">
                  {user?.avatar || (user?.name || user?.username || 'KV').slice(0, 2).toUpperCase()}
                </div>
                <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-emerald-500 text-white font-mono text-[10px] font-bold ring-2 ring-white">
                  ONLINE
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                    {user?.name || user?.username || 'Combatant'}
                  </h1>
                  <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-mono text-xs font-semibold border border-indigo-200">
                    {tierInfo.currentTier.toUpperCase()}
                  </span>
                </div>
                <div className="font-mono text-xs text-indigo-600 font-medium mt-0.5">
                  {user?.handle || (user?.username ? `@${user.username}` : '@combatant')}
                </div>
                <p className="text-xs text-slate-500 mt-1 font-sans">
                  Competitive algorithmic duelist. Specializing in high-frequency graphs and concurrency vectors.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('lobby')}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-xs font-semibold tracking-wider flex items-center gap-2 shadow-xs transition-colors"
              >
                <span className="material-symbols-outlined text-sm">swords</span>
                <span>CHALLENGE TO DUEL</span>
              </button>
            </div>
          </div>

          {/* Tier & LP Progression Banner */}
          <div className="mt-5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 font-mono">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-bold tracking-wider">
                  {tierInfo.currentTier.toUpperCase()}
                </span>
                <span className="text-xs font-semibold text-slate-800 font-sans">
                  Tier Path: <strong className="font-mono text-indigo-600 font-bold">{tierInfo.currentTier}</strong> →{' '}
                  <strong className="font-mono text-slate-900">{tierInfo.nextTier} ({tierInfo.nextTierLP.toLocaleString()} LP)</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">
                  <strong className="text-slate-900 font-bold">{rating.toLocaleString()}</strong> / {tierInfo.nextTierLP.toLocaleString()} LP ({tierInfo.pct}%)
                </span>
                <span className="text-slate-300">•</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px] flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">keyboard_double_arrow_up</span>
                  {tierInfo.lpNeeded} LP needed to reach {tierInfo.nextTier}
                </span>
              </div>
            </div>

            <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden border border-slate-200/60">
              <div
                className="bg-gradient-to-r from-sky-500 via-indigo-500 to-indigo-600 h-full rounded-full transition-all duration-500 shadow-2xs"
                style={{ width: `${tierInfo.pct}%` }}
              />
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100 font-mono">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
              <div className="text-[10px] uppercase text-slate-400 font-medium">Rating LP</div>
              <div className="text-2xl font-black text-slate-900 mt-0.5">
                {rating.toLocaleString()} <span className="text-xs text-indigo-600 font-normal">LP</span>
              </div>
              <div className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-0.5">
                <span className="material-symbols-outlined text-xs">trending_up</span>
                <span>Active ({tierInfo.currentTier})</span>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
              <div className="text-[10px] uppercase text-slate-400 font-medium">Global Ladder</div>
              <div className="text-2xl font-black text-slate-900 mt-0.5">{rankDisplay}</div>
              <div className="text-[10px] text-slate-500 mt-1">Live Competitive Standing</div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
              <div className="text-[10px] uppercase text-slate-400 font-medium">Duel Win Rate</div>
              <div className="text-2xl font-black text-slate-900 mt-0.5">{winRate}%</div>
              <div className="text-[10px] text-slate-500 mt-1">{wins}W - {losses}L ({totalMatches} Matches)</div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
              <div className="flex items-center justify-between text-[10px] uppercase text-slate-400 font-medium">
                <span>Daily Streak</span>
                <span className="material-symbols-outlined text-xs text-amber-500">local_fire_department</span>
              </div>
              <div className="text-2xl font-black text-amber-600 mt-0.5">{streakDisplay}</div>
              <div className={`text-[10px] font-semibold mt-1 ${todayCompleted ? 'text-emerald-700' : 'text-amber-700'}`}>
                {todayCompleted
                  ? `✓ Active Today • Record: ${longestStreak}d`
                  : `Pending Today • Best: ${longestStreak}d`}
              </div>
            </div>
          </div>
        </section>

        {/* 2-Column Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (7 cols): Algorithmic Mastery Matrix */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-indigo-600 uppercase tracking-wider font-semibold">
                  <span className="material-symbols-outlined text-sm">hub</span>
                  <span>Category Breakdown</span>
                </div>
                <h2 className="text-base font-bold text-slate-900 mt-0.5">
                  Algorithmic Mastery Matrix
                </h2>
              </div>
              <span className="font-mono text-xs px-2 py-1 rounded bg-slate-100 text-slate-600">
                Normalized vs 2,200+ LP
              </span>
            </div>

            <div className="space-y-4">
              {masteryCategories.map((cat) => (
                <div key={cat.name} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{cat.name}</span>
                      <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        {cat.tier}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-slate-900">{cat.pct}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                    <div className={`h-full ${cat.color} rounded-full`} style={{ width: `${cat.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column (5 cols): Tier Progression & Clan */}
          <div className="lg:col-span-5 space-y-5">
            {/* Tier & LP to Next Tier Progression Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 font-mono">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-indigo-600">military_tech</span>
                  <h3 className="font-bold text-slate-900 text-sm font-sans">
                    Combatant Tier Progression
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
                  {tierInfo.currentTier.toUpperCase()}
                </span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-50 border border-slate-200/70">
                  <span className="text-slate-500 uppercase text-[11px]">Current Tier</span>
                  <span className="font-bold text-slate-900">{tierInfo.currentTier}</span>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-50 border border-slate-200/70">
                  <span className="text-slate-500 uppercase text-[11px]">Next Milestone</span>
                  <span className="font-bold text-indigo-600">{tierInfo.nextTier} ({tierInfo.nextTierLP.toLocaleString()} LP)</span>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-50 border border-slate-200/70">
                  <span className="text-slate-500 uppercase text-[11px]">Current Rating</span>
                  <span className="font-bold text-slate-900">{rating.toLocaleString()} / {tierInfo.nextTierLP.toLocaleString()} LP ({tierInfo.pct}%)</span>
                </div>

                <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-50 to-sky-50 border border-indigo-200/70 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-indigo-600 text-lg">bolt</span>
                    <div>
                      <div className="font-sans text-xs font-bold text-slate-900">LP Needed for Next Tier</div>
                      <div className="font-mono text-[10px] text-slate-500">{tierInfo.lpNeeded} LP to promote to {tierInfo.nextTier}</div>
                    </div>
                  </div>
                  <span className="font-mono font-black text-base text-indigo-600 bg-white px-2.5 py-1 rounded-lg border border-indigo-100 shadow-2xs">
                    {tierInfo.lpNeeded} LP
                  </span>
                </div>
              </div>
            </div>

            {/* Clan / Guild Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3 font-mono">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center text-sm">
                  AP
                </div>
                <div>
                  <div className="text-slate-900 font-bold text-sm">Clan [APEX]</div>
                  <div className="text-slate-400 text-xs">Top 3 Global Competitive Syndicate</div>
                </div>
              </div>
              <span className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 text-xs font-mono font-semibold">
                Member
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
