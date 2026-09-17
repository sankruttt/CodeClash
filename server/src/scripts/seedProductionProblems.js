/**
 * seedProductionProblems.js
 * 
 * Completely resets the CodeClash coding-problem database and seeds 9 production-ready problems.
 * 
 * - Deletes ALL existing CodingProblem and TestCase documents
 * - Inserts exactly 9 new problems (4 Easy, 3 Medium, 2 Hard)
 * - Inserts robust test cases (sample + hidden) for each problem
 * - Verifies final database state
 * 
 * Topics covered:
 *   1. Dynamic Programming & Memoization
 *   2. Graph Theory & Network Flow
 *   3. Advanced Data Structures — Trie / Segment Tree
 *   4. Concurrency & Locks (deterministic simulation)
 *   5. Greedy & Monotonic Queues
 * 
 * Usage: node server/src/scripts/seedProductionProblems.js
 */

import dotenv from 'dotenv';
dotenv.config();

import { connectDatabase, isMongoConnected } from '../config/database.js';
import CodingProblem from '../models/CodingProblem.js';
import TestCase from '../models/TestCase.js';

// ═══════════════════════════════════════════════════════════════════
// PROBLEM DEFINITIONS
// ═══════════════════════════════════════════════════════════════════

const problems = [

  // ──────────────────────────────────────────────────────────────
  // EASY #1: Climbing Stairs (DP & Memoization)
  // ──────────────────────────────────────────────────────────────
  {
    title: 'Climbing Stairs',
    difficulty: 'Easy',
    description: `You are climbing a staircase with n steps. Each time you can climb 1 or 2 steps. Given n, determine the number of distinct ways to reach the top.

Read a single integer n from stdin and print the number of distinct ways to climb to the top.`,
    constraints: [
      '1 ≤ n ≤ 45'
    ],
    examples: [
      { input: '2', output: '2', explanation: 'Two ways: (1+1) or (2).' },
      { input: '3', output: '3', explanation: 'Three ways: (1+1+1), (1+2), (2+1).' },
      { input: '5', output: '8', explanation: 'Eight distinct paths exist.' }
    ],
    starterCode: {
      c: '#include <stdio.h>\\n\\nint main() {\\n    int n;\\n    scanf("%d", &n);\\n    // Your code here\\n    return 0;\\n}',
      cpp: '#include <iostream>\\nusing namespace std;\\n\\nint main() {\\n    int n;\\n    cin >> n;\\n    // Your code here\\n    return 0;\\n}',
      java: 'import java.util.Scanner;\\n\\npublic class Solution {\\n    public static void main(String[] args) {\\n        Scanner sc = new Scanner(System.in);\\n        int n = sc.nextInt();\\n        // Your code here\\n    }\\n}',
      javascript: "const lines = require('fs').readFileSync('/dev/stdin', 'utf8').trim().split('\\\\n');\\nconst n = parseInt(lines[0]);\\n// Your code here\\n",
      python: 'n = int(input())\\n# Your code here\\n'
    },
    tags: ['Dynamic Programming', 'Memoization', 'Fibonacci'],
    timeLimit: 30,
    memoryLimit: 256,
    points: 80
  },

  // ──────────────────────────────────────────────────────────────
  // EASY #2: Activity Selection (Greedy)
  // ──────────────────────────────────────────────────────────────
  {
    title: 'Activity Selection',
    difficulty: 'Easy',
    description: `You are given n activities, each with a start time and finish time. Select the maximum number of non-overlapping activities.

Input format:
- First line: integer n (number of activities)
- Next n lines: two integers s and f (start and finish time of each activity)

Output: a single integer — the maximum number of non-overlapping activities.`,
    constraints: [
      '1 ≤ n ≤ 100,000',
      '0 ≤ s < f ≤ 1,000,000,000'
    ],
    examples: [
      {
        input: '6\n1 3\n2 5\n0 7\n5 9\n5 8\n8 10',
        output: '3',
        explanation: 'Select activities (1,3), (5,8), (8,10) or (1,3), (5,9), and no more fit.'
      },
      {
        input: '3\n1 2\n3 4\n5 6',
        output: '3',
        explanation: 'All three activities are non-overlapping.'
      }
    ],
    starterCode: {
      c: '#include <stdio.h>\\n#include <stdlib.h>\\n\\nint main() {\\n    int n;\\n    scanf("%d", &n);\\n    // Your code here\\n    return 0;\\n}',
      cpp: '#include <iostream>\\n#include <vector>\\n#include <algorithm>\\nusing namespace std;\\n\\nint main() {\\n    int n;\\n    cin >> n;\\n    // Your code here\\n    return 0;\\n}',
      java: 'import java.util.*;\\n\\npublic class Solution {\\n    public static void main(String[] args) {\\n        Scanner sc = new Scanner(System.in);\\n        int n = sc.nextInt();\\n        // Your code here\\n    }\\n}',
      javascript: "const lines = require('fs').readFileSync('/dev/stdin', 'utf8').trim().split('\\\\n');\\nconst n = parseInt(lines[0]);\\n// Your code here\\n",
      python: 'n = int(input())\\n# Your code here\\n'
    },
    tags: ['Greedy', 'Sorting', 'Interval Scheduling'],
    timeLimit: 60,
    memoryLimit: 256,
    points: 80
  },

  // ──────────────────────────────────────────────────────────────
  // EASY #3: Sliding Window Maximum (Monotonic Deque)
  // ──────────────────────────────────────────────────────────────
  {
    title: 'Sliding Window Maximum',
    difficulty: 'Easy',
    description: `Given an array of n integers and a window size k, find the maximum value in each contiguous window of size k as it slides from left to right.

Input format:
- First line: two integers n and k
- Second line: n space-separated integers

Output: space-separated maximum values for each window position.`,
    constraints: [
      '1 ≤ k ≤ n ≤ 100,000',
      '-1,000,000,000 ≤ a[i] ≤ 1,000,000,000'
    ],
    examples: [
      {
        input: '8 3\n1 3 -1 -3 5 3 6 7',
        output: '3 3 5 5 6 7',
        explanation: 'Windows: [1,3,-1]→3, [3,-1,-3]→3, [-1,-3,5]→5, [-3,5,3]→5, [5,3,6]→6, [3,6,7]→7.'
      },
      {
        input: '4 2\n4 2 12 3',
        output: '4 12 12',
        explanation: 'Windows: [4,2]→4, [2,12]→12, [12,3]→12.'
      }
    ],
    starterCode: {
      c: '#include <stdio.h>\\n\\nint main() {\\n    int n, k;\\n    scanf("%d %d", &n, &k);\\n    // Your code here\\n    return 0;\\n}',
      cpp: '#include <iostream>\\n#include <deque>\\n#include <vector>\\nusing namespace std;\\n\\nint main() {\\n    int n, k;\\n    cin >> n >> k;\\n    // Your code here\\n    return 0;\\n}',
      java: 'import java.util.*;\\n\\npublic class Solution {\\n    public static void main(String[] args) {\\n        Scanner sc = new Scanner(System.in);\\n        int n = sc.nextInt(), k = sc.nextInt();\\n        // Your code here\\n    }\\n}',
      javascript: "const lines = require('fs').readFileSync('/dev/stdin', 'utf8').trim().split('\\\\n');\\nconst [n, k] = lines[0].split(' ').map(Number);\\nconst arr = lines[1].split(' ').map(Number);\\n// Your code here\\n",
      python: 'n, k = map(int, input().split())\\narr = list(map(int, input().split()))\\n# Your code here\\n'
    },
    tags: ['Monotonic Queue', 'Deque', 'Sliding Window'],
    timeLimit: 60,
    memoryLimit: 256,
    points: 90
  },

  // ──────────────────────────────────────────────────────────────
  // EASY #4: BFS Shortest Path (Graph Theory)
  // ──────────────────────────────────────────────────────────────
  {
    title: 'Shortest Path in Unweighted Graph',
    difficulty: 'Easy',
    description: `Given an unweighted undirected graph with n nodes (numbered 1 to n) and m edges, find the shortest path distance from node 1 to node n. If no path exists, print -1.

Input format:
- First line: two integers n and m
- Next m lines: two integers u and v representing an undirected edge

Output: a single integer — the shortest distance from node 1 to node n, or -1 if unreachable.`,
    constraints: [
      '2 ≤ n ≤ 100,000',
      '0 ≤ m ≤ 200,000',
      '1 ≤ u, v ≤ n',
      'No self-loops'
    ],
    examples: [
      {
        input: '5 5\n1 2\n2 3\n3 5\n1 4\n4 5',
        output: '2',
        explanation: 'Shortest path: 1 → 4 → 5 (distance 2).'
      },
      {
        input: '3 1\n1 2',
        output: '-1',
        explanation: 'Node 3 is unreachable from node 1.'
      },
      {
        input: '2 1\n1 2',
        output: '1',
        explanation: 'Direct edge from 1 to 2.'
      }
    ],
    starterCode: {
      c: '#include <stdio.h>\\n#include <stdlib.h>\\n#include <string.h>\\n\\nint main() {\\n    int n, m;\\n    scanf("%d %d", &n, &m);\\n    // Your code here\\n    return 0;\\n}',
      cpp: '#include <iostream>\\n#include <vector>\\n#include <queue>\\nusing namespace std;\\n\\nint main() {\\n    int n, m;\\n    cin >> n >> m;\\n    // Your code here\\n    return 0;\\n}',
      java: 'import java.util.*;\\n\\npublic class Solution {\\n    public static void main(String[] args) {\\n        Scanner sc = new Scanner(System.in);\\n        int n = sc.nextInt(), m = sc.nextInt();\\n        // Your code here\\n    }\\n}',
      javascript: "const lines = require('fs').readFileSync('/dev/stdin', 'utf8').trim().split('\\\\n');\\nconst [n, m] = lines[0].split(' ').map(Number);\\n// Your code here\\n",
      python: 'import sys\\nfrom collections import deque\\ninput = sys.stdin.readline\\n\\nn, m = map(int, input().split())\\n# Your code here\\n'
    },
    tags: ['Graph Theory', 'BFS', 'Shortest Path'],
    timeLimit: 60,
    memoryLimit: 256,
    points: 90
  },

  // ──────────────────────────────────────────────────────────────
  // MEDIUM #1: Longest Increasing Subsequence (DP Optimization)
  // ──────────────────────────────────────────────────────────────
  {
    title: 'Longest Increasing Subsequence',
    difficulty: 'Medium',
    description: `Given an array of n integers, find the length of the longest strictly increasing subsequence.

Input format:
- First line: integer n
- Second line: n space-separated integers

Output: a single integer — the length of the longest strictly increasing subsequence.`,
    constraints: [
      '1 ≤ n ≤ 100,000',
      '-1,000,000,000 ≤ a[i] ≤ 1,000,000,000'
    ],
    examples: [
      {
        input: '8\n10 9 2 5 3 7 101 18',
        output: '4',
        explanation: 'One LIS is [2, 3, 7, 18] or [2, 3, 7, 101].'
      },
      {
        input: '6\n0 1 0 3 2 3',
        output: '4',
        explanation: 'One LIS is [0, 1, 2, 3].'
      },
      {
        input: '1\n42',
        output: '1',
        explanation: 'A single element is trivially an increasing subsequence of length 1.'
      }
    ],
    starterCode: {
      c: '#include <stdio.h>\\n\\nint main() {\\n    int n;\\n    scanf("%d", &n);\\n    // Your code here\\n    return 0;\\n}',
      cpp: '#include <iostream>\\n#include <vector>\\n#include <algorithm>\\nusing namespace std;\\n\\nint main() {\\n    int n;\\n    cin >> n;\\n    // Your code here\\n    return 0;\\n}',
      java: 'import java.util.*;\\n\\npublic class Solution {\\n    public static void main(String[] args) {\\n        Scanner sc = new Scanner(System.in);\\n        int n = sc.nextInt();\\n        // Your code here\\n    }\\n}',
      javascript: "const lines = require('fs').readFileSync('/dev/stdin', 'utf8').trim().split('\\\\n');\\nconst n = parseInt(lines[0]);\\nconst arr = lines[1].split(' ').map(Number);\\n// Your code here\\n",
      python: 'import sys\\nfrom bisect import bisect_left\\ninput = sys.stdin.readline\\n\\nn = int(input())\\narr = list(map(int, input().split()))\\n# Your code here\\n'
    },
    tags: ['Dynamic Programming', 'Binary Search', 'Optimization'],
    timeLimit: 60,
    memoryLimit: 256,
    points: 120
  },

  // ──────────────────────────────────────────────────────────────
  // MEDIUM #2: Prefix Search Engine (Trie)
  // ──────────────────────────────────────────────────────────────
  {
    title: 'Prefix Search Engine',
    difficulty: 'Medium',
    description: `Build a prefix search engine. You are given n words to index and q prefix queries. For each query, output how many indexed words start with the given prefix.

Input format:
- First line: integer n (number of words)
- Next n lines: one word per line (lowercase English letters only)
- Next line: integer q (number of queries)
- Next q lines: one prefix query per line

Output: q lines, each containing the count of words matching the prefix.`,
    constraints: [
      '1 ≤ n ≤ 100,000',
      '1 ≤ q ≤ 100,000',
      '1 ≤ |word|, |prefix| ≤ 100',
      'All words and prefixes consist of lowercase English letters'
    ],
    examples: [
      {
        input: '5\napple\napp\napricot\nbanana\nband\n3\nap\nban\nz',
        output: '3\n2\n0',
        explanation: '"ap" matches apple, app, apricot. "ban" matches banana, band. "z" matches nothing.'
      },
      {
        input: '3\nabc\nabc\nabd\n2\nab\nabc',
        output: '3\n2',
        explanation: '"ab" matches all three. "abc" matches the two "abc" entries.'
      }
    ],
    starterCode: {
      c: '#include <stdio.h>\\n#include <stdlib.h>\\n#include <string.h>\\n\\nint main() {\\n    int n;\\n    scanf("%d", &n);\\n    // Your code here\\n    return 0;\\n}',
      cpp: '#include <iostream>\\n#include <string>\\nusing namespace std;\\n\\nint main() {\\n    int n;\\n    cin >> n;\\n    // Your code here\\n    return 0;\\n}',
      java: 'import java.util.*;\\n\\npublic class Solution {\\n    public static void main(String[] args) {\\n        Scanner sc = new Scanner(System.in);\\n        int n = sc.nextInt();\\n        // Your code here\\n    }\\n}',
      javascript: "const lines = require('fs').readFileSync('/dev/stdin', 'utf8').trim().split('\\\\n');\\nlet idx = 0;\\nconst n = parseInt(lines[idx++]);\\n// Your code here\\n",
      python: 'import sys\\ninput = sys.stdin.readline\\n\\nn = int(input())\\n# Your code here\\n'
    },
    tags: ['Trie', 'String', 'Data Structures'],
    timeLimit: 60,
    memoryLimit: 256,
    points: 130
  },

  // ──────────────────────────────────────────────────────────────
  // MEDIUM #3: Dijkstra's Shortest Path (Graph Theory)
  // ──────────────────────────────────────────────────────────────
  {
    title: "Dijkstra's Shortest Path",
    difficulty: 'Medium',
    description: `Given a weighted directed graph with n nodes (numbered 1 to n) and m edges, find the shortest path distance from node 1 to every other node. If a node is unreachable, output -1 for that node.

Input format:
- First line: two integers n and m
- Next m lines: three integers u, v, w representing a directed edge from u to v with weight w

Output: n-1 space-separated integers — the shortest distance from node 1 to nodes 2, 3, ..., n. Print -1 for unreachable nodes.`,
    constraints: [
      '2 ≤ n ≤ 100,000',
      '0 ≤ m ≤ 200,000',
      '1 ≤ u, v ≤ n',
      '1 ≤ w ≤ 1,000,000,000',
      'No negative weights'
    ],
    examples: [
      {
        input: '4 5\n1 2 1\n1 3 4\n2 3 2\n2 4 6\n3 4 1',
        output: '1 3 4',
        explanation: 'Shortest to 2: 1→2 (cost 1). To 3: 1→2→3 (cost 3). To 4: 1→2→3→4 (cost 4).'
      },
      {
        input: '3 1\n1 2 5',
        output: '5 -1',
        explanation: 'Node 2 reachable (cost 5). Node 3 unreachable.'
      }
    ],
    starterCode: {
      c: '#include <stdio.h>\\n#include <stdlib.h>\\n#include <limits.h>\\n\\nint main() {\\n    int n, m;\\n    scanf("%d %d", &n, &m);\\n    // Your code here\\n    return 0;\\n}',
      cpp: '#include <iostream>\\n#include <vector>\\n#include <queue>\\n#include <climits>\\nusing namespace std;\\n\\nint main() {\\n    int n, m;\\n    cin >> n >> m;\\n    // Your code here\\n    return 0;\\n}',
      java: 'import java.util.*;\\n\\npublic class Solution {\\n    public static void main(String[] args) {\\n        Scanner sc = new Scanner(System.in);\\n        int n = sc.nextInt(), m = sc.nextInt();\\n        // Your code here\\n    }\\n}',
      javascript: "const lines = require('fs').readFileSync('/dev/stdin', 'utf8').trim().split('\\\\n');\\nconst [n, m] = lines[0].split(' ').map(Number);\\n// Your code here\\n",
      python: 'import sys\\nimport heapq\\ninput = sys.stdin.readline\\n\\nn, m = map(int, input().split())\\n# Your code here\\n'
    },
    tags: ['Graph Theory', 'Dijkstra', 'Shortest Path', 'Priority Queue'],
    timeLimit: 90,
    memoryLimit: 256,
    points: 140
  },

  // ──────────────────────────────────────────────────────────────
  // HARD #1: Deadlock Detector (Concurrency & Locks — Deterministic Simulation)
  // ──────────────────────────────────────────────────────────────
  {
    title: 'Deadlock Detector',
    difficulty: 'Hard',
    description: `Simulate a resource allocation system. There are p processes and r resources. You are given a sequence of lock acquisition requests. Each process tries to acquire resources one at a time. If a resource is already held by another process, the requesting process waits (blocks).

A deadlock occurs when there is a cycle in the wait-for graph: process A waits for a resource held by process B, B waits for a resource held by C, ..., and eventually some process waits for a resource held by A.

Process the requests in order. For each request, either the process acquires the resource (if free) or begins waiting. After each request, check if a deadlock exists. Print the 1-indexed line number of the first request that causes a deadlock, or 0 if no deadlock occurs.

Input format:
- First line: three integers p, r, and q (processes, resources, requests)
- Next q lines: two integers pid and rid (process pid requests resource rid)
  - Processes are numbered 1..p, resources are numbered 1..r

Output: a single integer — the 1-indexed request number that first creates a deadlock, or 0 if no deadlock ever occurs.`,
    constraints: [
      '1 ≤ p, r ≤ 100,000',
      '1 ≤ q ≤ 200,000',
      '1 ≤ pid ≤ p',
      '1 ≤ rid ≤ r',
      'A process will not request a resource it already holds'
    ],
    examples: [
      {
        input: '2 2 4\n1 1\n2 2\n1 2\n2 1',
        output: '4',
        explanation: 'Request 1: P1 acquires R1. Request 2: P2 acquires R2. Request 3: P1 waits for R2 (held by P2). Request 4: P2 waits for R1 (held by P1) → cycle → deadlock at request 4.'
      },
      {
        input: '2 2 2\n1 1\n2 2',
        output: '0',
        explanation: 'Both processes acquire their resources. No waiting, no deadlock.'
      },
      {
        input: '3 3 6\n1 1\n2 2\n3 3\n1 2\n2 3\n3 1',
        output: '6',
        explanation: 'Three-way circular wait formed at request 6.'
      }
    ],
    starterCode: {
      c: '#include <stdio.h>\\n#include <stdlib.h>\\n#include <string.h>\\n\\nint main() {\\n    int p, r, q;\\n    scanf("%d %d %d", &p, &r, &q);\\n    // Your code here\\n    return 0;\\n}',
      cpp: '#include <iostream>\\n#include <vector>\\n#include <unordered_map>\\nusing namespace std;\\n\\nint main() {\\n    int p, r, q;\\n    cin >> p >> r >> q;\\n    // Your code here\\n    return 0;\\n}',
      java: 'import java.util.*;\\n\\npublic class Solution {\\n    public static void main(String[] args) {\\n        Scanner sc = new Scanner(System.in);\\n        int p = sc.nextInt(), r = sc.nextInt(), q = sc.nextInt();\\n        // Your code here\\n    }\\n}',
      javascript: "const lines = require('fs').readFileSync('/dev/stdin', 'utf8').trim().split('\\\\n');\\nconst [p, r, q] = lines[0].split(' ').map(Number);\\n// Your code here\\n",
      python: 'import sys\\ninput = sys.stdin.readline\\n\\np, r, q = map(int, input().split())\\n# Your code here\\n'
    },
    tags: ['Concurrency', 'Locks', 'Graph Theory', 'Cycle Detection', 'Simulation'],
    timeLimit: 90,
    memoryLimit: 256,
    points: 180
  },

  // ──────────────────────────────────────────────────────────────
  // HARD #2: Range Sum with Updates (Segment Tree)
  // ──────────────────────────────────────────────────────────────
  {
    title: 'Range Sum with Updates',
    difficulty: 'Hard',
    description: `You are given an array of n integers. Process q operations of two types:

1. Update: Set the value at index i to v.
2. Query: Compute the sum of elements from index l to index r (inclusive).

Input format:
- First line: two integers n and q
- Second line: n space-separated integers (the initial array, 1-indexed)
- Next q lines: either "1 i v" (update index i to value v) or "2 l r" (query sum from l to r)

Output: For each query operation (type 2), print the sum on a separate line.`,
    constraints: [
      '1 ≤ n, q ≤ 200,000',
      '-1,000,000,000 ≤ a[i], v ≤ 1,000,000,000',
      '1 ≤ i ≤ n',
      '1 ≤ l ≤ r ≤ n'
    ],
    examples: [
      {
        input: '5 5\n1 2 3 4 5\n2 1 3\n1 2 10\n2 1 3\n2 2 5\n2 1 5',
        output: '6\n14\n22\n23',
        explanation: 'Initial: [1,2,3,4,5]. Query(1,3)=6. Update idx 2 to 10 → [1,10,3,4,5]. Query(1,3)=14. Query(2,5)=22. Query(1,5)=23.'
      },
      {
        input: '3 3\n0 0 0\n1 1 5\n1 3 7\n2 1 3',
        output: '12',
        explanation: 'After updates: [5,0,7]. Query(1,3)=12.'
      }
    ],
    starterCode: {
      c: '#include <stdio.h>\\n#include <stdlib.h>\\n\\nint main() {\\n    int n, q;\\n    scanf("%d %d", &n, &q);\\n    // Your code here\\n    return 0;\\n}',
      cpp: '#include <iostream>\\n#include <vector>\\nusing namespace std;\\n\\nint main() {\\n    ios_base::sync_with_stdio(false);\\n    cin.tie(NULL);\\n    int n, q;\\n    cin >> n >> q;\\n    // Your code here\\n    return 0;\\n}',
      java: 'import java.util.*;\\nimport java.io.*;\\n\\npublic class Solution {\\n    public static void main(String[] args) throws Exception {\\n        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\\n        StringTokenizer st = new StringTokenizer(br.readLine());\\n        int n = Integer.parseInt(st.nextToken());\\n        int q = Integer.parseInt(st.nextToken());\\n        // Your code here\\n    }\\n}',
      javascript: "const lines = require('fs').readFileSync('/dev/stdin', 'utf8').trim().split('\\\\n');\\nlet idx = 0;\\nconst [n, q] = lines[idx++].split(' ').map(Number);\\nconst arr = lines[idx++].split(' ').map(Number);\\n// Your code here\\n",
      python: 'import sys\\ninput = sys.stdin.readline\\n\\nn, q = map(int, input().split())\\narr = list(map(int, input().split()))\\n# Your code here\\n'
    },
    tags: ['Segment Tree', 'Data Structures', 'Range Query'],
    timeLimit: 120,
    memoryLimit: 256,
    points: 200
  }
];


