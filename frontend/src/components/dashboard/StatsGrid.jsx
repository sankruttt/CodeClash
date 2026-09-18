import React from 'react';
import { SCORING } from '../../config/scoring';

function KpiCard({ label, icon, iconColor, badge, badgeColor, bigValue, subLeft, subRight }) {
  return (
    <div className="p-4 rounded-xl border border-slate-200/80 bg-white flex flex-col justify-between shadow-xs min-w-0">
      <div className="flex items-center justify-between text-slate-500 text-[11px] font-mono gap-2">
        <span className="uppercase tracking-wider font-medium truncate">{label}</span>
        {badge ? (
          <span className={`text-xs font-mono font-semibold px-1.5 py-0.5 rounded border shrink-0 ${badgeColor}`}>
            {badge}
          </span>
        ) : (
          <span className={`material-symbols-outlined text-sm shrink-0 ${iconColor}`}>{icon}</span>
        )}
      </div>
      <div className="my-2 flex items-baseline justify-between gap-2 min-w-0">
        <div className="text-2xl font-bold font-mono tracking-tight truncate">{bigValue}</div>
      </div>
      <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between border-t border-slate-100 pt-2 gap-2">
        <span className="truncate">{subLeft}</span>
        <span className="text-slate-600 font-medium shrink-0">{subRight || ''}</span>
      </div>
    </div>
  );
}

export default function StatsGrid({ winRate, lp, solveTime, rank }) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* League Points */}
      <KpiCard
        label="League Points"
        icon="workspace_premium"
        iconColor="text-indigo-600"
        bigValue={`${lp?.rating ?? SCORING.defaultRating}`}
        subLeft={lp?.tier ? `Tier: ${lp.tier}` : 'Tier: Unranked'}
        subRight={lp?.nextTier ? `Next: ${lp.nextTier}` : ''}
      />

      {/* Win Rate */}
      <KpiCard
        label="Win Rate"
        icon="trending_up"
        iconColor="text-emerald-600"
        bigValue={`${winRate?.pct ?? 0}%`}
        subLeft={`Record: ${winRate?.wins ?? 0}W / ${winRate?.losses ?? 0}L`}
        subRight={winRate?.draws ? `${winRate.draws}D` : ''}
      />

      {/* Median Solve Time */}
      <KpiCard
        label="Median Solve Time"
        icon="timer"
        iconColor="text-sky-600"
        bigValue={solveTime?.median != null ? formatTime(solveTime.median) : '—'}
        subLeft={solveTime?.count ? `Across ${solveTime.count} solves` : 'No solved duels yet'}
        subRight="S-Tier Speed"
      />

      {/* Global Ranking */}
      <KpiCard
        label="Global Ranking"
        icon="public"
        iconColor="text-slate-400"
        bigValue={rank?.position ? `#${rank.position}` : '#--'}
        subLeft={rank?.topPct != null ? `Top ${rank.topPct}%` : 'No ranking data available'}
        subRight={rank?.total ? `${rank.total.toLocaleString()} devs` : ''}
      />
    </section>
  );
}

function formatTime(secs) {
  const s = Math.max(0, Math.round(secs || 0));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return m > 0 ? `${m}m ${rem.toString().padStart(2, '0')}s` : `${s}s`;
}