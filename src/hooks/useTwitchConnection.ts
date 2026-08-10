import { connectTwitch, clearTwitchToken } from '@/components/zksend/Oauth/twitch';
import { readTwitchAccessToken } from '@/lib/zk-oauth/tokenStorage';
import { usePlatformConnection, type PlatformConnectionDescriptor } from '@/hooks/usePlatformConnection';

const twitchDescriptor: PlatformConnectionDescriptor = {
  id: 'twitch',
  storageKeys: ['twitch_oauth_token', 'twitch_oauth', 'twitch_access_token'],
  updateEvent: 'twitch-oauth-updated',
  connect: connectTwitch,
  clear: clearTwitchToken,
  readToken: readTwitchAccessToken,
};

export function useTwitchConnection() {
  return usePlatformConnection(twitchDescriptor);
}
