// Centralized Supported Languages Configuration
// Strictly supports ONLY: C, C++, Java, JavaScript, Python

export const SUPPORTED_LANGUAGES = ['c', 'cpp', 'java', 'javascript', 'python'];

export const LANGUAGE_DISPLAY_NAMES = {
  c: 'C (GCC 15)',
  cpp: 'C++ (G++ 15)',
  java: 'Java (OpenJDK 25)',
  javascript: 'JavaScript (Deno)',
  python: 'Python (3.14)'
};

export const COMPILER_MAP = {
  c: 'gcc-15',
  cpp: 'g++-15',
  java: 'openjdk-25',
  javascript: 'typescript-deno',
  python: 'python-3.14'
};

const LANGUAGE_ALIASES = {
  c: 'c',
  cpp: 'cpp',
  'c++': 'cpp',
  cxx: 'cpp',
  java: 'java',
  javascript: 'javascript',
  js: 'javascript',
  python: 'python',
  py: 'python',
  python3: 'python'
};

/**
 * Normalizes and validates language identifier.
 * Returns canonical language identifier ('c', 'cpp', 'java', 'javascript', 'python')
 * or throws an error if unsupported.
 */
export function normalizeLanguage(lang) {
  if (!lang || typeof lang !== 'string') {
    const error = new Error('Language is required');
    error.statusCode = 400;
    error.code = 'INVALID_LANGUAGE';
    throw error;
  }

  const clean = lang.trim().toLowerCase();
  const canonical = LANGUAGE_ALIASES[clean];

  if (!canonical || !SUPPORTED_LANGUAGES.includes(canonical)) {
    const error = new Error(
      `Unsupported programming language: "${lang}". Supported languages are: C, C++, Java, JavaScript, Python.`
    );
    error.statusCode = 400;
    error.code = 'UNSUPPORTED_LANGUAGE';
    throw error;
  }

  return canonical;
}

export function isLanguageSupported(lang) {
  try {
    normalizeLanguage(lang);
    return true;
  } catch {
    return false;
  }
}

export default {
  SUPPORTED_LANGUAGES,
  LANGUAGE_DISPLAY_NAMES,
  COMPILER_MAP,
  normalizeLanguage,
  isLanguageSupported
};
