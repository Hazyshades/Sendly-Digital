import { readLiveTelegramIdentity } from './telegramSession';

export async function resolveTelegramDisplayName(): Promise<string | null> {
  const live = readLiveTelegramIdentity();
  if (!live) return null;
  return `@${live.username.replace(/^@/, '')}`;
}
