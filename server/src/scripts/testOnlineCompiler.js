import 'dotenv/config';
import { runCodeOnlineCompiler, executeCode } from '../services/compilerService.js';

async function testOnlineCompiler() {
  console.log('═════════════════════════════════════════════════════════');
  console.log('  🧪 TESTING ONLINECOMPILER.IO API INTEGRATION');
  console.log('═════════════════════════════════════════════════════════\n');

  console.log('API URL:', process.env.ONLINE_COMPILER_API_URL);
  console.log('API Key configured:', Boolean(process.env.ONLINE_COMPILER_API_KEY));
  console.log('API Key preview:', (process.env.ONLINE_COMPILER_API_KEY || '').slice(0, 8) + '...\n');

  const tests = [
    {
      name: 'Python 3 Execution',
      language: 'python',
      code: 'print(f"OnlineCompiler Python is working: {21 * 2}")',
      stdin: ''
    },
    {
      name: 'Python with Stdin',
      language: 'python',
      code: 'import sys\nname = sys.stdin.read().strip()\nprint(f"Hello, {name}!")',
      stdin: 'CodeClash Warrior'
    },
    {
      name: 'JavaScript Execution (typescript-deno)',
      language: 'javascript',
      code: 'const a = 15;\nconst b = 27;\nconsole.log(`Sum is: ${a + b}`);',
      stdin: ''
    },
    {
      name: 'C++ 15 Execution',
      language: 'cpp',
      code: '#include <iostream>\nint main() { std::cout << "C++ 15 online compiler working!\\n"; return 0; }',
      stdin: ''
    },
    {
      name: 'Java (openjdk-25) Execution',
      language: 'java',
      code: 'public class Main { public static void main(String[] args) { System.out.println("Java OpenJDK 25 working!"); } }',
      stdin: ''
    },
    {
      name: 'Syntax / Compilation Error Handling',
      language: 'python',
      code: 'def broken_function(\n    return "unmatched paren',
      stdin: '',
      expectError: true
    }
  ];

  for (const test of tests) {
    process.stdout.write(`Testing: ${test.name.padEnd(45)} ... `);
    try {
      const startTime = Date.now();
      const result = await runCodeOnlineCompiler({
        code: test.code,
        language: test.language,
        stdin: test.stdin
      });
      const duration = Date.now() - startTime;

      if (test.expectError) {
        if (result.status === 'error' || result.error || result.exitCode !== 0) {
          console.log(`✅ PASS (Error caught cleanly in ${duration}ms)`);
          console.log(`   Expected error: ${result.error.trim()}`);
        } else {
          console.log(`❌ FAIL (Expected error but succeeded)`);
        }
      } else {
        if (result.exitCode === 0 && !result.error) {
          console.log(`✅ PASS (${duration}ms)`);
          console.log(`   Output: ${result.output.trim()}`);
        } else {
          console.log(`❌ FAIL (Exit code: ${result.exitCode}, error: ${result.error})`);
        }
      }
    } catch (err) {
      if (test.expectError) {
        console.log(`✅ PASS (Error cleanly rejected: ${err.message})`);
      } else {
        console.log(`❌ FAIL (Exception: ${err.message})`);
      }
    }
  }

  console.log('\n--- Testing executeCode Judge Engine (with Test Cases) ---');
  try {
    const judgeResult = await executeCode({
      code: 'function twoSum(a, b) { return a + b; }\nconsole.log(twoSum(4, 5));',
      language: 'javascript',
      testCases: [
        { id: 'tc-1', input: '', expectedOutput: '9' }
      ]
    });

    console.log('Status:       ', judgeResult.status);
    console.log('Passed Tests: ', `${judgeResult.passedTests} / ${judgeResult.totalTests}`);
    console.log('Engine:       ', judgeResult.engine);
    console.log('Execution Time:', `${judgeResult.executionTime}ms`);
    console.log('Output:       ', judgeResult.output.trim());
    console.log('Judge Verified:', judgeResult.status === 'Accepted' ? '✅ PASS' : '❌ FAIL');
  } catch (err) {
    console.log('Judge execution failed:', err.message);
  }

  console.log('\n--- Testing Backend HTTP Endpoint (POST /api/submissions/run) ---');
  try {
    const res = await fetch('http://localhost:3001/api/submissions/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: 'print("Backend HTTP -> OnlineCompiler roundtrip OK!")',
        language: 'python'
      })
    });
    const data = await res.json();
    console.log('HTTP Status:  ', res.status);
    console.log('Backend Data: ', data);
    console.log('HTTP Verified:', res.status === 200 && data.data?.output ? '✅ PASS' : '❌ FAIL');
  } catch (err) {
    console.log('HTTP endpoint test failed:', err.message);
  }

  console.log('\n═════════════════════════════════════════════════════════');
}

testOnlineCompiler().catch(console.error);
