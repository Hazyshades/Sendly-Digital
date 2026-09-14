export const TELEGRAM_IDENTITY_STORAGE_KEY = 'sendly:telegram-identity';

export type TelegramSessionIdentity = {
  socialUserId: string;
  username: string;
};

type TelegramJwtPayload = {
  telegram_user_id?: string | number;
  id?: string | number;
  username?: string;
  exp?: number;
};

function decodeBase64Url(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  return atob(padded + pad);
}

export function decodeTelegramJwtPayload(token: string): TelegramJwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const json = decodeBase64Url(parts[1]!);
    return JSON.parse(json) as TelegramJwtPayload;
  } catch {
    return null;
  }
}

export function telegramUserIdFromPayload(payload: TelegramJwtPayload): string | null {
  const raw = payload.telegram_user_id ?? payload.id;
  if (raw === null || raw === undefined || raw === '') return null;
  return String(raw);
}

export function isTelegramJwtExpired(
  payload: TelegramJwtPayload,
  nowSec: number = Math.floor(Date.now() / 1000),
): boolean {
  return typeof payload.exp === 'number' && payload.exp < nowSec;
}

export function readStoredTelegramToken(): string | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('telegram_oauth_token') || localStorage.getItem('telegram_oauth');
  return stored && stored.length > 10 ? stored : null;
}

export function persistTelegramIdentity(identity: TelegramSessionIdentity): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TELEGRAM_IDENTITY_STORAGE_KEY, JSON.stringify(identity));
  } catch {
    // quota / private mode
  }
}

export function readPersistedTelegramIdentity(): TelegramSessionIdentity | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(TELEGRAM_IDENTITY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TelegramSessionIdentity>;
    if (!parsed.socialUserId) return null;
    return {
      socialUserId: String(parsed.socialUserId),
      username: (parsed.username || parsed.socialUserId).replace(/^@/, ''),
    };
  } catch {
    return null;
  }
}

export function clearPersistedTelegramIdentity(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(TELEGRAM_IDENTITY_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function persistTelegramIdentityFromToken(token: string): TelegramSessionIdentity | null {
  const payload = decodeTelegramJwtPayload(token);
  if (!payload || isTelegramJwtExpired(payload)) return null;
  const socialUserId = telegramUserIdFromPayload(payload);
  if (!socialUserId) return null;
  const identity: TelegramSessionIdentity = {
    socialUserId,
    username: (payload.username || '').replace(/^@/, '') || socialUserId,
  };
  persistTelegramIdentity(identity);
  return identity;
}

export function readLiveTelegramIdentity(): TelegramSessionIdentity | null {
  const token = readStoredTelegramToken();
  if (!token) return null;
  return persistTelegramIdentityFromToken(token);
}

export function readLiveTelegramAccessToken(): string | null {
  const token = readStoredTelegramToken();
  if (!token) return null;
  return persistTelegramIdentityFromToken(token) ? token : null;
}
