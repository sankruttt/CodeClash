export const LP_TIERS = [
  { name: 'Bronze', minLP: 0, nextLP: 600, nextTier: 'Silver' },
  { name: 'Silver', minLP: 600, nextLP: 1200, nextTier: 'Gold' },
  { name: 'Gold', minLP: 1200, nextLP: 1600, nextTier: 'Platinum' },
  { name: 'Platinum', minLP: 1600, nextLP: 2000, nextTier: 'Diamond' },
  { name: 'Diamond', minLP: 2000, nextLP: 2400, nextTier: 'Grandmaster' },
  { name: 'Grandmaster', minLP: 2400, nextLP: 2700, nextTier: 'Apex Dominator' },
  { name: 'Apex Dominator', minLP: 2700, nextLP: 3000, nextTier: 'Apex Legend' },
];

export function getTierDetails(rating = 2148, explicitTier) {
  let tier = null;
  let normalizedExplicit = explicitTier;
  if (normalizedExplicit && normalizedExplicit.toLowerCase() === 'diamond ii') {
    normalizedExplicit = 'Diamond';
  }
  if (normalizedExplicit) {
    tier = LP_TIERS.find((t) => t.name.toLowerCase() === normalizedExplicit.toLowerCase());
  }
  if (!tier) {
    for (let i = LP_TIERS.length - 1; i >= 0; i--) {
      if (rating >= LP_TIERS[i].minLP) {
        tier = LP_TIERS[i];
        break;
      }
    }
  }
  if (!tier) {
    tier = LP_TIERS[0];
  }

  const lpNeeded = Math.max(0, tier.nextLP - rating);
  const tierSpan = tier.nextLP - tier.minLP;
  const progressInTier = Math.max(0, rating - tier.minLP);
  const pct = Math.min(100, Math.max(0, Math.round(((rating / tier.nextLP) * 100) * 10) / 10));
  const tierPct = Math.min(100, Math.max(0, Math.round(((progressInTier / tierSpan) * 100) * 10) / 10));

  return {
    currentTier: tier.name,
    minLP: tier.minLP,
    nextTierLP: tier.nextLP,
    nextTier: tier.nextTier,
    lpNeeded,
    progressInTier,
    tierSpan,
    pct,
    tierPct,
    rating,
  };
}
