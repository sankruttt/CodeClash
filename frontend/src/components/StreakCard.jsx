import React, { useState, useEffect } from 'react';
import { authAPI } from '../services/api';

export default function StreakCard({ currentUser }) {
  const [streakData, setStreakData] = useState(() => {
    // Initial optimistic state from currentUser
    const streak = Math.max(0, currentUser?.streak ?? 0);
    const longestStreak = Math.max(0, currentUser?.longestStreak ?? currentUser?.bestStreak ?? streak);
    const todayCompleted = Boolean(currentUser?.todayCompleted);
    return {
      streak,
      longestStreak,
      todayCompleted,
      weeklyIndicators: currentUser?.weeklyIndicators || null
    };
  });

  useEffect(() => {
    let isCancelled = false;

    async function fetchStreak() {
      if (!currentUser?.id) return;
      try {
        const res = await authAPI.getStreak().catch(() => null);
        const data = res?.data || res;
        if (!isCancelled && data && typeof data.streak === 'number') {
          setStreakData({
            streak: Math.max(0, data.streak),
            longestStreak: Math.max(0, data.longestStreak ?? data.streak),
            todayCompleted: Boolean(data.todayCompleted),
            weeklyIndicators: data.weeklyIndicators || null
          });
        }
      } catch (err) {
        console.warn('Unable to load streak telemetry:', err);
      }
    }

    fetchStreak();

    return () => {
      isCancelled = true;
    };
  }, [currentUser?.id, currentUser?.streak, currentUser?.lastActivityDate]);

  // Fallback 7-day indicators if not returned by server
  const indicators = streakData.weeklyIndicators || (() => {
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const now = new Date();
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const isToday = i === 0;
      const completed = isToday ? streakData.todayCompleted : (streakData.streak > i);
      result.push({
        date: d.toISOString().slice(0, 10),
        dayLetter: days[d.getDay()],
        completed,
        isToday
      });
    }
    return result;
  })();

  const currentStreak = Math.max(0, streakData.streak ?? currentUser?.streak ?? 0);
  const longestStreak = Math.max(0, streakData.longestStreak ?? currentUser?.longestStreak ?? currentUser?.bestStreak ?? currentStreak);
  const todayCompleted = streakData.todayCompleted ?? currentUser?.todayCompleted ?? false;

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 space-y-4 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-amber-500 animate-pulse">
            local_fire_department
          </span>
          <h2 className="text-sm font-semibold tracking-tight text-slate-900">
            Combatant Streak
          </h2>
        </div>

        {todayCompleted ? (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shadow-2xs">
            <span className="material-symbols-outlined text-[13px] leading-none">check_circle</span>
            <span>ACTIVE TODAY</span>
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 shadow-2xs">
            <span className="material-symbols-outlined text-[13px] leading-none">schedule</span>
            <span>PENDING TODAY</span>
          </span>
        )}
      </div>

      {/* Dual Streak Counters */}
      <div className="grid grid-cols-2 gap-3 font-mono">
        {/* Current Streak */}
        <div className="p-3.5 rounded-xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-[10px] uppercase font-semibold tracking-wider">
            <span>CURRENT</span>
            <span className="material-symbols-outlined text-xs text-amber-600">whatshot</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-amber-600 tracking-tight">
              {currentStreak}
            </span>
            <span className="text-[11px] font-bold text-slate-600">
              {currentStreak === 1 ? 'DAY' : 'DAYS'}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 font-sans mt-0.5">
            {todayCompleted ? 'Secured for today' : 'Battle needed today'}
          </div>
        </div>

        {/* Longest Streak */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-[10px] uppercase font-semibold tracking-wider">
            <span>LONGEST</span>
            <span className="material-symbols-outlined text-xs text-indigo-600">military_tech</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {longestStreak}
            </span>
            <span className="text-[11px] font-bold text-slate-600">
              {longestStreak === 1 ? 'DAY' : 'DAYS'}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 font-sans mt-0.5">
            All-time record
          </div>
        </div>
      </div>

      {/* Weekly 7-Day Indicators */}
      <div className="pt-1">
        <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2">
          <span>7-Day Activity Rhythm</span>
          <span className="text-indigo-600 font-semibold lowercase">
            {todayCompleted ? 'streak continued' : '1 activity pending'}
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {indicators.map((item, idx) => (
            <div
              key={item.date || idx}
              className="flex flex-col items-center gap-1 font-mono"
            >
              <div
                title={`${item.date}: ${item.completed ? 'Completed' : item.isToday ? 'Pending Today' : 'Missed'}`}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                  item.completed
                    ? 'bg-amber-500 text-white shadow-xs shadow-amber-500/30'
                    : item.isToday
                      ? 'border-2 border-dashed border-amber-500 bg-amber-50 text-amber-700 animate-pulse'
                      : 'bg-slate-100 text-slate-400 border border-slate-200/60'
                }`}
              >
                {item.completed ? (
                  <span className="material-symbols-outlined text-[15px] leading-none">
                    local_fire_department
                  </span>
                ) : item.isToday ? (
                  <span className="material-symbols-outlined text-[13px] leading-none">
                    bolt
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">•</span>
                )}
              </div>
              <span
                className={`text-[10px] ${
                  item.isToday
                    ? 'text-indigo-600 font-bold'
                    : 'text-slate-400 font-medium'
                }`}
              >
                {item.dayLetter}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Status Footer Banner */}
      <div
        className={`p-2.5 rounded-lg border text-xs font-sans flex items-center gap-2 ${
          todayCompleted
            ? 'bg-emerald-50/70 border-emerald-200/70 text-emerald-800'
            : 'bg-slate-50 border-slate-200/80 text-slate-600'
        }`}
      >
        <span
          className={`material-symbols-outlined text-sm shrink-0 ${
            todayCompleted ? 'text-emerald-600' : 'text-amber-500'
          }`}
        >
          {todayCompleted ? 'verified' : 'info'}
        </span>
        <span className="text-[11px] leading-snug">
          {todayCompleted
            ? "Qualifying activity recorded for today! Streak is safely preserved."
            : "Complete any problem submission or battle duel today to extend your streak."}
        </span>
      </div>
    </div>
  );
}
