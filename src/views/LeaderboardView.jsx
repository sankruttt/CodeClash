import React, { useState, useEffect, useRef } from 'react';
import { leaderboardAPI } from '../services/api';
import { getTierDetails } from '../utils/tierUtils';

const SUPPORTED_STACKS = ['All Stacks', 'C', 'C++', 'Java', 'JavaScript', 'Python'];

export default function LeaderboardView({ currentUser }) {
  const [stackFilter, setStackFilter] = useState('All Stacks');
  const [searchQuery, setSearchQuery] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [top3, setTop3] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [userRankData, setUserRankData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageChanging, setPageChanging] = useState(false);
  const [apiError, setApiError] = useState(null);

  const requestSeq = useRef(0);

  const fetchPage = async (targetPage = 1, stack = stackFilter, search = searchQuery) => {
    const seq = ++requestSeq.current;
    if (leaderboard.length === 0) {
      setLoading(true);
    } else {
      setPageChanging(true);
    }
    setApiError(null);

    try {
      const [res, meRes] = await Promise.all([
        leaderboardAPI.getLeaderboard({
          page: targetPage,
          limit: 20,
          sortBy: 'rating',
          stack: stack !== 'All Stacks' ? stack : '',
          search: search?.trim() || ''
        }),
        currentUser?.id ? leaderboardAPI.getMeRank().catch(() => null) : Promise.resolve(null),
      ]);

      if (seq !== requestSeq.current) return; // Discard stale response

      if (res?.success && res.data) {
        setLeaderboard(res.data.leaderboard || []);
        if (res.data.top3 && res.data.top3.length > 0) {
          setTop3(res.data.top3);
        } else if (targetPage === 1 && res.data.leaderboard) {
          setTop3(res.data.leaderboard.slice(0, 3));
        }
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      }

      if (meRes?.success && meRes.data) {
        setUserRankData(meRes.data);
      }
    } catch (err) {
      if (seq === requestSeq.current) {
        console.error('Leaderboard fetch failed:', err);
        setApiError('Unable to load leaderboard. Please check connection to MongoDB.');
      }
    } finally {
      if (seq === requestSeq.current) {
        setLoading(false);
        setPageChanging(false);
      }
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPage(1, stackFilter, searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [stackFilter, searchQuery, currentUser?.id]);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages || pageChanging || loading) return;
    fetchPage(newPage, stackFilter, searchQuery);
  };

  const getStackForUser = (item, idx) => {
    if (item.stack && SUPPORTED_STACKS.includes(item.stack)) return item.stack;
    const fallbackStacks = ['Python', 'JavaScript', 'C++', 'Java', 'C'];
    return fallbackStacks[idx % fallbackStacks.length];
  };

  const mappedLadder = leaderboard.map((item, idx) => {
    const wins = item.wins || 0;
    const losses = item.losses || 0;
    const totalDuels = wins + losses + (item.draws || 0);
    const calculatedWR = totalDuels > 0 ? `${((wins / totalDuels) * 100).toFixed(1)}%` : '0.0%';
    const tierLabel = getTierDetails(item.rating || 1500, item.tier).currentTier;

    return {
      rank: item.rank || pagination.page * 20 - 20 + idx + 1,
      rankFormatted: (item.rank || pagination.page * 20 - 20 + idx + 1).toString().padStart(2, '0'),
      userId: item.userId || item.id,
      name: item.name || item.username || 'Combatant',
      rating: item.rating || 1500,
      winRate: item.winRate || calculatedWR,
      duels: totalDuels,
      stack: getStackForUser(item, idx),
      tier: tierLabel.toUpperCase(),
      avatar: item.avatar || (item.username ? item.username.slice(0, 2).toUpperCase() : 'CC'),
    };
  });

  const filteredLadder = mappedLadder.filter((item) => {
    if (
      searchQuery &&
      !item.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !item.username?.toLowerCase()?.includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    if (stackFilter !== 'All Stacks' && item.stack !== stackFilter) {
      return false;
    }
    return true;
  });

  const mapTopItem = (item, defaultMatrix) => {
    if (!item) return null;
    const wins = item.wins || 0;
    const losses = item.losses || 0;
    const total = wins + losses + (item.draws || 0);
    const winRate = total > 0 ? `${((wins / total) * 100).toFixed(1)}%` : '0.0%';
    return {
      name: item.name || item.username || 'Champion',
      rating: item.rating || 1500,
      winRate: item.winRate || winRate,
      stack: item.stack || 'Python',
      avatar: item.avatar || (item.username ? item.username.slice(0, 2).toUpperCase() : 'CC'),
      subtitle: defaultMatrix,
    };
  };

  const podium1 = top3[0] ? mapTopItem(top3[0], 'Grandmaster Champion') : null;
  const podium2 = top3[1] ? mapTopItem(top3[1], 'Fast-Execution Matrix') : null;
  const podium3 = top3[2] ? mapTopItem(top3[2], 'Algorithmic Architect') : null;

  // Authoritative current user details
  const myRank = userRankData?.rank;
  const myRating = userRankData?.user?.rating ?? currentUser?.rating ?? 1500;
  const myWins = userRankData?.user?.wins ?? currentUser?.wins ?? 0;
  const myLosses = userRankData?.user?.losses ?? currentUser?.losses ?? 0;
  const myTotalDuels = myWins + myLosses;
  const myWinRate = myTotalDuels > 0 ? `${((myWins / myTotalDuels) * 100).toFixed(1)}% WR` : '0.0% WR';
  const myTier = getTierDetails(myRating).currentTier;

  const currentUserIdStr = currentUser?.id ? String(currentUser.id) : currentUser?._id ? String(currentUser._id) : null;
  const isCurrentUserOnPage = currentUserIdStr && mappedLadder.some((item) => String(item.userId) === currentUserIdStr);

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
              Real-time deterministic ratings across competitive clusters. Powered by live MongoDB telemetry.
            </p>
          </div>
          {pagination.total > 0 && (
            <div className="text-xs font-mono text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs self-start lg:self-center">
              Total Combatants: <span className="font-bold text-slate-900">{pagination.total.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between font-mono text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 overflow-x-auto py-0.5">
              {SUPPORTED_STACKS.map((stk) => (
                <button
                  key={stk}
                  onClick={() => setStackFilter(stk)}
                  className={`px-2.5 py-0.5 rounded transition-colors text-[11px] cursor-pointer ${
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
              placeholder="Search combatant..."
              className="w-full bg-slate-50 text-slate-900 placeholder:text-slate-400 font-sans text-xs pl-8 pr-4 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-2xs"
            />
          </div>
        </div>

        {apiError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-mono flex items-center justify-between">
            <span>{apiError}</span>
            <button onClick={() => fetchPage(pagination.page)} className="underline hover:text-red-900 ml-3">
              Retry
            </button>
          </div>
        )}

        {/* Top 3 Podium Cards */}
        {loading && top3.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch pt-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-5 border border-slate-200 animate-pulse space-y-3">
                <div className="h-4 bg-slate-100 rounded w-1/3" />
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-slate-100" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-slate-100 rounded w-2/3" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-14 bg-slate-50 rounded-lg" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch pt-1">
            {/* Rank 2 Podium Card */}
            <div className="order-2 md:order-1 bg-white rounded-xl p-4 flex flex-col justify-between border border-slate-200 hover:border-slate-300 shadow-xs transition-all relative">
              {podium2 ? (
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 font-mono text-[10px]">
                    <span className="text-slate-600 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Rank #02
                    </span>
                    <span className="text-slate-500 font-medium">Tier: {getTierDetails(podium2.rating).currentTier}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <div className="w-11 h-11 rounded-lg bg-slate-800 text-white font-mono font-bold flex items-center justify-center text-sm">
                      {podium2.avatar}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm text-slate-900">{podium2.name}</span>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400">{podium2.subtitle}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100 mt-3.5 font-mono">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-400 uppercase font-medium">Rating</span>
                      <span className="text-sm font-bold text-slate-900 mt-0.5">{podium2.rating.toLocaleString()}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-400 uppercase font-medium">Win Rate</span>
                      <span className="text-sm font-semibold text-emerald-600 mt-0.5">{podium2.winRate}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-400 uppercase font-medium">Stack</span>
                      <span className="text-xs font-semibold text-slate-700 mt-0.5">{podium2.stack}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 font-mono text-xs">Awaiting Duelist #2</div>
              )}
            </div>

            {/* Rank 1 Center Podium Card */}
            <div className="order-1 md:order-2 bg-gradient-to-b from-indigo-50/50 via-white to-white rounded-xl p-5 flex flex-col justify-between border-2 border-indigo-500/80 shadow-md relative">
              {podium1 ? (
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-indigo-100 font-mono text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                      <span className="text-indigo-700 uppercase tracking-wider font-bold">
                        Rank #01 Dominator
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold border border-indigo-200">
                      {getTierDetails(podium1.rating).currentTier.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mt-3">
                    <div className="w-13 h-13 rounded-xl bg-gradient-to-tr from-amber-500 via-indigo-600 to-sky-500 text-white font-mono font-black flex items-center justify-center text-lg shadow-sm">
                      {podium1.avatar}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-base text-slate-900">{podium1.name}</span>
                      </div>
                      <span className="font-mono text-[11px] text-indigo-600 font-medium">
                        {podium1.subtitle}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-indigo-50/50 border border-indigo-100 mt-3.5 font-mono">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-500 uppercase font-medium">Rating</span>
                      <span className="text-base font-black text-indigo-900 mt-0.5">{podium1.rating.toLocaleString()}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-500 uppercase font-medium">Win Rate</span>
                      <span className="text-base font-bold text-emerald-600 mt-0.5">{podium1.winRate}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-500 uppercase font-medium">Stack</span>
                      <span className="text-xs font-bold text-slate-800 mt-0.5">{podium1.stack}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 font-mono text-xs">Awaiting Global Dominator</div>
              )}
            </div>

            {/* Rank 3 Podium Card */}
            <div className="order-3 bg-white rounded-xl p-4 flex flex-col justify-between border border-slate-200 hover:border-slate-300 shadow-xs transition-all relative">
              {podium3 ? (
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 font-mono text-[10px]">
                    <span className="text-slate-600 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Rank #03
                    </span>
                    <span className="text-slate-500 font-medium">Tier: {getTierDetails(podium3.rating).currentTier}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <div className="w-11 h-11 rounded-lg bg-slate-800 text-white font-mono font-bold flex items-center justify-center text-sm">
                      {podium3.avatar}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm text-slate-900">{podium3.name}</span>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400">{podium3.subtitle}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100 mt-3.5 font-mono">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-400 uppercase font-medium">Rating</span>
                      <span className="text-sm font-bold text-slate-900 mt-0.5">{podium3.rating.toLocaleString()}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-400 uppercase font-medium">Win Rate</span>
                      <span className="text-sm font-semibold text-emerald-600 mt-0.5">{podium3.winRate}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-400 uppercase font-medium">Stack</span>
                      <span className="text-xs font-semibold text-slate-700 mt-0.5">{podium3.stack}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 font-mono text-xs">Awaiting Duelist #3</div>
              )}
            </div>
          </div>
        )}

        {/* Full Ladder Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-5 sm:px-6 py-3.5 border-b border-slate-200 flex items-center justify-between font-mono text-xs">
            <span className="font-bold text-slate-900 uppercase tracking-wide">Competitive Pool Ladder</span>
            <span className="text-slate-400">
              {loading
                ? 'Retrieving rankings...'
                : `Showing page ${pagination.page} of ${pagination.totalPages} (${filteredLadder.length} records)`}
            </span>
          </div>

          <div className="overflow-x-auto relative">
            {pageChanging && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10">
                <div className="flex items-center gap-2 font-mono text-xs text-indigo-600 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-indigo-100">
                  <span className="w-3 h-3 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
                  Loading page {pagination.page}...
                </div>
              </div>
            )}
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
                {loading && leaderboard.length === 0 ? (
                  [1, 2, 3, 4, 5].map((idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td className="py-3.5 px-5 sm:px-6"><div className="h-4 bg-slate-100 rounded w-8" /></td>
                      <td className="py-3.5 px-5 sm:px-6"><div className="h-4 bg-slate-100 rounded w-32" /></td>
                      <td className="py-3.5 px-5 sm:px-6"><div className="h-4 bg-slate-100 rounded w-16" /></td>
                      <td className="py-3.5 px-5 sm:px-6"><div className="h-4 bg-slate-100 rounded w-16" /></td>
                      <td className="py-3.5 px-5 sm:px-6"><div className="h-4 bg-slate-100 rounded w-12" /></td>
                      <td className="py-3.5 px-5 sm:px-6"><div className="h-4 bg-slate-100 rounded w-10" /></td>
                      <td className="py-3.5 px-5 sm:px-6"><div className="h-4 bg-slate-100 rounded w-16" /></td>
                    </tr>
                  ))
                ) : filteredLadder.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-400 font-sans">
                      No combatants found matching current filters.
                    </td>
                  </tr>
                ) : (
                  filteredLadder.map((item) => {
                    const isCurrentUser =
                      currentUserIdStr && String(item.userId) === currentUserIdStr;

                    return (
                      <tr
                        key={item.rank}
                        className={`transition-colors ${
                          isCurrentUser
                            ? 'bg-indigo-50/90 ring-1 ring-inset ring-indigo-300 font-semibold'
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="py-3.5 px-5 sm:px-6 font-bold text-slate-800 whitespace-nowrap">
                          #{item.rankFormatted}
                        </td>
                        <td className="py-3.5 px-5 sm:px-6 font-sans font-medium text-slate-900 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-7 h-7 rounded-full font-mono font-bold text-[10px] flex items-center justify-center shrink-0 ${
                                isCurrentUser
                                  ? 'bg-indigo-600 text-white shadow-xs'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {item.avatar}
                            </div>
                            <span className="font-semibold">{item.name}</span>
                            {isCurrentUser && (
                              <span className="px-1.5 py-0.2 rounded bg-indigo-200 text-indigo-900 font-mono text-[10px] font-bold">
                                YOU
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-5 sm:px-6 whitespace-nowrap">
                          <span className="inline-flex items-center whitespace-nowrap px-2.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {item.tier}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 sm:px-6 font-bold text-slate-900 whitespace-nowrap">
                          {item.rating.toLocaleString()} LP
                        </td>
                        <td className="py-3.5 px-5 sm:px-6 text-emerald-600 font-semibold whitespace-nowrap">
                          {item.winRate}
                        </td>
                        <td className="py-3.5 px-5 sm:px-6 text-slate-600 whitespace-nowrap">{item.duels}</td>
                        <td className="py-3.5 px-5 sm:px-6 text-slate-600 whitespace-nowrap">{item.stack}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 sm:px-6 py-3 border-t border-slate-200 font-mono text-xs bg-slate-50/50">
            <div className="text-slate-500">
              Page <span className="font-bold text-slate-800">{pagination.page}</span> of{' '}
              <span className="font-bold text-slate-800">{pagination.totalPages || 1}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!pagination.hasPreviousPage || loading || pageChanging}
                onClick={() => handlePageChange(pagination.page - 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-medium flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
              >
                <span>←</span>
                <span>Previous</span>
              </button>

              <span className="px-2 text-slate-400">|</span>

              <button
                type="button"
                disabled={!pagination.hasNextPage || loading || pageChanging}
                onClick={() => handlePageChange(pagination.page + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-medium flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
              >
                <span>Next</span>
                <span>→</span>
              </button>
            </div>
          </div>

          {/* Your Rank Anchor */}
          <div className="px-5 sm:px-6 py-3.5 bg-indigo-50/90 border-t border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-xs">
            <div className="flex items-center gap-3">
              <span className="text-indigo-700 font-bold">
                {myRank ? `#${String(myRank).padStart(2, '0')}` : '#--'}
              </span>
              <span className="font-sans font-bold text-indigo-950">
                {currentUser?.name || currentUser?.username || 'You'} (Your Standing)
              </span>
              <span className="inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-semibold">
                {myTier.toUpperCase()}
              </span>
              {isCurrentUserOnPage && (
                <span className="text-[10px] text-indigo-600 bg-white px-2 py-0.5 rounded border border-indigo-200">
                  On Current Page
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-indigo-900">{myRating.toLocaleString()} LP</span>
              <span className="text-slate-400">•</span>
              <span className="text-emerald-600 font-semibold">{myWinRate}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
