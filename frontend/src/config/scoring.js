// Re-export shim — imports the canonical scoring config straight from the
// server source so the frontend NEVER duplicates or hardcodes scoring values.
// Compiled for the browser at build time by Vite/Rollup.
export { SCORING, defaultRating, formatLp } from '../../../server/src/config/scoring.js';