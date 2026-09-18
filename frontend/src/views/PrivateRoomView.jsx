import React, { useState, useEffect, useRef } from 'react';
import { roomAPI } from '../services/api';
import { SCORING } from '../config/scoring';

export default function PrivateRoomView({ navigate, currentUser, onStartBattle }) {
  const [roomCode] = useState(() => {
    return sessionStorage.getItem('activeRoomCode') || 'CD-8492';
  });
  const [roomData, setRoomData] = useState(null);
  const [isHostReady, setIsHostReady] = useState(true);
  const [isGuestReady, setIsGuestReady] = useState(true);
  const [copied, setCopied] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState('Medium');
  const [timeLimit, setTimeLimit] = useState('10:00');
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const hasTransitioned = useRef(false);

  // Check role: Host (Owner) vs Guest
  const isOwner = Boolean(
    currentUser &&
    roomData &&
    (String(currentUser.id) === String(roomData.hostId) ||
      (currentUser.name && roomData.hostName && currentUser.name.toLowerCase() === roomData.hostName.toLowerCase()))
  );

  const isGuest = Boolean(
    currentUser &&
    roomData &&
    (String(currentUser.id) === String(roomData.guestId) ||
      (currentUser.name && roomData.guestName && currentUser.name.toLowerCase() === roomData.guestName.toLowerCase()))
  );

  const isChallengerJoined = Boolean(
    roomData?.guestId ||
    (roomData?.players && roomData.players.length >= 2) ||
    (roomData?.status && roomData.status !== 'waiting')
  );

  const challengerName = roomData?.guestName || roomData?.players?.[1]?.name || 'Challenger';
  const hostName = roomData?.hostName || currentUser?.name || 'Room Host';

  // Transition into the arena
  const transitionToMatch = (data) => {
    if (hasTransitioned.current) return;
    hasTransitioned.current = true;

    const problem = data?.questions?.[0] || null;
    const opponent = isOwner ? (data?.guestName || challengerName) : (data?.hostName || hostName);
    const resolvedDifficulty = data?.difficulty || selectedDifficulty || 'Medium';
    const resolvedTimeLimit = data?.timeLimit || timeLimit || '10:00';
    const resolvedDuration = data?.duration || (resolvedTimeLimit === '05:00' ? 300 : resolvedTimeLimit === '10:00' ? 600 : 900);

    const matchConfig = {
      matchId: data?.matchId || `room_${data?.code || roomCode}`,
      roomCode: data?.code || roomCode,
      type: 'Private Scrimmage',
      opponent,
      opponentRating: isOwner ? SCORING.simulated.ranked : SCORING.simulated.scrimmage,
      opponentAvatar: opponent.slice(0, 2).toUpperCase(),
      difficulty: resolvedDifficulty,
      timeLimit: resolvedTimeLimit,
      duration: resolvedDuration,
      problem: problem?.title || 'Binary Search',
      problemData: problem,
      questions: data?.questions || (problem ? [problem] : []),
      startedAt: data?.startedAt || data?.updatedAt || new Date().toISOString(),
    };

    if (onStartBattle) {
      onStartBattle(matchConfig);
    } else {
      navigate('arena');
    }
  };

  useEffect(() => {
    let isCancelled = false;

    async function loadRoomDetails() {
      if (!roomCode) return;
      try {
        const res = await roomAPI.getRoom(roomCode).catch((err) => {
          if (err?.status === 404) {
            return { notFound: true };
          }
          return null;
        });

        if (res?.notFound) {
          sessionStorage.removeItem('activeRoomCode');
          sessionStorage.removeItem('codeclash_active_match');
          navigate('lobby');
          return;
        }

        const data = res?.data?.room || res?.data || res;
        if (!isCancelled && data && (data.code || data._id)) {
          setRoomData(data);
          if (data.difficulty) setSelectedDifficulty(data.difficulty);
          if (data.timeLimit) setTimeLimit(data.timeLimit);

          // If room status is in_progress, transition into arena immediately
          if (data.status === 'in_progress' && !hasTransitioned.current) {
            transitionToMatch(data);
          }
        }
      } catch (err) {
        console.warn('Failed to load room details:', err);
      }
    }

    loadRoomDetails();
    const interval = setInterval(loadRoomDetails, 1200);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [roomCode]);

  const handleCopyCode = () => {
    navigator.clipboard?.writeText?.(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeaveRoom = async () => {
    try {
      const playerId = currentUser?.id || 'guest';
      await Promise.allSettled([
        roomAPI.leaveRoom(roomCode, playerId),
        roomAPI.abandonRoom(roomCode, playerId),
      ]);
    } catch (err) {
      console.warn('Error leaving room:', err.message);
    } finally {
      sessionStorage.removeItem('activeRoomCode');
      sessionStorage.removeItem('codeclash_active_match');
      navigate('lobby');
    }
  };

  const handleDifficultyChange = async (diff) => {
    setSelectedDifficulty(diff);
    setRoomData((prev) => (prev ? { ...prev, difficulty: diff } : prev));
    if (isOwner) {
      try {
        const hostId = currentUser?.id || roomData?.hostId;
        const durSec = timeLimit === '05:00' ? 300 : timeLimit === '10:00' ? 600 : 900;
        const res = await roomAPI.updateSettings(roomCode, {
          difficulty: diff,
          timeLimit,
          duration: durSec,
          hostId
        });
        const updated = res?.data?.room || res?.room;
        if (updated) setRoomData(updated);
      } catch (err) {
        console.warn('Failed to persist difficulty setting:', err.message);
      }
    }
  };

  const handleTimeLimitChange = async (time) => {
    setTimeLimit(time);
    const durSec = time === '05:00' ? 300 : time === '10:00' ? 600 : 900;
    setRoomData((prev) => (prev ? { ...prev, timeLimit: time, duration: durSec } : prev));
    if (isOwner) {
      try {
        const hostId = currentUser?.id || roomData?.hostId;
        const res = await roomAPI.updateSettings(roomCode, {
          difficulty: selectedDifficulty,
          timeLimit: time,
          duration: durSec,
          hostId
        });
        const updated = res?.data?.room || res?.room;
        if (updated) setRoomData(updated);
      } catch (err) {
        console.warn('Failed to persist timeLimit setting:', err.message);
      }
    }
  };

  // Only the room owner triggers start
  const handleStartCombat = async () => {
    if (!isOwner || isStarting) return;
    if (!isChallengerJoined || roomData?.status !== 'ready') {
      setErrorMessage('Cannot start match before all required players have joined.');
      return;
    }

    setIsStarting(true);
    setErrorMessage('');

    try {
      const res = await roomAPI.startBattle(roomCode, currentUser?.id);
      const updatedRoom = res?.data?.room || res?.room || roomData;
      if (updatedRoom) {
        setRoomData(updatedRoom);
        transitionToMatch(updatedRoom);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to start match');
      setIsStarting(false);
    }
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
                className="ml-1 text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
                title="Copy Room Code"
              >
                <span className="material-symbols-outlined text-sm">
                  {copied ? 'check' : 'content_copy'}
                </span>
              </button>
            </div>

            <button
              onClick={handleLeaveRoom}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-xs font-mono font-medium text-slate-600 hover:text-rose-600 transition-colors shadow-2xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">logout</span>
              <span>LEAVE ROOM</span>
            </button>
          </div>
        </section>

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">error</span>
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage('')} className="hover:text-rose-900">×</button>
          </div>
        )}

        {/* 1v1 Staging Arena Layout: Host vs Challenger */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Host Card (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border-2 border-indigo-500/80 p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-mono text-[10px] font-bold border border-indigo-100 uppercase">
              ROOM HOST {isOwner && '(YOU)'}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-400 text-white font-mono font-bold flex items-center justify-center text-lg shadow-sm">
                  {isOwner ? (currentUser?.avatar || 'KV') : (hostName.slice(0, 2).toUpperCase())}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{hostName}</h3>
                  <div className="font-mono text-xs text-indigo-600 font-medium">
                    {isOwner ? (currentUser?.handle || `@${currentUser?.name?.toLowerCase() || 'host'}`) : `@${hostName.toLowerCase()}`}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 font-mono text-[11px] text-slate-500">
                    <span className="text-sky-600 font-semibold">{isOwner ? (currentUser?.tier || 'Diamond') : 'Diamond'}</span>
                    <span>•</span>
                    <span>{isOwner ? (currentUser?.rating || SCORING.defaultRating) : SCORING.simulated.scrimmage} LP</span>
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
              {isOwner ? (
                <button
                  onClick={() => setIsHostReady(!isHostReady)}
                  className={`w-full py-2.5 px-4 rounded-xl font-mono text-xs font-bold tracking-wider uppercase border transition-all cursor-pointer ${
                    isHostReady
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {isHostReady ? '✓ YOU ARE READY (HOST)' : 'SET AS READY'}
                </button>
              ) : (
                <div className="w-full py-2.5 px-4 rounded-xl font-mono text-xs font-bold tracking-wider uppercase bg-emerald-50 text-emerald-700 border border-emerald-300 text-center">
                  ✓ HOST READY (LEADER)
                </div>
              )}
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
              CHALLENGER {isGuest && '(YOU)'}
            </div>

            {isChallengerJoined ? (
              <>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-slate-800 text-white font-mono font-bold flex items-center justify-center text-lg shadow-sm">
                      {isGuest ? (currentUser?.avatar || 'KV') : challengerName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">
                        {isGuest ? (currentUser?.name || challengerName) : challengerName}
                      </h3>
                      <div className="font-mono text-xs text-slate-500 font-medium">
                        @{isGuest ? (currentUser?.name?.toLowerCase() || 'cadet') : challengerName.toLowerCase()}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 font-mono text-[11px] text-slate-500">
                        <span className="text-sky-600 font-semibold">{isGuest ? (currentUser?.tier || 'Master') : 'Master'}</span>
                        <span>•</span>
                        <span>{isGuest ? (currentUser?.rating || SCORING.defaultRating) : SCORING.simulated.ranked} LP</span>
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
                  {isGuest ? (
                    <button
                      onClick={() => setIsGuestReady(!isGuestReady)}
                      className={`w-full py-2.5 px-4 rounded-xl font-mono text-xs font-bold tracking-wider uppercase border transition-all cursor-pointer ${
                        isGuestReady
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {isGuestReady ? '✓ YOU ARE READY' : 'SET AS READY'}
                    </button>
                  ) : (
                    <div className="w-full py-2.5 px-4 rounded-xl font-mono text-xs font-bold tracking-wider uppercase bg-emerald-50 text-emerald-700 border border-emerald-300 text-center">
                      ✓ OPPONENT READY
                    </div>
                  )}
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
                  <p className="text-xs text-slate-400 mt-0.5">Share code {roomCode} to invite</p>
                </div>
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
                    id={`room-diff-${diff.toLowerCase()}`}
                    disabled={!isOwner}
                    onClick={() => handleDifficultyChange(diff)}
                    className={`px-2.5 py-1 rounded border transition-all ${
                      selectedDifficulty === diff
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-white'
                    } ${isOwner ? 'cursor-pointer' : 'cursor-default opacity-85'}`}
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
                {['05:00', '10:00', '15:00'].map((time) => (
                  <button
                    key={time}
                    id={`room-time-${time.replace(':', '-')}`}
                    disabled={!isOwner}
                    onClick={() => handleTimeLimitChange(time)}
                    className={`px-2.5 py-1 rounded border transition-all ${
                      timeLimit === time
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-white'
                    } ${isOwner ? 'cursor-pointer' : 'cursor-default opacity-85'}`}
                  >
                    {time === '05:00' ? '5 Min' : time === '10:00' ? '10 Min' : '15 Min'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Area: Owner Controls Start Match; Non-Owner Waits */}
          <div className="w-full md:w-auto">
            {isOwner ? (
              isChallengerJoined && roomData?.status === 'ready' ? (
                <button
                  id="start-match-btn"
                  onClick={handleStartCombat}
                  disabled={isStarting}
                  className="w-full md:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-mono text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-base">play_arrow</span>
                  <span>{isStarting ? 'STARTING MATCH...' : 'START MATCH (COMMENCE DUEL)'}</span>
                </button>
              ) : (
                <button
                  id="start-match-disabled-btn"
                  disabled
                  className="w-full md:w-auto px-6 py-3 rounded-xl bg-slate-100 text-slate-400 border border-slate-200 font-mono text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-base">hourglass_top</span>
                  <span>WAITING FOR CHALLENGER TO JOIN...</span>
                </button>
              )
            ) : (
              <div
                id="waiting-for-owner-msg"
                className="w-full md:w-auto px-5 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-mono text-xs font-semibold flex items-center justify-center gap-2.5 shadow-2xs"
              >
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                <span>Waiting for the room owner to start the match…</span>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
