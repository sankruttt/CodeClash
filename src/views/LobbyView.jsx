import React, { useState } from 'react';
import { roomAPI } from '../services/api';

export default function LobbyView({ navigate, queueing, onToggleQueue, currentUser }) {
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const liveDuels = [
    {
      id: 'd1',
      p1: 'Maya Chen',
      p1Score: 640,
      p1Avatar: 'MC',
      p2: 'Jon Bell',
      p2Score: 510,
      p2Avatar: 'JB',
      problem: 'Graph Traversal with Cycle Check',
      tier: 'MEDIUM',
      tierColor: 'amber',
      time: '08:42',
    },
    {
      id: 'd2',
      p1: 'Sarah Kim',
      p1Score: 420,
      p1Avatar: 'SK',
      p2: 'James Liu',
      p2Score: 380,
      p2Avatar: 'JL',
      problem: 'Binary Search Rotated Array',
      tier: 'EASY',
      tierColor: 'emerald',
      time: '03:15',
    },
    {
      id: 'd3',
      p1: 'Alex Chen',
      p1Score: 210,
      p1Avatar: 'AC',
      p2: 'Maria Santos',
      p2Score: 280,
      p2Avatar: 'MS',
      problem: 'Two Sum II - Input Array Is Sorted',
      tier: 'MEDIUM',
      tierColor: 'amber',
      time: '12:47',
    },
  ];

  const handleCreateRoom = async () => {
    setIsCreatingRoom(true);
    setErrorMsg('');
    try {
      const hostId = currentUser?.id || 'player_' + Math.random().toString(36).substr(2, 6);
      const hostName = currentUser?.name || 'Kaelen';
      const res = await roomAPI.createRoom(hostId, hostName);
      if (res && res.code) {
        navigate(`private-room`);
      } else {
        navigate(`private-room`);
      }
    } catch {
      // Fallback directly to private room view
      navigate('private-room');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!roomCodeInput.trim()) return;
    setErrorMsg('');
    try {
      const playerId = currentUser?.id || 'guest_' + Math.random().toString(36).substr(2, 6);
      const playerName = currentUser?.name || 'Cadet';
      await roomAPI.joinRoom(roomCodeInput.trim().toUpperCase(), playerId, playerName);
      navigate('private-room');
    } catch {
      // Direct navigation on demo
      navigate('private-room');
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
              <h1 className="text-3xl md:text-4xl text-slate-900 tracking-tight font-bold">
                Combat Protocols
              </h1>
              <span className="text-xs font-mono text-slate-500 font-normal">
                Select engagement vector or scrimmage tunnel
              </span>
            </div>
          </div>

          {/* Telemetry Pills */}
          <div className="flex items-center gap-2 flex-wrap font-mono">
            <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs flex items-center gap-2">
              <span className="material-symbols-outlined text-slate-400 text-[16px]">speed</span>
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Queue Avg</span>
                <span className="text-xs text-slate-900 font-semibold">14.2s</span>
              </div>
            </div>
            <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-500 text-[16px]">person_check</span>
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Active Queue</span>
                <span className="text-xs text-emerald-600 font-semibold">84 Duelists</span>
              </div>
            </div>
          </div>
        </div>

        {/* Protocols & Live Feed Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column (7 cols): Protocol 01 and Protocol 02 */}
          <div className="lg:col-span-7 space-y-5">
            {/* PROTOCOL 01: 1v1 Ranked Clash */}
            <div className="bg-white rounded-xl p-5 border-2 border-indigo-500/80 flex flex-col justify-between relative shadow-[0_4px_20px_-4px_rgba(79,70,229,0.12)] hover:border-indigo-600 transition-all">
              <div className="flex flex-col gap-4">
                {/* Header Bar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-xs text-indigo-600 font-bold">PROTOCOL_01</span>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-semibold">
                      PREMIER
                    </span>
                  </div>
                  <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-mono text-[11px] font-medium">
                    <span className="material-symbols-outlined text-[13px]">verified</span>
                    <span>LP STAKES ON</span>
                  </div>
                </div>

                {/* Title & Body */}
                <div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                    1v1 Ranked Clash
                  </h2>
                  <p className="text-sm text-slate-600 mt-1.5 leading-relaxed font-sans">
                    Synchronous peer duel over 3 algorithmic test vectors. Highest delta test resolution or quickest clean pass takes the pool.
                  </p>
                </div>

                {/* Milestone Pipeline */}
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200/80 flex flex-col gap-2.5 font-mono">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                    <span>Tri-Phase Matrix</span>
                    <span className="text-slate-400">15:00 LIMIT</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs flex flex-col gap-1.5">
                      <span className="text-[10px] text-slate-400 font-medium">STAGE I</span>
                      <span className="text-xs font-bold text-emerald-600">EASY (300)</span>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full w-full" />
                      </div>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs flex flex-col gap-1.5">
                      <span className="text-[10px] text-slate-400 font-medium">STAGE II</span>
                      <span className="text-xs font-bold text-sky-600">MED (600)</span>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-sky-500 h-full w-2/3" />
                      </div>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs flex flex-col gap-1.5">
                      <span className="text-[10px] text-slate-400 font-medium">STAGE III</span>
                      <span className="text-xs font-bold text-indigo-600">HARD (1100)</span>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-indigo-600 h-full w-1/3" />
                      </div>
                    </div>
                  </div>

                  <div className="pt-1 flex items-center justify-between text-slate-500 text-[11px]">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <span className="material-symbols-outlined text-[14px]">sync_alt</span>
                      <span>Live Keystroke &amp; AST Diff</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-5">
                <button
                  onClick={onToggleQueue}
                  className={`w-full py-3 px-4 rounded-lg font-mono text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 border shadow-sm transition-all duration-150 ${queueing
                      ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-700 shadow-rose-600/20'
                      : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white border-indigo-700 shadow-indigo-600/20'
                    }`}
                >
                  <span className="material-symbols-outlined text-base">
                    {queueing ? 'hourglass_top' : 'swords'}
                  </span>
                  <span>
                    {queueing
                      ? 'SEARCHING MATCH... CLICK TO CANCEL'
                      : 'ENTER 1v1 MATCHMAKING QUEUE'}
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
                      SANDBOX / P2P
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
                  <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono">
                    {errorMsg}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={handleCreateRoom}
                    disabled={isCreatingRoom}
                    className="p-3 rounded-lg border border-slate-200 hover:border-indigo-500 bg-slate-50 hover:bg-white text-slate-800 font-mono text-xs font-semibold flex flex-col gap-1 text-left transition-all group"
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
                      className="py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-semibold tracking-wider transition-colors"
                    >
                      JOIN ROOM KEY
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (5 cols): Live Arena Streams */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-rose-500">sensors</span>
                  <h2 className="text-sm font-semibold tracking-tight text-slate-900">
                    Live Arena Streams
                  </h2>
                </div>
                <span className="text-xs font-mono text-slate-400">3 Duels Live</span>
              </div>

              <div className="space-y-3 font-mono">
                {liveDuels.map((duel) => (
                  <div
                    key={duel.id}
                    className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 hover:border-indigo-300 transition-all shadow-2xs space-y-2.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                        <span className="font-semibold text-slate-900 font-sans">{duel.p1}</span>
                        <span className="text-slate-400 text-[11px]">({duel.p1Score})</span>
                        <span className="text-indigo-600 font-bold">vs</span>
                        <span className="font-semibold text-slate-900 font-sans">{duel.p2}</span>
                        <span className="text-slate-400 text-[11px]">({duel.p2Score})</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">{duel.time}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-sans">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-slate-700 truncate">{duel.problem}</span>
                        <span
                          className={`text-[9px] font-mono px-1 py-0.2 rounded font-semibold border ${duel.tierColor === 'amber'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                        >
                          {duel.tier}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
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
