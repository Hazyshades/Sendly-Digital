import { connectTelegram, clearTelegramToken } from '@/components/zksend/Oauth/telegram';
import { readTelegramAccessToken } from '@/lib/zk-oauth/tokenStorage';
import { usePlatformConnection, type PlatformConnectionDescriptor } from '@/hooks/usePlatformConnection';

const telegramDescriptor: PlatformConnectionDescriptor = {
  id: 'telegram',
  storageKeys: ['telegram_oauth_token', 'telegram_oauth'],
  updateEvent: 'telegram-oauth-updated',
  connect: connectTelegram,
  clear: clearTelegramToken,
  readToken: readTelegramAccessToken,
};

export function useTelegramConnection() {
  return usePlatformConnection(telegramDescriptor);
}
