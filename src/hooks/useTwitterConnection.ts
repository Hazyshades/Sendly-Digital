import { connectTwitter, clearTwitterToken } from '@/components/zksend/Oauth/twitter';
import { readTwitterOAuthTokens } from '@/lib/zk-oauth/tokenStorage';
import { usePlatformConnection, type PlatformConnectionDescriptor } from '@/hooks/usePlatformConnection';

function readTwitterAccessToken(): string | null {
  const tokens = readTwitterOAuthTokens();
  if (!tokens) return null;
  return tokens.kind === 'oauth2' ? tokens.accessToken : tokens.oauthToken;
}

const twitterDescriptor: PlatformConnectionDescriptor = {
  id: 'twitter',
  storageKeys: [
    'twitter_oauth_token',
    'twitter_oauth',
    'twitter_oauth1_token',
    'twitter_oauth1_secret',
  ],
  updateEvent: 'twitter-oauth-updated',
  connect: connectTwitter,
  clear: clearTwitterToken,
  readToken: readTwitterAccessToken,
};

export function useTwitterConnection() {
  return usePlatformConnection(twitterDescriptor);
}
