import React from 'react';
import { SCORING, formatLp } from '../config/scoring';
import { getTierDetails } from '../utils/tierUtils';

/**
 * MatchAbandonedModal
 * Shown to the opponent who REMAINED in the arena when the adversary abandons,
 * disconnects, or leaves. Rebuilt to match the Match Abandoned design reference
 * while reading all values from authoritative backend match data.
 *
 * Perspective rules enforced here:
 *  - The CURRENT user is always "YOU / Connected".
 *  - NEVER shows the current user as the abandoning / forfeited party.
 *  - Reward amount comes from the canonical scoring config (backend source of
 *    truth) or backend-persisted rewardDetails.rewardedLp.
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

export default function MatchAbandonedModal({
  isOpen,
  matchResult,
  currentUser,
  activeMatch,
  executionResult,
  onCleanExit,
  navigate,
}) {
  if (!isOpen) return null;

  const players = Array.isArray(matchResult?.players) ? matchResult.players : [];

  // Robust identification of current user vs opponent (mirrors MatchCompleteModal)
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

  const mePlayer = userIndex !== -1 ? players[userIndex] : null;
  const oppPlayer = userIndex !== -1 ? players[userIndex === 0 ? 1 : 0] : (players[0] || null);

  // ----- Names, avatars, ratings (authoritative backend first, UI fallbacks second) -----
  const meName = mePlayer?.username || currentUser?.name || currentUser?.username || 'You';
  const oppName = oppPlayer?.username || activeMatch?.opponent || activeMatch?.opponentName || 'Adversary';

  const meAvatar = mePlayer?.avatar || currentUser?.avatar || getInitials(meName);
  const oppAvatar = oppPlayer?.avatar || activeMatch?.opponentAvatar || getInitials(oppName);
  const oppInitials = getInitials(oppName);

  const meLP =
    typeof mePlayer?.ratingAfter === 'number'
      ? mePlayer.ratingAfter
      : typeof mePlayer?.rating === 'number'
        ? mePlayer.rating
        : currentUser?.rating;
  const oppLP = (() => {
    if (typeof oppPlayer?.ratingAfter === 'number') return oppPlayer.ratingAfter;
    if (typeof oppPlayer?.rating === 'number') return oppPlayer.rating;
    if (typeof activeMatch?.opponentRating === 'number') return activeMatch.opponentRating;
    return null;
  })();

  const meTier = currentUser?.tier || getTierDetails(typeof meLP === 'number' ? meLP : SCORING.defaultRating).currentTier;
  const oppTier = getTierDetails(typeof oppLP === 'number' ? oppLP : SCORING.defaultRating).currentTier;

  // ----- Who abandoned? (defensive: card is only shown to the remaining player) -----
  const abandonedBy = matchResult?.abandonedBy ?? activeMatch?.abandonedBy ?? null;
  const meIds = [currentUser?.id, currentUser?._id, mePlayer?.userId?.toString?.() || mePlayer?.userId]
    .filter(Boolean)
    .map(String);
  const isCurrentUserAbandoned = Boolean(
    abandonedBy && meIds.length > 0 && meIds.some((id) => id === String(abandonedBy))
  );
  const isRemaining = !isCurrentUserAbandoned && mePlayer?.status !== 'DISCONNECTED';

  // ----- Reward: canonical abandonment compensation for the remaining player -----
  const rewardLP = (() => {
    const stored = matchResult?.rewardDetails?.rewardedLp;
    if (typeof stored === 'number' && stored !== 0) return stored;
    return SCORING.abandonment.remainingReward;
  })();

  // ----- Abandonment/disconnect moment (backend completedAt vs startedAt) -----
  let forfeitTime = null;
  if (matchResult?.completedAt) {
    const started = new Date(matchResult.startedAt || matchResult.createdAt || 0).getTime();
    const ended = new Date(matchResult.completedAt).getTime();
    const durSeconds = Number(matchResult.duration) ||
      (started > 0 && ended > 0 ? Math.max(0, Math.floor((ended - started) / 1000)) : null);
    if (typeof durSeconds === 'number' && isFinite(durSeconds) && durSeconds > 0) {
      forfeitTime = defaultFormatTime(durSeconds);
    }
  }

  // ----- Adversary penalty (authoritative player delta, else canonical config) -----
  const oppPenalty = typeof oppPlayer?.ratingChange === 'number'
    ? oppPlayer.ratingChange
    : SCORING.abandonment.leaverPenalty;

  // ----- Remaining player's runtime from their last execution (backend driven) -----
  const meExecMs = executionResult?.executionTime || executionResult?.time || null;

  // ----- Reference ID derived from real match data (never invented) -----
  const rawRef = matchResult?.roomCode || matchResult?._id || matchResult?.id || activeMatch?.roomCode || activeMatch?.matchId || null;
  const refId = rawRef
    ? `#${String(rawRef).replace(/^(MATCH_|ROOM_|match_|room_)/i, '').toUpperCase().slice(0, 8)}`
    : null;

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
      aria-labelledby="match-abandoned-title"
      className="fixed inset-0 z-50 bg-slate-900/25 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fadeIn"
    >
      {/* Match Abandoned Card */}
      <section
        role="dialog"
        aria-label="Match Abandoned"
        className="relative w-full max-w-xl bg-white/95 rounded-2xl sm:rounded-3xl border border-slate-200/90 modal-shadow overflow-hidden transition-all animate-zoomIn my-auto"
      >
        {/* Top Multi-tone Accent Bar */}
        <div className="h-1.5 w-full bg-emerald-500" />

        <div className="p-6 sm:p-8 space-y-6">
          {/* Header Area */}
          <header className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0 shadow-sm">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <line x1="12" x2="12" y1="9" y2="13" />
                  <line x1="12" x2="12.01" y1="17" y2="17" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded uppercase mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  PROTOCOL_04 // SESSION TERMINATED
                </div>
                <h1 id="match-abandoned-title" className="text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">
                  Match Abandoned
                </h1>
              </div>
            </div>

            <div className="flex flex-col items-end font-mono text-right shrink-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Status</span>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Clean Closure
              </span>
            </div>
          </header>

          {/* Description */}
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {isRemaining
              ? 'Your opponent disconnected or left the arena. Safe session closure completed.'
              : 'This arena session has been terminated and safely closed.'}
          </p>

          {/* Compensation Box — only for the REMAINING player */}
          {isRemaining && (
            <div className="rounded-xl bg-emerald-50/90 border border-emerald-200/90 abandoned-emerald-glow p-4 flex items-center justify-between gap-3.5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-300 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-emerald-950 uppercase tracking-tight">
                      Abandonment Compensation
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      FAIR-PLAY
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    Rating compensation credited directly to your rank ledger.
                  </p>
                </div>
              </div>
              {typeof rewardLP === 'number' && (
                <div className="shrink-0 bg-emerald-500 text-white px-3.5 py-1.5 rounded-lg font-mono text-center shadow-sm border border-emerald-600">
                  <div className="text-[9px] uppercase font-semibold opacity-90 leading-none tracking-wider">Delta</div>
                  <div className="text-base font-extrabold tracking-tight leading-tight mt-0.5">{formatLp(rewardLP)}</div>
                </div>
              )}
            </div>
          )}

          {/* Combatants Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* YOU (remaining player) */}
            <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="font-mono text-[10px] uppercase font-bold text-slate-400 tracking-wider">You</span>
                <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Connected
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs font-mono border border-indigo-200 shrink-0">
                    {meAvatar}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 leading-none truncate">{meName}</div>
                    <div className="text-[11px] font-mono text-slate-500 mt-1 truncate">
                      {meTier} • {typeof meLP === 'number' ? `${meLP.toLocaleString()} LP` : 'LP —'}
                    </div>
                  </div>
                </div>
                {meExecMs != null && (
                  <span className="text-[10px] font-mono text-slate-600 font-semibold bg-white border border-slate-200 px-2 py-0.5 rounded shadow-2xs shrink-0">
                    {meExecMs}ms
                  </span>
                )}
              </div>
            </div>

            {/* ADVERSARY (abandoning player) */}
            <div className="bg-rose-50/40 border border-rose-200/80 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between border-b border-rose-100 pb-2">
                <span className="font-mono text-[10px] uppercase font-bold text-slate-400 tracking-wider">Adversary</span>
                {isCurrentUserAbandoned ? (
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                    Forfeited{forfeitTime ? ` (${forfeitTime})` : ''}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs font-mono border border-slate-300 shrink-0">
                    {oppAvatar && oppAvatar !== oppInitials ? oppAvatar : oppInitials}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 leading-none truncate">{oppName}</div>
                    <div className="text-[11px] font-mono text-slate-500 mt-1 truncate">
                      {oppTier} • {typeof oppLP === 'number' ? `${oppLP.toLocaleString()} LP` : 'LP —'}
                    </div>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border shrink-0 ${
                    isCurrentUserAbandoned
                      ? 'text-slate-500 bg-white border-slate-200'
                      : 'text-rose-700 bg-rose-100/80 border-rose-200'
                  }`}
                >
                  {formatLp(oppPenalty)}
                </span>
              </div>
            </div>
          </div>

          {/* Actions Row */}
          <div className="space-y-2.5 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Primary Action */}
              <button
                onClick={() => handleExit('lobby')}
                type="button"
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xl abandoned-indigo-glow transition-all flex items-center justify-center gap-2 border border-indigo-700 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                <span>Find New Match</span>
              </button>

              {/* Secondary Action */}
              <button
                onClick={() => handleExit('dashboard')}
                type="button"
                className="w-full py-3 px-4 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-mono font-semibold text-xs uppercase tracking-wider rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14" />
                  <path d="M2 20h20" />
                  <path d="M14 12v.01" />
                </svg>
                <span>Return to Lobby</span>
              </button>
            </div>

            {/* Tertiary: Match Log */}
            <button
              onClick={() => handleExit('history')}
              type="button"
              className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 text-slate-600 font-mono font-semibold text-[11px] uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Match Log
            </button>
          </div>

          {/* Footer Metadata */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] font-mono text-slate-400">
            <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Ledger Sync: Confirmed
              </span>
              {refId && (
                <>
                  <span className="text-slate-300">•</span>
                  <span>REF_ID: {refId}</span>
                </>
              )}
            </div>
            <span className="text-slate-500 font-medium">FAIR-PLAY PROTECTION ACTIVE</span>
          </div>
        </div>
      </section>
    </div>
  );
}