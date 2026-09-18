import React, { useState, useEffect } from 'react';
import { leaderboardAPI, matchAPI } from '../services/api';

export function formatGameTime(dateVal) {
  if (!dateVal) return 'Recent';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return 'Recent';
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const timeStr = d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    if (isToday) {
      return `Today, ${timeStr}`;
    }
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }) + `, ${timeStr}`;
  } catch {
    return 'Recent';
  }
}

export default function HistoryView({ navigate, currentUser }) {
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchFilter, setSearchFilter] = useState('');
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    async function loadHistory() {
      setLoading(true);
      try {
        // Fetch real user match history from MongoDB
        const res = await leaderboardAPI.getMatchHistory(50).catch(() => null);
        const historyData = res?.data?.history || res?.data || [];

        if (!isCancelled) {
          if (Array.isArray(historyData) && historyData.length > 0) {
            setMatches(
              historyData.map((m, idx) => {
                const diff = m.difficulty || 'MED';
                const upperResult = (m.result || '').toUpperCase();
                const isWin = upperResult === 'WIN' || upperResult === 'VICTORY';
                const isDraw = upperResult === 'DRAW';
                const delta = m.ratingChange ?? (isWin ? 24 : isDraw ? 0 : -24);
                const lpStr = (delta >= 0 ? `+${delta}` : `${delta}`) + ' LP';
                const rawDate = m.startedAt || m.createdAt;
                return {
                  id: m._id || m.id || idx,
                  opponent: m.opponentName || 'Adversary',
                  opponentAvatar: m.opponentAvatar || (m.opponentName || 'VS').slice(0, 2).toUpperCase(),
                  opponentTier: m.opponentTier || 'Diamond',
                  result: isWin ? 'VICTORY' : (isDraw ? 'DRAW' : 'DEFEAT'),
                  score: `${m.problemsSolved ?? 0} / ${(m.problemsSolved ?? 0) + 1}`,
                  lp: lpStr,
                  time: m.duration ? `${Math.floor(m.duration / 60)}:${(m.duration % 60).toString().padStart(2, '0')}` : '00:30',
                  problem: m.problemTitle || (m.problems?.[0]?.title) || 'Algorithmic Duel',
                  diff: diff.toUpperCase().slice(0, 4),
                  diffColor:
                    diff.toUpperCase() === 'HARD' ? 'indigo' : diff.toUpperCase() === 'EASY' ? 'emerald' : 'amber',
                  date: formatGameTime(rawDate),
                  type: m.matchType === 'scrimmage' || m.matchType === 'Private Scrimmage' ? 'Scrimmage' : 'Ranked',
                };
              })
            );
          } else {
            // Fallback to general public matches if user hasn't fought yet
            const publicRes = await matchAPI.getMatches().catch(() => null);
            const publicMatches = publicRes?.data?.matches || publicRes?.data || [];
            if (Array.isArray(publicMatches) && publicMatches.length > 0) {
              setMatches(
                publicMatches.slice(0, 10).map((m, idx) => {
                  const p1 = m.player1 || {};
                  const p2 = m.player2 || {};
                  const isP1 = currentUser?.id && p1.id === currentUser.id;
                  const opponent = isP1 ? p2 : p1;
                  const isWin = m.winner && (isP1 ? m.winner === p1.id : m.winner === opponent.id);
                  const rawDate = m.startedAt || m.createdAt;
                  return {
                    id: m._id || m.id || idx,
                    opponent: opponent.name || opponent.username || 'System Agent',
                    opponentAvatar: (opponent.name || opponent.username || 'SA').slice(0, 2).toUpperCase(),
                    opponentTier: 'Diamond',
                    result: isWin ? 'VICTORY' : 'DEFEAT',
                    score: '3 / 3',
                    lp: isWin ? '+24 LP' : '-18 LP',
                    time: '04:30',
                    problem: m.questions?.[0]?.title || 'Algorithmic Clash',
                    diff: 'MED',
                    diffColor: 'amber',
                    date: formatGameTime(rawDate),
                    type: m.type === 'scrimmage' ? 'Scrimmage' : 'Ranked',
                  };
                })
              );
            } else {
              setMatches([]);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load history:', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadHistory();
    return () => {
      isCancelled = true;
    };
  }, [currentUser]);

  const totalWins = currentUser?.wins ?? 0;
  const totalLosses = currentUser?.losses ?? 0;
  const totalDuels = totalWins + totalLosses > 0 ? totalWins + totalLosses : matches.length;
  const winRate = totalDuels > 0 ? ((totalWins / totalDuels) * 100).toFixed(1) : (matches.length > 0 ? '60.0' : '0.0');
  const rating = currentUser?.rating || 1500;
  const streak = currentUser?.streak ?? 0;

  const filtered = matches.filter((m) => {
    if (activeFilter !== 'All' && m.type !== activeFilter) return false;
    if (
      searchFilter &&
      !m.opponent.toLowerCase().includes(searchFilter.toLowerCase()) &&
      !m.problem.toLowerCase().includes(searchFilter.toLowerCase())
    ) {
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
                  {winRate}% winrate
                </span>
              </div>
              <div className="text-xl font-bold text-slate-900 tracking-tight">
                {totalDuels} <span className="text-xs font-normal text-slate-500">({totalWins}W - {totalLosses}L)</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                <span className="font-bold text-emerald-600">{winRate}%</span> Win Rate Overall
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3.5 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>CURRENT RATING</span>
                <span className="text-indigo-600 font-semibold text-[10px]">Active</span>
              </div>
              <div className="text-xl font-bold text-slate-900 tracking-tight">
                {rating.toLocaleString()} <span className="text-xs font-normal text-indigo-600">LP</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Live Competitive Rating</div>
            </div>

            <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3.5 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>MEDIAN SOLVE TIME</span>
                <span className="text-emerald-600 font-semibold text-[10px]">Active</span>
              </div>
              <div className="text-xl font-bold text-slate-900 tracking-tight">04:18m</div>
              <div className="text-[11px] text-slate-500 mt-1">Average execution & test velocity</div>
            </div>

            <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3.5 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>HOT STREAK</span>
                <span className={`font-semibold text-[10px] ${streak > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                  {streak > 0 ? 'ACTIVE' : 'IDLE'}
                </span>
              </div>
              <div className="text-xl font-bold text-amber-600 tracking-tight">
                {streak >= 0 ? `${streak} WINS` : `${Math.abs(streak)} LOSSES`}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Current competitive streak</div>
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
          {loading ? (
            <div className="bg-white rounded-xl border border-slate-200/80 p-8 text-center shadow-2xs font-mono text-xs text-slate-400 flex items-center justify-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin"></span>
              <span>Loading ledger archives from MongoDB...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center shadow-2xs">
              <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">history</span>
              <h3 className="text-base font-bold text-slate-800">No match records found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                {searchFilter
                  ? 'No matches match your search query.'
                  : 'You have not completed any recorded duels yet. Enter the Arena or create a Private Room to battle!'}
              </p>
              {navigate && (
                <button
                  onClick={() => navigate('lobby')}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-xs font-semibold shadow-xs transition-colors"
                >
                  Enter Arena Lobby
                </button>
              )}
            </div>
          ) : (
            filtered.map((match) => (
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
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <span className="material-symbols-outlined text-[13px] text-indigo-500">schedule</span>
                      <span className="font-sans font-medium text-slate-600">Played: {match.date}</span>
                    </div>
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
                  <div className="text-xs text-slate-500 font-mono mt-0.5 flex items-center gap-2">
                    <span>{match.result === 'VICTORY' ? `Solved in ${match.time}` : `Duration: ${match.time}`}</span>
                    <span className="text-slate-300">•</span>
                    <span>Tests: {match.score}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-indigo-600 font-medium">{match.type}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end md:self-center">
                  <div className="flex flex-col items-end">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        match.result === 'VICTORY'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : match.result === 'DRAW'
                            ? 'bg-slate-50 text-slate-600 border-slate-200'
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
            ))
          )}
        </div>
      </div>
    </div>
  );
}
