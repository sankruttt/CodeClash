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
import {
  authAPI,
  problemAPI,
  matchmakingAPI,
  matchAPI,
  roomAPI,
  getAuthToken,
  setAuthToken,
  clearAuthToken,
} from './services/api';
import { getTierDetails } from './utils/tierUtils';

function getInitialUser() {
  const token = localStorage.getItem('codeclash_token') || sessionStorage.getItem('codeclash_token');
  if (!token) {
    sessionStorage.removeItem('codeclash_user');
    return null;
  }
  const saved = sessionStorage.getItem('codeclash_user');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (!parsed || !parsed.id || String(parsed.id).startsWith('user_')) {
        sessionStorage.removeItem('codeclash_user');
        return null;
      }
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
  const [queueConfig, setQueueConfig] = useState({ questionCount: 1, duration: 10 });
  const [activeMatch, setActiveMatch] = useState(() => {
    try {
      const stored = sessionStorage.getItem('codeclash_active_match');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [matchFoundModal, setMatchFoundModal] = useState(null);
  const [arenaLockedNotice, setArenaLockedNotice] = useState(null);
  const [confirmExitModal, setConfirmExitModal] = useState(false);
  const [pendingNavigationRoute, setPendingNavigationRoute] = useState(null);
  const [forfeitNotice, setForfeitNotice] = useState(null);

  const isMatchInProgress = useCallback((matchObj) => {
    if (!matchObj) return false;
    if (matchObj.status === 'completed' || matchObj.status === 'COMPLETED' || matchObj.isCompleted) return false;
    if (matchObj.status === 'abandoned' || matchObj.status === 'ABANDONED' || matchObj.isAbandoned) return false;
    return true;
  }, []);

  const getStoredActiveMatch = useCallback(() => {
    try {
      const raw = sessionStorage.getItem('codeclash_active_match');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const navigate = useCallback((newRoute) => {
    const storedMatch = getStoredActiveMatch();
    const matchOngoing = isMatchInProgress(activeMatch) && isMatchInProgress(storedMatch);

    if (route === 'arena' && matchOngoing && newRoute !== 'arena') {
      setPendingNavigationRoute(newRoute);
      setConfirmExitModal(true);
      return;
    }

    if (route === 'arena' && newRoute !== 'arena') {
      sessionStorage.removeItem('codeclash_active_match');
      setActiveMatch(null);
      setConfirmExitModal(false);
      setPendingNavigationRoute(null);
    }

    window.location.hash = newRoute;
  }, [route, activeMatch, isMatchInProgress, getStoredActiveMatch]);

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
        const storedMatch = getStoredActiveMatch();
        const matchOngoing = isMatchInProgress(activeMatch) && isMatchInProgress(storedMatch);

        if (route === 'arena' && matchOngoing && hash !== 'arena') {
          window.location.hash = 'arena';
          setPendingNavigationRoute(hash || 'dashboard');
          setConfirmExitModal(true);
          return;
        }

        if (route === 'arena' && hash !== 'arena') {
          sessionStorage.removeItem('codeclash_active_match');
          setActiveMatch(null);
          setConfirmExitModal(false);
          setPendingNavigationRoute(null);
        }

        setRoute(hash || 'dashboard');
      }
      window.scrollTo(0, 0);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [route, activeMatch, isMatchInProgress, getStoredActiveMatch]);

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

  // Rehydrate authenticated session from MongoDB on initial mount or refresh
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setCurrentUser(null);
      sessionStorage.removeItem('codeclash_user');
      return;
    }

    authAPI.getMe()
      .then((res) => {
        if (res?.data?.user) {
          const u = res.data.user;
          const tierDetails = getTierDetails(u.rating || 1500, u.tier);
          const combatant = {
            id: u._id || u.id,
            name: u.name || u.username,
            username: u.username,
            handle: `@${u.username}`,
            avatar: u.avatar || (u.username ? u.username.slice(0, 2).toUpperCase() : 'KV'),
            color: u.color || 'indigo',
            rating: u.rating || 1500,
            tier: tierDetails.currentTier,
            wins: u.wins || 0,
            losses: u.losses || 0,
            streak: Math.max(0, u.streak || 0),
            longestStreak: Math.max(0, u.longestStreak || u.bestStreak || u.streak || 0),
            todayCompleted: u.todayCompleted || false,
            lastActivityDate: u.lastActivityDate || null,
            activityHistory: u.activityHistory || [],
            weeklyIndicators: u.weeklyIndicators || null,
            primaryStack: u.primaryStack || u.stack || 'Python',
            stack: u.primaryStack || u.stack || 'Python',
            email: u.email,
          };
          setCurrentUser(combatant);
          sessionStorage.setItem('codeclash_user', JSON.stringify(combatant));
        }
      })
      .catch((err) => {
        console.warn('Session expired or invalid:', err.message);
        clearAuthToken();
        sessionStorage.removeItem('codeclash_user');
        setCurrentUser(null);
      });
  }, []);

  // Queue simulation with real backend problem selection
  const handleToggleQueue = async (cfg = {}) => {
    if (queueing) {
      setQueueing(false);
      try {
        await matchmakingAPI.leaveQueue();
      } catch (err) {
        console.warn('Failed to leave matchmaking queue:', err.message);
      }
    } else {
      const qCount = [1, 2, 3].includes(Number(cfg?.questionCount)) ? Number(cfg.questionCount) : 1;
      const dur = [5, 10, 15].includes(Number(cfg?.duration)) ? Number(cfg.duration) : 10;
      const nextConfig = { questionCount: qCount, duration: dur };
      setQueueConfig(nextConfig);
      setQueueing(true);
      try {
        await matchmakingAPI.joinQueue(nextConfig);
      } catch (err) {
        console.warn('Failed to join matchmaking queue:', err.message);
      }
    }
  };

  useEffect(() => {
    if (!queueing) return;
    let isCancelled = false;

    const timer = setTimeout(async () => {
      try {
        const qCount = queueConfig?.questionCount || 1;
        const durMinutes = queueConfig?.duration || 10;
        const durSeconds = durMinutes * 60;
        const probRes = await problemAPI.getRandomProblems(qCount);
        const problems = Array.isArray(probRes?.data?.problems)
          ? probRes.data.problems
          : Array.isArray(probRes?.data)
          ? probRes.data
          : probRes?.data?.problem
          ? [probRes.data.problem]
          : [];
        const primaryProblem = problems[0] || null;
        const probTitle = primaryProblem?.title || 'Algorithmic Duel';

        if (!isCancelled) {
          setQueueing(false);
          matchmakingAPI.leaveQueue().catch(() => null);
          setMatchFoundModal({
            opponent: 'v0_Sniper',
            opponentRating: 2395,
            opponentAvatar: 'VS',
            type: '1v1 Ranked Duel',
            problem: probTitle,
            problemData: primaryProblem,
            problems: problems,
            questionCount: qCount,
            duration: durSeconds,
            countdown: 3,
          });
        }
      } catch (err) {
        if (!isCancelled) {
          setQueueing(false);
          matchmakingAPI.leaveQueue().catch(() => null);
          setMatchFoundModal({
            opponent: 'v0_Sniper',
            opponentRating: 2395,
            opponentAvatar: 'VS',
            type: '1v1 Ranked Duel',
            problem: 'Binary Search',
            problems: [],
            questionCount: queueConfig?.questionCount || 1,
            duration: (queueConfig?.duration || 10) * 60,
            countdown: 3,
          });
        }
      }
    }, 2800);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [queueing, queueConfig]);

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
      const cd = setTimeout(async () => {
        let createdMatchId = null;
        const generatedRoomCode = 'RK-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        const durationSec = matchFoundModal.duration || 600;
        const qCount = matchFoundModal.questionCount || matchFoundModal.problems?.length || 1;
        const problemList = matchFoundModal.problems && matchFoundModal.problems.length > 0
          ? matchFoundModal.problems
          : (matchFoundModal.problemData ? [matchFoundModal.problemData] : []);
        const questionIds = problemList.map((p) => p._id || p);

        try {
          const createRes = await matchAPI.createMatch({
            roomCode: generatedRoomCode,
            type: 'ranked',
            duration: durationSec,
            questionCount: qCount,
            timeLimit: `${Math.floor(durationSec / 60) < 10 ? '0' : ''}${Math.floor(durationSec / 60)}:00`,
            player1: {
              userId: currentUser?.id,
              username: currentUser?.name || currentUser?.username || 'You',
              ratingBefore: currentUser?.rating || 1500,
            },
            player2: {
              userId: null,
              username: matchFoundModal.opponent || 'v0_Sniper',
              ratingBefore: matchFoundModal.opponentRating || 2395,
            },
            questions: questionIds,
          });
          const m = createRes?.data?.match || createRes?.match;
          if (m?._id) {
            createdMatchId = m._id.toString();
          }
        } catch (err) {
          console.warn('Backend match creation notice:', err.message);
        }

        const match = {
          id: createdMatchId || generatedRoomCode,
          matchId: createdMatchId,
          roomCode: generatedRoomCode,
          type: matchFoundModal.type || '1v1 Ranked Duel',
          isRanked: true,
          opponent: matchFoundModal.opponent,
          opponentRating: matchFoundModal.opponentRating || 2395,
          opponentAvatar: matchFoundModal.opponentAvatar || 'VS',
          problem: problemList[0]?.title || matchFoundModal.problem,
          problemData: problemList[0] || matchFoundModal.problemData,
          problems: problemList,
          questionCount: qCount,
          duration: durationSec,
          startedAt: new Date().toISOString(),
        };
        sessionStorage.setItem('codeclash_active_match', JSON.stringify(match));
        setActiveMatch(match);
        setMatchFoundModal(null);
        window.location.hash = 'arena';
      }, 1000);
      return () => clearTimeout(cd);
    }
  }, [matchFoundModal]);

  // Start match from Private Room
  const handleStartPrivateBattle = (roomConfig) => {
    let durationSeconds = roomConfig?.duration;
    if (!durationSeconds && roomConfig?.timeLimit) {
      const parts = roomConfig.timeLimit.split(':').map(Number);
      durationSeconds = (parts[0] || 15) * 60 + (parts[1] || 0);
    }
    if (![300, 600, 900].includes(durationSeconds)) {
      durationSeconds = 600;
    }
    const problems = roomConfig?.questions || (roomConfig?.problemData ? [roomConfig.problemData] : []);
    const match = {
      id: roomConfig?.matchId || roomConfig?.roomCode || 'CD-8492',
      matchId: roomConfig?.matchId,
      roomCode: roomConfig?.roomCode,
      type: 'Private Scrimmage',
      isRanked: false,
      opponent: roomConfig?.opponent || 'v0_Sniper',
      opponentRating: roomConfig?.opponentRating || 2180,
      opponentAvatar: roomConfig?.opponentAvatar || 'VS',
      difficulty: roomConfig?.difficulty || 'Medium',
      timeLimit: roomConfig?.timeLimit || `${Math.floor(durationSeconds / 60) < 10 ? '0' : ''}${Math.floor(durationSeconds / 60)}:00`,
      duration: durationSeconds,
      startedAt: roomConfig?.startedAt || new Date().toISOString(),
      problem: problems[0]?.title || roomConfig?.problem || 'Binary Search',
      problemData: problems[0] || roomConfig?.problemData,
      problems: problems,
      questionCount: problems.length || 1,
    };
    sessionStorage.setItem('codeclash_active_match', JSON.stringify(match));
    setActiveMatch(match);
    navigate('arena');
  };

  // Clean exit without penalty or forfeit warning (used when match is finished, abandoned, or forfeited)
  const handleCleanExit = useCallback((destination = 'lobby') => {
    sessionStorage.removeItem('codeclash_active_match');
    setActiveMatch(null);
    setConfirmExitModal(false);
    setPendingNavigationRoute(null);
    setRoute(destination);
    window.location.hash = destination;
  }, []);

  // Refresh user data from MongoDB after match completion (LP update)
  const handleMatchComplete = useCallback(async () => {
    try {
      const res = await authAPI.getMe();
      if (res?.data?.user) {
        const u = res.data.user;
        const tierDetails = getTierDetails(u.rating || 1500, u.tier);
        const combatant = {
          id: u._id || u.id,
          name: u.name || u.username,
          username: u.username,
          handle: `@${u.username}`,
          avatar: u.avatar || (u.username ? u.username.slice(0, 2).toUpperCase() : 'KV'),
          color: u.color || 'indigo',
          rating: u.rating || 1500,
          rank: u.rank || 1,
          tier: tierDetails.currentTier,
          wins: u.wins || 0,
          losses: u.losses || 0,
          streak: Math.max(0, u.streak || 0),
          longestStreak: Math.max(0, u.longestStreak || u.bestStreak || u.streak || 0),
          todayCompleted: u.todayCompleted || false,
          lastActivityDate: u.lastActivityDate || null,
          activityHistory: u.activityHistory || [],
          weeklyIndicators: u.weeklyIndicators || null,
          primaryStack: u.primaryStack || u.stack || 'Python',
          stack: u.primaryStack || u.stack || 'Python',
          email: u.email,
        };
        setCurrentUser(combatant);
        sessionStorage.setItem('codeclash_user', JSON.stringify(combatant));
      }
    } catch (err) {
      console.warn('Failed to refresh user data after match completion:', err.message);
    }
  }, []);

  // Trigger exit confirmation modal
  const handleTriggerExitArena = () => {
    setPendingNavigationRoute('lobby');
    setConfirmExitModal(true);
  };

  // Confirm exit: Notify backend MongoDB of abandonment, deduct penalty, and exit match
  const handleConfirmExit = async () => {
    const roomCode = activeMatch?.roomCode;
    const matchId = activeMatch?.matchId || activeMatch?.id;
    const playerId = currentUser?.id || 'player';

    try {
      await Promise.allSettled([
        roomCode ? roomAPI.abandonRoom(roomCode, playerId) : Promise.resolve(),
        matchId
          ? matchAPI.abandonMatch(matchId, playerId, {
              problemTitle: activeMatch?.problem || activeMatch?.problemData?.title,
              difficulty: activeMatch?.difficulty || activeMatch?.problemData?.difficulty || 'Medium',
            })
          : Promise.resolve(),
        matchmakingAPI.leaveQueue().catch(() => null),
      ]);

      const res = await authAPI.getMe().catch(() => null);
      if (res?.data?.user) {
        const u = res.data.user;
        const tierDetails = getTierDetails(u.rating || 1500, u.tier);
        const combatant = {
          id: u._id || u.id,
          name: u.username || u.name,
          handle: `@${u.username}`,
          avatar: u.avatar || (u.username ? u.username.slice(0, 2).toUpperCase() : 'KV'),
          color: u.color || 'indigo',
          rating: u.rating || 1500,
          rank: u.rank || 1,
          tier: tierDetails.currentTier,
          wins: u.wins || 0,
          losses: u.losses || 0,
          streak: Math.max(0, u.streak || 0),
          longestStreak: Math.max(0, u.longestStreak || u.bestStreak || u.streak || 0),
          todayCompleted: u.todayCompleted || false,
          lastActivityDate: u.lastActivityDate || null,
          activityHistory: u.activityHistory || [],
          weeklyIndicators: u.weeklyIndicators || null,
          primaryStack: u.primaryStack || u.stack || 'Python',
          stack: u.primaryStack || u.stack || 'Python',
          email: u.email,
        };
        setCurrentUser(combatant);
        sessionStorage.setItem('codeclash_user', JSON.stringify(combatant));
      }
    } catch (err) {
      console.warn('Abandonment report notice:', err);
    }

    sessionStorage.removeItem('codeclash_active_match');
    setActiveMatch(null);
    setConfirmExitModal(false);
    const destination = pendingNavigationRoute || 'lobby';
    setPendingNavigationRoute(null);
    setRoute(destination);
    window.location.hash = destination;
    setForfeitNotice('Match Abandoned (-24 LP)');
  };

  const handleCancelExit = () => {
    setConfirmExitModal(false);
    setPendingNavigationRoute(null);
  };

  const handleLoginSuccess = ({ user, token }) => {
    if (token) setAuthToken(token);
    const u = user || {};
    const tierDetails = getTierDetails(u.rating || 1500, u.tier);
    const combatant = {
      id: u._id || u.id,
      name: u.username || u.name || 'Combatant',
      handle: `@${u.username || 'combatant'}`,
      avatar: u.avatar || (u.username ? u.username.slice(0, 2).toUpperCase() : 'KV'),
      color: u.color || 'indigo',
      rating: u.rating || 1500,
      tier: tierDetails.currentTier,
      wins: u.wins || 0,
      losses: u.losses || 0,
      streak: Math.max(0, u.streak || 0),
      primaryStack: u.primaryStack || u.stack || 'Python',
      stack: u.primaryStack || u.stack || 'Python',
      email: u.email,
    };
    setCurrentUser(combatant);
    sessionStorage.setItem('codeclash_user', JSON.stringify(combatant));
    navigate('dashboard');
  };

  const handleSignUpSuccess = ({ user, token, name, handle, email, avatar }) => {
    if (token) setAuthToken(token);
    const u = user || {};
    const tierDetails = getTierDetails(u.rating || 1500, u.tier);
    const combatant = {
      id: u._id || u.id,
      name: name || u.username || 'Combatant',
      handle: handle || `@${u.username || 'combatant'}`,
      avatar: avatar || u.avatar || 'CC',
      color: u.color || 'indigo',
      rating: u.rating || 1500,
      tier: tierDetails.currentTier,
      wins: u.wins || 0,
      losses: u.losses || 0,
      streak: Math.max(0, u.streak || 0),
      primaryStack: u.primaryStack || u.stack || 'Python',
      stack: u.primaryStack || u.stack || 'Python',
      email: email || u.email,
    };
    setCurrentUser(combatant);
    sessionStorage.setItem('codeclash_user', JSON.stringify(combatant));
    navigate('dashboard');
  };

  const handleUpdateUser = useCallback((updatedUserData, newToken) => {
    if (newToken) {
      setAuthToken(newToken);
    }
    setCurrentUser((prev) => {
      const tierDetails = getTierDetails(updatedUserData?.rating || prev?.rating || 1500, updatedUserData?.tier || prev?.tier);
      const name = updatedUserData?.name || prev?.name || updatedUserData?.username || prev?.username;
      const username = updatedUserData?.username || prev?.username;
      const merged = {
        ...prev,
        ...updatedUserData,
        id: updatedUserData?.id || updatedUserData?._id || prev?.id,
        name,
        username,
        handle: username ? `@${username}` : prev?.handle,
        avatar: updatedUserData?.avatar || (name || username ? (name || username).slice(0, 2).toUpperCase() : prev?.avatar || 'KV'),
        tier: tierDetails.currentTier,
      };
      sessionStorage.setItem('codeclash_user', JSON.stringify(merged));
      return merged;
    });
  }, []);

  const handleLogout = () => {
    clearAuthToken();
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
            onCleanExit={handleCleanExit}
            onTriggerForfeit={handleTriggerExitArena}
            onForfeit={handleConfirmExit}
            onMatchComplete={handleMatchComplete}
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
            currentUser={currentUser}
          />
        )}

        {route === 'profile' && (
          <ProfileView
            navigate={navigate}
            currentUser={currentUser}
            onUpdateUser={handleUpdateUser}
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
                <span className="font-mono text-[11px] text-sky-600">{(currentUser?.rating || 1500).toLocaleString()} LP</span>
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
                <span className="font-mono text-[11px] text-slate-500">{(matchFoundModal.opponentRating || 1500).toLocaleString()} LP</span>
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
