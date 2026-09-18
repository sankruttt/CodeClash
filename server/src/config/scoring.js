// Centralized LP / Rating Scoring Configuration — SINGLE SOURCE OF TRUTH.
// The server consumes these values directly, and the frontend imports the same
// file via the re-export shim at frontend/src/config/scoring.js so scoring
// rules are never hardcoded or duplicated at call sites.

export const SCORING = {
  defaultRating: 1500,

  // Fair ranked duel outcome deltas
  ranked: {
    win: 24,
    loss: -18,
    draw: 0,
  },

  // Abandonment / forfeit deltas (signed, applied directly to current rating)
  abandonment: {
    remainingReward: 16, // LP gained by the player who stayed in the arena
    leaverPenalty: -24, // LP deducted from the player who abandoned
  },

  // Simulated adversary ratings used for practice / NPC opponents
  simulated: {
    ranked: 2395, // elite simulated ranked adversary ("v0_Sniper")
    scrimmage: 2180, // private scrimmage guest adversary
  },
};

export function defaultRating() {
  return SCORING.defaultRating;
}

/**
 * Format an LP delta or absolute rating for display.
 * Example: formatLp(24) -> "+24 LP", formatLp(-18) -> "-18 LP", formatLp(1500) -> "1500 LP"
 * With { omitUnit: true }: formatLp(24, { omitUnit: true }) -> "+24"
 */
export function formatLp(value, { omitUnit = false } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return omitUnit ? '0' : '0 LP';
  const signed = n > 0 ? `+${n.toLocaleString()}` : n.toLocaleString();
  return omitUnit ? signed : `${signed} LP`;
}

export default SCORING;