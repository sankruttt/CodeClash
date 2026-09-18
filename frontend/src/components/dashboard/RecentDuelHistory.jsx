import React from 'react';

const LANG_STYLES = {
  C: 'bg-sky-50 text-sky-700 border-sky-200',
  'C++': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Java: 'bg-amber-50 text-amber-700 border-amber-200',
  JavaScript: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  Python: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

function langClass(lang) {
  const key = lang && LANG_STYLES[lang] ? lang : null;
  return key ? LANG_STYLES[key] : '';
}

function formatDuration(secs) {
  if (secs == null || isNaN(secs)) return null;
  const s = Math.max(0, Math.round(secs));
  return `${Math.floor(s / 60)}m ${(s % 60).toString().padStart(2, '0')}s`;
}

function verdictChip(result) {
  switch (result) {
    case 'win':
    case 'victory':
      return {
        label: 'WIN',
        cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
      };
    case 'draw':
      return {
        label: 'DRAW',
        cls: 'bg-slate-50 text-slate-600 border-slate-200',
        dot: 'bg-slate-400',
      };
    default:
      return {
        label: 'LOSS',
        cls: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-500',
      };
  }
}

export default function RecentDuelHistory({ history, loading, onViewAll }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-indigo-600">history</span>
          <h2 className="text-sm font-semibold tracking-tight text-slate-900">Recent Duel History</h2>
          <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
            Last {history.length} matches
          </span>
        </div>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
          >
            Full Ledger <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        )}
      </div>

      {loading && history.length === 0 ? (
        <div className="space-y-2.5" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-11 rounded-lg bg-slate-100 animate-pulse border border-slate-200/60" />
          ))}
        </div>
      ) : history.length === 0 ? (
        <div className="py-10 text-center">
          <span className="material-symbols-outlined text-2xl text-slate-300 block mb-2">swords</span>
          <p className="text-xs font-mono text-slate-400">No completed duels yet. Enter the queue or a private room to start one.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-mono uppercase text-slate-400">
                <th className="pb-2.5 font-medium">Adversary</th>
                <th className="pb-2.5 font-medium">Problem Specification</th>
                <th className="pb-2.5 font-medium">Duration</th>
                <th className="pb-2.5 font-medium">Verdict</th>
                <th className="pb-2.5 font-medium">Rating Delta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {history.map((m) => {
                const vc = verdictChip(m.result);
                const dur = formatDuration(m.solveTime != null ? m.solveTime : m.duration);
                const delta = typeof m.ratingChange === 'number' ? m.ratingChange : 0;
                const deltaCls = delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-rose-600' : 'text-slate-500';
                const deltaStr = delta > 0 ? `+${delta}` : `${delta}`;
                return (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 pr-2">
                      <div className="flex items-center gap-2.5 font-sans">
                        <div className="relative shrink-0">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-sky-400 text-white font-mono font-bold flex items-center justify-center text-[10px] border border-slate-200">
                            {m.opponentAvatar}
                          </div>
                          <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ${vc.dot} ring-2 ring-white`} />
                        </div>
                        <div className="min-w-0">
                          <span className="font-medium text-slate-900 block truncate">{m.opponentName}</span>
                          <span className="text-[9px] text-slate-400 font-mono block">{m.startedLabel}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 pr-2">
                      <div className="font-sans text-slate-800 font-medium max-w-[180px] truncate">
                        {m.problemTitle || 'Algorithmic Duel'}
                      </div>
                      {m.language && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono border font-semibold inline-block mt-0.5 ${langClass(m.language)}`}>
                          {m.language}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-2 text-slate-500">{dur || '—'}</td>
                    <td className="py-2.5 pr-2">
                      <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${vc.cls}`}>{vc.label}</span>
                    </td>
                    <td className={`py-2.5 text-right font-bold ${deltaCls}`}>{deltaStr} LP</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}