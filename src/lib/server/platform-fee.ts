// Platform fee policy — the single extension point for future tiered fees
// (per subscription / offer / creator). Server-only.

const DEFAULT_PLATFORM_FEE_RATE = 0.10;

export async function getPlatformFeeRate(creatorId: string | null): Promise<number> {
  void creatorId; // reserved for per-creator tiers
  return DEFAULT_PLATFORM_FEE_RATE;
}