// ═══════════════════════════════════════════════════════════════════
// TEST CASES
// ═══════════════════════════════════════════════════════════════════

const testCasesData = {

  'Climbing Stairs': {
    sample: [
      { input: '2', expectedOutput: '2' },
      { input: '3', expectedOutput: '3' },
      { input: '5', expectedOutput: '8' }
    ],
    hidden: [
      { input: '1', expectedOutput: '1' },
      { input: '4', expectedOutput: '5' },
      { input: '6', expectedOutput: '13' },
      { input: '10', expectedOutput: '89' },
      { input: '20', expectedOutput: '10946' },
      { input: '30', expectedOutput: '1346269' },
      { input: '35', expectedOutput: '14930352' },
      { input: '40', expectedOutput: '165580141' },
      { input: '45', expectedOutput: '1836311903' },
      { input: '7', expectedOutput: '21' },
      { input: '15', expectedOutput: '987' }
    ]
  },

  'Activity Selection': {
    sample: [
      { input: '6\n1 3\n2 5\n0 7\n5 9\n5 8\n8 10', expectedOutput: '3' },
      { input: '3\n1 2\n3 4\n5 6', expectedOutput: '3' }
    ],
    hidden: [
      { input: '1\n0 1', expectedOutput: '1' },
      { input: '2\n1 3\n2 4', expectedOutput: '1' },
      { input: '4\n1 2\n2 3\n3 4\n4 5', expectedOutput: '4' },
      { input: '5\n1 10\n2 3\n4 5\n6 7\n8 9', expectedOutput: '4' },
      { input: '3\n1 100\n2 100\n3 100', expectedOutput: '1' },
      { input: '6\n1 2\n1 2\n1 2\n3 4\n3 4\n3 4', expectedOutput: '2' },
      { input: '5\n0 1\n1 2\n2 3\n3 4\n4 5', expectedOutput: '5' },
      { input: '4\n1 4\n2 3\n3 5\n5 6', expectedOutput: '3' },
      { input: '7\n0 2\n1 3\n2 4\n3 5\n4 6\n5 7\n6 8', expectedOutput: '4' },
      { input: '2\n1 1000000000\n0 1', expectedOutput: '1' }
    ]
  },

  'Sliding Window Maximum': {
    sample: [
      { input: '8 3\n1 3 -1 -3 5 3 6 7', expectedOutput: '3 3 5 5 6 7' },
      { input: '4 2\n4 2 12 3', expectedOutput: '4 12 12' }
    ],
    hidden: [
      { input: '1 1\n5', expectedOutput: '5' },
      { input: '5 5\n1 2 3 4 5', expectedOutput: '5' },
      { input: '5 1\n3 1 4 1 5', expectedOutput: '3 1 4 1 5' },
      { input: '6 3\n1 1 1 1 1 1', expectedOutput: '1 1 1 1' },
      { input: '5 2\n5 4 3 2 1', expectedOutput: '5 4 3 2' },
      { input: '5 2\n1 2 3 4 5', expectedOutput: '2 3 4 5' },
      { input: '7 3\n-1 -2 -3 -4 -5 -6 -7', expectedOutput: '-1 -2 -3 -4 -5' },
      { input: '6 4\n10 5 2 7 8 7', expectedOutput: '10 8 8' },
      { input: '4 3\n1000000000 -1000000000 1000000000 -1000000000', expectedOutput: '1000000000 1000000000' },
      { input: '3 2\n1 -1 1', expectedOutput: '1 1' },
      { input: '8 4\n2 1 3 1 2 3 1 2', expectedOutput: '3 3 3 3 3' }
    ]
  },

  'Shortest Path in Unweighted Graph': {
    sample: [
      { input: '5 5\n1 2\n2 3\n3 5\n1 4\n4 5', expectedOutput: '2' },
      { input: '3 1\n1 2', expectedOutput: '-1' },
      { input: '2 1\n1 2', expectedOutput: '1' }
    ],
    hidden: [
      { input: '2 0', expectedOutput: '-1' },
      { input: '4 4\n1 2\n2 3\n3 4\n1 4', expectedOutput: '1' },
      { input: '6 7\n1 2\n2 3\n3 4\n4 5\n5 6\n1 3\n3 6', expectedOutput: '2' },
      { input: '5 4\n1 2\n2 3\n3 4\n4 5', expectedOutput: '4' },
      { input: '4 2\n1 2\n3 4', expectedOutput: '-1' },
      { input: '3 3\n1 2\n2 3\n1 3', expectedOutput: '1' },
      { input: '6 5\n1 2\n2 3\n4 5\n5 6\n1 6', expectedOutput: '1' },
      { input: '5 6\n1 2\n1 3\n2 4\n3 4\n4 5\n2 5', expectedOutput: '2' },
      { input: '7 6\n1 2\n2 3\n3 4\n4 5\n5 6\n6 7', expectedOutput: '6' },
      { input: '4 6\n1 2\n1 3\n1 4\n2 3\n2 4\n3 4', expectedOutput: '1' }
    ]
  },

  'Longest Increasing Subsequence': {
    sample: [
      { input: '8\n10 9 2 5 3 7 101 18', expectedOutput: '4' },
      { input: '6\n0 1 0 3 2 3', expectedOutput: '4' },
      { input: '1\n42', expectedOutput: '1' }
    ],
    hidden: [
      { input: '5\n5 4 3 2 1', expectedOutput: '1' },
      { input: '5\n1 2 3 4 5', expectedOutput: '5' },
      { input: '6\n1 1 1 1 1 1', expectedOutput: '1' },
      { input: '3\n1 3 2', expectedOutput: '2' },
      { input: '7\n3 1 4 1 5 9 2', expectedOutput: '4' },
      { input: '2\n2 1', expectedOutput: '1' },
      { input: '2\n1 2', expectedOutput: '2' },
      { input: '10\n1 9 2 8 3 7 4 6 5 10', expectedOutput: '6' },
      { input: '8\n-5 -3 -1 0 2 4 6 8', expectedOutput: '8' },
      { input: '6\n100 1 2 3 4 5', expectedOutput: '5' },
      { input: '4\n1000000000 -1000000000 500000000 999999999', expectedOutput: '3' }
    ]
  },

  'Prefix Search Engine': {
    sample: [
      {
        input: '5\napple\napp\napricot\nbanana\nband\n3\nap\nban\nz',
        expectedOutput: '3\n2\n0'
      },
      {
        input: '3\nabc\nabc\nabd\n2\nab\nabc',
        expectedOutput: '3\n2'
      }
    ],
    hidden: [
      { input: '1\na\n1\na', expectedOutput: '1' },
      { input: '1\na\n1\nb', expectedOutput: '0' },
      { input: '4\naaa\naab\naba\nabb\n4\na\naa\nab\nb', expectedOutput: '4\n2\n2\n0' },
      { input: '3\nxyz\nxyz\nxyz\n1\nxyz', expectedOutput: '3' },
      { input: '5\ncat\ncar\ncard\ncare\ncarp\n3\ncar\nca\ncat', expectedOutput: '4\n5\n1' },
      { input: '6\na\nab\nabc\nabcd\nabcde\nabcdef\n6\na\nab\nabc\nabcd\nabcde\nabcdef', expectedOutput: '6\n5\n4\n3\n2\n1' },
      { input: '4\ndog\ndoor\ndone\nday\n2\ndo\nd', expectedOutput: '3\n4' },
      { input: '3\nz\nzz\nzzz\n2\nz\nzzzz', expectedOutput: '3\n0' },
      { input: '2\nhello\nworld\n3\nhel\nwor\nx', expectedOutput: '1\n1\n0' }
    ]
  },

  "Dijkstra's Shortest Path": {
    sample: [
      { input: '4 5\n1 2 1\n1 3 4\n2 3 2\n2 4 6\n3 4 1', expectedOutput: '1 3 4' },
      { input: '3 1\n1 2 5', expectedOutput: '5 -1' }
    ],
    hidden: [
      { input: '2 1\n1 2 10', expectedOutput: '10' },
      { input: '2 0', expectedOutput: '-1' },
      { input: '4 4\n1 2 1\n2 3 1\n3 4 1\n1 4 10', expectedOutput: '1 2 3' },
      { input: '3 3\n1 2 5\n1 3 10\n2 3 3', expectedOutput: '5 8' },
      { input: '5 6\n1 2 2\n1 3 4\n2 3 1\n2 4 7\n3 5 3\n4 5 1', expectedOutput: '2 3 9 6' },
      { input: '3 4\n1 2 1\n2 1 1\n2 3 1\n3 2 1', expectedOutput: '1 2' },
      { input: '4 3\n1 2 1000000000\n2 3 1000000000\n3 4 1000000000', expectedOutput: '1000000000 2000000000 3000000000' },
      { input: '5 4\n1 2 1\n1 3 2\n2 4 3\n3 4 1', expectedOutput: '1 2 3 -1' },
      { input: '3 2\n1 2 3\n1 2 1', expectedOutput: '1 -1' },
      { input: '4 6\n1 2 1\n1 3 2\n1 4 3\n2 3 1\n2 4 1\n3 4 1', expectedOutput: '1 2 2' }
    ]
  },

  'Deadlock Detector': {
    sample: [
      { input: '2 2 4\n1 1\n2 2\n1 2\n2 1', expectedOutput: '4' },
      { input: '2 2 2\n1 1\n2 2', expectedOutput: '0' },
      { input: '3 3 6\n1 1\n2 2\n3 3\n1 2\n2 3\n3 1', expectedOutput: '6' }
    ],
    hidden: [
      { input: '1 1 1\n1 1', expectedOutput: '0' },
      { input: '2 1 2\n1 1\n2 1', expectedOutput: '0' },
      { input: '3 2 4\n1 1\n2 2\n3 1\n3 2', expectedOutput: '0' },
      { input: '4 4 8\n1 1\n2 2\n3 3\n4 4\n1 2\n2 3\n3 4\n4 1', expectedOutput: '8' },
      { input: '3 3 5\n1 1\n2 2\n1 2\n3 1\n2 1', expectedOutput: '5' },
      { input: '2 3 4\n1 1\n1 2\n2 3\n2 1', expectedOutput: '0' },
      { input: '3 3 4\n1 1\n2 1\n3 1\n1 2', expectedOutput: '0' },
      { input: '5 5 10\n1 1\n2 2\n3 3\n4 4\n5 5\n1 2\n2 3\n3 4\n4 5\n5 1', expectedOutput: '10' },
      { input: '2 2 3\n1 1\n2 2\n1 2', expectedOutput: '0' },
      { input: '3 2 5\n1 1\n2 2\n1 2\n2 1\n3 1', expectedOutput: '4' }
    ]
  },

  'Range Sum with Updates': {
    sample: [
      {
        input: '5 5\n1 2 3 4 5\n2 1 3\n1 2 10\n2 1 3\n2 2 5\n2 1 5',
        expectedOutput: '6\n14\n22\n23'
      },
      {
        input: '3 3\n0 0 0\n1 1 5\n1 3 7\n2 1 3',
        expectedOutput: '12'
      }
    ],
    hidden: [
      { input: '1 1\n42\n2 1 1', expectedOutput: '42' },
      { input: '1 2\n5\n1 1 10\n2 1 1', expectedOutput: '10' },
      { input: '4 4\n1 2 3 4\n2 1 4\n2 2 3\n2 1 1\n2 4 4', expectedOutput: '10\n5\n1\n4' },
      { input: '5 4\n1 1 1 1 1\n2 1 5\n1 3 100\n2 1 5\n2 3 3', expectedOutput: '5\n104\n100' },
      { input: '3 6\n10 20 30\n2 1 3\n1 1 0\n2 1 3\n1 2 0\n1 3 0\n2 1 3', expectedOutput: '60\n50\n0' },
      { input: '5 3\n-5 -3 -1 2 4\n2 1 5\n2 1 3\n2 4 5', expectedOutput: '-3\n-9\n6' },
      { input: '4 5\n1000000000 1000000000 1000000000 1000000000\n2 1 4\n1 1 -1000000000\n2 1 4\n2 1 2\n2 3 4', expectedOutput: '4000000000\n2000000000\n0\n2000000000' },
      { input: '6 6\n1 2 3 4 5 6\n2 1 6\n1 3 0\n1 4 0\n2 1 6\n2 1 3\n2 4 6', expectedOutput: '21\n14\n3\n11' },
      { input: '3 4\n0 0 0\n1 1 1\n1 2 2\n1 3 3\n2 1 3', expectedOutput: '6' },
      { input: '2 4\n5 5\n2 1 1\n2 2 2\n1 1 0\n2 1 2', expectedOutput: '5\n5\n5' }
    ]
  }
};


