import React from 'react';
import { SCORING, formatLp } from '../config/scoring';
import { getTierDetails } from '../utils/tierUtils';

/**
 * MatchCompleteModal
 * Arena debrief overlay — renders the authoritative backend Match result
 * (players, ratings deltas, completion times, verdict) with the problem
 * metadata and the user's final execution telemetry.
 */
function defaultFormatTime(secs) {
  if (typeof secs !== 'number' || isNaN(secs) || secs < 0) return null;
  const mins = Math.floor(secs / 60);
  const remSecs = Math.floor(secs % 60);
  return `${String(mins).padStart(2, '0')}:${String(remSecs).padStart(2, '0')}`;
}

function getInitials(name) {
  if (!name || typeof name !== 'string') return '??';
  const clean = name.trim().replace(/[^a-zA-Z0-9_\s]/g, '');
  const parts = clean.split(/[\s_-]+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase() || 'CC';
}

function DuelPlayerCard({
  name,
  initials,
  avatarClass,
  rankLine,
  rankScoreClass,
  verdict,
  cardClass,
  statusSolved,
  statusTextClass,
  passedTests,
  totalTests,
  passedColorClass,
  timeStr,
  timeTextClass,
  execTime,
  execColorClass,
  execNote,
  memLimit,
  delta,
  deltaColorClass,
  ratingAfterLP,
}) {
  return (
    <article className={`rounded-2xl bg-white p-4 flex flex-col justify-between space-y-3.5 ${cardClass}`}>
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-xs shadow-xs shrink-0 ${avatarClass}`}>
            {initials}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 leading-tight truncate">{name}</h2>
            <span className="text-[11px] font-mono text-slate-500 block truncate">
              Rank: <strong className={`font-semibold ${rankScoreClass}`}>{rankLine}</strong>
            </span>
          </div>
        </div>
        {verdict}
      </div>

      <div className="space-y-2 font-mono text-xs">
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2">
            <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Status</span>
            <span className={`font-bold flex items-center gap-1 mt-0.5 ${statusTextClass}`}>
              <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24">
                {statusSolved ? <path d="M20 6 9 17l-5-5" /> : <path d="M12 8v4m0 4h.01" />}
              </svg>
              {statusSolved ? `${statusSolved} Solved` : '0 Solved (DNF)'}
            </span>
          </div>
          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2">
            <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Test Vectors</span>
            <span className={`text-slate-800 font-bold block mt-0.5 ${passedColorClass}`}>
              {passedTests}/{totalTests} Passed
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
          <div className="bg-slate-50 border border-slate-200/70 rounded-lg p-1.5 flex flex-col justify-center">
            <span className="text-[8px] text-slate-400 uppercase block">Exec</span>
            <span className={`font-bold block truncate ${execColorClass}`}>{execTime}</span>
            {execNote && <span className="text-[8px] text-emerald-600 block leading-tight">{execNote}</span>}
          </div>
          <div className="bg-slate-50 border border-slate-200/70 rounded-lg p-1.5 flex flex-col justify-center">
            <span className="text-[8px] text-slate-400 uppercase block">Solve</span>
            <span className={`font-bold block truncate ${timeTextClass}`}>{timeStr || '--:--'}</span>
          </div>
          <div className="bg-slate-50 border border-slate-200/70 rounded-lg p-1.5 flex flex-col justify-center">
            <span className="text-[8px] text-slate-400 uppercase block">Memory</span>
            <span className={`font-bold block truncate ${timeTextClass}`}>{memLimit}</span>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100 flex items-center justify-between font-mono">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Delta</span>
        <div className="flex items-baseline gap-1.5">
          <span className={`text-base sm:text-lg font-black tracking-tight ${deltaColorClass}`}>{delta}</span>
          <span className="text-[10px] text-slate-400 font-medium">{ratingAfterLP}</span>
        </div>
      </div>
    </article>
  );
}

export default function MatchCompleteModal({
  isOpen,
  matchResult,
  currentUser,
  activeMatch,
  problem,
  executionResult,
  hasSolved,
  solveTime,
  opponentSolved,
  opponentSolveTime,
  formatTimer,
  onCleanExit,
  navigate,
}) {
  if (!isOpen || !matchResult) return null;

  const players = Array.isArray(matchResult?.players) ? matchResult.players : [];

  // Robust identification of current user vs opponent
  const userIndex = players.findIndex((p) => {
    if (!p) return false;
    const pUserId = p.userId !== undefined ? String(p.userId) : null;
    const pId = p.id !== undefined ? String(p.id) : null;
    const curId = currentUser?.id !== undefined ? String(currentUser.id) : null;
    const cur_Id = currentUser?._id !== undefined ? String(currentUser._id) : null;

    if (curId && (pUserId === curId || pId === curId)) return true;
    if (cur_Id && (pUserId === cur_Id || pId === cur_Id)) return true;

    if (currentUser?.username && p.username && p.username.toLowerCase() === currentUser.username.toLowerCase()) return true;
    if (currentUser?.name && p.username && p.username.toLowerCase() === currentUser.name.toLowerCase()) return true;
    return false;
  });

  const userPlayer = (userIndex !== -1 ? players[userIndex] : players[0]) || {};
  const opponentPlayer = (userIndex !== -1 ? players[userIndex === 0 ? 1 : 0] : players[1]) || {};

  const userName = userPlayer.username || currentUser?.name || currentUser?.username || 'You';
  const opponentName = opponentPlayer.username || activeMatch?.opponent || 'Opponent';

  // Outcome Logic (Authoritative from backend)
  const isDraw = Boolean(
    matchResult?.isDraw ||
    matchResult?.result === 'draw' ||
    matchResult?.result === 'tie' ||
    (!matchResult?.winner && !matchResult?.winnerId && !userPlayer.isWinner && !opponentPlayer.isWinner)
  );

  const isUserWinner = !isDraw && Boolean(
    userPlayer.isWinner ||
    (matchResult?.winnerId && (String(matchResult.winnerId) === String(userPlayer.userId) || String(matchResult.winnerId) === String(userPlayer.id))) ||
    (matchResult?.winner && userName && String(matchResult.winner).toLowerCase() === String(userName).toLowerCase()) ||
    (matchResult?.result === 'player1' && userIndex === 0) ||
    (matchResult?.result === 'player2' && userIndex === 1)
  );

  const isOpponentWinner = !isDraw && !isUserWinner && Boolean(
    opponentPlayer.isWinner ||
    (matchResult?.winnerId && (String(matchResult.winnerId) === String(opponentPlayer.userId) || String(matchResult.winnerId) === String(opponentPlayer.id))) ||
    (matchResult?.winner && opponentName && String(matchResult.winner).toLowerCase() === String(opponentName).toLowerCase()) ||
    (matchResult?.result === 'player1' && userIndex === 1) ||
    (matchResult?.result === 'player2' && userIndex === 0)
  );

  // Ratings (rank shows the pre-match LP, delta footer shows post-match)
  const userRating = userPlayer.ratingBefore ?? userPlayer.ratingAfter ?? userPlayer.rating ?? userPlayer.currentRating ?? currentUser?.rating ?? SCORING.defaultRating;
  const opponentRating = opponentPlayer.ratingBefore ?? opponentPlayer.ratingAfter ?? opponentPlayer.rating ?? opponentPlayer.currentRating ?? activeMatch?.opponentRating ?? SCORING.simulated?.ranked ?? SCORING.defaultRating;

  const userPoints = typeof userPlayer.pointsAwarded === 'number'
    ? userPlayer.pointsAwarded
    : typeof userPlayer.ratingChange === 'number'
      ? userPlayer.ratingChange
      : (isDraw ? SCORING.ranked.draw : isUserWinner ? SCORING.ranked.win : SCORING.ranked.loss);

  const opponentPoints = typeof opponentPlayer.pointsAwarded === 'number'
    ? opponentPlayer.pointsAwarded
    : typeof opponentPlayer.ratingChange === 'number'
      ? opponentPlayer.ratingChange
      : (isDraw ? SCORING.ranked.draw : isOpponentWinner ? SCORING.ranked.win : SCORING.ranked.loss);

  const userSolvedCount = typeof userPlayer.problemsSolved === 'number'
    ? userPlayer.problemsSolved
    : (hasSolved ? 1 : 0);

  const opponentSolvedCount = typeof opponentPlayer.problemsSolved === 'number'
    ? opponentPlayer.problemsSolved
    : (opponentSolved ? 1 : 0);

  // Test cases
  const totalTestCases = (problem?.examples && problem.examples.length > 0)
    ? problem.examples.length
    : (executionResult?.testResults && executionResult.testResults.length > 0)
      ? executionResult.testResults.length
      : 3;

  const userPassedTests = userSolvedCount > 0
    ? (executionResult?.testResults && executionResult.testResults.length > 0
        ? executionResult.testResults.filter((t) => t.passed).length
        : totalTestCases)
    : 0;

  const opponentPassedTests = opponentSolvedCount > 0 ? totalTestCases : 0;

  // Timers
  const fmt = (v) => (formatTimer ? formatTimer(v) : defaultFormatTime(v));
  const userTimeStr = userPlayer.completionTime
    ? fmt(userPlayer.completionTime)
    : (hasSolved && solveTime ? fmt(solveTime) : null);

  const opponentTimeStr = opponentPlayer.completionTime
    ? fmt(opponentPlayer.completionTime)
    : (opponentSolved && opponentSolveTime ? fmt(opponentSolveTime) : null);

  const userExecTime = executionResult?.executionTime || executionResult?.time || null;

  // Post-match ratings
  const userRatingAfter = userPlayer.ratingAfter ?? ((Number(userRating) || 0) + userPoints);
  const opponentRatingAfter = opponentPlayer.ratingAfter ?? ((Number(opponentRating) || 0) + opponentPoints);

  const userTier = getTierDetails(Number(userRating) || 1500).currentTier;
  const opponentTier = getTierDetails(Number(opponentRating) || 1500).currentTier;

  // Protocol metadata
  const matchType = activeMatch?.type === 'scrimmage' || activeMatch?.type === 'Private Scrimmage'
    ? 'Private Scrimmage'
    : (activeMatch?.isRanked ?? true)
      ? '1v1 Ranked Duel'
      : '1v1 Casual Duel';

  const problemTitle = problem?.title || activeMatch?.problem || activeMatch?.problemTitle || activeMatch?.problemData?.title || 'Competitive Clash';
  const difficultyLabel = problem?.difficulty || activeMatch?.difficulty || null;
  const memLimit = problem?.memoryLimit ? `${problem.memoryLimit} MB` : '—';

  // Concluded-at time / duration breadcrumb
  const concludedStamp = matchResult?.completedAt || matchResult?.startedAt;
  const concludedAt = concludedStamp
    ? new Date(concludedStamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;
  const durationStr = typeof matchResult?.duration === 'number' && matchResult.duration > 0
    ? fmt(matchResult.duration)
    : null;

  // Reference id for the ledger footer
  const refId = (() => {
    const id = matchResult?.id || matchResult?._id;
    if (!id) return null;
    const s = String(id);
    return `#${s.slice(0, 2).toUpperCase()}-${s.slice(-4).toUpperCase()}`;
  })();

  const handleExit = (destination) => {
    sessionStorage.removeItem('codeclash_active_match');
    if (onCleanExit) onCleanExit(destination);
    else if (navigate) navigate(destination);
    else window.location.hash = destination;
  };

  const verdictPill = (kind, strong) => (
    <span
      className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider border ${
        kind === 'win'
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : kind === 'loss'
            ? 'bg-rose-50 text-rose-600 border-rose-200'
            : 'bg-slate-100 text-slate-600 border-slate-200'
      }`}
    >
      <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" />
        {kind === 'win'
          ? <path d="m9 12 2 2 4-4" />
          : kind === 'loss'
            ? <><path d="m15 9-6 6" /><path d="m9 9 6 6" /></>
            : null}
      </svg>
      {strong}
    </span>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="match-complete-title"
      className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[6px] flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fadeIn"
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl modal-shadow border border-slate-100 overflow-hidden my-auto transition-all"
        data-purpose="match-complete-modal"
      >
        {/* Top Decorative Accent Rail */}
        <div className={`h-1.5 w-full ${isDraw ? 'bg-slate-400' : isUserWinner ? 'bg-emerald-500' : 'bg-rose-500'}`}/>
        <div className="p-6 sm:p-7 space-y-5">
          {/* Header: Protocol Badge + Decisive Resolution Box */}
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 font-bold uppercase tracking-wider border border-indigo-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                  LEDGER // ARENA DEBRIEF
                </span>
              </div>
              <h1 id="match-complete-title" className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Match Complete
              </h1>
              <p className="text-xs text-slate-500 font-mono">
                {matchType} • {problemTitle}
                {difficultyLabel && <span className="text-slate-400"> ({difficultyLabel})</span>}
              </p>
            </div>

            <div className="flex items-center gap-3 bg-amber-50/70 p-2.5 rounded-2xl border border-amber-200/80 shrink-0 self-start sm:self-center">
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-b from-amber-100 to-amber-200/90 border border-amber-300/80 flex items-center justify-center text-amber-600 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                  <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                  <path d="M4 22h16" />
                  <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                  <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                  <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                </svg>
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[9px] font-bold">★</span>
              </div>
              <div className="font-mono pr-1 text-left">
                <span className="text-[9px] uppercase font-bold text-amber-700 tracking-wider block">
                  {isDraw ? 'DUEL RESOLVED' : isUserWinner ? 'DECISIVE VICTORY' : 'DECISIVE RESOLUTION'}
                </span>
                <span className="text-xs font-bold text-slate-800">
                  {concludedAt ? `Concluded at ${concludedAt}` : durationStr ? `Elapsed ${durationStr}` : 'Concluded'}
                </span>
              </div>
            </div>
          </header>

          {/* Official Verdict Banner */}
          <div
            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl px-4 py-2.5 shadow-xs border ${
              isDraw
                ? 'bg-slate-50/70 border-slate-200'
                : isUserWinner
                  ? 'bg-emerald-50/70 border-emerald-300'
                  : 'bg-rose-50/60 border-rose-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-7 h-7 rounded-lg text-white flex items-center justify-center shrink-0 shadow-xs ${
                  isDraw ? 'bg-slate-400' : isUserWinner ? 'bg-emerald-600' : 'bg-rose-600'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  {isDraw ? <path d="M12 8v4m0 4h.01" /> : <path d="m9 12 2 2 4-4" />}
                </svg>
              </div>
              <div>
                <span className="text-[9px] font-mono font-bold uppercase tracking-widest block leading-tight text-slate-500">
                  {isDraw ? 'DUEL RESOLVED' : 'OFFICIAL VERDICT'}
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight uppercase font-mono block">
                  {isDraw ? 'DUEL ENDS IN A DRAW' : isUserWinner ? `${userName} WINS THE DUEL` : `${opponentName} WINS THE DUEL`}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 font-mono shrink-0">
              <span
                className={`px-2.5 py-1 rounded-lg text-xs font-black text-white shadow-xs ${
                  isDraw ? 'bg-slate-400' : userPoints > 0 ? 'bg-emerald-600' : 'bg-rose-600'
                }`}
              >
                {formatLp(userPoints)}
              </span>
            </div>
          </div>

          {/* Combatant Telemetry Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <DuelPlayerCard
              name={userName}
              initials={getInitials(userName)}
              avatarClass={isUserWinner
                ? 'bg-emerald-100 border border-emerald-300 text-emerald-800'
                : 'bg-indigo-100 border border-indigo-200 text-indigo-700'}
              rankLine={`${Number(userRating).toLocaleString()} LP (${userTier})`}
              rankScoreClass="text-slate-800"
              cardClass={isUserWinner
                ? 'border-2 border-emerald-400 winner-glow'
                : isDraw
                  ? 'border border-slate-200 bg-slate-50/40'
                  : 'border border-slate-200'}
              verdict={verdictPill(isDraw ? 'draw' : isUserWinner ? 'win' : 'loss', isDraw ? 'DRAW' : isUserWinner ? 'WINNER' : 'DEFEAT')}
              statusSolved={userSolvedCount > 0 ? userSolvedCount : null}
              statusTextClass={userSolvedCount > 0 ? 'text-emerald-700' : 'text-rose-600'}
              passedTests={userPassedTests}
              totalTests={totalTestCases}
              passedColorClass={userPassedTests > 0 ? 'text-emerald-600' : 'text-slate-500'}
              timeStr={userTimeStr}
              timeTextClass={userTimeStr ? 'text-slate-800' : 'text-slate-400'}
              execTime={userExecTime != null ? `${userExecTime}ms` : '—'}
              execColorClass={userExecTime != null ? 'text-emerald-700' : 'text-slate-400'}
              execNote={userExecTime != null ? '(Fastest)' : null}
              memLimit={memLimit}
              delta={formatLp(userPoints)}
              deltaColorClass={userPoints > 0 ? 'text-emerald-600' : userPoints < 0 ? 'text-rose-600' : 'text-slate-600'}
              ratingAfterLP={`→ ${Number(userRatingAfter).toLocaleString()} LP`}
            />

            <DuelPlayerCard
              name={opponentName}
              initials={getInitials(opponentName)}
              avatarClass={isOpponentWinner
                ? 'bg-emerald-100 border border-emerald-300 text-emerald-800'
                : 'bg-slate-100 border border-slate-200 text-slate-600'}
              rankLine={`${Number(opponentRating).toLocaleString()} LP (${opponentTier})`}
              rankScoreClass="text-slate-700"
              cardClass={isOpponentWinner
                ? 'border-2 border-emerald-400 winner-glow'
                : isDraw
                  ? 'border border-slate-200 bg-slate-50/40'
                  : 'border border-slate-200'}
              verdict={verdictPill(isDraw ? 'draw' : isOpponentWinner ? 'win' : 'loss', isDraw ? 'DRAW' : isOpponentWinner ? 'WINNER' : 'DEFEAT')}
              statusSolved={opponentSolvedCount > 0 ? opponentSolvedCount : null}
              statusTextClass={opponentSolvedCount > 0 ? 'text-emerald-700' : 'text-rose-600'}
              passedTests={opponentPassedTests}
              totalTests={totalTestCases}
              passedColorClass={opponentPassedTests > 0 ? 'text-emerald-600' : 'text-slate-500'}
              timeStr={opponentTimeStr}
              timeTextClass={opponentTimeStr ? 'text-slate-800' : 'text-slate-400'}
              execTime={opponentSolvedCount > 0 && !opponentTimeStr ? 'Timed out' : '—'}
              execColorClass={opponentSolvedCount > 0 && !opponentTimeStr ? 'text-rose-600' : 'text-slate-400'}
              execNote={null}
              memLimit={memLimit}
              delta={formatLp(opponentPoints)}
              deltaColorClass={opponentPoints > 0 ? 'text-emerald-600' : opponentPoints < 0 ? 'text-rose-600' : 'text-slate-600'}
              ratingAfterLP={`→ ${Number(opponentRatingAfter).toLocaleString()} LP`}
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-1 flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <button
              onClick={() => handleExit('lobby')}
              type="button"
              className="w-full sm:flex-1 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-200/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
                <line x1="13" x2="19" y1="19" y2="13" />
                <line x1="16" x2="20" y1="16" y2="20" />
                <line x1="19" x2="21" y1="21" y2="19" />
                <polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5" />
                <line x1="5" x2="9" y1="14" y2="18" />
                <line x1="7" x2="4" y1="17" y2="20" />
                <line x1="3" x2="5" y1="19" y2="21" />
              </svg>
              <span>Find New Match</span>
            </button>

            <button
              onClick={() => handleExit('history')}
              type="button"
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 font-mono text-xs cursor-pointer"
            >
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              <span>History</span>
            </button>
          </div>
        </div>

        {/* Ledger Sync Footer */}
        <footer className="border-t border-slate-100 px-6 sm:px-7 py-3 flex items-center justify-between text-[10px] font-mono text-slate-400 bg-slate-50/60">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {matchResult?.rewardsAwarded ? 'LEDGER SYNC: CONFIRMED' : 'ELO SYNCED TO GLOBAL LEDGER'}
          </span>
          {refId && (
            <span>
              REF_ID: <strong className="text-slate-600 font-semibold">{refId}</strong>
            </span>
          )}
        </footer>
      </div>
    </div>
  );
}