// Seed script - populates database with initial data
import dotenv from 'dotenv';
dotenv.config();

import { connectDatabase, isMongoConnected } from '../config/database.js';
import User from '../models/User.js';
import CodingProblem from '../models/CodingProblem.js';
import TestCase from '../models/TestCase.js';

const defaultProblems = [
  {
    title: 'Binary Search',
    difficulty: 'Medium',
    description: 'Given a sorted array of integers and a target value, return the index of the target if it exists. Otherwise, return -1.',
    constraints: [
      '1 ≤ nums.length ≤ 10,000',
      '-10,000 ≤ nums[i] ≤ 10,000',
      'All elements are unique',
      'nums is sorted in ascending order'
    ],
    examples: [
      { input: 'nums = [-1, 0, 3, 5, 9, 12], target = 9', output: '4', explanation: '9 exists at index 4' },
      { input: 'nums = [5], target = 5', output: '0' },
      { input: 'nums = [-1, 0, 3, 5, 9, 12], target = 13', output: '-1' }
    ],
    starterCode: {
      javascript: 'function search(nums, target) {\n  // write your solution here\n  return -1;\n}',
      python: 'def search(nums, target):\n    # write your solution here\n    return -1'
    },
    tags: ['Algorithms', 'Array', 'Binary Search'],
    timeLimit: 60,
    memoryLimit: 256,
    points: 100
  },
  {
    title: 'Valid Parentheses',
    difficulty: 'Easy',
    description: "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.",
    constraints: ['1 ≤ s.length ≤ 10,000', "s consists of parentheses only '()[]{}'"],
    examples: [
      { input: 's = "()"', output: 'true' },
      { input: 's = "()[]{}"', output: 'true' },
      { input: 's = "(]"', output: 'false' }
    ],
    starterCode: {
      javascript: 'function isValid(s) {\n  // write your solution here\n  return false;\n}',
      python: 'def isValid(s):\n    # write your solution here\n    return False'
    },
    tags: ['Data Structures', 'Stack', 'String'],
    timeLimit: 30,
    memoryLimit: 256,
    points: 80
  },
  {
    title: 'Merge Intervals',
    difficulty: 'Hard',
    description: 'Given an array of intervals where intervals[i] = [starti, endi], merge all overlapping intervals.',
    constraints: ['1 ≤ intervals.length ≤ 10,000', 'intervals[i].length == 2', '0 ≤ starti ≤ endi ≤ 10,000'],
    examples: [
      { input: 'intervals = [[1,3],[2,6],[8,10],[15,18]]', output: '[[1,6],[8,10],[15,18]]' },
      { input: 'intervals = [[1,4],[4,5]]', output: '[[1,5]]' }
    ],
    starterCode: {
      javascript: 'function merge(intervals) {\n  // write your solution here\n  return intervals;\n}',
      python: 'def merge(intervals):\n    # write your solution here\n    return intervals'
    },
    tags: ['Algorithms', 'Array', 'Sorting'],
    timeLimit: 90,
    memoryLimit: 256,
    points: 150
  }
];

async function seed() {
  console.log('🌱 Starting seed...');
  
  await connectDatabase();
  
  if (!isMongoConnected()) {
    console.log('⚠️  MongoDB not available. Skipping seed (in-memory store is pre-populated).');
    process.exit(0);
  }
  
  try {
    // Clear existing data
    await CodingProblem.deleteMany({});
    await TestCase.deleteMany({});
    
    // Insert problems
    for (const problemData of defaultProblems) {
      const problem = await CodingProblem.create(problemData);
      console.log(`✅ Created problem: ${problem.title}`);
      
      // Add default test cases
      for (let i = 0; i < problem.examples.length; i++) {
        await TestCase.create({
          problemId: problem._id,
          input: problem.examples[i].input,
          expectedOutput: problem.examples[i].output,
          isSample: i < 2,  // First 2 are sample
          order: i
        });
      }
    }
    
    console.log('\n✅ Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seed();
