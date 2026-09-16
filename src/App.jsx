import React, { useState, useEffect, useCallback } from 'react';
import TopAppBar from './components/TopAppBar';
import UnifiedDock from './components/UnifiedDock';
import LandingLoginView from './views/LandingLoginView';
import SignUpView from './views/SignUpView';
import DashboardView from './views/DashboardView';
import LobbyView from './views/LobbyView';
import ArenaView from './views/ArenaView';
import PrivateRoomView from './views/PrivateRoomView';
import LeaderboardView from './views/LeaderboardView';
import HistoryView from './views/HistoryView';
import ProfileView from './views/ProfileView';

function getInitialUser() {
  const saved = sessionStorage.getItem('codeclash_user');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && (parsed.tier === 'Diamond II' || parsed.tier === 'diamond ii' || parsed.tier === 'DIAMOND II')) {
        parsed.tier = 'Diamond';
        sessionStorage.setItem('codeclash_user', JSON.stringify(parsed));
      }
      return parsed;
    } catch {
      // fallback
    }
  }
  return null;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(getInitialUser);
  const [route, setRoute] = useState(() => {
    const user = getInitialUser();
    const hash = window.location.hash.replace(/^#\/?/, '');
    if (!user) {
      return hash === 'register' ? 'register' : 'login';
    }
    return hash || 'dashboard';
  });

  const [queueing, setQueueing] = useState(false);
  const [activeMatch, setActiveMatch] = useState(null);
  const [matchFoundModal, setMatchFoundModal] = useState(null);
  const [arenaLockedNotice, setArenaLockedNotice] = useState(null);
  const [confirmExitModal, setConfirmExitModal] = useState(false);
  const [pendingNavigationRoute, setPendingNavigationRoute] = useState(null);
  const [forfeitNotice, setForfeitNotice] = useState(null);

  const navigate = useCallback((newRoute) => {
    if (route === 'arena' && activeMatch && newRoute !== 'arena') {
      setPendingNavigationRoute(newRoute);
      setConfirmExitModal(true);
      return;
    }
    window.location.hash = newRoute;
  }, [route, activeMatch]);

  // Sync hash routing & enforce landing page for unauthenticated users
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      const user = sessionStorage.getItem('codeclash_user');
      if (!user) {
        if (hash === 'register') {
          setRoute('register');
        } else {
          setRoute('login');
          if (hash !== 'login') {
            window.location.hash = 'login';
          }
        }
      } else {
        if (route === 'arena' && activeMatch && hash !== 'arena') {
          window.location.hash = 'arena';
          setPendingNavigationRoute(hash || 'dashboard');
          setConfirmExitModal(true);
          return;
        }
        setRoute(hash || 'dashboard');
      }
      window.scrollTo(0, 0);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [route, activeMatch]);

  // Route guard: When player hasn't signed in, redirect to landing page (or register)
  useEffect(() => {
    if (!currentUser) {
      if (route !== 'login' && route !== 'register') {
        window.location.hash = 'login';
      } else if (route === 'login' && window.location.hash !== '#/login' && window.location.hash !== '#login') {
        window.location.hash = 'login';
      }
    }
  }, [currentUser, route]);

  // Route guard: Arena cannot be accessed directly without an active match
  useEffect(() => {
    if (route === 'arena' && !activeMatch) {
      window.location.hash = 'dashboard';
      const timer = setTimeout(() => {
        setArenaLockedNotice(
          'Arena Locked: A match must be found via queue or launched from a private room.'
        );
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [route, activeMatch]);

  // Auto-dismiss the Arena locked popup after 4-5 seconds
  useEffect(() => {
    if (!arenaLockedNotice) return;
    const timer = setTimeout(() => {
      setArenaLockedNotice(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [arenaLockedNotice]);

  // Auto-dismiss forfeit penalty notice after 4-5 seconds
  useEffect(() => {
    if (!forfeitNotice) return;
    const timer = setTimeout(() => {
      setForfeitNotice(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [forfeitNotice]);

  // Queue simulation: searches for ~2.8 seconds, then triggers Match Found
  const handleToggleQueue = () => {
    if (queueing) {
      setQueueing(false);
    } else {
      setQueueing(true);
    }
  };

  useEffect(() => {
    if (!queueing) return;
    const timer = setTimeout(() => {
      setQueueing(false);
      setMatchFoundModal({
        opponent: 'v0_Sniper',
        type: '1v1 Ranked Clash',
        problem: 'LRU Cache with TTL',
        countdown: 3,
      });
    }, 2800);

    return () => clearTimeout(timer);
  }, [queueing]);

  // Match Found countdown sequence (3 -> 2 -> 1 -> Arena)
  useEffect(() => {
    if (!matchFoundModal) return;

    if (matchFoundModal.countdown > 1) {
      const cd = setTimeout(() => {
        setMatchFoundModal((prev) =>
          prev ? { ...prev, countdown: prev.countdown - 1 } : null
        );
      }, 1000);
      return () => clearTimeout(cd);
    } else {
      const cd = setTimeout(() => {
        const match = {
          id: 'match_' + Date.now(),
          type: matchFoundModal.type,
          opponent: matchFoundModal.opponent,
          problem: matchFoundModal.problem,
        };
        setActiveMatch(match);
        setMatchFoundModal(null);
        window.location.hash = 'arena';
      }, 1000);
      return () => clearTimeout(cd);
    }
  }, [matchFoundModal]);

  // Start match from Private Room
  const handleStartPrivateBattle = (roomConfig) => {
    const match = {
      id: 'room_' + (roomConfig?.roomCode || 'CD-8492'),
      type: 'Private Scrimmage',
      opponent: roomConfig?.opponent || 'v0_Sniper',
      difficulty: roomConfig?.difficulty || 'Medium',
      timeLimit: roomConfig?.timeLimit || '15:00',
      problem: 'LRU Cache with TTL',
    };
    setActiveMatch(match);
    navigate('arena');
  };

  // Trigger exit confirmation modal
  const handleTriggerExitArena = () => {
    setPendingNavigationRoute('lobby');
    setConfirmExitModal(true);
  };

  // Confirm exit: Deduct LP penalty, record defeat, reset streak, and exit match
  const handleConfirmExit = () => {
    const penalty = 24;
    const currentRating = currentUser?.rating ?? 2148;
    const newRating = Math.max(0, currentRating - penalty);
    if (currentUser) {
      const updated = {
        ...currentUser,
        rating: newRating,
        losses: (currentUser.losses || 66) + 1,
        streak: 0,
      };
      setCurrentUser(updated);
      sessionStorage.setItem('codeclash_user', JSON.stringify(updated));
    }
    setActiveMatch(null);
    setConfirmExitModal(false);
    const destination = pendingNavigationRoute || 'lobby';
    setPendingNavigationRoute(null);
    window.location.hash = destination;
    setForfeitNotice(`Match Abandoned: -${penalty} LP penalty deducted for leaving midway.`);
  };

  const handleCancelExit = () => {
    setConfirmExitModal(false);
    setPendingNavigationRoute(null);
  };

  const handleLoginSuccess = (loginData) => {
    const emailPrefix = loginData?.email ? loginData.email.split('@')[0] : 'kaelen.vance';
    const displayName = emailPrefix
      .split(/[._-]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ') || 'Kaelen Vance';

    const combatant = {
      id: 'user_4829',
      name: displayName,
      handle: `@${emailPrefix}`,
      avatar: emailPrefix.slice(0, 2).toUpperCase() || 'KV',
      color: 'indigo',
      rating: 2148,
      tier: 'Diamond',
      wins: 142,
      losses: 66,
      streak: 7,
      email: loginData?.email || 'kaelen.vance@duel.internal',
    };
    setCurrentUser(combatant);
    sessionStorage.setItem('codeclash_user', JSON.stringify(combatant));
    navigate('dashboard');
  };

  const handleSignUpSuccess = (signUpData) => {
    const newUser = {
      id: 'user_' + Math.floor(1000 + Math.random() * 9000),
      name: signUpData?.name || 'Alex Mercer',
      handle: signUpData?.handle || '@alex_dev',
      avatar: signUpData?.avatar || 'AM',
      color: 'indigo',
      rating: 1200,
      tier: 'Gold IV',
      wins: 0,
      losses: 0,
      streak: 0,
      email: signUpData?.email || 'alex@codeclash.dev',
    };
    setCurrentUser(newUser);
    sessionStorage.setItem('codeclash_user', JSON.stringify(newUser));
    navigate('dashboard');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('codeclash_user');
    setCurrentUser(null);
    setActiveMatch(null);
    navigate('login');
  };

  // Auth views do not show the unified dock or top app bar
  if (route === 'login') {
    return <LandingLoginView navigate={navigate} onLoginSuccess={handleLoginSuccess} />;
  }

  if (route === 'register') {
    return <SignUpView navigate={navigate} onSignUpSuccess={handleSignUpSuccess} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fc] text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Universal Top App Bar */}
      <TopAppBar
        currentRoute={route}
        navigate={navigate}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main View Router */}
      <main className="pt-14 flex-1 flex flex-col min-w-0">
        {route === 'dashboard' && (
          <DashboardView
            navigate={navigate}
            queueing={queueing}
            setQueueing={setQueueing}
            onToggleQueue={handleToggleQueue}
            currentUser={currentUser}
          />
        )}

        {route === 'lobby' && (
          <LobbyView
            navigate={navigate}
            queueing={queueing}
            onToggleQueue={handleToggleQueue}
            currentUser={currentUser}
          />
        )}

        {route === 'arena' && (
          <ArenaView
            navigate={navigate}
            currentUser={currentUser}
            activeMatch={activeMatch}
            onExitArena={handleTriggerExitArena}
          />
        )}

        {route === 'private-room' && (
          <PrivateRoomView
            navigate={navigate}
            currentUser={currentUser}
            onStartBattle={handleStartPrivateBattle}
          />
        )}

        {route === 'leaderboard' && (
          <LeaderboardView
            currentUser={currentUser}
          />
        )}

        {route === 'history' && (
          <HistoryView
            navigate={navigate}
          />
        )}

        {route === 'profile' && (
          <ProfileView
            navigate={navigate}
            currentUser={currentUser}
          />
        )}
      </main>

      {/* Unified Floating Bottom Navigation Dock */}
      <UnifiedDock
        currentRoute={route}
        navigate={navigate}
        hasActiveMatch={Boolean(activeMatch)}
        onArenaLockedClick={() => {
          setArenaLockedNotice(
            'Arena Locked: Enter the 1v1 Queue or start a Private Room duel to unlock.'
          );
        }}
      />

      {/* MATCH FOUND OVERLAY MODAL */}
      {matchFoundModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white border-2 border-indigo-600 rounded-2xl shadow-2xl p-6 text-center space-y-5 relative overflow-hidden">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-xs font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>MATCH FOUND // ADVERSARY ACQUIRED</span>
            </div>

            <div className="flex items-center justify-center gap-6 py-2">
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-400 text-white font-mono font-bold text-lg flex items-center justify-center shadow-md">
                  {currentUser?.avatar || 'KV'}
                </div>
                <span className="font-bold text-slate-900 text-xs font-sans">
                  {currentUser?.name || 'You'}
                </span>
                <span className="font-mono text-[11px] text-sky-600">2,148 LP</span>
              </div>

              <div className="font-mono font-black text-xl text-indigo-600 flex flex-col items-center">
                <span className="text-xl">VS</span>
                <span className="text-[9px] text-slate-400 uppercase tracking-widest mt-0.5">1v1 BO3</span>
              </div>

              <div className="flex flex-col items-center gap-1.5">
                <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white font-mono font-bold text-lg flex items-center justify-center shadow-md">
                  VS
                </div>
                <span className="font-bold text-slate-900 text-xs font-sans">
                  {matchFoundModal.opponent}
                </span>
                <span className="font-mono text-[11px] text-slate-500">2,395 LP</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-left font-mono text-xs space-y-1">
              <div className="flex justify-between text-slate-500">
                <span>PROBLEM VECTOR</span>
                <span className="font-semibold text-slate-900">{matchFoundModal.problem}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>FORMAT</span>
                <span className="text-indigo-600 font-bold uppercase">{matchFoundModal.type}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-mono text-indigo-600 font-bold tracking-wider uppercase">
                ENTERING LIVE ARENA IN {matchFoundModal.countdown}s...
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                <div
                  className="bg-indigo-600 h-full transition-all duration-1000 ease-linear rounded-full"
                  style={{ width: `${((4 - matchFoundModal.countdown) / 3) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ARENA LOCKED TOAST BANNER (Auto-dismisses in 4.5s) */}
      {arenaLockedNotice && (
        <div className="fixed top-16 right-6 z-50 bg-slate-900/95 text-white font-mono text-xs p-3.5 rounded-xl shadow-2xl border border-slate-700 flex flex-col gap-2 max-w-sm backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-amber-400 shrink-0">lock</span>
              <span className="font-sans font-medium text-slate-100 leading-snug">{arenaLockedNotice}</span>
            </div>
            <button
              onClick={() => setArenaLockedNotice(null)}
              className="text-slate-400 hover:text-white transition-colors p-0.5 rounded cursor-pointer"
              title="Dismiss"
              aria-label="Dismiss notice"
            >
              <span className="material-symbols-outlined text-sm leading-none">close</span>
            </button>
          </div>
          <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
            <div className="bg-amber-400 h-full rounded-full animate-[progress_4.5s_linear_forwards]" style={{ width: '100%', animation: 'shrinkWidth 4.5s linear forwards' }} />
          </div>
        </div>
      )}

      {/* MATCH FORFEIT / EXIT CONFIRMATION MODAL */}
      {confirmExitModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white border-2 border-rose-500 rounded-2xl shadow-2xl p-6 text-center space-y-5 relative overflow-hidden">
            {/* Top Warning Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-mono text-xs font-bold uppercase tracking-wider">
              <span className="material-symbols-outlined text-sm text-rose-600">warning</span>
              <span>ABANDON DUEL // FORFEIT WARNING</span>
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-black text-slate-900 tracking-tight font-mono">
                LEAVE MATCH MIDWAY?
              </h2>
              <p className="text-xs text-slate-500 font-sans leading-relaxed">
                You are currently in an active code duel against{' '}
                <strong className="text-slate-900 font-mono">{activeMatch?.opponent || 'v0_Sniper'}</strong>.
                Leaving midway counts as an immediate defeat and incurs a rating penalty.
              </p>
            </div>

            {/* Penalty Point Deduction Calculation Box */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-left font-mono text-xs space-y-2.5">
              <div className="flex justify-between items-center text-slate-600">
                <span>CURRENT RATING</span>
                <span className="font-bold text-slate-900">{currentUser?.rating || 2148} LP</span>
              </div>
              <div className="flex justify-between items-center text-rose-600 font-bold">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">trending_down</span>
                  MIDWAY ABANDONMENT PENALTY
                </span>
                <span>-24 LP</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between items-center">
                <span className="text-slate-600 font-semibold">NEW RATING AFTER FORFEIT</span>
                <span className="font-extrabold text-indigo-600 text-sm">
                  {Math.max(0, (currentUser?.rating || 2148) - 24)} LP
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={handleCancelExit}
                className="py-2.5 px-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-mono text-xs font-bold uppercase transition-all shadow-2xs cursor-pointer"
              >
                RESUME MATCH
              </button>
              <button
                onClick={handleConfirmExit}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white font-mono text-xs font-bold uppercase transition-all shadow-md shadow-rose-600/25 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">logout</span>
                <span>FORFEIT (-24 LP)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FORFEIT PENALTY TOAST (Auto-dismisses in 4.5s) */}
      {forfeitNotice && (
        <div className="fixed top-16 right-6 z-50 bg-slate-900/95 text-white font-mono text-xs p-3.5 rounded-xl shadow-2xl border border-rose-500/60 flex flex-col gap-2 max-w-sm backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-rose-400 shrink-0">trending_down</span>
              <span className="font-sans font-medium text-slate-100 leading-snug">{forfeitNotice}</span>
            </div>
            <button
              onClick={() => setForfeitNotice(null)}
              className="text-slate-400 hover:text-white transition-colors p-0.5 rounded cursor-pointer"
              title="Dismiss"
              aria-label="Dismiss notice"
            >
              <span className="material-symbols-outlined text-sm leading-none">close</span>
            </button>
          </div>
          <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
            <div
              className="bg-rose-500 h-full rounded-full"
              style={{ width: '100%', animation: 'shrinkWidth 4.5s linear forwards' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
