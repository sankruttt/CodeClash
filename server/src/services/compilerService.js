import { COMPILER_MAP, normalizeLanguage } from '../config/languages.js';

const ONLINE_COMPILER_API_URL =
  process.env.ONLINE_COMPILER_API_URL ||
  'https://api.onlinecompiler.io/api/run-code-sync/';

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
  const canonicalLang = normalizeLanguage(language);
  const compiler = COMPILER_MAP[canonicalLang];

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
 * Executes user code strictly through OnlineCompiler.io.
 * Evaluates each testcase with its specific input passed via stdin.
 */
export async function executeCode({ code, language, stdin = '', testCases = [] }) {
  const canonicalLang = normalizeLanguage(language);
  const safeTestCases = Array.isArray(testCases) ? testCases : [];

  if (safeTestCases.length === 0) {
    // Single ad-hoc execution
    const execResult = await runCodeOnlineCompiler({
      code,
      language: canonicalLang,
      stdin: stdin || ''
    });

    const errLower = (execResult.error || '').toLowerCase();
    const isRuntimeErr =
      errLower.includes('traceback') ||
      errLower.includes('zerodivisionerror') ||
      errLower.includes('exception') ||
      errLower.includes('runtimeerror') ||
      errLower.includes('nullpointer') ||
      errLower.includes('segmentation fault') ||
      errLower.includes('indexerror') ||
      errLower.includes('typeerror') ||
      errLower.includes('referenceerror');

    const isCompilationErr =
      !isRuntimeErr &&
      (errLower.includes('syntaxerror') ||
        errLower.includes('compilation') ||
        errLower.includes('compile error') ||
        errLower.includes('fatal error:') ||
        errLower.includes('error: expected') ||
        ((canonicalLang === 'c' || canonicalLang === 'cpp' || canonicalLang === 'java') && errLower.includes('error:')));

    let status = 'Accepted';
    if (execResult.exitCode !== 0 || execResult.error) {
      status = isCompilationErr ? 'Compilation Error' : 'Runtime Error';
    }

    return {
      status,
      passedTests: status === 'Accepted' ? 1 : 0,
      totalTests: 1,
      executionTime: Math.round(execResult.time || 50),
      testResults: [
        {
          testCaseId: 'run-1',
          passed: status === 'Accepted',
          input: stdin,
          expectedOutput: '',
          actualOutput: execResult.output,
          error: execResult.error || null
        }
      ],
      output: execResult.output,
      error: execResult.error || null,
      engine: 'OnlineCompiler.io'
    };
  }

  // Execute each testcase sequentially against OnlineCompiler
  const evaluatedTestResults = [];
  let totalExecutionTime = 0;
  let encounteredCompilationError = false;
  let encounteredRuntimeError = false;

  for (let i = 0; i < safeTestCases.length; i++) {
    const tc = safeTestCases[i];
    const tcInput = tc.input !== undefined && tc.input !== null ? String(tc.input) : '';
    const expected = String(tc.expectedOutput || tc.output || '').trim();

    try {
      const execResult = await runCodeOnlineCompiler({
        code,
        language: canonicalLang,
        stdin: tcInput
      });

      totalExecutionTime += Math.round(execResult.time || 50);

      const actual = (execResult.output || '').trim();
      const hasError = execResult.exitCode !== 0 || Boolean(execResult.error);

      if (hasError) {
        const errLower = (execResult.error || '').toLowerCase();
        const isRuntime =
          errLower.includes('traceback') ||
          errLower.includes('zerodivisionerror') ||
          errLower.includes('exception') ||
          errLower.includes('runtimeerror') ||
          errLower.includes('nullpointer') ||
          errLower.includes('segmentation fault') ||
          errLower.includes('indexerror') ||
          errLower.includes('typeerror') ||
          errLower.includes('referenceerror');

        if (isRuntime) {
          encounteredRuntimeError = true;
        } else if (
          errLower.includes('syntaxerror') ||
          errLower.includes('compilation') ||
          errLower.includes('compile error') ||
          errLower.includes('fatal error:') ||
          errLower.includes('error: expected') ||
          ((canonicalLang === 'c' || canonicalLang === 'cpp' || canonicalLang === 'java') && errLower.includes('error:'))
        ) {
          encounteredCompilationError = true;
        } else {
          encounteredRuntimeError = true;
        }
      }

      const passed =
        !hasError &&
        (expected === '' ||
          actual === expected ||
          actual.endsWith(expected) ||
          actual.split('\n').map((s) => s.trim()).includes(expected));

      evaluatedTestResults.push({
        testCaseId: tc.id || tc._id || `tc-${i + 1}`,
        passed,
        input: tcInput,
        expectedOutput: expected,
        actualOutput: actual || (execResult.error ? 'Error' : ''),
        error: execResult.error || (passed ? null : 'Output mismatch')
      });
    } catch (err) {
      encounteredRuntimeError = true;
      evaluatedTestResults.push({
        testCaseId: tc.id || tc._id || `tc-${i + 1}`,
        passed: false,
        input: tcInput,
        expectedOutput: expected,
        actualOutput: '',
        error: err.message
      });
    }
  }

  const passedTests = evaluatedTestResults.filter((r) => r.passed).length;
  const totalTests = evaluatedTestResults.length;

  let status = 'Accepted';
  if (encounteredCompilationError) {
    status = 'Compilation Error';
  } else if (encounteredRuntimeError) {
    status = 'Runtime Error';
  } else if (passedTests < totalTests) {
    status = 'Wrong Answer';
  }

  return {
    status,
    passedTests,
    totalTests,
    executionTime: Math.round(totalExecutionTime / (totalTests || 1)),
    testResults: evaluatedTestResults,
    output: evaluatedTestResults[0]?.actualOutput || '',
    error: evaluatedTestResults.find((r) => r.error)?.error || null,
    engine: 'OnlineCompiler.io'
  };
}

export default {
  runCodeOnlineCompiler,
  runCode: runCodeOnlineCompiler,
  executeCode
};
