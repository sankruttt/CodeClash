// Seed script - adds 4 additional coding problems + test cases to the database
// Idempotent: skips problems whose title already exists; does NOT delete existing rows.
import dotenv from 'dotenv';
dotenv.config();

import { connectDatabase, isMongoConnected } from '../config/database.js';
import CodingProblem from '../models/CodingProblem.js';
import TestCase from '../models/TestCase.js';

const newProblems = [
  {
    title: 'Two Sum',
    difficulty: 'Easy',
    description: 'Given an array of integers nums and an integer target, return the indices of the two numbers that add up to target. You may assume that each input has exactly one solution, and you may not use the same element twice. Return the answer in any order.',
    constraints: [
      '2 ≤ nums.length ≤ 10,000',
      '-10^9 ≤ nums[i] ≤ 10^9',
      '-10^9 ≤ target ≤ 10^9',
      'Only one valid answer exists'
    ],
    examples: [
      { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]', explanation: 'nums[0] + nums[1] == 9, so we return [0, 1].' },
      { input: 'nums = [3,2,4], target = 6', output: '[1,2]' },
      { input: 'nums = [3,3], target = 6', output: '[0,1]' }
    ],
    starterCode: {
      javascript: 'function twoSum(nums, target) {\n  // write your solution here\n  return [];\n}',
      python: 'def twoSum(nums, target):\n    # write your solution here\n    return []',
      typescript: 'function twoSum(nums: number[], target: number): number[] {\n  // write your solution here\n  return [];\n}',
      java: 'class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // write your solution here\n        return new int[0];\n    }\n}'
    },
    tags: ['Algorithms', 'Array', 'Hash Table'],
    timeLimit: 30,
    memoryLimit: 256,
    points: 80
  },
  {
    title: 'Longest Substring Without Repeating Characters',
    difficulty: 'Medium',
    description: 'Given a string s, find the length of the longest substring without repeating characters.',
    constraints: [
      '0 ≤ s.length ≤ 50,000',
      's consists of English letters, digits, symbols and spaces'
    ],
    examples: [
      { input: 's = "abcabcbb"', output: '3', explanation: 'The answer is "abc", with the length of 3.' },
      { input: 's = "bbbbb"', output: '1' },
      { input: 's = "pwwkew"', output: '3', explanation: 'The answer is "wke", with the length of 3.' }
    ],
    starterCode: {
      javascript: 'function lengthOfLongestSubstring(s) {\n  // write your solution here\n  return 0;\n}',
      python: 'def lengthOfLongestSubstring(s):\n    # write your solution here\n    return 0',
      typescript: 'function lengthOfLongestSubstring(s: string): number {\n  // write your solution here\n  return 0;\n}',
      java: 'class Solution {\n    public int lengthOfLongestSubstring(String s) {\n        // write your solution here\n        return 0;\n    }\n}'
    },
    tags: ['Algorithms', 'String', 'Sliding Window', 'Hash Table'],
    timeLimit: 60,
    memoryLimit: 256,
    points: 120
  },
  {
    title: 'Container With Most Water',
    difficulty: 'Medium',
    description: 'You are given an integer array height of length n. There are n vertical lines drawn such that the two endpoints of the i-th line are (i, 0) and (i, height[i]). Find two lines that together with the x-axis form a container, such that the container contains the most water. Return the maximum amount of water a container can store.',
    constraints: [
      'n == height.length',
      '2 ≤ n ≤ 100,000',
      '0 ≤ height[i] ≤ 10,000'
    ],
    examples: [
      { input: 'height = [1,8,6,2,5,4,8,3,7]', output: '49', explanation: 'Lines 1 and 8 form a container holding 49 units of water.' },
      { input: 'height = [1,1]', output: '1' }
    ],
    starterCode: {
      javascript: 'function maxArea(height) {\n  // write your solution here\n  return 0;\n}',
      python: 'def maxArea(height):\n    # write your solution here\n    return 0',
      typescript: 'function maxArea(height: number[]): number {\n  // write your solution here\n  return 0;\n}',
      java: 'class Solution {\n    public int maxArea(int[] height) {\n        // write your solution here\n        return 0;\n    }\n}'
    },
    tags: ['Algorithms', 'Array', 'Two Pointers'],
    timeLimit: 60,
    memoryLimit: 256,
    points: 120
  },
  {
    title: 'Trapping Rain Water',
    difficulty: 'Hard',
    description: 'Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.',
    constraints: [
      'n == height.length',
      '1 ≤ n ≤ 20,000',
      '0 ≤ height[i] ≤ 100,000'
    ],
    examples: [
      { input: 'height = [0,1,0,2,1,0,1,3,2,1,2,1]', output: '6', explanation: 'The elevation map traps 6 units of rain water.' },
      { input: 'height = [4,2,0,3,2,5]', output: '9' }
    ],
    starterCode: {
      javascript: 'function trap(height) {\n  // write your solution here\n  return 0;\n}',
      python: 'def trap(height):\n    # write your solution here\n    return 0',
      typescript: 'function trap(height: number[]): number {\n  // write your solution here\n  return 0;\n}',
      java: 'class Solution {\n    public int trap(int[] height) {\n        // write your solution here\n        return 0;\n    }\n}'
    },
    tags: ['Algorithms', 'Array', 'Two Pointers', 'Dynamic Programming', 'Stack'],
    timeLimit: 90,
    memoryLimit: 256,
    points: 180
  }
];

