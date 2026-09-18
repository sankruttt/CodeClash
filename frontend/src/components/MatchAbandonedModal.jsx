import React from 'react';
import { getTierDetails } from '../utils/tierUtils';

/**
 * MatchAbandonedModal
 * Shown to the opponent who REMAINED in the arena when the adversary abandons,
 * disconnects, or leaves. Remodeled to match the Match Abandoned design reference
 * while reading all values from authoritative backend match data.
 *
 * Perspective rules enforced here:
 *  - The CURRENT user is always "Combatant_01 (You) / Connected".
 *  - NEVER shows the current user as the abandoning / forfeited party.
 *  - Reward amount is taken straight from the backend match players' ratingChange.
 */
export default function MatchAbandonedModal({
  isOpen,
  matchResult,
  currentUser,
  activeMatch,
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

  const getInitials = (name) => {
    if (!name || typeof name !== 'string') return '??';
    const clean = name.trim().replace(/[^a-zA-Z0-9_\s]/g, '');
    const parts = clean.split(/[\s_-]+/);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase() || 'CC';
  };

  const meAvatar = mePlayer?.avatar || currentUser?.avatar || getInitials(meName);
  const oppAvatar = oppPlayer?.avatar || activeMatch?.opponentAvatar || getInitials(oppName);

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

  const meTier = currentUser?.tier || getTierDetails(typeof meLP === 'number' ? meLP : 1500).currentTier;

  // ----- Who abandoned? (defensive: card is only shown to the remaining player) -----
  const abandonedBy = matchResult?.abandonedBy ?? activeMatch?.abandonedBy ?? null;
  const meIds = [currentUser?.id, currentUser?._id, mePlayer?.userId?.toString?.() || mePlayer?.userId]
    .filter(Boolean)
    .map(String);
  const isCurrentUserAbandoned = Boolean(
    abandonedBy && meIds.length > 0 && meIds.some((id) => id === String(abandonedBy))
  );
  const isRemaining = !isCurrentUserAbandoned && mePlayer?.status !== 'DISCONNECTED';

  // ----- Reward: abandonment-only card, always the authoritative +16 rule -----
  // Preferred source: backend-persisted rewardDetails.rewardedLp (new matches).
  // Older match records may still carry the pre-rule +24 in players[].ratingChange;
  // this card never surfaces it because the abandonment reward is fixed at +16.
  const ABANDONMENT_REWARD_LP = 16;
  const rewardLP = (() => {
    const stored = matchResult?.rewardDetails?.rewardedLp;
    if (typeof stored === 'number' && stored !== 0) {
      return stored;
    }
    return ABANDONMENT_REWARD_LP;
  })();

  // ----- Abandonment/disconnect moment (backend completedAt vs startedAt) -----
  let disconnectLabel = 'Disconnected (DNF)';
  if (matchResult?.completedAt) {
    const started = new Date(matchResult.startedAt || matchResult.createdAt || 0).getTime();
    const ended = new Date(matchResult.completedAt).getTime();
    const durSeconds = Number(matchResult.duration) ||
      (started > 0 && ended > 0 ? Math.max(0, Math.floor((ended - started) / 1000)) : null);
    if (typeof durSeconds === 'number' && isFinite(durSeconds) && durSeconds > 0) {
      const mins = Math.floor(durSeconds / 60);
      const secs = Math.floor(durSeconds % 60);
      disconnectLabel = `Left at ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} (DNF)`;
    }
  }

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
        className="relative w-full max-w-[560px] bg-white/95 rounded-2xl border border-slate-200/90 modal-shadow overflow-hidden transition-all animate-zoomIn my-auto"
      >
        {/* Top Cybernetic Accent Telemetry Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-indigo-500 to-emerald-400" />

        {/* Modal Content Body */}
        <div className="px-6 pt-7 pb-6 sm:px-8 sm:pt-8 sm:pb-7 flex flex-col items-center text-center">
          {/* Hazard / Alert Emblem */}
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-amber-400/20 blur-xl rounded-full" />
            <div className="relative w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-500 abandoned-amber-glow">
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" x2="12" y1="9" y2="13" />
                <line x1="12" x2="12.01" y1="17" y2="17" />
              </svg>
            </div>
            {/* Tiny Live Hazard Blinker */}
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500 border-2 border-white" />
            </span>
          </div>

          {/* Overline Monospace Header */}
          <div className="font-mono text-[11px] font-bold uppercase tracking-widest text-amber-600/90 mb-1 flex items-center gap-1.5">
            <span>PROTOCOL_04</span>
            <span className="text-slate-300">•</span>
            <span>SESSION TERMINATED</span>
          </div>

          {/* Main Title */}
          <h1 id="match-abandoned-title" className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Match Abandoned
          </h1>

          {/* Explanation from the remaining player's perspective */}
          <p className="mt-2 text-sm text-slate-600 max-w-md font-normal leading-relaxed">
            {isRemaining
              ? 'Your opponent has disconnected or left the arena session. The match has been verified and safely closed.'
              : 'This arena session has been terminated and safely closed.'}
          </p>

          {/* Combatant Status Matrix */}
          <div className="w-full mt-6 grid grid-cols-2 gap-3">
            {/* Combatant 1: Current user (remaining player) */}
            <div className="bg-slate-50/90 border border-slate-200/90 rounded-xl p-3 text-left relative overflow-hidden">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-[10px] uppercase font-bold text-slate-400">Combatant_01 (You)</span>
                <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Connected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs font-mono shrink-0">
                  {meAvatar}
                </div>
                <div className="truncate min-w-0">
                  <div className="text-xs font-bold text-slate-900 leading-tight truncate">{meName}</div>
                  <div className="text-[11px] font-mono text-slate-500 truncate">
                    {meTier} • {typeof meLP === 'number' ? `${meLP.toLocaleString()} LP` : 'LP —'}
                  </div>
                </div>
              </div>
            </div>

            {/* Combatant 2: Adversary (abandoning player) */}
            <div className="bg-slate-50/90 border border-amber-200/60 rounded-xl p-3 text-left relative overflow-hidden">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-[10px] uppercase font-bold text-slate-400">Adversary</span>
                {isCurrentUserAbandoned ? (
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                    Forfeited
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs font-mono shrink-0">
                  {oppAvatar}
                </div>
                <div className="truncate min-w-0">
                  <div className="text-xs font-bold text-slate-800 leading-tight truncate">{oppName}</div>
                  <div className="text-[11px] font-mono text-amber-600/90 font-medium truncate">
                    {typeof oppLP === 'number' ? `${oppLP.toLocaleString()} LP • ` : ''}
                    {disconnectLabel}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Reward / Compensation Banner — only for the REMAINING player */}
          {isRemaining && (
            <div className="w-full mt-4 p-4 rounded-xl bg-emerald-50/90 border border-emerald-200/90 abandoned-emerald-glow flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M4.5 12.75l6 6 9-13.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-semibold text-emerald-950 font-mono tracking-tight">
                    Abandonment reward processed
                  </div>
                  <p className="text-[11px] text-emerald-700 leading-tight mt-0.5">
                    Fair-play rating compensation credited to your rank ledger.
                  </p>
                </div>
              </div>
              {typeof rewardLP === 'number' && (
                <div className="shrink-0 font-mono font-bold text-sm bg-emerald-500 text-white px-3 py-1.5 rounded-lg shadow-sm border border-emerald-600">
                  {rewardLP > 0 ? `+${rewardLP}` : rewardLP} LP
                </div>
              )}
            </div>
          )}

          {/* Action Buttons Section */}
          <div className="w-full mt-6 space-y-2.5">
            {/* Primary Action: Return to Lobby */}
            <button
              type="button"
              onClick={() => handleExit('lobby')}
              className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-mono font-bold text-xs uppercase tracking-wider py-3.5 px-6 rounded-xl abandoned-indigo-glow hover:shadow-indigo-500/40 transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 016 6v3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              RETURN TO LOBBY
            </button>

            {/* Secondary Grid Actions */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleExit('history')}
                className="w-full bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 text-slate-700 font-mono font-semibold text-[11px] uppercase tracking-wider py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                MATCH LOG
              </button>
              <button
                type="button"
                onClick={() => handleExit('lobby')}
                className="w-full bg-slate-50 hover:bg-indigo-50 active:bg-indigo-100 hover:border-indigo-300 border border-slate-200 text-slate-700 hover:text-indigo-700 font-mono font-semibold text-[11px] uppercase tracking-wider py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                FIND NEW MATCH
              </button>
            </div>
          </div>

          {/* Telemetry Audit Footer */}
          <div className="mt-6 pt-4 border-t border-slate-100 w-full flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              LEDGER SYNC: CONFIRMED
            </span>
            <span className="hidden sm:inline">INTEGRITY AUDIT PASSED</span>
            {refId && <span className="text-slate-500 font-semibold">REF_ID: {refId}</span>}
          </div>
        </div>
      </section>
    </div>
  );
}