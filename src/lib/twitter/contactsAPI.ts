export interface TwitterContact {
  twitter_user_id: string;
  username: string;
  display_name: string;
  followed_at: string;
}

interface TwitterFollowingResponse {
  data?: Array<{
    id: string;
    name: string;
    username: string;
  }>;
  meta?: {
    result_count?: number;
    next_token?: string;
  };
}

const TWITTER_API_BASE_URL = 'https://api.twitter.com/2';

export async function syncTwitterFollowing(
  userId: string,
  accessToken: string
): Promise<TwitterContact[]> {
  const allContacts: TwitterContact[] = [];
  let paginationToken: string | undefined = undefined;

  try {
    do {
      const url = new URL(`${TWITTER_API_BASE_URL}/users/${userId}/following`);
      url.searchParams.set('max_results', '1000');
      if (paginationToken) {
        url.searchParams.set('pagination_token', paginationToken);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Twitter API error: ${response.status} ${response.statusText}. ${errorText}`
        );
      }

      const data: TwitterFollowingResponse = await response.json();

      if (data.data && Array.isArray(data.data)) {
        const contacts: TwitterContact[] = data.data.map((item) => ({
          twitter_user_id: item.id,
          username: item.username,
          display_name: item.name,
          followed_at: new Date().toISOString(),
        }));

        allContacts.push(...contacts);
      }

      paginationToken = data.meta?.next_token;
    } while (paginationToken);

    return allContacts;
  } catch (error) {
    console.error('Error syncing Twitter following:', error);
    throw error;
  }
}

