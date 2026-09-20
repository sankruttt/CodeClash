import React, { useState } from 'react';
import { SCORING, formatLp } from '../../config/scoring';

const PILLARS = [
  {
    n: 'PILLAR 01',
    icon: 'swords',
    iconColor: 'bg-indigo-50 border-indigo-200 text-indigo-600',
    hover: 'hover:border-indigo-300 group-hover:text-indigo-600',
    title: '1v1 Live Head-to-Head',
    body:
      'Duel one opponent in real time — either through the ranked queue or a private scrimmage room — both working the same algorithmic problems on the same clock.',
    footerLeft: 'Ranked Queue',
    footerLeftDot: 'bg-indigo-500',
    footerRight: 'Private Scrimmage',
    footerRightColor: 'text-indigo-600',
  },
  {
    n: 'PILLAR 02',
    icon: 'timer',
    iconColor: 'bg-rose-50 border-rose-200 text-rose-600',
    hover: 'hover:border-rose-300 group-hover:text-rose-600',
    title: 'Time-Pressure Matrix',
    body:
      'Every duel runs on a configurable countdown timer. Choose 5, 10, or 15 minutes in the lobby, then solve before the clock hits zero to bank your progress.',
    footerLeft: 'Configurable Clock',
    footerLeftDot: 'bg-rose-500',
    footerRight: '5 / 10 / 15 min',
    footerRightColor: 'text-rose-600',
  },
  {
    n: 'PILLAR 03',
    icon: 'military_tech',
    iconColor: 'bg-emerald-50 border-emerald-200 text-emerald-600',
    hover: 'hover:border-emerald-300 group-hover:text-emerald-600',
    title: 'Rank & LP Ascension',
    body:
      'Completed duels move your League Points the moment they finish — wins add LP, losses deduct it, abandonments penalize the leaver, and draws clear even. Your tier and ladder position follow your rating.',
    footerLeft: 'Match Delta',
    footerLeftDot: 'bg-emerald-500',
    footerRight: `${formatLp(SCORING.ranked.win, { omitUnit: true })} Win / ${formatLp(SCORING.ranked.loss, { omitUnit: true })} Loss`,
    footerRightColor: 'text-emerald-600',
  },
];

const DUEL_FLOW = [
  { step: 1, label: 'Queue Match', tone: 'indigo' },
  { step: 2, label: 'Duel & Submit Code', tone: 'indigo' },
  { step: 3, label: 'Edge-Case Judge', tone: 'indigo' },
  { step: 4, label: 'Claim LP & Rank', tone: 'emerald' },
];

// Module-level flag: survives SPA navigation (component unmount/remount) so a
// dismissed briefing stays hidden when the user returns to the dashboard, but
// resets on a full page reload — making the briefing appear once per load.
let briefingDismissed = false;

export default function CombatBriefing() {
  const [dismissed, setDismissed] = useState(briefingDismissed);

  const handleDismiss = () => {
    briefingDismissed = true;
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <section
      className="rounded-xl border border-indigo-200 bg-white p-5 relative overflow-hidden shadow-xs transition-all duration-300"
      id="combat-briefing-card"
    >
      {/* Ambient background glow accents */}
      <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-indigo-50/70 pointer-events-none blur-2xl" />
      <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-sky-50/60 pointer-events-none blur-2xl" />

      <div className="relative z-10 space-y-4">
        {/* Header bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1.5 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping" />
              COMBAT BRIEFING // HOW CODECLASH WORKS
            </span>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-[11px] font-mono text-slate-400 hover:text-slate-700 transition-colors flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-100 cursor-pointer"
            title="Dismiss briefing"
          >
            <span className="material-symbols-outlined text-sm">close</span>
            <span className="hidden sm:inline">Dismiss</span>
          </button>
        </div>

        {/* Headline */}
        <div>
          <h2 className="text-lg sm:text-xl font-bold font-sans tracking-tight text-slate-900 flex items-center gap-2 flex-wrap">
            <span>Real-Time 1v1 Code Combat</span>
            <span className="text-slate-300 font-mono font-light text-base">—</span>
            <span className="text-indigo-600 font-mono text-base font-semibold">Where Algorithms Collide.</span>
          </h2>
          <p className="text-xs text-slate-600 font-sans leading-relaxed max-w-3xl">
            CodeClash is a competitive coding platform where you challenge other developers in real-time 1v1
            coding battles. Solve problems under the clock, earn LP with every result, climb tiers, and prove
            your skills against players from across the leaderboard.
          </p>
        </div>

        {/* 3 Feature Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {PILLARS.map((p) => (
            <div
              key={p.n}
              className="p-4 rounded-lg border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-indigo-300 transition-all shadow-xs flex flex-col justify-between group min-w-0"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className={`w-7 h-7 rounded-md border flex items-center justify-center shrink-0 ${p.iconColor}`}>
                    <span className="material-symbols-outlined text-base">{p.icon}</span>
                  </div>
                  <span className={`text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider transition-colors ${p.hover}`}>
                    {p.n}
                  </span>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 font-sans">{p.title}</h3>
                  <p className="text-[11px] text-slate-500 font-sans mt-1 leading-relaxed">{p.body}</p>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-mono text-slate-600 gap-2">
                <span className="flex items-center gap-1.5 shrink-0">
                  <span className={`w-1.5 h-1.5 rounded-full ${p.footerLeftDot}`} />
                  {p.footerLeft}
                </span>
                <span className={`font-semibold truncate ${p.footerRightColor}`}>{p.footerRight}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Duel Flow mini-stepper */}
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-700 font-bold text-[11px] shrink-0">
            <span className="material-symbols-outlined text-sm text-indigo-600">schema</span>
            <span className="uppercase tracking-wide">DUEL FLOW:</span>
          </div>
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
            {DUEL_FLOW.map((f) => (
              <div key={f.step} className="flex items-center gap-2 p-1.5 rounded bg-white border border-slate-200 shadow-xs min-w-0">
                <span
                  className={`w-4 h-4 rounded-full text-white font-bold text-[9px] flex items-center justify-center shrink-0 ${
                    f.tone === 'emerald' ? 'bg-emerald-600' : 'bg-indigo-600'
                  }`}
                >
                  {f.step}
                </span>
                <span className="text-slate-700 font-medium truncate">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}