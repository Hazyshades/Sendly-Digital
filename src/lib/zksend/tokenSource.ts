import {
  readGithubAccessToken,
  readGmailAccessToken,
  readLinkedInAccessToken,
  readTelegramAccessToken,
  readTwitterOAuthTokens,
  readTwitchAccessToken,
} from '@/lib/zk-oauth/tokenStorage';

export type ClaimOAuthTokens = {
  twitterAccessToken?: string | null;
  oauth1Token?: string | null;
  oauth1TokenSecret?: string | null;
  twitchAccessToken?: string | null;
  githubAccessToken?: string | null;
  telegramAccessToken?: string | null;
  instagramAccessToken?: string | null;
  linkedinAccessToken?: string | null;
  gmailAccessToken?: string | null;
  privyAccessToken?: string | null;
};

export type TokenSource = {
  read(): ClaimOAuthTokens | Promise<ClaimOAuthTokens>;
};

export type PrivyTokenReader = () => Promise<string | null>;

export function readInstagramAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  const stored =
    localStorage.getItem('instagram_oauth_token') ||
    localStorage.getItem('instagram_oauth') ||
    localStorage.getItem('instagram_access_token');
  return stored && stored.length > 0 ? stored : null;
}

function readStorageTokens(privyAccessToken?: string | null): ClaimOAuthTokens {
  if (typeof window === 'undefined') {
    return { privyAccessToken: privyAccessToken ?? null };
  }

  const twitter = readTwitterOAuthTokens();
  return {
    twitterAccessToken: twitter?.kind === 'oauth2' ? twitter.accessToken : null,
    oauth1Token: twitter?.kind === 'oauth1' ? twitter.oauthToken : null,
    oauth1TokenSecret: twitter?.kind === 'oauth1' ? twitter.oauthTokenSecret : null,
    twitchAccessToken: readTwitchAccessToken(),
    githubAccessToken: readGithubAccessToken(),
    telegramAccessToken: readTelegramAccessToken(),
    instagramAccessToken: readInstagramAccessToken(),
    linkedinAccessToken: readLinkedInAccessToken(),
    gmailAccessToken: readGmailAccessToken(),
    privyAccessToken: privyAccessToken ?? null,
  };
}

/** Default adapter: browser zk-oauth storage. No-ops without `window`. Privy is a separate reader. */
export function createBrowserTokenSource(options?: {
  readPrivyAccessToken?: PrivyTokenReader;
}): TokenSource {
  return {
    async read() {
      const privy = options?.readPrivyAccessToken ? await options.readPrivyAccessToken() : null;
      return readStorageTokens(privy);
    },
  };
}

export const defaultBrowserTokenSource: TokenSource = createBrowserTokenSource();
