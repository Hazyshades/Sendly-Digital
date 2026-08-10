import { ClaimCards } from './ClaimCards';
import type { GiftCardPlatform } from '@/lib/giftCards/registry';

const TWITCH_ONLY: readonly GiftCardPlatform[] = ['twitch'];

/**
 * Twitch-only pending claims view.
 * Kept as a stable export/route surface; implementation is ClaimCards filtered to twitch.
 */
export function ClaimTwitchCards() {
  return <ClaimCards platforms={TWITCH_ONLY} />;
}
