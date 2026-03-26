export interface TwitchContact {
  broadcaster_id: string;
  broadcaster_login: string;
  broadcaster_name: string;
  followed_at: string;
  is_favorite?: boolean;
}

interface TwitchFollowedChannelsResponse {
  data: Array<{
    broadcaster_id: string;
    broadcaster_login: string;
    broadcaster_name: string;
    followed_at: string;
  }>;
  pagination?: {
    cursor?: string;
  };
}

const TWITCH_API_BASE_URL = 'https://api.twitch.tv/helix';

export async function syncTwitchFollowedChannels(
  userId: string,
  accessToken: string,
  clientId: string
): Promise<TwitchContact[]> {
  const allContacts: TwitchContact[] = [];
  let cursor: string | undefined = undefined;

  try {
    do {
      const url = new URL(`${TWITCH_API_BASE_URL}/channels/followed`);
      url.searchParams.set('user_id', userId);
      if (cursor) {
        url.searchParams.set('after', cursor);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Client-Id': clientId,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Twitch API error: ${response.status} ${response.statusText}. ${errorText}`
        );
      }

      const data: TwitchFollowedChannelsResponse = await response.json();

      if (data.data && Array.isArray(data.data)) {
        const contacts: TwitchContact[] = data.data.map((item) => ({
          broadcaster_id: item.broadcaster_id,
          broadcaster_login: item.broadcaster_login,
          broadcaster_name: item.broadcaster_name,
          followed_at: item.followed_at,
        }));

        allContacts.push(...contacts);
      }

      cursor = data.pagination?.cursor;
    } while (cursor);

    return allContacts;
  } catch (error) {
    console.error('Error syncing Twitch followed channels:', error);
    throw error;
  }
}

