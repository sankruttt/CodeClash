import React, { useEffect, useState } from 'react';

const NEW_USER_FLAG = 'codeclash_new_user';

export default function WelcomeCard({ currentUser, rating, tierInfo, queueing, queueSeconds, onToggleQueue }) {
  // Freshly-created accounts greet with "WELCOME" on their very first dashboard
  // landing, then fall back to "WELCOME BACK" on every later visit.
  const [isNewUser, setIsNewUser] = useState(() => sessionStorage.getItem(NEW_USER_FLAG) === '1');
  useEffect(() => {
    if (isNewUser) {
      sessionStorage.removeItem(NEW_USER_FLAG);
    }
  }, [isNewUser]);

  const displayName = currentUser?.name || currentUser?.username || 'Combatant';
  const progressPct = Math.max(0, Math.min(100, tierInfo.tierPct || 0));

  const handleQueue = () => {
    if (onToggleQueue) {
      onToggleQueue({ questionCount: 1, duration: 10 });
    }
  };

  return (
    <section className="rounded-xl border border-slate-200/80 bg-white p-5 relative overflow-hidden shadow-xs">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
        {/* Left Info Block */}
        <div className="space-y-1.5 max-w-xl">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {isNewUser ? 'WELCOME' : 'WELCOME BACK'},{' '}
            <span className="text-indigo-600 font-mono font-semibold">{displayName.toUpperCase()}</span>
          </h1>
          {/* Progress to Next Tier */}
          <div className="pt-2 max-w-md">
            <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
              <span className="text-slate-600">
                Tier Path: <strong className="text-sky-600 font-semibold">{tierInfo.currentTier}</strong> →{' '}
                <strong className="text-indigo-600 font-semibold">{tierInfo.nextTier}</strong>
              </span>
              <span className="text-slate-500 font-medium">
                {rating.toLocaleString()} / {tierInfo.nextTierLP.toLocaleString()} LP ({progressPct}%)
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
              <div
                className="h-full bg-gradient-to-r from-sky-500 via-indigo-600 to-indigo-700 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right CTA Action Box */}
        <div className="flex items-center gap-3 self-stretch lg:self-center">
          <button
            onClick={handleQueue}
            className={`flex-1 sm:flex-initial px-5 py-3 rounded-lg active:scale-[0.98] text-white font-mono text-xs font-bold tracking-wider flex items-center justify-center gap-2 border shadow-sm transition-all cursor-pointer ${
              queueing
                ? 'bg-rose-600 hover:bg-rose-700 border-rose-700 animate-pulse'
                : 'bg-indigo-600 hover:bg-indigo-700 border-indigo-700'
            }`}
            id="main-queue-cta"
          >
            <span className="material-symbols-outlined text-base">{queueing ? 'radar' : 'swords'}</span>
            <span id="queue-cta-label">
              {queueing ? `SEARCHING MATCH (${queueSeconds}s)...` : 'ENTER QUEUE (1v1 RANKED)'}
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}