// ═══════════════════════════════════════════════════════════════════
// SEED LOGIC
// ═══════════════════════════════════════════════════════════════════

async function seed() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  🔄 CodeClash Production Problem Seeder');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  // 1. Connect to MongoDB
  await connectDatabase();
  if (!isMongoConnected()) {
    console.error('❌ FATAL: MongoDB not connected. Cannot proceed.');
    process.exit(1);
  }
  console.log('✅ Connected to MongoDB.\n');

  // 2. Count existing data
  const oldProblemCount = await CodingProblem.countDocuments();
  const oldTestCaseCount = await TestCase.countDocuments();
  console.log(`📊 Existing data: ${oldProblemCount} problems, ${oldTestCaseCount} test cases.`);

  // 3. Delete ALL existing problems and test cases
  console.log('\n🗑️  Deleting ALL existing coding problems and test cases...');
  const deletedProblems = await CodingProblem.deleteMany({});
  const deletedTests = await TestCase.deleteMany({});
  console.log(`   Deleted ${deletedProblems.deletedCount} problems.`);
  console.log(`   Deleted ${deletedTests.deletedCount} test cases.`);

  // 4. Verify collections are empty
  const verifyProblemCount = await CodingProblem.countDocuments();
  const verifyTestCount = await TestCase.countDocuments();
  if (verifyProblemCount !== 0 || verifyTestCount !== 0) {
    console.error(`❌ FATAL: Collections not empty after delete! Problems: ${verifyProblemCount}, Tests: ${verifyTestCount}`);
    process.exit(1);
  }
  console.log('✅ Verified: Both collections are empty.\n');

  // 5. Insert new problems and test cases
  console.log('📝 Inserting 9 new production problems...\n');

  let totalProblemsCreated = 0;
  let totalTestCasesCreated = 0;

  for (const problemData of problems) {
    try {
      const problem = await CodingProblem.create(problemData);
      totalProblemsCreated++;

      const tc = testCasesData[problemData.title];
      if (!tc) {
        console.warn(`   ⚠️  No test cases defined for "${problemData.title}"`);
        continue;
      }

      let order = 0;

      // Insert sample test cases
      for (const s of tc.sample) {
        await TestCase.create({
          problemId: problem._id,
          input: s.input,
          expectedOutput: s.expectedOutput,
          isSample: true,
          weight: 1,
          order: order++
        });
        totalTestCasesCreated++;
      }

      // Insert hidden test cases
      for (const h of tc.hidden) {
        await TestCase.create({
          problemId: problem._id,
          input: h.input,
          expectedOutput: h.expectedOutput,
          isSample: false,
          weight: 1,
          order: order++
        });
        totalTestCasesCreated++;
      }

      const sampleCount = tc.sample.length;
      const hiddenCount = tc.hidden.length;
      console.log(`   ✅ ${problem.title} [${problem.difficulty}] — ${sampleCount} sample + ${hiddenCount} hidden = ${sampleCount + hiddenCount} test cases`);

    } catch (err) {
      console.error(`   ❌ Error creating "${problemData.title}":`, err.message);
    }
  }

  // 6. Final verification
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  📊 POST-SEED VERIFICATION');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const finalProblemCount = await CodingProblem.countDocuments();
  const finalEasy = await CodingProblem.countDocuments({ difficulty: 'Easy' });
  const finalMedium = await CodingProblem.countDocuments({ difficulty: 'Medium' });
  const finalHard = await CodingProblem.countDocuments({ difficulty: 'Hard' });
  const finalTestCount = await TestCase.countDocuments();

  // Check for orphaned test cases
  const allProblemsIds = (await CodingProblem.find({}, '_id')).map(p => p._id.toString());
  const allTestCases = await TestCase.find({}, 'problemId');
  const orphanedTests = allTestCases.filter(tc => !allProblemsIds.includes(tc.problemId.toString()));

  console.log(`   Total problems:        ${finalProblemCount} ${finalProblemCount === 9 ? '✅' : '❌ EXPECTED 9'}`);
  console.log(`   Easy:                   ${finalEasy} ${finalEasy === 4 ? '✅' : '❌ EXPECTED 4'}`);
  console.log(`   Medium:                 ${finalMedium} ${finalMedium === 3 ? '✅' : '❌ EXPECTED 3'}`);
  console.log(`   Hard:                   ${finalHard} ${finalHard === 2 ? '✅' : '❌ EXPECTED 2'}`);
  console.log(`   Total test cases:       ${finalTestCount} ✅`);
  console.log(`   Orphaned test cases:    ${orphanedTests.length} ${orphanedTests.length === 0 ? '✅' : '❌'}`);
  console.log(`   Old problems deleted:   ${deletedProblems.deletedCount}`);
  console.log(`   Old test cases deleted: ${deletedTests.deletedCount}`);
  console.log(`   New problems inserted:  ${totalProblemsCreated}`);
  console.log(`   New test cases inserted:${totalTestCasesCreated}`);

  // Verify every problem has all required fields
  console.log('\n   Field completeness check:');
  const allProblems = await CodingProblem.find({});
  let fieldErrors = 0;
  for (const p of allProblems) {
    const checks = {
      title: !!p.title,
      description: !!p.description,
      difficulty: !!p.difficulty,
      constraints: Array.isArray(p.constraints) && p.constraints.length > 0,
      examples: Array.isArray(p.examples) && p.examples.length > 0,
      tags: Array.isArray(p.tags) && p.tags.length > 0,
      'starterCode.c': !!p.starterCode?.c,
      'starterCode.cpp': !!p.starterCode?.cpp,
      'starterCode.java': !!p.starterCode?.java,
      'starterCode.javascript': !!p.starterCode?.javascript,
      'starterCode.python': !!p.starterCode?.python
    };

    const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([field]) => field);
    if (failures.length > 0) {
      console.log(`   ❌ "${p.title}" missing: ${failures.join(', ')}`);
      fieldErrors++;
    } else {
      console.log(`   ✅ "${p.title}" — all fields present`);
    }
  }

  // Verify test case references
  console.log('\n   Test case reference check:');
  for (const p of allProblems) {
    const tcCount = await TestCase.countDocuments({ problemId: p._id });
    const sampleCount = await TestCase.countDocuments({ problemId: p._id, isSample: true });
    const hiddenCount = await TestCase.countDocuments({ problemId: p._id, isSample: false });
    const status = tcCount >= 10 ? '✅' : '⚠️';
    console.log(`   ${status} "${p.title}" — ${sampleCount} sample + ${hiddenCount} hidden = ${tcCount} total`);
  }

  const allPassed = finalProblemCount === 9 && finalEasy === 4 && finalMedium === 3 &&
    finalHard === 2 && orphanedTests.length === 0 && fieldErrors === 0;

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  if (allPassed) {
    console.log('  ✅ ALL VERIFICATION CHECKS PASSED');
  } else {
    console.log('  ❌ SOME CHECKS FAILED — Review output above');
  }
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  process.exit(allPassed ? 0 : 1);
}

seed().catch(err => {
  console.error('❌ Seed script failed:', err);
  process.exit(1);
});
