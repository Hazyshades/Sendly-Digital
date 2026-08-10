import { connectGithub, clearGithubToken } from '@/components/zksend/Oauth/github';
import { readGithubAccessToken } from '@/lib/zk-oauth/tokenStorage';
import { usePlatformConnection, type PlatformConnectionDescriptor } from '@/hooks/usePlatformConnection';

const githubDescriptor: PlatformConnectionDescriptor = {
  id: 'github',
  storageKeys: ['github_oauth_token', 'github_oauth', 'github_access_token'],
  updateEvent: 'github-oauth-updated',
  connect: connectGithub,
  clear: clearGithubToken,
  readToken: readGithubAccessToken,
};

export function useGithubConnection() {
  return usePlatformConnection(githubDescriptor);
}
