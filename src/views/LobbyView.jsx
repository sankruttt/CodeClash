import React, { useState, useEffect } from 'react';
import { roomAPI, matchAPI } from '../services/api';

export default function LobbyView({ navigate, queueing, onToggleQueue, currentUser }) {
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [liveDuels, setLiveDuels] = useState([]);
  const [loadingDuels, setLoadingDuels] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    async function fetchLiveDuels() {
      setLoadingDuels(true);
      try {
        const res = await matchAPI.getMatches().catch(() => null);
        const matches = res?.data?.matches || res?.data || [];
        const active = matches.filter((m) => m.status === 'ACTIVE' || m.status === 'WAITING');

        if (!isCancelled && Array.isArray(active) && active.length > 0) {
          setLiveDuels(
            active.map((m, idx) => ({
              id: m._id || m.id || idx,
              p1: m.players?.[0]?.username || m.player1?.name || 'Combatant 1',
              p1Score: m.players?.[0]?.ratingBefore || 500,
              p1Avatar: (m.players?.[0]?.username || m.player1?.name || 'P1').slice(0, 2).toUpperCase(),
              p2: m.players?.[1]?.username || m.player2?.name || 'Combatant 2',
              p2Score: m.players?.[1]?.ratingBefore || 450,
              p2Avatar: (m.players?.[1]?.username || m.player2?.name || 'P2').slice(0, 2).toUpperCase(),
              problem: m.problemTitle || m.problems?.[0]?.title || 'Algorithmic Duel',
              tier: (m.difficulty || 'MEDIUM').toUpperCase(),
              tierColor: m.difficulty === 'Hard' ? 'indigo' : m.difficulty === 'Easy' ? 'emerald' : 'amber',
              time: 'Live',
            }))
          );
        } else if (!isCancelled) {
          setLiveDuels([]);
        }
      } catch (err) {
        console.warn('Error fetching live duels:', err);
      } finally {
        if (!isCancelled) setLoadingDuels(false);
      }
    }

    fetchLiveDuels();

    return () => {
      isCancelled = true;
    };
  }, []);

  const handleCreateRoom = async () => {
    setIsCreatingRoom(true);
    setErrorMsg('');
    try {
      const hostId = currentUser?.id || 'player_' + Math.random().toString(36).substr(2, 6);
      const hostName = currentUser?.name || 'Combatant';
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
      const playerName = currentUser?.name || 'Cadet';
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

        {/* Operational Grid: Protocols & Live Duels */}
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
                    1v1 Ranked Duel (Best of 3)
                  </h2>
                  <p className="text-sm text-slate-600 mt-1 font-sans leading-relaxed">
                    Automated competitive matchmaking against verified adversaries of comparable LP. Full rating calibration applies upon conclusion.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2 font-mono text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-[10px] text-slate-400 font-medium">QUEUE TIME</div>
                    <div className="text-sm font-bold text-slate-800 mt-0.5">~12s</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-[10px] text-slate-400 font-medium">PAIRING TOLERANCE</div>
                    <div className="text-sm font-bold text-indigo-600 mt-0.5">±120 LP</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-[10px] text-slate-400 font-medium">STAKE</div>
                    <div className="text-sm font-bold text-emerald-600 mt-0.5">+24 / -18 LP</div>
                  </div>
                </div>
              </div>

              <div className="pt-5">
                <button
                  onClick={onToggleQueue}
                  className={`w-full py-3 px-4 rounded-lg font-mono text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 border shadow-sm transition-all duration-150 cursor-pointer ${
                    queueing
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
                <span className="text-xs font-mono text-slate-400">
                  {liveDuels.length} {liveDuels.length === 1 ? 'Duel Live' : 'Duels Live'}
                </span>
              </div>

              <div className="space-y-3 font-mono">
                {liveDuels.length > 0 ? (
                  liveDuels.map((duel) => (
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
                            className={`text-[9px] font-mono px-1 py-0.2 rounded font-semibold border ${
                              duel.tierColor === 'amber'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {duel.tier}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-xs font-mono text-slate-400">
                    {loadingDuels ? 'Scanning active arena streams...' : 'No combat duels currently active. Be the first to duel!'}
                  </div>
                )}
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
