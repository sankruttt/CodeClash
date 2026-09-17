/**
 * fixJsStarterCode.js
 * 
 * Updates all coding problems' JavaScript starter code to use Deno-compatible
 * stdin reading instead of Node.js require('fs').
 */

import dotenv from 'dotenv';
dotenv.config();

import { connectDatabase, isMongoConnected } from '../config/database.js';
import CodingProblem from '../models/CodingProblem.js';

const DENO_STDIN_READER = `const _buf = new Uint8Array(1048576);
const _n = Deno.stdin.readSync(_buf);
const _input = new TextDecoder().decode(_buf.subarray(0, _n)).trim();
const lines = _input.split('\\n');`;

// Map each problem to a Deno-compatible starter code
const jsStarterCodes = {
  'Climbing Stairs': `${DENO_STDIN_READER}
const n = parseInt(lines[0]);
// Your code here
`,

  'Activity Selection': `${DENO_STDIN_READER}
const n = parseInt(lines[0]);
// Your code here
`,

  'Sliding Window Maximum': `${DENO_STDIN_READER}
const [n, k] = lines[0].split(' ').map(Number);
const arr = lines[1].split(' ').map(Number);
// Your code here
`,

  'Shortest Path in Unweighted Graph': `${DENO_STDIN_READER}
const [n, m] = lines[0].split(' ').map(Number);
// Your code here
`,

  'Longest Increasing Subsequence': `${DENO_STDIN_READER}
const n = parseInt(lines[0]);
const arr = lines[1].split(' ').map(Number);
// Your code here
`,

  'Prefix Search Engine': `${DENO_STDIN_READER}
let idx = 0;
const n = parseInt(lines[idx++]);
// Your code here
`,

  "Dijkstra's Shortest Path": `${DENO_STDIN_READER}
const [n, m] = lines[0].split(' ').map(Number);
// Your code here
`,

  'Deadlock Detector': `${DENO_STDIN_READER}
const [p, r, q] = lines[0].split(' ').map(Number);
// Your code here
`,

  'Range Sum with Updates': `${DENO_STDIN_READER}
let idx = 0;
const [n, q] = lines[idx++].split(' ').map(Number);
const arr = lines[idx++].split(' ').map(Number);
// Your code here
`
};

async function fix() {
  await connectDatabase();
  if (!isMongoConnected()) {
    console.error('❌ MongoDB not connected.');
    process.exit(1);
  }

  const problems = await CodingProblem.find({});
  let updated = 0;

  for (const p of problems) {
    const newCode = jsStarterCodes[p.title];
    if (!newCode) {
      console.log(`⏭️  No JS fix for "${p.title}"`);
      continue;
    }

    p.starterCode.javascript = newCode;
    await p.save();
    updated++;
    console.log(`✅ Updated JS starter code for "${p.title}"`);
  }

  console.log(`\n📊 Updated ${updated} problems' JavaScript starter code to Deno-compatible.`);
  process.exit(0);
}

fix().catch(err => {
  console.error('❌ Fix failed:', err);
  process.exit(1);
});
