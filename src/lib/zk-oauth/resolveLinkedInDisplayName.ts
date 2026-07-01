export async function resolveLinkedInDisplayName(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const token =
    localStorage.getItem('linkedin_oauth_token') ||
    localStorage.getItem('linkedin_oauth') ||
    localStorage.getItem('linkedin_access_token');
  if (!token || token.length <= 10) return null;

  try {
    const response = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { name?: string; preferred_username?: string };
    return data.preferred_username ? `@${data.preferred_username}` : data.name ?? null;
  } catch {
    return null;
  }
}
