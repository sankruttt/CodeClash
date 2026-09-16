import React, { useState, useEffect } from 'react';

const defaultCode = `interface CacheNode {
  key: number;
  val: number;
  expiresAt: number;
}

class LRUCache {
  private capacity: number;
  private map: Map<number, CacheNode>;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.map = new Map();
  }

  get(key: number): number {
    const node = this.map.get(key);
    if (!node) return -1;
    if (Date.now() > node.expiresAt) {
      this.map.delete(key);
      return -1;
    }
    // Re-order node for LRU queue
    this.map.delete(key);
    this.map.set(key, node);
    return node.val;
  }

  put(key: number, val: number, ttl: number): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.capacity) {
      const firstKey = this.map.keys().next().value;
      if (firstKey !== undefined) this.map.delete(firstKey);
    }
    this.map.set(key, { key, val, expiresAt: Date.now() + ttl });
  }
}`;

export default function ArenaView({ navigate, currentUser, activeMatch, onExitArena }) {
  const [code, setCode] = useState(defaultCode);
  const [selectedLanguage, setSelectedLanguage] = useState('TypeScript 5.3');
  const [activeCase, setActiveCase] = useState(5);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(5 * 60 + 4); // 05:04
  const [currentTab, setCurrentTab] = useState('spec'); // 'spec' | 'submissions'
  const [showNotification, setShowNotification] = useState(null);

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

  const handleRunTests = () => {
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
      setShowNotification('4 of 5 test cases passed. Case #5 failed on TTL expiration.');
      setTimeout(() => setShowNotification(null), 4000);
    }, 800);
  };

  const handleCustomSubmit = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setShowNotification('Solution submitted! Evaluated: 80% passing.');
      setTimeout(() => setShowNotification(null), 4000);
    }, 1000);
  };

  const lineCount = code.split('\n').length;
  const lineNumbers = Array.from({ length: Math.max(lineCount, 25) }, (_, i) => i + 1);

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
                GM
              </span>
              <span className="text-slate-400 text-[10px]">2,410 LP</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 font-mono text-[10px]">
              <span className="inline-flex items-center text-emerald-600 font-medium gap-0.5">
                <span className="material-symbols-outlined text-[12px]">check</span> P1 (01:45)
              </span>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center text-indigo-600 gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span> P2: 4/6
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-400">P3</span>
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
              {activeMatch?.type ? activeMatch.type.toUpperCase() : 'BO3 ROUND'}
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
              <span className="text-slate-400 text-[10px]">2,395 LP</span>
              <span className="px-1 py-0.2 rounded text-[9px] bg-sky-50 text-sky-700 border border-sky-200 font-mono font-medium">
                GM
              </span>
              <span className="font-semibold text-slate-900">{activeMatch?.opponent || 'v0_Sniper'}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 font-mono text-[10px] justify-end">
              <span className="inline-flex items-center text-emerald-600 font-medium gap-0.5">
                <span className="material-symbols-outlined text-[12px]">check</span> P1 (02:10)
              </span>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center text-sky-600 gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span> P2: 5/6
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-400 font-mono text-[9px]">142 KPM</span>
            </div>
          </div>
          <div className="relative">
            <div className="w-7 h-7 rounded bg-slate-800 text-white font-mono font-bold flex items-center justify-center text-xs shadow-xs">
              VS
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
                className={`px-2.5 py-1 rounded font-semibold border transition-all ${
                  currentTab === 'spec'
                    ? 'bg-white text-slate-900 border-slate-200 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 border-transparent'
                }`}
              >
                Problem 2: LRU Cache
              </button>
              <button
                onClick={() => setCurrentTab('submissions')}
                className={`px-2 py-1 rounded transition-all ${
                  currentTab === 'submissions'
                    ? 'bg-white text-slate-900 border-slate-200 shadow-2xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Submissions (2)
              </button>
            </div>
            <span className="text-slate-400 text-[10px] font-mono pr-2">256MB LIMIT</span>
          </div>

          {/* Spec Body */}
          <div className="flex-1 overflow-y-auto p-4 pb-12 space-y-4 text-xs font-sans bg-white">
            {/* Title & Meta */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-sm font-semibold text-slate-900 tracking-tight font-mono">
                  LRU Cache with TTL
                </h1>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  MEDIUM
                </span>
                <span className="text-[11px] font-mono text-slate-500 ml-auto font-medium">
                  400 pts
                </span>
              </div>
              <p className="font-mono text-[10px] text-slate-500">
                Task ID: #4829-TTL-ARENA • Timeout: 2.00s
              </p>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1 font-mono text-[10px]">
              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                Hash Table
              </span>
              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                Doubly-Linked List
              </span>
              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                Concurrency / Clocks
              </span>
            </div>

            {/* Description */}
            <div className="space-y-2 text-slate-700 leading-relaxed font-normal">
              <p>
                Implement a Least Recently Used (<strong className="text-slate-900 font-medium">LRU</strong>) cache structure with an absolute Time-To-Live (<strong className="text-slate-900 font-medium">TTL</strong>) assigned per entry in milliseconds.
              </p>
              <p>
                When capacity is exhausted during a <code className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-indigo-600 border border-slate-200 font-medium">put</code> operation, expired keys must be evicted first. If no expired keys remain, evict the least recently accessed active key.
              </p>
            </div>

            {/* Examples */}
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="font-mono text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                  Example 1
                </div>
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200 font-mono text-[11px] space-y-1">
                  <div className="text-slate-600">
                    <span className="text-slate-900 font-medium">Input:</span> ["LRUCache", "put", "put", "get", "put", "get"]
                  </div>
                  <div className="text-slate-600">
                    <span className="text-slate-900 font-medium">Params:</span> [[2], [1, 10, 300], [2, 20, 100], [1], [3, 30, 200], [2]]
                  </div>
                  <div className="text-emerald-700 font-medium">
                    <span className="text-slate-900 font-medium">Output:</span> [null, null, null, 10, null, -1]
                  </div>
                  <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-200">
                    Explanation: Key 2 expired after 100ms and was purged automatically.
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="font-mono text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                  Example 2
                </div>
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200 font-mono text-[11px] space-y-1">
                  <div className="text-slate-600">
                    <span className="text-slate-900 font-medium">Input:</span> ["LRUCache", "put", "get", "advanceTime", "get"]
                  </div>
                  <div className="text-slate-600">
                    <span className="text-slate-900 font-medium">Params:</span> [[1], [4, 400, 50], [4], [60], [4]]
                  </div>
                  <div className="text-emerald-700 font-medium">
                    <span className="text-slate-900 font-medium">Output:</span> [null, null, 400, null, -1]
                  </div>
                </div>
              </div>
            </div>

            {/* Constraints */}
            <div className="pt-2 border-t border-slate-200 space-y-1.5">
              <div className="font-mono text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                Constraints &amp; Invariants
              </div>
              <ul className="font-mono text-[11px] text-slate-600 space-y-1 list-inside list-disc">
                <li><code className="text-indigo-600 font-medium text-[10.5px]">1 ≤ capacity ≤ 3,000</code></li>
                <li><code className="text-indigo-600 font-medium text-[10.5px]">0 ≤ key ≤ 10^4, 0 ≤ value ≤ 10^5</code></li>
                <li><code className="text-indigo-600 font-medium text-[10.5px]">1 ≤ ttl ≤ 10^5 ms</code></li>
              </ul>
            </div>
          </div>
        </section>

        {/* Column 2: Code Editor (5 cols) */}
        <section className="col-span-12 lg:col-span-5 flex flex-col border-r border-slate-200/80 bg-white overflow-hidden h-full">
          {/* Editor Header Bar */}
          <div className="h-9 bg-slate-50 border-b border-slate-200 px-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="px-2 py-0.5 rounded bg-white text-xs font-mono font-medium border border-slate-200 text-slate-800 cursor-pointer shadow-2xs focus:outline-none"
              >
                <option value="TypeScript 5.3">TypeScript 5.3</option>
                <option value="JavaScript (ES2024)">JavaScript (ES2024)</option>
                <option value="Python 3.12">Python 3.12</option>
              </select>
              <span className="text-[10px] font-mono text-slate-400">UTF-8</span>
            </div>

            <div className="flex items-center gap-1 text-slate-500">
              <button
                onClick={() => setCode(defaultCode)}
                className="p-1 rounded hover:text-slate-900 hover:bg-slate-200 transition-colors"
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

            {/* Floating IntelliSense Card */}
            <div className="absolute bottom-4 left-16 bg-white border border-slate-200 rounded-lg shadow-xl p-1.5 w-52 z-30 font-mono text-[11px] pointer-events-none opacity-90">
              <div className="flex items-center justify-between text-[9px] text-slate-500 px-1.5 py-0.5 border-b border-slate-100">
                <span className="font-semibold uppercase tracking-wider">INTELLISENSE</span>
                <span className="text-slate-400">TypeScript</span>
              </div>
              <div className="mt-0.5 space-y-0.5">
                <div className="px-1.5 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-between font-medium">
                  <span>expiresAt</span>
                  <span className="text-[9px] text-indigo-500">property</span>
                </div>
                <div className="px-1.5 py-1 rounded text-slate-600 flex items-center justify-between">
                  <span>expiryPolicy</span>
                  <span className="text-[9px] text-slate-400">method</span>
                </div>
              </div>
            </div>
          </div>

          {/* Editor Status & Action Bar */}
          <div className="h-10 bg-white border-t border-slate-200/80 px-3 flex items-center justify-between shrink-0 font-mono text-[11px]">
            <div className="flex items-center gap-2 text-slate-500">
              <span>Ln {lineCount}, Col 1</span>
              <span>•</span>
              <span>Tab: 2</span>
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
                <kbd className="text-[9px] text-slate-400 ml-1 hidden sm:inline">Ctrl+↵</kbd>
              </button>

              <button
                onClick={handleCustomSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-3.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-mono font-semibold transition-all active:scale-95 shadow-2xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">bolt</span>
                <span>{isSubmitting ? 'Submitting...' : 'Submit Solution'}</span>
                <kbd className="text-[9px] opacity-80 ml-1 hidden sm:inline">⇧Ctrl+↵</kbd>
              </button>
            </div>
          </div>
        </section>

        {/* Column 3: Test Execution Suite (3 cols) */}
        <section className="col-span-12 lg:col-span-3 flex flex-col bg-slate-50 overflow-hidden h-full">
          {/* Test Suite Header */}
          <div className="h-9 bg-slate-50 border-b border-slate-200 px-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="font-medium text-slate-900">Test Results</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-red-100 text-red-700 border border-red-200 font-semibold">
                1 FAILED
              </span>
            </div>
            <span className="font-mono text-[11px] text-slate-500">4 / 5 Passed</span>
          </div>

          {/* Test Case Selectors */}
          <div className="h-8 bg-slate-100/60 border-b border-slate-200 px-2 flex items-center gap-1 shrink-0 overflow-x-auto">
            {[1, 2, 3, 4].map((num) => (
              <button
                key={num}
                onClick={() => setActiveCase(num)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono border flex items-center gap-1 font-semibold transition-all ${
                  activeCase === num
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                <span className="material-symbols-outlined text-[12px]">check</span> #{num}
              </button>
            ))}
            <button
              onClick={() => setActiveCase(5)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono border flex items-center gap-1 font-semibold transition-all ${
                activeCase === 5
                  ? 'bg-red-200 text-red-800 border-red-400 ring-1 ring-red-300'
                  : 'bg-red-100 text-red-700 border-red-200'
              }`}
            >
              <span className="material-symbols-outlined text-[12px]">close</span> #5 FAIL
            </button>
          </div>

          {/* Failure Details & Telemetry */}
          <div className="flex-1 overflow-y-auto p-3 pb-12 space-y-3 font-mono text-xs">
            {activeCase === 5 ? (
              <>
                {/* Assertion Alert Box */}
                <div className="p-2.5 rounded bg-red-50 border border-red-200 space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-semibold text-red-700 uppercase tracking-wider">
                      Assertion Error
                    </span>
                    <span className="text-slate-500">Case #5 (Stale TTL Eviction)</span>
                  </div>
                  <div className="text-[11px] text-red-800 font-sans leading-snug">
                    Expected <code className="font-mono bg-white px-1 py-0.5 rounded text-emerald-700 border border-red-200 font-medium">true</code>, but received <code className="font-mono bg-white px-1 py-0.5 rounded text-red-700 border border-red-200 font-medium">false</code> on operation <code className="font-mono text-slate-800">cache.has(key=7)</code>
                  </div>
                </div>

                {/* Input Sequence */}
                <div className="space-y-1">
                  <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                    Input Operations
                  </div>
                  <div className="p-2 rounded bg-white border border-slate-200 text-[11px] text-slate-700 font-mono leading-relaxed shadow-2xs">
                    put(7, 100, 500);<br />
                    advanceClock(501);<br />
                    has(7);
                  </div>
                </div>

                {/* Diff Grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase font-semibold text-emerald-700 tracking-wider">
                      Expected
                    </div>
                    <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold text-[11px]">
                      false
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase font-semibold text-red-700 tracking-wider">
                      Actual Output
                    </div>
                    <div className="p-2 rounded bg-red-50 border border-red-200 text-red-700 font-semibold text-[11px]">
                      true
                    </div>
                  </div>
                </div>

                {/* Stdout Trace */}
                <div className="space-y-1">
                  <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                    Console Output
                  </div>
                  <div className="p-2 rounded bg-white border border-slate-200 text-[10.5px] text-slate-600 font-mono space-y-0.5 leading-tight shadow-2xs">
                    <div>&gt; [DEBUG] Cache size: 1</div>
                    <div>&gt; [DEBUG] clock: 1715891402501</div>
                    <div>&gt; [DEBUG] node expires: 1715891402500</div>
                    <div className="text-amber-700 font-medium">&gt; [WARN] Manual cleanup check skipped.</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-3 bg-white rounded border border-slate-200 space-y-2">
                <div className="flex items-center gap-1 text-emerald-600 font-bold">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  <span>Test Case #{activeCase} Passed</span>
                </div>
                <div className="text-[11px] text-slate-600">
                  Execution runtime: 12ms • Memory: 14.2MB
                </div>
              </div>
            )}
          </div>

          {/* Test Suite Footer */}
          <div className="h-9 bg-white border-t border-slate-200 px-3 flex items-center justify-between shrink-0 font-mono text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-500">
              <span className="material-symbols-outlined text-[14px]">lock</span>
              <span>V8 Sandbox Active</span>
            </div>
            <button
              onClick={() => {
                setShowNotification('Trace copied to clipboard!');
                setTimeout(() => setShowNotification(null), 2000);
              }}
              className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
              Copy Trace
            </button>
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
