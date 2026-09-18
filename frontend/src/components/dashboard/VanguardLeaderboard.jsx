import React from 'react';
import { getTierDetails } from '../../utils/tierUtils';
import { SCORING } from '../../config/scoring';

const RANK_STYLES = [
  { text: 'text-amber-600', chip: 'bg-amber-50 text-amber-700 border-amber-200' },
  { text: 'text-sky-600', chip: 'bg-sky-50 text-sky-700 border-sky-200' },
  { text: 'text-indigo-600', chip: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
];

function Row({ rank, name, avatar, tier, rating, isYou }) {
  const style = isYou
    ? { text: 'text-indigo-700', chip: 'bg-indigo-100 text-indigo-800 border-indigo-200', row: 'bg-indigo-50 border-indigo-200' }
    : { text: RANK_STYLES[(rank - 1) % 3].text, chip: RANK_STYLES[(rank - 1) % 3].chip, row: 'bg-slate-50 border-slate-200' };

  return (
    <div className={`px-3 py-2.5 rounded-lg border flex items-center justify-between gap-3 shadow-xs ${style.row}`}>
      <div className="flex items-center gap-2.5 min-w-0">
        <span className={`font-bold text-[11px] w-5 text-left shrink-0 ${style.text}`}>#{rank}</span>
        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-sky-400 text-white font-mono font-bold flex items-center justify-center text-[9px] border border-slate-200 shrink-0">
          {avatar || 'CC'}
        </div>
        <span className={`font-sans font-medium truncate text-xs ${isYou ? 'text-indigo-950 font-semibold' : 'text-slate-900'}`}>
          {name}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0 pl-1">
        <span className={`text-[9px] px-1.5 py-0.5 rounded-md border font-semibold whitespace-nowrap ${style.chip}`}>{tier}</span>
        <span className="text-[11px] font-semibold text-slate-800 whitespace-nowrap">{rating.toLocaleString()} LP</span>
      </div>
    </div>
  );
}

export default function VanguardLeaderboard({ top3, me, total, loading, onViewAll }) {
  const youRow =
    me && me.rank !== null && me.rank !== undefined
      ? me
      : null;

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 space-y-3 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-amber-500">military_tech</span>
          <h2 className="text-sm font-semibold tracking-tight text-slate-900">Top Leaderboard Snippet</h2>
        </div>
        {total != null && (
          <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
            {total.toLocaleString()} Devs
          </span>
        )}
      </div>

      {onViewAll && (
        <div className="text-right">
          <button
            onClick={onViewAll}
            className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 ml-auto cursor-pointer"
          >
            Full Ladder <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>
      )}

      {loading && !top3.length ? (
        <div className="space-y-2" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-9 rounded-lg bg-slate-100 animate-pulse border border-slate-200/60" />
          ))}
        </div>
      ) : (
        <div className="space-y-2 font-mono text-xs">
          {top3.length > 0 ? (
            top3.map((p) => (
              <Row
                key={String(p.userId || p.id || p.rank)}
                rank={p.rank}
                name={p.name || p.username}
                avatar={p.avatar}
                tier={getTierDetails(p.rating || SCORING.defaultRating, p.tier).currentTier}
                rating={p.rating || SCORING.defaultRating}
              />
            ))
          ) : (
            <div className="p-4 text-center text-xs font-mono text-slate-400">No ranking data available.</div>
          )}

          {youRow && (
            <>
              <div className="flex items-center gap-1.5 pt-2.5">
                <span className="w-6 h-[1px] bg-slate-200" />
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">YOUR POSITION</span>
                <span className="w-6 h-[1px] bg-slate-200" />
              </div>
              <Row
                rank={youRow.rank}
                name={`${youRow.name} (You)`}
                avatar={youRow.avatar}
                tier={youRow.tier}
                rating={youRow.rating}
                isYou
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}