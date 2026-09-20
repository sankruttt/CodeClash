import React, { useState, useEffect, useCallback } from 'react';
import { compilerAPI, problemAPI, matchAPI, roomAPI, authAPI } from '../services/api';
import { SCORING } from '../config/scoring';
import MatchCompleteModal from '../components/MatchCompleteModal';
import MatchAbandonedModal from '../components/MatchAbandonedModal';

import {
  normalizeStackToDropdown,
  getStarterCodeKey,
  normalizeCodeFormat,
  getStarterCodeForProblemAndLang,
} from '../utils/compilerHelpers';

const parseDurationSeconds = (val) => {
  if (typeof val === 'number' && val > 0) {
    if ([5, 10, 15].includes(val)) return val * 60;
    return val;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.includes(':')) {
      const parts = trimmed.split(':').map(Number);
      if (parts.length === 2 && !isNaN(parts[0])) {
        return parts[0] * 60 + (parts[1] || 0);
      }
    }
    const parsed = parseInt(trimmed, 10);
    if (!isNaN(parsed) && parsed > 0) {
      if ([5, 10, 15].includes(parsed)) return parsed * 60;
      return parsed;
    }
  }
  return 10 * 60;
};

export default function ArenaView({ navigate, currentUser, activeMatch, onCleanExit, onTriggerForfeit, onForfeit, onMatchComplete, onMatchCompleteVisible }) {
  const initialProblems = Array.isArray(activeMatch?.problems) && activeMatch.problems.length > 0
    ? activeMatch.problems
    : activeMatch?.problemData
      ? [activeMatch.problemData]
      : [];

  const [problems, setProblems] = useState(initialProblems);
  const [activeProblemIndex, setActiveProblemIndex] = useState(0);
  const [solvedProblemIds, setSolvedProblemIds] = useState(new Set());

  const problem = problems[activeProblemIndex] || null;
  const activeProblemId = problem?._id ? String(problem._id) : (problem?.id ? String(problem.id) : `prob_${activeProblemIndex}`);

  // Default compiler language based on the Primary Stack from backend/user profile
  const [hasUserExplicitlySelectedLang, setHasUserExplicitlySelectedLang] = useState(false);
  const initialLanguage = normalizeStackToDropdown(currentUser?.primaryStack || currentUser?.stack);
  const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage);

  // Sync selectedLanguage if authoritative user profile loads or changes and user hasn't explicitly overridden it
  useEffect(() => {
    if (!hasUserExplicitlySelectedLang) {
      if (currentUser?.primaryStack || currentUser?.stack) {
        setSelectedLanguage(normalizeStackToDropdown(currentUser.primaryStack || currentUser.stack));
      } else {
        authAPI.getMe().then((res) => {
          const u = res?.data?.user || res?.user;
          if (u?.primaryStack || u?.stack) {
            setSelectedLanguage(normalizeStackToDropdown(u.primaryStack || u.stack));
          }
        }).catch(() => null);
      }
    }
  }, [currentUser?.primaryStack, currentUser?.stack, hasUserExplicitlySelectedLang]);

  // Map of [problemId::canonicalLang] -> user edited or loaded code
  const [codeByProblemAndLang, setCodeByProblemAndLang] = useState({});

  const canonicalLang = getStarterCodeKey(selectedLanguage);
  const codeKey = `${activeProblemId}::${canonicalLang}`;
  const currentStarterCode = getStarterCodeForProblemAndLang(problem, selectedLanguage);

  const code = codeByProblemAndLang[codeKey] !== undefined
    ? codeByProblemAndLang[codeKey]
    : currentStarterCode;

  const setCode = (newCode) => {
    setCodeByProblemAndLang((prev) => ({
      ...prev,
      [codeKey]: newCode
    }));
  };

  const [activeCaseIndex, setActiveCaseIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalMatchSeconds = parseDurationSeconds(activeMatch?.duration || activeMatch?.timeLimit || '10:00');
  const [timeLeft, setTimeLeft] = useState(() => {
    if (activeMatch?.startedAt) {
      const elapsed = Math.floor((Date.now() - new Date(activeMatch.startedAt).getTime()) / 1000);
      if (elapsed >= 0 && elapsed < totalMatchSeconds) {
        return totalMatchSeconds - elapsed;
      }
    }
    return totalMatchSeconds;
  });

  const [currentTab, setCurrentTab] = useState('spec'); // 'spec' | 'submissions'
  const [showNotification, setShowNotification] = useState(null);
  const [executionResult, setExecutionResult] = useState(null);
  const [pastSubmissions, setPastSubmissions] = useState([]);
  const [isAbandoned, setIsAbandoned] = useState(false);

  // Match completion and finalization state
  const [isCompleted, setIsCompleted] = useState(false);
  const [matchResult, setMatchResult] = useState(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [hasSolved, setHasSolved] = useState(false);
  const [solveTime, setSolveTime] = useState(null);
  const [opponentSolved, setOpponentSolved] = useState(false);
  const [opponentSolveTime, setOpponentSolveTime] = useState(null);

  // Fetch problems if not present in activeMatch or unpopulated
  useEffect(() => {
    let isMounted = true;
    const needsFetch = !problems || problems.length === 0 || typeof problems[0] === 'string' || !problems[0]?.starterCode;
    if (needsFetch) {
      const matchId = activeMatch?.matchId || activeMatch?.id;
      if (matchId) {
        matchAPI.getMatch(matchId)
          .then((res) => {
            if (!isMounted) return null;
            const m = res?.data?.match || res?.match;
            if (Array.isArray(m?.problems) && m.problems.length > 0 && typeof m.problems[0] === 'object' && m.problems[0]?.starterCode) {
              return m.problems;
            }
            const count = activeMatch?.questionCount || 1;
            const diff = activeMatch?.difficulty || '';
            return problemAPI.getRandomProblems(count, diff).then((r) => r?.data?.problems || r?.data || []);
          })
          .then((list) => {
            if (!isMounted || !list || list.length === 0) return;
            setProblems(list);
          })
          .catch((err) => console.warn('Problem fetch notice:', err));
      } else {
        const count = activeMatch?.questionCount || 1;
        const diff = activeMatch?.difficulty || '';
        problemAPI.getRandomProblems(count, diff)
          .then((res) => {
            if (!isMounted) return;
            const list = Array.isArray(res?.data?.problems)
              ? res.data.problems
              : Array.isArray(res?.data)
                ? res.data
                : [];
            if (list.length > 0) {
              setProblems(list);
            }
          })
          .catch((err) => console.warn('Problem fetch notice:', err));
      }
    }
    return () => { isMounted = false; };
  }, [activeMatch, problems]);

  // Countdown timer based on server duration
  useEffect(() => {
    if (isAbandoned || isCompleted) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isAbandoned, isCompleted]);

  // Authoritative backend finalization triggered when timer reaches 00:00
  const handleFinalizeMatch = useCallback(async () => {
    if (isCompleted || isFinalizing) return;
    setIsFinalizing(true);
    const matchId = activeMatch?.matchId || activeMatch?.id || activeMatch?.roomCode;
    try {
      if (matchId) {
        const res = await matchAPI.completeMatch(matchId).catch(() => null);
        const completedData = res?.data?.match || res?.match || res?.data;
        if (completedData) {
          setMatchResult(completedData);
          setIsCompleted(true);
          authAPI.getMe().catch(() => null);
          return;
        }
      }
      const mRes = await matchAPI.getMatch(matchId).catch(() => null);
      const m = mRes?.data?.match || mRes?.match || mRes;
      if (m) {
        setMatchResult(m);
        setIsCompleted(true);
        authAPI.getMe().catch(() => null);
      }
    } catch (err) {
      console.warn('Finalization notice:', err?.message || err);
    } finally {
      setIsFinalizing(false);
    }
  }, [activeMatch, isCompleted, isFinalizing]);

  useEffect(() => {
    if (timeLeft === 0 && !isCompleted && !isAbandoned) {
      handleFinalizeMatch();
    }
  }, [timeLeft, isCompleted, isAbandoned, handleFinalizeMatch]);

  // Refresh user data from MongoDB after match completion so LP is up-to-date everywhere
  useEffect(() => {
    if (isCompleted && onMatchComplete) {
      onMatchComplete();
    }
  }, [isCompleted, onMatchComplete]);

  // Hide the bottom dock while any authoritative result/abandonment modal is displayed
  useEffect(() => {
    if (onMatchCompleteVisible) {
      onMatchCompleteVisible((isCompleted && Boolean(matchResult)) || (isAbandoned && !isCompleted));
    }
    return () => {
      if (onMatchCompleteVisible) onMatchCompleteVisible(false);
    };
  }, [isCompleted, matchResult, isAbandoned, onMatchCompleteVisible]);

  // Real-time polling for opponent progress, match completion, and abandonment
  useEffect(() => {
    if (isCompleted || isAbandoned) return;
    const roomCode = activeMatch?.roomCode;
    const matchId = activeMatch?.matchId || activeMatch?.id;

    if (!roomCode && !matchId) return;

    let isMounted = true;

    const checkStatus = async () => {
      try {
        const targetId = matchId || roomCode;
        if (targetId) {
          const mRes = await matchAPI.getMatch(targetId).catch(() => null);
          const m = mRes?.data?.match || mRes?.match;
          if (m && isMounted) {
            if (m.status === 'COMPLETED') {
              setMatchResult(m);
              setIsCompleted(true);
              setIsAbandoned(false);
              const stored = sessionStorage.getItem('codeclash_active_match');
              if (stored) {
                try {
                  const parsed = JSON.parse(stored);
                  sessionStorage.setItem('codeclash_active_match', JSON.stringify({ ...parsed, status: 'completed', isCompleted: true }));
                } catch { }
              }
              authAPI.getMe().catch(() => null);
              return;
            }
            if (m.status === 'ABANDONED' || m.abandonedBy) {
              // Store authoritative abandoned match data so the result card can
              // render the real reward / abandoned-by / disconnect-time from DB.
              setMatchResult(m);
              setIsAbandoned(true);
              const stored = sessionStorage.getItem('codeclash_active_match');
              if (stored) {
                try {
                  const parsed = JSON.parse(stored);
                  sessionStorage.setItem('codeclash_active_match', JSON.stringify({ ...parsed, status: 'abandoned', isAbandoned: true }));
                } catch { }
              }
              return;
            }

            if (Array.isArray(m.players)) {
              // Current player
              const pMe = m.players.find(
                (p) => (currentUser?.id && String(p.userId) === String(currentUser.id)) ||
                  (currentUser?.username && p.username === currentUser.username)
              );
              if (pMe && pMe.problemsSolved > 0) {
                setHasSolved(true);
                if (pMe.completionTime || pMe.totalTime) {
                  setSolveTime(pMe.completionTime || pMe.totalTime);
                }
              }

              // Opponent
              const pOpp = m.players.find(
                (p) => (!currentUser?.id || String(p.userId) !== String(currentUser.id)) &&
                  (!currentUser?.username || p.username !== currentUser.username)
              );
              if (pOpp && pOpp.problemsSolved > 0) {
                setOpponentSolved(true);
                if (pOpp.completionTime || pOpp.totalTime) {
                  setOpponentSolveTime(pOpp.completionTime || pOpp.totalTime);
                }
              }
            }
          }
        }

        const isPrivateRoom = Boolean(
          (activeMatch?.isPrivate ||
            activeMatch?.type === 'scrimmage' ||
            activeMatch?.type === 'private' ||
            activeMatch?.type === 'Private Scrimmage') &&
          !String(roomCode || '').startsWith('RK-')
        );

        if (roomCode && isPrivateRoom) {
          const res = await roomAPI.getRoom(roomCode).catch(() => null);
          const room = res?.data?.room || res?.data || res;
          if ((room?.status === 'abandoned' || room?.abandonedBy) && isMounted) {
            // Best-effort: pull the authoritative abandoned match record for the result card
            matchAPI.getMatch(targetId).then((mRes) => {
              const mm = mRes?.data?.match || mRes?.match;
              if (mm && isMounted) setMatchResult(mm);
            }).catch(() => null);
            setIsAbandoned(true);
            const stored = sessionStorage.getItem('codeclash_active_match');
            if (stored) {
              try {
                const parsed = JSON.parse(stored);
                sessionStorage.setItem('codeclash_active_match', JSON.stringify({ ...parsed, status: 'abandoned', isAbandoned: true }));
              } catch { }
            }
            return;
          }
        }
      } catch (err) {
        // silent polling catch
      }
    };

    const interval = setInterval(checkStatus, 1500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeMatch, currentUser, isCompleted, isAbandoned]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleLanguageChange = (newLang) => {
    const normalizedNewLang = normalizeStackToDropdown(newLang);
    setHasUserExplicitlySelectedLang(true);
    setSelectedLanguage(normalizedNewLang);

    // Immediately load the starter code for the new language for current problem
    const newCanonical = getStarterCodeKey(normalizedNewLang);
    const newKey = `${activeProblemId}::${newCanonical}`;
    const starter = getStarterCodeForProblemAndLang(problem, normalizedNewLang);
    setCodeByProblemAndLang((prev) => ({
      ...prev,
      [newKey]: starter
    }));
  };

  const handleResetCode = () => {
    const starter = getStarterCodeForProblemAndLang(problem, selectedLanguage);
    setCodeByProblemAndLang((prev) => ({
      ...prev,
      [codeKey]: starter
    }));
  };

  const getNormalizedLang = () => {
    return getStarterCodeKey(selectedLanguage);
  };

  // Run code against OnlineCompiler.io
  const handleRunTests = async () => {
    if (isAbandoned || isRunning) return;
    setIsRunning(true);
    setExecutionResult(null);
    try {
      const lang = getNormalizedLang();
      const testCases = problem?.examples || problem?.testCases || [];
      const res = await compilerAPI.runCode(code, lang, '', testCases);
      const data = res?.data || res;
      setExecutionResult(data);
      setActiveCaseIndex(0);

      const isPass = data.status === 'Accepted';
      const passedCount = data.passedTests ?? (isPass ? (data.testResults?.length || 1) : 0);
      const totalCount = data.totalTests ?? (data.testResults?.length || testCases.length || 1);

      // Record test run in pastSubmissions as TEST RUN so it appears in Submissions tab
      setPastSubmissions((prev) => [
        {
          id: 'run_' + Date.now(),
          type: 'RUN',
          time: new Date().toLocaleTimeString(),
          status: data.status || (isPass ? 'Accepted' : 'Failed'),
          executionTime: data.executionTime || 50,
          passedTests: passedCount,
          totalTests: totalCount,
        },
        ...prev,
      ]);

      setShowNotification(
        isPass
          ? `✓ Code execution passed: ${passedCount}/${totalCount} tests passed (${data.executionTime || 50}ms)!`
          : `Execution: ${data.status} (${passedCount}/${totalCount} passed). Check results panel.`
      );
      setTimeout(() => setShowNotification(null), 4000);
    } catch (err) {
      setShowNotification(`Execution error: ${err.message}`);
      setTimeout(() => setShowNotification(null), 4000);
    } finally {
      setIsRunning(false);
    }
  };

  // Submit code to backend and record in MongoDB
  const handleCustomSubmit = async () => {
    if (isAbandoned || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const matchId = activeMatch?.matchId || activeMatch?.id || activeMatch?.roomCode || 'match_adhoc';
      const problemId = problem?._id || problem?.id || '6a9bec6232c0d06705daedd5';
      const lang = getNormalizedLang();

      const res = await compilerAPI.submitCode(matchId, problemId, code, lang, currentUser?.id);
      const rawData = res?.data || res;
      const sub = rawData?.submission || rawData;

      const executionData = {
        status: sub?.status || rawData?.status || 'Accepted',
        executionTime: sub?.executionTime ?? rawData?.executionTime ?? 50,
        passedTests: sub?.passedTests ?? rawData?.passedTests ?? 1,
        totalTests: sub?.totalTests ?? rawData?.totalTests ?? 1,
        testResults: sub?.testResults || rawData?.testResults || [],
        output: sub?.output || rawData?.output || '',
        error: sub?.errorMessage || sub?.error || rawData?.error || null,
      };

      setExecutionResult(executionData);
      setActiveCaseIndex(0);

      setPastSubmissions((prev) => [
        {
          id: sub?.id || sub?._id || 'sub_' + Date.now(),
          type: 'SUBMISSION',
          time: new Date().toLocaleTimeString(),
          status: executionData.status,
          executionTime: executionData.executionTime,
          passedTests: executionData.passedTests,
          totalTests: executionData.totalTests,
          problemTitle: problem?.title || `Question ${activeProblemIndex + 1}`,
        },
        ...prev,
      ]);

      if (executionData.status === 'Accepted' && executionData.passedTests === executionData.totalTests) {
        const timeTaken = Math.max(1, totalMatchSeconds - timeLeft);
        const nextSolved = new Set(solvedProblemIds);
        nextSolved.add(activeProblemId);
        setSolvedProblemIds(nextSolved);

        const totalAssignedQuestions = activeMatch?.questionCount || problems.length || 1;
        const isRanked = activeMatch?.isRanked ?? (activeMatch?.type !== 'Private Scrimmage');

        if (isRanked) {
          if (nextSolved.size >= totalAssignedQuestions) {
            // RANKED: ALL QUESTIONS SOLVED -> MATCH ENDS IMMEDIATELY!
            setHasSolved(true);
            setSolveTime(timeTaken);
            setShowNotification(`✓ Solution Accepted! All questions solved. Match complete!`);
            setTimeout(() => setShowNotification(null), 3000);

            try {
              const compRes = await matchAPI.completeMatch(matchId).catch(() => null);
              const m = compRes?.data?.match || compRes?.match || rawData?.matchProgress?.match;
              if (m) {
                setMatchResult(m);
                setIsCompleted(true);
                authAPI.getMe().catch(() => null);
                return;
              }
              const mRes = await matchAPI.getMatch(matchId).catch(() => null);
              const m2 = mRes?.data?.match || mRes?.match;
              if (m2) {
                setMatchResult(m2);
                setIsCompleted(true);
                authAPI.getMe().catch(() => null);
                return;
              }
            } catch (err) {
              console.warn('Ranked instant completion notice:', err);
            }
          } else {
            // RANKED: More questions remain
            setShowNotification(`✓ Q${activeProblemIndex + 1} Accepted (${nextSolved.size}/${totalAssignedQuestions} completed)! Switching to next question...`);
            const nextUnsolved = problems.findIndex((p, idx) => !nextSolved.has(p._id || p.id || `prob_${idx}`));
            if (nextUnsolved !== -1) {
              setActiveProblemIndex(nextUnsolved);
              setActiveCaseIndex(0);
              setExecutionResult(null);
            }
          }
        } else {
          // SCRIMMAGE: DO NOT END IMMEDIATELY!
          if (nextSolved.size >= totalAssignedQuestions) {
            setHasSolved(true);
            setSolveTime(timeTaken);
            setShowNotification(`✓ All questions solved! Finished in ${formatTimer(timeTaken)}. Waiting for opponent or timer...`);

            try {
              const checkRes = await matchAPI.getMatch(matchId).catch(() => null);
              const m = checkRes?.data?.match || checkRes?.match;
              if (m?.status === 'COMPLETED') {
                setMatchResult(m);
                setIsCompleted(true);
                authAPI.getMe().catch(() => null);
              }
            } catch (err) {
              // ignore
            }
          } else {
            setShowNotification(`✓ Q${activeProblemIndex + 1} Accepted (${nextSolved.size}/${totalAssignedQuestions} completed)!`);
            const nextUnsolved = problems.findIndex((p, idx) => !nextSolved.has(p._id || p.id || `prob_${idx}`));
            if (nextUnsolved !== -1) {
              setActiveProblemIndex(nextUnsolved);
              setActiveCaseIndex(0);
              setExecutionResult(null);
            }
          }
        }
      } else {
        setShowNotification(
          `Verdict: ${executionData.status} (${executionData.passedTests}/${executionData.totalTests} passed).`
        );
      }
      setTimeout(() => setShowNotification(null), 5000);
    } catch (err) {
      setShowNotification(`Submission note: ${err.message}`);
      setTimeout(() => setShowNotification(null), 4500);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForfeit = () => {
    if (isCompleted || isAbandoned) {
      if (onCleanExit) onCleanExit('lobby');
      else navigate('lobby');
      return;
    }
    if (onTriggerForfeit) {
      onTriggerForfeit();
    } else if (onForfeit) {
      onForfeit();
    }
  };

  const lineCount = code.split('\n').length;
  const lineNumbers = Array.from({ length: Math.max(lineCount, 25) }, (_, i) => i + 1);

  const defaultTestCases = (problem?.examples && problem.examples.length > 0)
    ? problem.examples.map((ex, idx) => ({
      testCaseId: `tc-${idx + 1}`,
      passed: true,
      input: ex.input,
      expectedOutput: ex.output,
      actualOutput: ex.output,
      error: null,
    }))
    : [
      {
        testCaseId: 'tc-1',
        passed: true,
        input: 'nums = [1, 2, 3], target = 2',
        expectedOutput: '1',
        actualOutput: '1',
        error: null,
      },
    ];

  const testCasesList =
    executionResult?.testResults && executionResult.testResults.length > 0
      ? executionResult.testResults
      : defaultTestCases;

  const activeTestCase = testCasesList[activeCaseIndex] || testCasesList[0];


  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-56px)] overflow-hidden min-w-0 pb-28 relative">
      {/* Match Abandoned Result Card — shown to the REMAINING player */}
      <MatchAbandonedModal
        isOpen={isAbandoned && !isCompleted}
        matchResult={matchResult}
        currentUser={currentUser}
        activeMatch={activeMatch}
        executionResult={executionResult}
        onCleanExit={onCleanExit}
        navigate={navigate}
      />

      {/* Authoritative Match Complete Result Modal */}
      <MatchCompleteModal
        isOpen={isCompleted && Boolean(matchResult)}
        matchResult={matchResult}
        currentUser={currentUser}
        activeMatch={activeMatch}
        problem={problem}
        executionResult={executionResult}
        hasSolved={hasSolved}
        solveTime={solveTime}
        opponentSolved={opponentSolved}
        opponentSolveTime={opponentSolveTime}
        formatTimer={formatTimer}
        onCleanExit={onCleanExit}
        navigate={navigate}
      />


      {/* Battle Match HUD Bar */}
      <div className="h-12 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-2xs">
        {/* Player 1 (You) */}
        <div className="flex items-center gap-3 min-w-[200px]">
          <div className="relative">
            <div className="w-7 h-7 rounded bg-gradient-to-tr from-indigo-600 to-sky-400 text-white font-mono font-bold flex items-center justify-center text-xs shadow-xs">
              {currentUser?.avatar || 'KV'}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white"></span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className="font-semibold text-slate-900">{currentUser?.name || 'You'}</span>
              <span className="px-1 py-0.2 rounded text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono font-medium">
                {currentUser?.tier || 'GM'}
              </span>
              <span className="text-slate-400 text-[10px]">{(currentUser?.rating || SCORING.defaultRating).toLocaleString()} LP</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 font-mono text-[10px]">
              {hasSolved ? (
                <span className="inline-flex items-center text-emerald-700 font-bold gap-1 px-1.5 py-0.2 rounded bg-emerald-50 border border-emerald-200">
                  <span className="material-symbols-outlined text-[12px]">check_circle</span>
                  SOLVED ({formatTimer(solveTime || 0)})
                </span>
              ) : (
                <span className="inline-flex items-center text-emerald-600 font-medium gap-0.5">
                  <span className="material-symbols-outlined text-[12px]">check</span> P1 (READY)
                </span>
              )}
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center text-indigo-600 gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span> ONLINE
              </span>
            </div>
          </div>
        </div>

        {/* Center Match Timer & Round State */}
        <div className="flex flex-col items-center justify-center">
          <div className="flex items-center gap-2 px-3 py-0.5 rounded bg-slate-50 border border-slate-200 shadow-2xs">
            <span className="material-symbols-outlined text-[14px] text-slate-400">schedule</span>
            <span id="arena-timer" className="font-mono text-[13px] font-semibold tracking-wider text-slate-900">
              {formatTimer(timeLeft)}
            </span>
            <span className="text-slate-300">|</span>
            <span id="arena-match-config" className="font-mono text-[10px] text-indigo-600 font-bold uppercase">
              {Math.floor(totalMatchSeconds / 60)}M • {activeMatch?.difficulty || 'MEDIUM'}
            </span>
            <span className="text-slate-300">|</span>
            <span className="font-mono text-[10px] text-slate-500 font-medium uppercase">
              {activeMatch?.type ? activeMatch.type.toUpperCase() : '1v1 DUEL'}
            </span>
            <button
              onClick={handleForfeit}
              className="ml-2 px-2 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 text-[10px] font-mono font-bold tracking-wider uppercase border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer"
              title="Forfeit & Exit Arena"
            >
              <span className="material-symbols-outlined text-[12px]">logout</span>
              <span>FORFEIT</span>
            </button>
          </div>
          <div className="w-40 sm:w-48 h-1 bg-slate-200 mt-1.5 rounded-full overflow-hidden flex">
            <div className="h-full bg-emerald-500 w-1/3" />
            <div className="h-full bg-indigo-600 w-[25%] opacity-80" />
            <div className="h-full bg-transparent flex-1" />
          </div>
        </div>

        {/* Player 2 (Opponent) */}
        <div className="flex items-center justify-end gap-3 min-w-[200px] text-right">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1.5 font-mono text-[11px] justify-end">
              <span className="text-slate-400 text-[10px]">{activeMatch?.opponentRating || SCORING.simulated.ranked} LP</span>
              <span className="px-1 py-0.2 rounded text-[9px] bg-sky-50 text-sky-700 border border-sky-200 font-mono font-medium">
                MASTER
              </span>
              <span className="font-semibold text-slate-900">{activeMatch?.opponent || 'v0_Sniper'}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 font-mono text-[10px] justify-end">
              {opponentSolved ? (
                <span className="inline-flex items-center text-emerald-700 font-bold gap-1 px-1.5 py-0.2 rounded bg-emerald-50 border border-emerald-200">
                  <span className="material-symbols-outlined text-[12px]">check_circle</span>
                  SOLVED ({formatTimer(opponentSolveTime || 0)})
                </span>
              ) : (
                <span className="inline-flex items-center text-sky-600 gap-1 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span> SOLVING...
                </span>
              )}
            </div>
          </div>
          <div className="relative">
            <div className="w-7 h-7 rounded bg-slate-800 text-white font-mono font-bold flex items-center justify-center text-xs shadow-xs">
              {activeMatch?.opponentAvatar || 'VS'}
            </div>
            <span className="absolute -bottom-0.5 -left-0.5 w-2 h-2 rounded-full bg-sky-500 ring-2 ring-white"></span>
          </div>
        </div>
      </div>

      {/* Real-time Battle Status Notice */}
      {hasSolved && !opponentSolved && !isCompleted && (
        <div className="h-8 bg-amber-50 border-b border-amber-200 px-4 sm:px-6 flex items-center justify-between text-[11px] font-mono text-amber-900 shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[14px] text-amber-600 animate-spin">hourglass_top</span>
            <span>
              <strong>✓ Solution Accepted ({formatTimer(solveTime || 0)})!</strong> Opponent is still solving. Match will finalize when opponent finishes or timer reaches 00:00.
            </span>
          </div>
          <span className="px-2 py-0.2 rounded bg-amber-100 text-amber-800 font-bold text-[10px] uppercase border border-amber-300">
            MATCH ACTIVE
          </span>
        </div>
      )}

      {isFinalizing && (
        <div className="h-8 bg-indigo-50 border-b border-indigo-200 px-4 sm:px-6 flex items-center justify-center text-[11px] font-mono text-indigo-900 gap-2 shrink-0">
          <span className="material-symbols-outlined text-[14px] text-indigo-600 animate-spin">sync</span>
          <span>Match timer reached 00:00. Finalizing authoritative match results...</span>
        </div>
      )}

      {/* 3-Column Surgical IDE Workspace */}
      <main className="flex-1 grid grid-cols-12 overflow-hidden bg-slate-100">
        {/* Column 1: Problem Spec (4 cols) */}
        <section className="col-span-12 lg:col-span-4 flex flex-col border-r border-slate-200/80 bg-white overflow-hidden h-full">
          {/* Multi-Question Selector Bar */}
          {problems.length > 1 && (
            <div className="h-10 bg-slate-50 border-b border-slate-200 px-3 flex items-center justify-between shrink-0 overflow-x-auto gap-2">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider pr-1 shrink-0">
                  Questions ({solvedProblemIds.size}/{problems.length}):
                </span>
                {problems.map((p, idx) => {
                  const pId = p?._id || p?.id || `prob_${idx}`;
                  const isSolved = solvedProblemIds.has(pId);
                  const isActive = activeProblemIndex === idx;
                  return (
                    <button
                      key={pId}
                      id={`question-tab-${idx + 1}`}
                      type="button"
                      onClick={() => {
                        setActiveProblemIndex(idx);
                        setActiveCaseIndex(0);
                        setExecutionResult(null);
                      }}
                      className={`px-2.5 py-1 rounded text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer border shrink-0 ${isActive
                          ? 'bg-white border-indigo-500 text-indigo-700 shadow-2xs'
                          : isSolved
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                    >
                      {isSolved ? (
                        <span className="material-symbols-outlined text-[13px] text-emerald-600">check_circle</span>
                      ) : (
                        <span className="text-[11px] font-bold">Q{idx + 1}</span>
                      )}
                      <span className="truncate max-w-[90px]">{p.title || `Q${idx + 1}`}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  id="prev-question-btn"
                  type="button"
                  disabled={activeProblemIndex <= 0}
                  onClick={() => {
                    if (activeProblemIndex > 0) {
                      setActiveProblemIndex(activeProblemIndex - 1);
                      setActiveCaseIndex(0);
                      setExecutionResult(null);
                    }
                  }}
                  className="px-2 py-0.5 rounded text-xs font-mono font-medium border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-0.5 cursor-pointer text-slate-700 shadow-2xs"
                  title="Previous Question"
                >
                  <span className="material-symbols-outlined text-[14px]">chevron_left</span>
                  <span>Prev</span>
                </button>
                <button
                  id="next-question-btn"
                  type="button"
                  disabled={activeProblemIndex >= problems.length - 1}
                  onClick={() => {
                    if (activeProblemIndex < problems.length - 1) {
                      setActiveProblemIndex(activeProblemIndex + 1);
                      setActiveCaseIndex(0);
                      setExecutionResult(null);
                    }
                  }}
                  className="px-2.5 py-0.5 rounded text-xs font-mono font-semibold border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-0.5 cursor-pointer shadow-2xs"
                  title="Next Question"
                >
                  <span>Next Question</span>
                  <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                </button>
              </div>
            </div>
          )}

          {/* Tab Bar */}
          <div className="h-9 bg-slate-50 border-b border-slate-200 px-2 flex items-center justify-between shrink-0 font-mono text-xs">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentTab('spec')}
                className={`px-2.5 py-1 rounded font-semibold border transition-all cursor-pointer ${currentTab === 'spec'
                  ? 'bg-white text-slate-900 border-slate-200 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 border-transparent'
                  }`}
              >
                Problem: {problem?.title || 'Binary Search'}
              </button>
              <button
                onClick={() => setCurrentTab('submissions')}
                className={`px-2 py-1 rounded transition-all cursor-pointer ${currentTab === 'submissions'
                  ? 'bg-white text-slate-900 border-slate-200 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                Submissions ({pastSubmissions.length})
              </button>
            </div>
            <span className="text-slate-400 text-[10px] font-mono pr-2">256MB LIMIT</span>
          </div>

          {/* Spec Body or Submissions Tab */}
          {currentTab === 'spec' ? (
            <div className="flex-1 overflow-y-auto p-4 pb-12 space-y-4 text-xs font-sans bg-white">
              {/* Title & Meta */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-sm font-semibold text-slate-900 tracking-tight font-mono">
                    {problem?.title || 'Binary Search'}
                  </h1>
                  <span
                    id="problem-difficulty-badge"
                    className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold uppercase ${
                      (problem?.difficulty || activeMatch?.difficulty)?.toUpperCase() === 'EASY'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : (problem?.difficulty || activeMatch?.difficulty)?.toUpperCase() === 'HARD'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {problem?.difficulty || activeMatch?.difficulty || 'MEDIUM'}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 ml-auto font-medium">
                    {problem?.points || 100} pts
                  </span>
                </div>
                <p className="font-mono text-[10px] text-slate-500">
                  Problem ID: #{problem?._id?.toString().slice(-6) || 'CC-01'} • Timeout: {problem?.timeLimit || 2}s
                </p>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 font-mono text-[10px]">
                {problem?.tags?.map((tag) => (
                  <span key={tag} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    {tag}
                  </span>
                )) || (
                    <>
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        Algorithms
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        Competitive Programming
                      </span>
                    </>
                  )}
              </div>

              {/* Description */}
              <div className="space-y-2 text-slate-700 leading-relaxed font-normal">
                <p>{problem?.description || 'Given an array of sorted integers and a target value, write a solution that runs in logarithmic time.'}</p>
              </div>

              {/* Examples */}
              <div className="space-y-3">
                {problem?.examples?.map((ex, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="font-mono text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                      Example {idx + 1}
                    </div>
                    <div className="p-2.5 rounded bg-slate-50 border border-slate-200 font-mono text-[11px] space-y-1">
                      <div className="text-slate-600">
                        <span className="text-slate-900 font-medium">Input:</span> {ex.input}
                      </div>
                      <div className="text-emerald-700 font-medium">
                        <span className="text-slate-900 font-medium">Output:</span> {ex.output}
                      </div>
                      {ex.explanation && (
                        <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-200">
                          Explanation: {ex.explanation}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Constraints */}
              {problem?.constraints && problem.constraints.length > 0 && (
                <div className="pt-2 border-t border-slate-200 space-y-1.5">
                  <div className="font-mono text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                    Constraints &amp; Invariants
                  </div>
                  <ul className="font-mono text-[11px] text-slate-600 space-y-1 list-inside list-disc">
                    {problem.constraints.map((c, i) => (
                      <li key={i}>
                        <code className="text-indigo-600 font-medium text-[10.5px]">{c}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs font-mono bg-white">
              <div className="font-semibold text-slate-800 text-sm">Submission &amp; Run History</div>
              {pastSubmissions.length > 0 ? (
                pastSubmissions.map((s) => (
                  <div key={s.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5 shadow-2xs">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider ${s.type === 'RUN' ? 'bg-slate-200 text-slate-700' : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                          }`}>
                          {s.type === 'RUN' ? 'TEST RUN' : 'SUBMIT'}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.status === 'Accepted' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}>
                          {s.status}
                        </span>
                      </div>
                      <span className="text-slate-400 text-[10px]">{s.time}</span>
                    </div>
                    <div className="text-slate-600 text-[11px] font-mono">
                      Tests Passed: <strong className={s.status === 'Accepted' ? 'text-emerald-700 font-bold' : 'text-slate-900 font-bold'}>{s.passedTests} / {s.totalTests}</strong> • Runtime: {s.executionTime}ms
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-400">
                  No submissions or test runs executed yet in this session.
                </div>
              )}
            </div>
          )}
        </section>

        {/* Column 2: Code Editor (5 cols) */}
        <section className="col-span-12 lg:col-span-5 flex flex-col border-r border-slate-200/80 bg-white overflow-hidden h-full">
          {/* Editor Header Bar */}
          <div className="h-9 bg-slate-50 border-b border-slate-200 px-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 font-mono text-xs truncate max-w-[140px] sm:max-w-[180px]">
                {problems.length > 1 ? `Q${activeProblemIndex + 1}: ` : ''}{problem?.title || 'Code Editor'}
              </span>
              <span className="text-slate-300">|</span>
              <select
                id="compiler-language-select"
                value={selectedLanguage}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="px-2 py-0.5 rounded bg-white text-xs font-mono font-medium border border-slate-200 text-slate-800 cursor-pointer shadow-2xs focus:outline-none"
              >
                <option value="C">C (GCC 15)</option>
                <option value="C++">C++ (G++ 15)</option>
                <option value="Java">Java (OpenJDK 25)</option>
                <option value="JavaScript">JavaScript (Deno)</option>
                <option value="Python">Python (3.14)</option>
              </select>
              <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">OnlineCompiler.io Active</span>
            </div>

            <div className="flex items-center gap-1 text-slate-500">
              <button
                id="compiler-reset-btn"
                onClick={handleResetCode}
                className="p-1 rounded hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
                title="Reset Code Template"
              >
                <span className="material-symbols-outlined text-[15px]">restart_alt</span>
              </button>
            </div>
          </div>

          {/* Editor Surface - White / Light Theme */}
          <div className="flex-1 flex overflow-hidden bg-white font-mono text-xs text-slate-900 border-t border-slate-200">
            {/* Line Numbers */}
            <div className="w-11 py-3 bg-slate-50 text-slate-400 select-none text-right pr-2.5 shrink-0 border-r border-slate-200 text-[11px] overflow-hidden font-mono">
              {lineNumbers.map((num) => (
                <div key={num} className="leading-5 h-5">
                  {num}
                </div>
              ))}
            </div>

            {/* Code Textarea with component key to guarantee fresh reinitialization on problem/language change */}
            <textarea
              key={`${activeProblemId}_${canonicalLang}`}
              id="compiler-code-textarea"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={isAbandoned}
              spellCheck={false}
              className="flex-1 p-3 bg-white text-slate-900 font-mono text-xs leading-5 resize-none focus:outline-none overflow-y-auto whitespace-pre caret-indigo-600 selection:bg-indigo-100 selection:text-indigo-900 disabled:opacity-50"
              style={{ tabSize: 2 }}
            />
          </div>

          {/* Action Bar */}
          <div className="h-12 bg-white border-t border-slate-200 px-4 flex items-center justify-between shrink-0 shadow-2xs">
            <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px]">
              <span>Ln {lineCount}, Col 1</span>
              <span>•</span>
              <span>UTF-8</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="run-tests-btn"
                onClick={handleRunTests}
                disabled={isRunning || isSubmitting || isAbandoned}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-800 font-mono text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[14px]">play_arrow</span>
                <span>{isRunning ? 'RUNNING...' : 'RUN TESTS'}</span>
              </button>

              <button
                id="submit-solution-btn"
                onClick={handleCustomSubmit}
                disabled={isSubmitting || isRunning || isAbandoned}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs shadow-indigo-600/20 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[14px]">done_all</span>
                <span>{isSubmitting ? 'SUBMITTING...' : 'SUBMIT SOLUTION'}</span>
              </button>
            </div>
          </div>
        </section>

        {/* Column 3: Test Execution & Output (3 cols) */}
        <section className="col-span-12 lg:col-span-3 flex flex-col bg-slate-50 overflow-hidden h-full">
          {/* Test Suite Header */}
          <div className="h-9 bg-slate-50 border-b border-slate-200 px-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="font-medium text-slate-900">Test Execution</span>
              {executionResult && (
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${executionResult.status === 'Accepted'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : 'bg-red-100 text-red-800 border-red-200'
                    }`}
                >
                  {executionResult.status}
                </span>
              )}
            </div>
            {executionResult && (
              <span className="font-mono text-[11px] text-slate-500">
                {executionResult.passedTests} / {executionResult.totalTests} Passed
              </span>
            )}
          </div>

          {/* Test Case Selectors */}
          <div className="h-8 bg-slate-100/60 border-b border-slate-200 px-2 flex items-center gap-1 shrink-0 overflow-x-auto">
            {testCasesList.map((tc, idx) => (
              <button
                key={idx}
                onClick={() => setActiveCaseIndex(idx)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono border flex items-center gap-1 font-semibold transition-all cursor-pointer ${activeCaseIndex === idx
                  ? tc.passed
                    ? 'bg-emerald-200 text-emerald-900 border-emerald-400'
                    : 'bg-red-200 text-red-900 border-red-400'
                  : tc.passed
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                  }`}
              >
                <span className="material-symbols-outlined text-[12px]">
                  {tc.passed ? 'check' : 'close'}
                </span>
                #{idx + 1}
              </button>
            ))}
          </div>

          {/* Execution Details & Telemetry */}
          <div className="flex-1 overflow-y-auto p-3 pb-12 space-y-3 font-mono text-xs">
            {executionResult ? (
              <>
                {/* Result Summary Box */}
                <div
                  className={`p-2.5 rounded border space-y-1 ${activeTestCase?.passed
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-red-50 border-red-200 text-red-900'
                    }`}
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-semibold uppercase tracking-wider">
                      {activeTestCase?.passed ? '✓ Test Passed' : 'Assertion / Execution Note'}
                    </span>
                    <span className="text-slate-500">Case #{activeCaseIndex + 1}</span>
                  </div>
                  <div className="text-[11px] font-sans leading-snug">
                    {activeTestCase?.error || (activeTestCase?.passed ? 'Outputs matched successfully.' : 'Output mismatch.')}
                  </div>
                </div>

                {/* Input & Outputs */}
                <div className="space-y-1">
                  <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                    Input Arguments
                  </div>
                  <div className="p-2 rounded bg-white border border-slate-200 text-[11px] text-slate-700 font-mono shadow-2xs">
                    {activeTestCase?.input || 'Default arguments'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase font-semibold text-emerald-700 tracking-wider">
                      Expected Output
                    </div>
                    <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold text-[11px] truncate">
                      {activeTestCase?.expectedOutput || 'Execution complete'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase font-semibold text-slate-700 tracking-wider">
                      Actual Output
                    </div>
                    <div className="p-2 rounded bg-white border border-slate-200 text-slate-900 font-semibold text-[11px] truncate">
                      {activeTestCase?.actualOutput || executionResult.output || '—'}
                    </div>
                  </div>
                </div>

                {/* Stdout Trace */}
                {executionResult.output && (
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                      Console Output (OnlineCompiler.io)
                    </div>
                    <pre className="p-2 rounded bg-white border border-slate-200 text-[10.5px] text-slate-700 font-mono whitespace-pre-wrap leading-tight shadow-2xs">
                      {executionResult.output}
                    </pre>
                  </div>
                )}
              </>
            ) : (
              <div className="p-6 text-center text-slate-400 space-y-2">
                <span className="material-symbols-outlined text-3xl text-slate-300">terminal</span>
                <p className="text-xs">Click "Run Tests" to evaluate code directly via the OnlineCompiler engine.</p>
              </div>
            )}
          </div>

          {/* Test Suite Footer */}
          <div className="h-9 bg-white border-t border-slate-200 px-3 flex items-center justify-between shrink-0 font-mono text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-500">
              <span className="material-symbols-outlined text-[14px]">cloud_done</span>
              <span>OnlineCompiler Cloud Engine</span>
            </div>
            {executionResult && (
              <span className="text-indigo-600 font-medium">
                {executionResult.executionTime}ms
              </span>
            )}
          </div>
        </section>
      </main>

      {/* Notification Toast */}
      {showNotification && (
        <div className="fixed top-16 right-6 z-50 bg-slate-900 text-white font-mono text-xs px-4 py-2.5 rounded-lg shadow-xl border border-slate-700 flex items-center gap-2 animate-bounce">
          <span className="material-symbols-outlined text-base text-emerald-400">info</span>
          <span>{showNotification}</span>
        </div>
      )}
    </div>
  );
}
