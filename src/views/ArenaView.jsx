import React, { useState, useEffect } from 'react';
import { compilerAPI, problemAPI } from '../services/api';

const fallbackCode = `function search(nums, target) {
  // Binary Search Implementation
  let left = 0;
  let right = nums.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}

// Test call
console.log(search([-1, 0, 3, 5, 9, 12], 9));`;

export default function ArenaView({ navigate, currentUser, activeMatch, onExitArena }) {
  const [problem, setProblem] = useState(activeMatch?.problemData || null);
  const [code, setCode] = useState(() => {
    return activeMatch?.problemData?.starterCode?.javascript || fallbackCode;
  });
  const [selectedLanguage, setSelectedLanguage] = useState('JavaScript');
  const [activeCaseIndex, setActiveCaseIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15:00
  const [currentTab, setCurrentTab] = useState('spec'); // 'spec' | 'submissions'
  const [showNotification, setShowNotification] = useState(null);
  const [executionResult, setExecutionResult] = useState(null);
  const [pastSubmissions, setPastSubmissions] = useState([]);

  // Fetch problem if not present in activeMatch
  useEffect(() => {
    if (!problem) {
      problemAPI.getRandomProblems(1)
        .then((res) => {
          const p = res?.data?.problems?.[0] || res?.data?.[0];
          if (p) {
            setProblem(p);
            if (p.starterCode?.javascript) {
              setCode(p.starterCode.javascript);
            }
          }
        })
        .catch((err) => console.warn('Problem fetch notice:', err));
    }
  }, [problem]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const getStarterCodeForLang = (lang, p = problem) => {
    const l = (lang || '').toLowerCase();
    if (l === 'c') {
      if (p?.starterCode?.c) return p.starterCode.c;
      return `#include <stdio.h>\n#include <stdbool.h>\n#include <stdlib.h>\n#include <string.h>\n\n// Solution for: ${p?.title || 'Algorithmic Challenge'}\nint main() {\n    // Write your solution here\n    printf("Output\\n");\n    return 0;\n}\n`;
    }
    if (l.includes('c++') || l.includes('cpp')) {
      if (p?.starterCode?.cpp) return p.starterCode.cpp;
      return `#include <iostream>\n#include <vector>\n#include <string>\n#include <algorithm>\n\nusing namespace std;\n\n// Solution for: ${p?.title || 'Algorithmic Challenge'}\nint main() {\n    // Write your solution here\n    cout << "Output" << endl;\n    return 0;\n}\n`;
    }
    if (l.includes('python')) {
      if (p?.starterCode?.python) return p.starterCode.python;
      return `def solve():\n    # Solution for: ${p?.title || 'Algorithmic Challenge'}\n    pass\n\nif __name__ == '__main__':\n    solve()\n`;
    }
    if (l.includes('typescript')) {
      if (p?.starterCode?.typescript) return p.starterCode.typescript;
      return `function solve(): void {\n  // Solution for: ${p?.title || 'Algorithmic Challenge'}\n}\n\nsolve();\n`;
    }
    return p?.starterCode?.javascript || fallbackCode;
  };

  const handleLanguageChange = (newLang) => {
    setSelectedLanguage(newLang);
    setCode(getStarterCodeForLang(newLang, problem));
  };

  const getNormalizedLang = () => {
    const l = selectedLanguage.toLowerCase();
    if (l === 'c') return 'c';
    if (l.includes('c++') || l.includes('cpp')) return 'cpp';
    if (l.includes('python')) return 'python';
    if (l.includes('typescript')) return 'typescript';
    if (l.includes('java')) return 'java';
    return 'javascript';
  };

  // Run code against OnlineCompiler.io
  const handleRunTests = async () => {
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
      setShowNotification(
        isPass
          ? `✓ Code compiled & executed successfully (${data.executionTime}ms)!`
          : `Execution: ${data.status}. Check results panel.`
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
    setIsSubmitting(true);
    try {
      const matchId = activeMatch?.id || 'match_adhoc';
      const problemId = problem?._id || problem?.id || '6a9bec6232c0d06705daedd5';
      const lang = getNormalizedLang();

      const res = await compilerAPI.submitCode(matchId, problemId, code, lang, currentUser?.id);
      const data = res?.data || res;

      setExecutionResult(data);
      setPastSubmissions((prev) => [
        {
          id: Date.now(),
          time: new Date().toLocaleTimeString(),
          status: data.status || 'Accepted',
          executionTime: data.executionTime || 50,
          passedTests: data.passedTests ?? 1,
          totalTests: data.totalTests ?? 1,
        },
        ...prev,
      ]);

      setShowNotification(
        data.status === 'Accepted'
          ? '✓ Solution Accepted! Submissions recorded in database.'
          : `Verdict: ${data.status}. Review execution output.`
      );
      setTimeout(() => setShowNotification(null), 4500);
    } catch (err) {
      setShowNotification(`Submission note: ${err.message}`);
      setTimeout(() => setShowNotification(null), 4500);
    } finally {
      setIsSubmitting(false);
    }
  };

  const lineCount = code.split('\n').length;
  const lineNumbers = Array.from({ length: Math.max(lineCount, 25) }, (_, i) => i + 1);

  const testCasesList = executionResult?.testResults || [
    {
      testCaseId: 'tc-1',
      passed: true,
      input: 'nums = [-1, 0, 3, 5, 9, 12], target = 9',
      expectedOutput: '4',
      actualOutput: '4',
      error: null,
    },
    {
      testCaseId: 'tc-2',
      passed: true,
      input: 'nums = [5], target = 5',
      expectedOutput: '0',
      actualOutput: '0',
      error: null,
    },
  ];

  const activeTestCase = testCasesList[activeCaseIndex] || testCasesList[0];

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-56px)] overflow-hidden min-w-0 pb-28">
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
              <span className="text-slate-400 text-[10px]">{(currentUser?.rating || 1500).toLocaleString()} LP</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 font-mono text-[10px]">
              <span className="inline-flex items-center text-emerald-600 font-medium gap-0.5">
                <span className="material-symbols-outlined text-[12px]">check</span> P1 (READY)
              </span>
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
            <span className="font-mono text-[13px] font-semibold tracking-wider text-slate-900">
              {formatTimer(timeLeft)}
            </span>
            <span className="text-slate-300">|</span>
            <span className="font-mono text-[10px] text-slate-500 font-medium uppercase">
              {activeMatch?.type ? activeMatch.type.toUpperCase() : '1v1 DUEL'}
            </span>
            <button
              onClick={() => {
                if (onExitArena) {
                  onExitArena();
                } else {
                  navigate('lobby');
                }
              }}
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
              <span className="text-slate-400 text-[10px]">{activeMatch?.opponentRating || 2395} LP</span>
              <span className="px-1 py-0.2 rounded text-[9px] bg-sky-50 text-sky-700 border border-sky-200 font-mono font-medium">
                MASTER
              </span>
              <span className="font-semibold text-slate-900">{activeMatch?.opponent || 'v0_Sniper'}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 font-mono text-[10px] justify-end">
              <span className="inline-flex items-center text-sky-600 gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span> IN ARENA
              </span>
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

      {/* 3-Column Surgical IDE Workspace */}
      <main className="flex-1 grid grid-cols-12 overflow-hidden bg-slate-100">
        {/* Column 1: Problem Spec (4 cols) */}
        <section className="col-span-12 lg:col-span-4 flex flex-col border-r border-slate-200/80 bg-white overflow-hidden h-full">
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
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    {problem?.difficulty || 'MEDIUM'}
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
              <div className="font-semibold text-slate-800 text-sm">Submission History</div>
              {pastSubmissions.length > 0 ? (
                pastSubmissions.map((s) => (
                  <div key={s.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.status === 'Accepted' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {s.status}
                      </span>
                      <span className="text-slate-400 text-[10px]">{s.time}</span>
                    </div>
                    <div className="text-slate-600 text-[11px]">
                      Tests Passed: {s.passedTests} / {s.totalTests} • Runtime: {s.executionTime}ms
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-400">
                  No submissions submitted yet in this session.
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
              <select
                value={selectedLanguage}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="px-2 py-0.5 rounded bg-white text-xs font-mono font-medium border border-slate-200 text-slate-800 cursor-pointer shadow-2xs focus:outline-none"
              >
                <option value="JavaScript">JavaScript</option>
                <option value="Python">Python 3.14</option>
                <option value="TypeScript">TypeScript</option>
                <option value="C">C (GCC 15)</option>
                <option value="C++">C++ (G++ 15)</option>
              </select>
              <span className="text-[10px] font-mono text-slate-400">OnlineCompiler.io Active</span>
            </div>

            <div className="flex items-center gap-1 text-slate-500">
              <button
                onClick={() => setCode(getStarterCodeForLang(selectedLanguage, problem))}
                className="p-1 rounded hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
                title="Reset Code Template"
              >
                <span className="material-symbols-outlined text-[15px]">restart_alt</span>
              </button>
            </div>
          </div>

          {/* Editor Surface */}
          <div className="flex-1 flex overflow-hidden relative font-mono text-[12px] leading-5 bg-white">
            {/* Gutter */}
            <div className="w-10 select-none py-2 text-right pr-2 text-slate-400 font-mono text-[11px] bg-[#f8fafc] border-r border-slate-200 shrink-0">
              {lineNumbers.map((num) => (
                <div key={num}>{num}</div>
              ))}
            </div>

            {/* Editable Code Area */}
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck="false"
              className="flex-1 py-2 px-3 overflow-y-auto text-slate-800 font-mono text-[12px] leading-5 bg-white resize-none focus:outline-none selection:bg-indigo-100"
            />
          </div>

          {/* Editor Status & Action Bar */}
          <div className="h-10 bg-white border-t border-slate-200/80 px-3 flex items-center justify-between shrink-0 font-mono text-[11px]">
            <div className="flex items-center gap-2 text-slate-500">
              <span>Ln {lineCount}, Col 1</span>
              <span>•</span>
              <span>OnlineCompiler REST</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRunTests}
                disabled={isRunning}
                className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition-all font-mono font-medium shadow-2xs cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-[14px] text-slate-700">
                  {isRunning ? 'refresh' : 'play_arrow'}
                </span>
                <span>{isRunning ? 'Running...' : 'Run Tests'}</span>
              </button>

              <button
                onClick={handleCustomSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-3.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-mono font-semibold transition-all active:scale-95 shadow-2xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">bolt</span>
                <span>{isSubmitting ? 'Submitting...' : 'Submit Solution'}</span>
              </button>
            </div>
          </div>
        </section>

        {/* Column 3: Test Execution Suite (3 cols) */}
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
