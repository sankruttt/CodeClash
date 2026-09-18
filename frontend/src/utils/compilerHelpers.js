/**
 * compilerHelpers.js
 * 
 * Helper functions for language normalization, compiler language keys,
 * code formatting, and problem starter code retrieval.
 */

/**
 * Normalizes user primary stack to one of the 5 standard dropdown languages:
 * 'Python', 'C++', 'Java', 'JavaScript', 'C'
 */
export const normalizeStackToDropdown = (stack) => {
  if (!stack || typeof stack !== 'string') return 'Python';
  const s = stack.trim().toLowerCase();
  if (s === 'c') return 'C';
  if (s === 'c++' || s === 'cpp' || s === 'g++') return 'C++';
  if (s === 'java' || s.includes('openjdk')) return 'Java';
  if (s === 'javascript' || s === 'js' || s.includes('deno') || s.includes('node')) return 'JavaScript';
  if (s === 'python' || s === 'py' || s.includes('python3')) return 'Python';
  return 'Python';
};

/**
 * Returns canonical key used for problem starter code subdocument:
 * 'c', 'cpp', 'java', 'javascript', 'python'
 */
export const getStarterCodeKey = (lang) => {
  const l = (lang || '').trim().toLowerCase();
  if (l === 'c') return 'c';
  if (l.includes('c++') || l.includes('cpp')) return 'cpp';
  if (l.includes('java')) return 'java';
  if (l.includes('javascript') || l.includes('js')) return 'javascript';
  if (l.includes('python') || l.includes('py')) return 'python';
  return 'python';
};

/**
 * Defensive helper to ensure starter code has proper multiline newlines
 */
export const normalizeCodeFormat = (raw) => {
  if (!raw || typeof raw !== 'string') return '';
  let formatted = raw;
  if (formatted.includes('\\n')) {
    formatted = formatted.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');
  }
  return formatted;
};

/**
 * Authoritatively get starter code for a specific problem and language from the problem data
 * Returns empty string if problem or code is missing (no hardcoded fallbacks).
 */
export const getStarterCodeForProblemAndLang = (problem, lang) => {
  if (!problem) return '';
  const langKey = getStarterCodeKey(lang);
  const starterCodeObj = problem.starterCode || {};
  const code = starterCodeObj[langKey];
  if (typeof code === 'string' && code.trim().length > 0) {
    return normalizeCodeFormat(code);
  }
  return '';
};
