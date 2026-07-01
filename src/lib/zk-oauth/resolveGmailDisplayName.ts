export async function resolveGmailDisplayName(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('gmail_oauth_token') || localStorage.getItem('gmail_oauth');
  if (!token || token.length <= 10) return null;

  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { email?: string };
    return data.email ?? null;
  } catch {
    return null;
  }
}
