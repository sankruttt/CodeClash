import React, { useState } from 'react';

export default function PrivateRoomView({ navigate, currentUser, onStartBattle }) {
  const [roomCode] = useState('CD-8492');
  const [isHostReady, setIsHostReady] = useState(true);
  const [isChallengerJoined, setIsChallengerJoined] = useState(true);
  const [copied, setCopied] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState('Medium');
  const [timeLimit, setTimeLimit] = useState('15:00');

  const handleCopyCode = () => {
    navigator.clipboard?.writeText?.(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 min-w-0 px-4 pt-4 sm:px-6 sm:pt-6 pb-48 cyber-grid-bg">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Banner */}
        <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-indigo-600 font-semibold tracking-wide uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
              PROTOCOL_03 // CUSTOM P2P
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight mt-0.5">
              Private Combat Room
              <span className="text-sm font-mono font-medium text-slate-400 ml-2">Waiting Lounge</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-sans">
              Direct peer-to-peer scrimmage tunnel. Share invite credentials to engage algorithmic duel.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Room Code Badge */}
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs font-mono text-xs">
              <span className="text-slate-400 font-medium">CODE:</span>
              <strong className="text-indigo-600 font-bold tracking-wider">{roomCode}</strong>
              <button
                onClick={handleCopyCode}
                className="ml-1 text-slate-400 hover:text-slate-800 transition-colors"
                title="Copy Room Code"
              >
                <span className="material-symbols-outlined text-sm">
                  {copied ? 'check' : 'content_copy'}
                </span>
              </button>
            </div>

            <button
              onClick={() => navigate('lobby')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-xs font-mono font-medium text-slate-600 hover:text-rose-600 transition-colors shadow-2xs"
            >
              <span className="material-symbols-outlined text-sm">logout</span>
              <span>LEAVE ROOM</span>
            </button>
          </div>
        </section>

        {/* 1v1 Staging Arena Layout: Host vs Challenger */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Host Card (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border-2 border-indigo-500/80 p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-mono text-[10px] font-bold border border-indigo-100 uppercase">
              ROOM HOST
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-400 text-white font-mono font-bold flex items-center justify-center text-lg shadow-sm">
                  {currentUser?.avatar || 'KV'}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{currentUser?.name || 'Kaelen'}</h3>
                  <div className="font-mono text-xs text-indigo-600 font-medium">
                    {currentUser?.handle || '@Kaelen_V'}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 font-mono text-[11px] text-slate-500">
                    <span className="text-sky-600 font-semibold">{currentUser?.tier || 'Diamond'}</span>
                    <span>•</span>
                    <span>{currentUser?.rating || 2148} LP</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 font-mono text-xs space-y-1.5">
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>NODE PING</span>
                  <span className="text-emerald-600 font-bold">18ms (LOW)</span>
                </div>
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>KEYSTROKE STREAM</span>
                  <span className="text-slate-800 font-medium">READY (60 FPS)</span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <button
                onClick={() => setIsHostReady(!isHostReady)}
                className={`w-full py-2.5 px-4 rounded-xl font-mono text-xs font-bold tracking-wider uppercase border transition-all ${
                  isHostReady
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {isHostReady ? '✓ YOU ARE READY' : 'SET AS READY'}
              </button>
            </div>
          </div>

          {/* Center VS Indicator (2 cols) */}
          <div className="lg:col-span-2 flex flex-col items-center justify-center py-4">
            <div className="w-12 h-12 rounded-full bg-slate-900 text-white font-mono font-black text-sm flex items-center justify-center shadow-md">
              VS
            </div>
            <div className="h-10 w-[1px] bg-slate-200 mt-2 hidden lg:block" />
          </div>

          {/* Challenger Card (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px] font-bold border border-slate-200 uppercase">
              CHALLENGER
            </div>

            {isChallengerJoined ? (
              <>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-slate-800 text-white font-mono font-bold flex items-center justify-center text-lg shadow-sm">
                      VS
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">v0_Sniper</h3>
                      <div className="font-mono text-xs text-slate-500 font-medium">@v0_sniper</div>
                      <div className="flex items-center gap-1.5 mt-1 font-mono text-[11px] text-slate-500">
                        <span className="text-sky-600 font-semibold">Master</span>
                        <span>•</span>
                        <span>2,395 LP</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 font-mono text-xs space-y-1.5">
                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>NODE PING</span>
                      <span className="text-emerald-600 font-bold">22ms</span>
                    </div>
                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>STATUS</span>
                      <span className="text-emerald-600 font-bold">READY</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  <div className="w-full py-2.5 px-4 rounded-xl font-mono text-xs font-bold tracking-wider uppercase bg-emerald-50 text-emerald-700 border border-emerald-300 text-center">
                    ✓ OPPONENT READY
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4 space-y-3">
                <div className="relative w-16 h-16 rounded-full border border-indigo-200 flex items-center justify-center">
                  <div className="w-full h-full rounded-full border-2 border-indigo-500/20 radar-beam absolute" />
                  <span className="material-symbols-outlined text-indigo-500 text-2xl">person_search</span>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm">Waiting for Challenger</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Share code CD-8492 to invite</p>
                </div>
                <button
                  onClick={() => setIsChallengerJoined(true)}
                  className="px-3 py-1 rounded bg-slate-100 hover:bg-slate-200 text-xs font-mono text-slate-700 font-medium"
                >
                  Simulate Player Join
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Room Parameters & Launch Bar */}
        <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5 font-mono text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <span className="text-slate-400 text-[10px] uppercase tracking-wider block mb-1">
                Difficulty Vector
              </span>
              <div className="flex items-center gap-1">
                {['Easy', 'Medium', 'Hard'].map((diff) => (
                  <button
                    key={diff}
                    onClick={() => setSelectedDifficulty(diff)}
                    className={`px-2.5 py-1 rounded border transition-all ${
                      selectedDifficulty === diff
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-white'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-slate-400 text-[10px] uppercase tracking-wider block mb-1">
                Time Limit
              </span>
              <div className="flex items-center gap-1">
                {['10:00', '15:00', '20:00'].map((time) => (
                  <button
                    key={time}
                    onClick={() => setTimeLimit(time)}
                    className={`px-2.5 py-1 rounded border transition-all ${
                      timeLimit === time
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-white'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              if (onStartBattle) {
                onStartBattle({
                  type: 'Private Room Scrimmage',
                  opponent: 'v0_Sniper',
                  difficulty: selectedDifficulty,
                  timeLimit,
                  roomCode,
                });
              } else {
                navigate('arena');
              }
            }}
            className="w-full md:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-mono text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">play_arrow</span>
            <span>START BATTLE (COMMENCE DUEL)</span>
          </button>
        </section>
      </div>
    </div>
  );
}
