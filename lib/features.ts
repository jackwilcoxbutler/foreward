export type SubscriptionTier = "free" | "premium";

export interface FeatureEntitlements {
  tier: SubscriptionTier;
  fullArchive: boolean;
  visibleHistoryCount: number | null;
}

const FREE_HISTORY_VISIBLE_ROUNDS = 3;

export function getFeatureEntitlements(tier: SubscriptionTier): FeatureEntitlements {
  if (tier === "premium") {
    return { tier, fullArchive: true, visibleHistoryCount: null };
  }

  return {
    tier: "free",
    fullArchive: false,
    visibleHistoryCount: FREE_HISTORY_VISIBLE_ROUNDS,
  };
}

export function isHistoryItemLocked(index: number, entitlements: FeatureEntitlements) {
  return entitlements.visibleHistoryCount !== null && index >= entitlements.visibleHistoryCount;
}
