import { connectLinkedIn, clearLinkedInToken } from '@/components/zksend/Oauth/linkedin';
import { readLinkedInAccessToken } from '@/lib/zk-oauth/tokenStorage';
import { usePlatformConnection, type PlatformConnectionDescriptor } from '@/hooks/usePlatformConnection';

const linkedInDescriptor: PlatformConnectionDescriptor = {
  id: 'linkedin',
  storageKeys: ['linkedin_oauth_token', 'linkedin_oauth', 'linkedin_access_token'],
  updateEvent: 'linkedin-oauth-updated',
  connect: connectLinkedIn,
  clear: clearLinkedInToken,
  readToken: readLinkedInAccessToken,
};

export function useLinkedInConnection() {
  return usePlatformConnection(linkedInDescriptor);
}
