import { connectGmail, clearGmailToken } from '@/components/zksend/Oauth/gmail';
import { readGmailAccessToken } from '@/lib/zk-oauth/tokenStorage';
import { usePlatformConnection, type PlatformConnectionDescriptor } from '@/hooks/usePlatformConnection';

const gmailDescriptor: PlatformConnectionDescriptor = {
  id: 'gmail',
  storageKeys: ['gmail_oauth_token', 'gmail_oauth', 'gmail_access_token'],
  updateEvent: 'gmail-oauth-updated',
  connect: connectGmail,
  clear: clearGmailToken,
  readToken: readGmailAccessToken,
};

export function useGmailConnection() {
  return usePlatformConnection(gmailDescriptor);
}
