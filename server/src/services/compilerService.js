const COMPILER_MAP = {
  python: 'python-3.14',
  py: 'python-3.14',
  python3: 'python-3.14',
  javascript: 'typescript-deno',
  js: 'typescript-deno',
  typescript: 'typescript-deno',
  ts: 'typescript-deno',
  java: 'openjdk-25',
  c: 'gcc-15',
  cpp: 'g++-15',
  'c++': 'g++-15',
  csharp: 'dotnet-csharp-9',
  'c#': 'dotnet-csharp-9',
  dotnet: 'dotnet-csharp-9',
  fsharp: 'dotnet-fsharp-9',
  'f#': 'dotnet-fsharp-9',
  php: 'php-8.5',
  ruby: 'ruby-4.0',
  rb: 'ruby-4.0',
  haskell: 'haskell-9.12',
  hs: 'haskell-9.12',
  go: 'go-1.26',
  golang: 'go-1.26',
  rust: 'rust-1.93',
  rs: 'rust-1.93'
};

const ONLINE_COMPILER_API_URL = process.env.ONLINE_COMPILER_API_URL || 'https://api.onlinecompiler.io/api/run-code-sync/';

/**
 * Execute code via OnlineCompiler.io REST API
 */
export async function runCodeOnlineCompiler({ code, language, stdin = '' }) {
  const apiKey = process.env.ONLINE_COMPILER_API_KEY;
  if (!apiKey) {
    const err = new Error('ONLINE_COMPILER_API_KEY environment variable is not configured');
    err.statusCode = 500;
    throw err;
  }

  const cleanApiKey = apiKey.replace(/^Bearer\s+/i, '').trim();
  const normalizedLang = (language || 'javascript').toLowerCase().trim();
  const compiler = COMPILER_MAP[normalizedLang];

  if (!compiler) {
    const err = new Error(`Unsupported programming language: ${language}`);
    err.statusCode = 400;
    throw err;
  }

  const response = await fetch(ONLINE_COMPILER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: cleanApiKey
    },
    body: JSON.stringify({
      compiler,
      code,
      input: stdin || ''
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OnlineCompiler API error (${response.status}): ${errorText}`);
  }

  const result = await response.json();

  if (result.error && !result.output && result.exit_code === undefined) {
    return {
      output: '',
      error: result.error,
      exitCode: 1,
      time: 0,
      memory: 0,
      status: 'error'
    };
  }

  return {
    output: result.output || '',
    error: result.error || '',
    exitCode: result.exit_code ?? 0,
    time: parseFloat(result.time || '0') * 1000, // in ms
    memory: parseInt(result.memory || '0', 10),
    status: result.exit_code === 0 && !result.error ? 'success' : 'error'
  };
}

/**
 * Unified Code Execution / Judge Engine
 * Executes user code strictly through the compiler service API.
 * Local VM execution fallback is completely removed.
 */
export async function executeCode({ code, language, stdin = '', testCases = [] }) {
  const safeTestCases = Array.isArray(testCases) ? testCases : [];
  const normalizedLang = (language || 'javascript').toLowerCase().trim();

  // Execute directly via OnlineCompiler
  const execResult = await runCodeOnlineCompiler({
    code,
    language: normalizedLang,
    stdin
  });

  // Evaluate against test cases if provided
  const evaluatedTestResults = safeTestCases.length > 0
    ? safeTestCases.map((tc, i) => {
        const expected = String(tc.expectedOutput || tc.output || '').trim();
        const actual = execResult.output.trim();
        const passed = execResult.exitCode === 0 && (!expected || actual.includes(expected));

        return {
          testCaseId: tc.id || tc._id || `tc-${i + 1}`,
          passed,
          input: tc.input || '',
          expectedOutput: expected,
          actualOutput: actual || (execResult.error ? 'Error' : ''),
          error: execResult.error || (passed ? null : 'Output mismatch')
        };
      })
    : [{
        testCaseId: 'run-1',
        passed: execResult.exitCode === 0 && !execResult.error,
        input: stdin,
        expectedOutput: '',
        actualOutput: execResult.output,
        error: execResult.error || null
      }];

  const passedTests = evaluatedTestResults.filter(r => r.passed).length;
  const totalTests = evaluatedTestResults.length;

  let status = 'Accepted';
  if (execResult.exitCode !== 0 || execResult.error) {
    status = 'Runtime Error';
  } else if (safeTestCases.length > 0 && passedTests < totalTests) {
    status = 'Wrong Answer';
  }

  return {
    status,
    passedTests,
    totalTests,
    executionTime: Math.round(execResult.time || 50),
    testResults: evaluatedTestResults,
    output: execResult.output,
    error: execResult.error || null,
    engine: 'OnlineCompiler.io'
  };
}

export default {
  runCodeOnlineCompiler,
  executeCode
};