// Each problem's hidden test cases (input string, expected output string, weight)
const hiddenTestCases = {
  'Two Sum': [
    { input: 'nums = [3,3], target = 6', expectedOutput: '[0,1]', weight: 1 },
    { input: 'nums = [1,5,3,8,2], target = 10', expectedOutput: '[3,4]', weight: 1 },
    { input: 'nums = [0,4,3,0], target = 0', expectedOutput: '[0,3]', weight: 1 },
    { input: 'nums = [-3,4,3,90], target = 0', expectedOutput: '[0,2]', weight: 1 },
    { input: 'nums = [2,2], target = 4', expectedOutput: '[0,1]', weight: 1 }
  ],
  'Longest Substring Without Repeating Characters': [
    { input: 's = ""', expectedOutput: '0', weight: 1 },
    { input: 's = "dvdf"', expectedOutput: '3', weight: 1 },
    { input: 's = "abcdefghijklmnopqrstuvwxyz"', expectedOutput: '26', weight: 1 },
    { input: 's = " "', expectedOutput: '1', weight: 1 },
    { input: 's = "aab"', expectedOutput: '2', weight: 1 }
  ],
  'Container With Most Water': [
    { input: 'height = [4,3,2,1,4]', expectedOutput: '16', weight: 1 },
    { input: 'height = [1,2,1]', expectedOutput: '2', weight: 1 },
    { input: 'height = [2,3,10,5,7,8,9]', expectedOutput: '36', weight: 1 },
    { input: 'height = [0,0,0,0]', expectedOutput: '0', weight: 1 },
    { input: 'height = [10,1,1,1,1,1,1,9]', expectedOutput: '63', weight: 1 }
  ],
  'Trapping Rain Water': [
    { input: 'height = [3,0,0,2,0,4]', expectedOutput: '10', weight: 1 },
    { input: 'height = [0,0,0,0]', expectedOutput: '0', weight: 1 },
    { input: 'height = [1]', expectedOutput: '0', weight: 1 },
    { input: 'height = [5,4,3,2,1]', expectedOutput: '0', weight: 1 },
    { input: 'height = [2,0,2]', expectedOutput: '2', weight: 1 },
    { input: 'height = [4,2,0,3,2,5]', expectedOutput: '9', weight: 1 }
  ]
};

async function seed() {
  console.log('🌱 Adding new problems...\n');

  await connectDatabase();

  if (!isMongoConnected()) {
    console.error('❌ MongoDB not available. Cannot seed problems.');
    process.exit(1);
  }

  let created = 0;
  let skipped = 0;
  let totalTestCases = 0;

  for (const problemData of newProblems) {
    try {
      const existing = await CodingProblem.findOne({ title: problemData.title });
      if (existing) {
        console.log(`⏭️  Skipped: ${problemData.title} (already exists)`);
        skipped++;
        continue;
      }

      const problem = await CodingProblem.create(problemData);
      console.log(`✅ Created problem: ${problem.title} (${problem.difficulty}, ${problem.points} pts)`);

      // Create sample test cases from examples (up to 2 per problem)
      const sampleCount = Math.min(problem.examples.length, 2);
      let count = 0;
      for (let i = 0; i < sampleCount; i++) {
        await TestCase.create({
          problemId: problem._id,
          input: problem.examples[i].input,
          expectedOutput: problem.examples[i].output,
          isSample: true,
          weight: 1,
          order: count++
        });
      }

      // Create hidden test cases
      const hidden = hiddenTestCases[problemData.title] || [];
      for (const tc of hidden) {
        await TestCase.create({
          problemId: problem._id,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          isSample: false,
          weight: tc.weight || 1,
          order: count++
        });
      }

      totalTestCases += count;
      created++;
    } catch (error) {
      console.error(`❌ Error creating ${problemData.title}:`, error.message);
    }
  }

  console.log(`\n📊 Summary: ${created} created, ${skipped} skipped, ${totalTestCases} test cases added`);
  console.log('✅ Done!');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});