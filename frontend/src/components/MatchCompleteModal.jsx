import React from 'react';
import { SCORING } from '../config/scoring';

/**
 * MatchCompleteModal
 * Recreated from the cybernetics design specification.
 * Renders an authoritative, responsive Match Complete dialog over a darkened and blurred arena backdrop.
 */
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

  // Extract players array
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

    if (currentUser?.username && p.username && p.username.toLowerCase() === currentUser.username.toLowerCase()) {
      return true;
    }
    if (currentUser?.name && p.username && p.username.toLowerCase() === currentUser.name.toLowerCase()) {
      return true;
    }
    return false;
  });

  const userPlayer = (userIndex !== -1 ? players[userIndex] : players[0]) || {};
  const opponentPlayer = (userIndex !== -1 ? players[userIndex === 0 ? 1 : 0] : players[1]) || {};

  // Names & Initials
  const userName = userPlayer.username || currentUser?.name || currentUser?.username || 'You';
  const opponentName = opponentPlayer.username || activeMatch?.opponent || 'Opponent';

  const getInitials = (name) => {
    if (!name || typeof name !== 'string') return '??';
    const clean = name.trim().replace(/[^a-zA-Z0-9_\s]/g, '');
    const parts = clean.split(/[\s_-]+/);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase() || 'CC';
  };

  const userInitials = getInitials(userName);
  const opponentInitials = getInitials(opponentName);

  // Ratings
  const userRating = userPlayer.ratingAfter || userPlayer.rating || userPlayer.currentRating || currentUser?.rating || SCORING.defaultRating;
  const opponentRating = opponentPlayer.ratingAfter || opponentPlayer.rating || opponentPlayer.currentRating || activeMatch?.opponentRating || SCORING.defaultRating;

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

  // Questions Solved
  const userSolvedCount = typeof userPlayer.problemsSolved === 'number'
    ? userPlayer.problemsSolved
    : (hasSolved ? 1 : 0);

  const opponentSolvedCount = typeof opponentPlayer.problemsSolved === 'number'
    ? opponentPlayer.problemsSolved
    : (opponentSolved ? 1 : 0);

  // Test cases Passed
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

  // Timer Formatting
  const defaultFormatTime = (secs) => {
    if (typeof secs !== 'number' || isNaN(secs) || secs < 0) return null;
    const mins = Math.floor(secs / 60);
    const remSecs = Math.floor(secs % 60);
    return `${String(mins).padStart(2, '0')}:${String(remSecs).padStart(2, '0')}`;
  };

  const userTimeStr = userPlayer.completionTime
    ? (formatTimer ? formatTimer(userPlayer.completionTime) : defaultFormatTime(userPlayer.completionTime))
    : (hasSolved && solveTime ? (formatTimer ? formatTimer(solveTime) : defaultFormatTime(solveTime)) : null);

  const opponentTimeStr = opponentPlayer.completionTime
    ? (formatTimer ? formatTimer(opponentPlayer.completionTime) : defaultFormatTime(opponentPlayer.completionTime))
    : (opponentSolved && opponentSolveTime ? (formatTimer ? formatTimer(opponentSolveTime) : defaultFormatTime(opponentSolveTime)) : null);

  // Optional execution time (hide if unavailable)
  const userExecTime = executionResult?.executionTime || executionResult?.time || null;

  // Points Delta
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

  // Protocol & Breadcrumb Metadata
  const matchType = activeMatch?.type === 'scrimmage' || activeMatch?.type === 'Private Scrimmage'
    ? 'Private Scrimmage'
    : (activeMatch?.isRanked ?? true)
      ? '1v1 Ranked Duel'
      : '1v1 Casual Duel';

  const problemTitle = problem?.title || activeMatch?.problem || activeMatch?.problemTitle || activeMatch?.problemData?.title || 'Competitive Clash';

  // Navigation handlers
  const handleExit = (destination) => {
    sessionStorage.removeItem('codeclash_active_match');
    if (onCleanExit) {
      onCleanExit(destination);
    } else if (navigate) {
      navigate(destination);
    } else {
      window.location.hash = destination;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="match-complete-title"
      className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[6px] flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fadeIn"
    >
      {/* Dialog Container */}
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl modal-shadow border border-slate-100 overflow-hidden my-auto transition-all"
        data-purpose="match-complete-modal"
      >
        {/* Top Decorative Accent Rail */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-400 via-indigo-500 to-indigo-600" />

        <div className="p-6 sm:p-8 md:p-9">
          {/* Header Section */}
          <section className="flex flex-col items-center text-center" data-purpose="dialog-header">
            {/* Cyber Gold Trophy Emblem */}
            <div className="relative mb-4 group">
              <div className="absolute -inset-2 bg-gradient-to-r from-amber-400 to-amber-200 rounded-2xl blur-md opacity-40 group-hover:opacity-60 transition duration-500" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-b from-amber-50 to-amber-100 border border-amber-200 flex items-center justify-center shadow-inner">
                <svg
                  className="w-8 h-8 text-amber-500 stroke-[1.75]"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  viewBox="0 0 24 24"
                >
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                  <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                  <path d="M4 22h16" />
                  <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                  <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                  <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                </svg>
                {/* Star Micro-badge */}
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold shadow">
                  ★
                </span>
              </div>
            </div>

            {/* Primary Heading */}
            <h1
              id="match-complete-title"
              className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight"
            >
              Match Complete
            </h1>

            {/* Protocol & Problem Metadata Breadcrumb */}
            <div className="mt-2 flex items-center gap-2 font-mono text-xs text-slate-500 flex-wrap justify-center">
              <span>{matchType}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              <span className="text-slate-700 font-semibold">{problemTitle}</span>
            </div>
          </section>

          {/* Duel Comparison Grid */}
          <section className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4" data-purpose="players-duel-comparison">
            {/* Current User Card */}
            <article
              className={`relative rounded-2xl p-5 flex flex-col justify-between transition-all ${
                isUserWinner
                  ? 'border-2 border-emerald-400 bg-white winner-glow'
                  : isDraw
                    ? 'border border-slate-200 bg-slate-50/70'
                    : 'border border-slate-200 bg-slate-50/60'
              }`}
              data-purpose="user-card"
            >
              <div>
                {/* Card Header: Handle & Status Pill */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                        isUserWinner
                          ? 'bg-emerald-100 border border-emerald-300 text-emerald-700 shadow-xs'
                          : 'bg-slate-200 border border-slate-300 text-slate-600'
                      }`}
                    >
                      {userInitials}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base font-bold text-slate-900 leading-tight truncate">
                        {userName}
                      </h2>
                      <span className="text-[11px] font-mono text-slate-400 block truncate">
                        Rank: <strong className="text-slate-700 font-semibold">{userRating} LP</strong>
                      </span>
                    </div>
                  </div>

                  {/* Status Pill */}
                  {isUserWinner && (
                    <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500 text-white shadow-xs shadow-emerald-500/25">
                      <svg className="w-3 h-3 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="m4.5 12.75 6 6 9-13.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      WINNER
                    </span>
                  )}
                  {isDraw && (
                    <span className="shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wide text-slate-600 bg-slate-200">
                      DRAW
                    </span>
                  )}
                  {!isUserWinner && !isDraw && (
                    <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wide text-slate-500 bg-slate-200">
                      DEFEAT
                    </span>
                  )}
                </div>

                {/* Metrics / Diagnostics */}
                <div className="space-y-2 py-3 border-y border-slate-100 font-mono text-xs">
                  {/* Questions Solved */}
                  <div
                    className={`flex items-center gap-2 ${
                      userSolvedCount > 0 ? 'text-emerald-700 font-semibold' : 'text-slate-500'
                    }`}
                  >
                    {userSolvedCount > 0 ? (
                      <svg
                        className="w-4 h-4 text-emerald-600 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        viewBox="0 0 24 24"
                      >
                        <path d="m4.5 12.75 6 6 9-13.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <svg
                        className="w-4 h-4 text-slate-400 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        viewBox="0 0 24 24"
                      >
                        <path d="M6 18 18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    <span>
                      {userSolvedCount} {userSolvedCount === 1 ? 'Question' : 'Questions'} Solved
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ml-auto ${
                        userSolvedCount > 0
                          ? 'bg-emerald-100/70 text-emerald-800 font-semibold'
                          : 'bg-slate-200/60 text-slate-500'
                      }`}
                    >
                      {userPassedTests}/{totalTestCases} TESTS
                    </span>
                  </div>

                  {/* Completion Time */}
                  <div className="flex items-center text-slate-600 gap-2">
                    {userTimeStr ? (
                      <>
                        <svg
                          className="w-4 h-4 text-slate-400 shrink-0"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span>
                          Time: <span className="font-bold text-slate-800">{userTimeStr}</span>
                        </span>
                        {userExecTime ? (
                          <span className="text-[10px] text-slate-400 ml-auto">{userExecTime}ms exec</span>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4 text-slate-400 shrink-0"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <path d="m4.93 4.93 14.14 14.14" />
                        </svg>
                        <span className="text-slate-400">Did not finish</span>
                        <span className="text-[10px] text-slate-400 ml-auto">DNF</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer: Points delta */}
              <div className="mt-4 pt-1 flex items-center justify-between">
                <span className="text-xs font-mono font-medium text-slate-500 uppercase tracking-wide">
                  Points
                </span>
                <span
                  className={`inline-flex items-center text-sm font-mono font-bold px-2.5 py-0.5 rounded-lg border ${
                    userPoints > 0
                      ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
                      : userPoints < 0
                        ? 'text-rose-600 bg-rose-50 border-rose-200'
                        : 'text-slate-600 bg-slate-100 border-slate-200'
                  }`}
                >
                  {userPoints > 0 ? `+${userPoints}` : userPoints} LP
                </span>
              </div>
            </article>

            {/* Opponent Card */}
            <article
              className={`relative rounded-2xl p-5 flex flex-col justify-between transition-all ${
                isOpponentWinner
                  ? 'border-2 border-emerald-400 bg-white winner-glow'
                  : isDraw
                    ? 'border border-slate-200 bg-slate-50/70'
                    : 'border border-slate-200 bg-slate-50/60'
              }`}
              data-purpose="opponent-card"
            >
              <div>
                {/* Card Header: Handle & Status Pill */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                        isOpponentWinner
                          ? 'bg-emerald-100 border border-emerald-300 text-emerald-700 shadow-xs'
                          : 'bg-slate-200 border border-slate-300 text-slate-600'
                      }`}
                    >
                      {opponentInitials}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base font-bold text-slate-800 leading-tight truncate">
                        {opponentName}
                      </h2>
                      <span className="text-[11px] font-mono text-slate-400 block truncate">
                        Rank: <strong className="text-slate-600 font-semibold">{opponentRating} LP</strong>
                      </span>
                    </div>
                  </div>

                  {/* Status Pill */}
                  {isOpponentWinner && (
                    <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500 text-white shadow-xs shadow-emerald-500/25">
                      <svg className="w-3 h-3 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="m4.5 12.75 6 6 9-13.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      WINNER
                    </span>
                  )}
                  {isDraw && (
                    <span className="shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wide text-slate-600 bg-slate-200">
                      DRAW
                    </span>
                  )}
                  {!isOpponentWinner && !isDraw && (
                    <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wide text-slate-500 bg-slate-200">
                      DEFEAT
                    </span>
                  )}
                </div>

                {/* Metrics / Diagnostics */}
                <div className="space-y-2 py-3 border-y border-slate-200/80 font-mono text-xs">
                  {/* Questions Solved */}
                  <div
                    className={`flex items-center gap-2 ${
                      opponentSolvedCount > 0 ? 'text-emerald-700 font-semibold' : 'text-slate-500'
                    }`}
                  >
                    {opponentSolvedCount > 0 ? (
                      <svg
                        className="w-4 h-4 text-emerald-600 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        viewBox="0 0 24 24"
                      >
                        <path d="m4.5 12.75 6 6 9-13.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <svg
                        className="w-4 h-4 text-slate-400 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        viewBox="0 0 24 24"
                      >
                        <path d="M6 18 18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    <span>
                      {opponentSolvedCount} {opponentSolvedCount === 1 ? 'Question' : 'Questions'} Solved
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ml-auto ${
                        opponentSolvedCount > 0
                          ? 'bg-emerald-100/70 text-emerald-800 font-semibold'
                          : 'bg-slate-200/60 text-slate-500'
                      }`}
                    >
                      {opponentPassedTests}/{totalTestCases} TESTS
                    </span>
                  </div>

                  {/* Completion Time */}
                  <div className="flex items-center text-slate-500 gap-2">
                    {opponentTimeStr ? (
                      <>
                        <svg
                          className="w-4 h-4 text-slate-400 shrink-0"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span>
                          Time: <span className="font-bold text-slate-700">{opponentTimeStr}</span>
                        </span>
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4 text-slate-400 shrink-0"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <path d="m4.93 4.93 14.14 14.14" />
                        </svg>
                        <span className="text-slate-400">Did not finish</span>
                        <span className="text-[10px] text-slate-400 ml-auto">DNF</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer: Points delta */}
              <div className="mt-4 pt-1 flex items-center justify-between">
                <span className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wide">
                  Points
                </span>
                <span
                  className={`inline-flex items-center text-sm font-mono font-bold px-2.5 py-0.5 rounded-lg border ${
                    opponentPoints > 0
                      ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
                      : opponentPoints < 0
                        ? 'text-rose-600 bg-rose-50 border-rose-200'
                        : 'text-slate-600 bg-slate-100 border-slate-200'
                  }`}
                >
                  {opponentPoints > 0 ? `+${opponentPoints}` : opponentPoints} LP
                </span>
              </div>
            </article>
          </section>

          {/* Official Verdict Banner */}
          <section className="mt-5" data-purpose="victory-verdict-banner">
            <div
              className={`w-full rounded-2xl py-3.5 px-4 text-center border transition-all ${
                isDraw
                  ? 'bg-slate-50 border-slate-200'
                  : isUserWinner
                    ? 'bg-emerald-50/70 border-emerald-200/90'
                    : 'bg-rose-50/60 border-rose-200/80'
              }`}
            >
              <p
                className={`text-xs font-mono uppercase tracking-widest font-semibold mb-0.5 ${
                  isDraw
                    ? 'text-slate-500'
                    : isUserWinner
                      ? 'text-emerald-600'
                      : 'text-rose-600'
                }`}
              >
                Official Verdict
              </p>
              <h3 className="text-base sm:text-lg font-black tracking-wide text-slate-900 uppercase">
                {isDraw
                  ? 'DUEL ENDS IN A DRAW'
                  : isUserWinner
                    ? `${userName} WINS THE DUEL`
                    : `${opponentName} WINS THE DUEL`}
              </h3>
            </div>
          </section>

          {/* Action Navigation Buttons */}
          <section className="mt-6 grid grid-cols-3 gap-3 font-mono" data-purpose="modal-action-buttons">
            {/* Lobby Button */}
            <button
              onClick={() => handleExit('lobby')}
              type="button"
              className="px-4 py-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
            >
              <svg
                className="w-3.5 h-3.5 text-slate-400 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Lobby</span>
            </button>

            {/* History Button */}
            <button
              onClick={() => handleExit('history')}
              type="button"
              className="px-4 py-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
            >
              <svg
                className="w-3.5 h-3.5 text-slate-400 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>History</span>
            </button>

            {/* Ranks Button */}
            <button
              onClick={() => handleExit('leaderboard')}
              type="button"
              className="px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/20 active:scale-95 cursor-pointer"
            >
              <svg
                className="w-3.5 h-3.5 text-indigo-200 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Ranks</span>
            </button>
          </section>
        </div>

        {/* Micro Telemetry Footer */}
        <footer className="bg-slate-50 border-t border-slate-100 px-6 sm:px-8 py-3 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            ELO Synced to Global Ledger
          </span>
          <div className="flex items-center gap-3">
            <span>
              Net Delta:{' '}
              <strong
                className={`font-semibold ${
                  userPoints > 0
                    ? 'text-emerald-600'
                    : userPoints < 0
                      ? 'text-rose-600'
                      : 'text-slate-600'
                }`}
              >
                {userPoints > 0 ? `+${userPoints}` : userPoints} LP
              </strong>
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
