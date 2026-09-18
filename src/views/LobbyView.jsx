import React, { useState } from 'react';
import { roomAPI } from '../services/api';

export default function LobbyView({ navigate, queueing, onToggleQueue, currentUser }) {
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [rankedQuestions, setRankedQuestions] = useState(1);
  const [rankedDuration, setRankedDuration] = useState(10);

  const handleCreateRoom = async () => {
    setIsCreatingRoom(true);
    setErrorMsg('');
    try {
      const hostId = currentUser?.id || 'player_' + Math.random().toString(36).substr(2, 6);
      const hostName = currentUser?.name || currentUser?.username || 'Combatant';
      const res = await roomAPI.createRoom(hostId, hostName);
      const code = res?.data?.code || res?.code;
      if (code) {
        sessionStorage.setItem('activeRoomCode', code);
        navigate('private-room');
      } else {
        throw new Error('Room creation failed to return a code');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create room');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    const cleanCode = roomCodeInput.trim().toUpperCase();
    if (!cleanCode) return;
    setErrorMsg('');
    try {
      const playerId = currentUser?.id || 'guest_' + Math.random().toString(36).substr(2, 6);
      const playerName = currentUser?.name || currentUser?.username || 'Cadet';
      await roomAPI.joinRoom(cleanCode, playerId, playerName);
      sessionStorage.setItem('activeRoomCode', cleanCode);
      navigate('private-room');
    } catch (err) {
      setErrorMsg(err.message || 'Room code not found or room is full.');
    }
  };

  return (
    <div className="flex-1 min-w-0 px-4 pt-4 sm:px-6 sm:pt-6 pb-48 clean-grid">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Breadcrumb & Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px] uppercase tracking-wider font-semibold">
              <span onClick={() => navigate('dashboard')} className="hover:text-slate-700 transition-colors cursor-pointer">
                HQ
              </span>
              <span className="text-slate-300">/</span>
              <span className="text-indigo-600">BATTLE LOBBY</span>
              <span className="text-slate-300">/</span>
            </div>
            <div className="flex items-baseline gap-3 flex-wrap">
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                Competitive Battle Hub
              </h1>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 font-semibold">
                GLOBAL CLUSTER 01
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('leaderboard')}
              className="px-3.5 py-2 rounded-lg border border-slate-200 hover:border-slate-300 bg-white text-xs font-mono text-slate-700 font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm text-amber-500">military_tech</span>
              <span>LADDER STANDINGS</span>
            </button>
            <button
              onClick={() => navigate('history')}
              className="px-3.5 py-2 rounded-lg border border-slate-200 hover:border-slate-300 bg-white text-xs font-mono text-slate-700 font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm text-slate-400">history</span>
              <span>COMBAT LOG</span>
            </button>
          </div>
        </div>

        {/* Operational Grid: Protocols & Information */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (7 cols): Protocol Selectors */}
          <div className="lg:col-span-7 space-y-4">
            {/* PROTOCOL 01: Ranked Queue */}
            <div className="bg-white rounded-xl p-5 border-2 border-indigo-500/80 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-xs text-indigo-600 font-bold">PROTOCOL_01</span>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-semibold">
                      OFFICIAL RANKED
                    </span>
                  </div>
                  <span className="text-xs font-mono text-emerald-600 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    MATCHMAKING ACTIVE
                  </span>
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                    1v1 Ranked Duel
                  </h2>
                  <p className="text-sm text-slate-600 mt-1 font-sans leading-relaxed">
                    Automated competitive matchmaking against verified adversaries of comparable LP. First player to solve all assigned questions wins immediately.
                  </p>
                </div>

                {/* Ranked Lobby Configuration */}
                <div className="pt-2 pb-1 space-y-3 bg-slate-50/70 p-3 rounded-lg border border-slate-200/80">
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
                      <span className="text-slate-500 font-medium uppercase tracking-wider">Number of Questions</span>
                      <span className="text-indigo-600 font-bold">{rankedQuestions} {rankedQuestions === 1 ? 'Question' : 'Questions'}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[1, 2, 3].map((count) => (
                        <button
                          key={count}
                          type="button"
                          disabled={queueing}
                          onClick={() => setRankedQuestions(count)}
                          className={`py-2 px-3 rounded-lg border font-mono text-xs font-semibold transition-all ${rankedQuestions === count
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                            } ${queueing ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          {count} {count === 1 ? 'Question' : 'Questions'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
                      <span className="text-slate-500 font-medium uppercase tracking-wider">Match Duration</span>
                      <span className="text-indigo-600 font-bold">{rankedDuration} Minutes</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[5, 10, 15].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          disabled={queueing}
                          onClick={() => setRankedDuration(mins)}
                          className={`py-2 px-3 rounded-lg border font-mono text-xs font-semibold transition-all ${rankedDuration === mins
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                            } ${queueing ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          {mins} Minutes
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-1 font-mono text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-[10px] text-slate-400 font-medium">QUEUE TIME</div>
                    <div className="text-sm font-bold text-slate-800 mt-0.5">~12s</div>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-[10px] text-slate-400 font-medium">PAIRING TOLERANCE</div>
                    <div className="text-sm font-bold text-indigo-600 mt-0.5">±120 LP</div>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-[10px] text-slate-400 font-medium">STAKE</div>
                    <div className="text-sm font-bold mt-0.5">
                      <span className="text-emerald-600">+24</span>
                      <span className="text-black"> / </span>
                      <span className="text-red-600"> -24 LP</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => onToggleQueue?.({ questionCount: rankedQuestions, duration: rankedDuration })}
                  className={`w-full py-3 px-4 rounded-lg font-mono text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 border shadow-sm transition-all duration-150 cursor-pointer ${queueing
                    ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-700 shadow-rose-600/20 animate-pulse'
                    : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white border-indigo-700 shadow-indigo-600/20'
                    }`}
                >
                  <span className="material-symbols-outlined text-base">
                    {queueing ? 'hourglass_top' : 'swords'}
                  </span>
                  <span>
                    {queueing
                      ? 'SEARCHING MATCH... CLICK TO CANCEL'
                      : `ENTER 1v1 MATCHMAKING QUEUE (${rankedQuestions}Q • ${rankedDuration}M)`}
                  </span>
                </button>
              </div>
            </div>

            {/* PROTOCOL 02: Private War Room / Sandbox */}
            <div className="bg-white rounded-xl p-5 border border-slate-200/80 flex flex-col justify-between shadow-xs hover:border-slate-300 transition-all">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-xs text-slate-500 font-bold">PROTOCOL_02</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-semibold">
                      P2P
                    </span>
                  </div>
                  <span className="text-xs font-mono text-slate-400">UNRANKED</span>
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                    Private Scrimmage Room
                  </h2>
                  <p className="text-sm text-slate-600 mt-1 font-sans leading-relaxed">
                    Custom peer room for technical interviews, friendly challenges, or clan tournaments without rating risk.
                  </p>
                </div>

                {errorMsg && (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm shrink-0">error</span>
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={handleCreateRoom}
                    disabled={isCreatingRoom}
                    className="p-3 rounded-lg border border-slate-200 hover:border-indigo-500 bg-slate-50 hover:bg-white text-slate-800 font-mono text-xs font-semibold flex flex-col gap-1 text-left transition-all group cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-indigo-600">
                      <span className="material-symbols-outlined text-lg">add_circle</span>
                      <span className="text-[10px] text-slate-400 font-normal">INSTANT</span>
                    </div>
                    <span>{isCreatingRoom ? 'GENERATING...' : 'CREATE NEW ROOM'}</span>
                    <span className="text-[10px] text-slate-400 font-sans font-normal">
                      Generates unique 6-character room key
                    </span>
                  </button>

                  <form onSubmit={handleJoinRoom} className="flex flex-col gap-2">
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={roomCodeInput}
                        onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                        placeholder="ROOM CODE (E.G. CD-8492)"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 placeholder:text-slate-400 input-glow uppercase"
                      />
                    </div>
                    <button
                      type="submit"
                      className="py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-semibold tracking-wider transition-colors cursor-pointer"
                    >
                      JOIN ROOM KEY
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (5 cols): Arena Rules & Compiler Info */}
          <div className="lg:col-span-5 space-y-4">
            {/* Arena Protocols & Rules */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-4 font-mono text-xs">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <span className="material-symbols-outlined text-base text-indigo-600">gavel</span>
                <h2 className="text-sm font-semibold tracking-tight text-slate-900 font-sans">
                  Arena Combat Rules
                </h2>
              </div>

              <div className="space-y-3 font-sans text-xs text-slate-600">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded bg-indigo-50 text-indigo-700 font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    01
                  </span>
                  <div>
                    <strong className="text-slate-900 font-semibold block">Authoritative Evaluation</strong>
                    Code is compiled in sandboxed containers via OnlineCompiler.io. Solutions must pass all public and hidden test cases.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded bg-indigo-50 text-indigo-700 font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    02
                  </span>
                  <div>
                    <strong className="text-slate-900 font-semibold block">Deterministic Rating Adjustments</strong>
                    Victories yield +24 LP; defeats lose -24 LP. All rating transitions are committed directly to MongoDB.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded bg-indigo-50 text-indigo-700 font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    03
                  </span>
                  <div>
                    <strong className="text-slate-900 font-semibold block">Zero Tolerance for Abandonment</strong>
                    Leaving an active match mid-way triggers immediate forfeiture (-24 LP penalty). The remaining combatant receives +25 LP compensation.
                  </div>
                </div>
              </div>
            </div>

            {/* Supported Language Runtimes */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-emerald-600">verified</span>
                  <h3 className="text-sm font-semibold tracking-tight text-slate-900 font-sans">
                    Supported Compilers
                  </h3>
                </div>
                <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  5 Runtimes Active
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <span className="text-slate-800 font-semibold">C</span>
                  <span className="text-slate-400 text-[10px]">GCC 15</span>
                </div>
                <div className="p-2 rounded bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <span className="text-slate-800 font-semibold">C++</span>
                  <span className="text-slate-400 text-[10px]">G++ 15</span>
                </div>
                <div className="p-2 rounded bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <span className="text-slate-800 font-semibold">Java</span>
                  <span className="text-slate-400 text-[10px]">OpenJDK 25</span>
                </div>
                <div className="p-2 rounded bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <span className="text-slate-800 font-semibold">JavaScript</span>
                  <span className="text-slate-400 text-[10px]">Deno</span>
                </div>
                <div className="p-2 rounded bg-slate-50 border border-slate-100 flex items-center justify-between col-span-2">
                  <span className="text-slate-800 font-semibold">Python</span>
                  <span className="text-slate-400 text-[10px]">Python 3.14</span>
                </div>
              </div>
            </div>

            {/* Quick Practice Tip */}
            <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-start gap-3">
              <span className="material-symbols-outlined text-indigo-600 text-lg">lightbulb</span>
              <div className="text-xs text-slate-600 leading-relaxed font-sans">
                <strong className="text-indigo-900 font-semibold block mb-0.5">Competitive Calibrations</strong>
                Ranked duel matchmaking pairs within ±120 LP. You can test submissions multiple times before final locking.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
