import { supabase } from './client';
import type { TwitchContact } from '@/lib/twitch/contactsAPI';
import type {
  TwitterContact,
  TikTokContact,
  InstagramContact,
  TelegramContact,
  UnifiedContact,
} from '@/types/social';

export type { TwitterContact, TikTokContact, InstagramContact, TelegramContact, UnifiedContact };

export interface Contact {
  name: string;
  wallet?: string;
  source?: 'manual' | 'twitch' | 'twitter' | 'tiktok' | 'instagram' | 'telegram';
  socialId?: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  isFavorite?: boolean;
}

export async function syncTwitchContacts(
  userId: string,
  contacts: TwitchContact[]
): Promise<void> {
  if (contacts.length === 0) {
    return;
  }

  const records = contacts.map((contact) => ({
    user_id: userId,
    broadcaster_id: contact.broadcaster_id,
    broadcaster_login: contact.broadcaster_login,
    broadcaster_name: contact.broadcaster_name,
    followed_at: contact.followed_at ? new Date(contact.followed_at).toISOString() : null,
    synced_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('twitch_followed')
    .upsert(records, {
      onConflict: 'user_id,broadcaster_id',
      ignoreDuplicates: false,
    });

  if (error) {
    console.error('Error syncing Twitch contacts:', error);
    throw new Error(`Failed to sync Twitch contacts: ${error.message}`);
  }
}

export async function getTwitchContacts(userId: string): Promise<TwitchContact[]> {
  const { data, error } = await supabase
    .from('twitch_followed')
    .select('*')
    .eq('user_id', userId)
    .order('is_favorite', { ascending: false })
    .order('broadcaster_name', { ascending: true });

  if (error) {
    console.error('Error fetching Twitch contacts:', error);
    throw new Error(`Failed to fetch Twitch contacts: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  return data.map((row) => ({
    broadcaster_id: row.broadcaster_id,
    broadcaster_login: row.broadcaster_login,
    broadcaster_name: row.broadcaster_name,
    followed_at: row.followed_at || new Date().toISOString(),
    is_favorite: row.is_favorite || false,
  }));
}

export async function syncTwitterContacts(
  userId: string,
  contacts: TwitterContact[]
): Promise<void> {
  if (contacts.length === 0) {
    return;
  }

  const records = contacts.map((contact) => ({
    user_id: userId,
    twitter_user_id: contact.twitter_user_id,
    username: contact.username,
    display_name: contact.display_name,
    followed_at: contact.followed_at ? new Date(contact.followed_at).toISOString() : null,
    synced_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('twitter_followed')
    .upsert(records, {
      onConflict: 'user_id,twitter_user_id',
      ignoreDuplicates: false,
    });

  if (error) {
    console.error('Error syncing Twitter contacts:', error);
    throw new Error(`Failed to sync Twitter contacts: ${error.message}`);
  }
}

export async function getTwitterContacts(userId: string): Promise<TwitterContact[]> {
  const { data, error } = await supabase
    .from('twitter_followed')
    .select('*')
    .eq('user_id', userId)
    .order('is_favorite', { ascending: false })
    .order('display_name', { ascending: true });

  if (error) {
    console.error('Error fetching Twitter contacts:', error);
    throw new Error(`Failed to fetch Twitter contacts: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  return data.map((row) => ({
    twitter_user_id: row.twitter_user_id,
    username: row.username,
    display_name: row.display_name,
    followed_at: row.followed_at || new Date().toISOString(),
    is_favorite: row.is_favorite || false,
  }));
}

export async function syncTikTokContacts(
  userId: string,
  contacts: TikTokContact[]
): Promise<void> {
  if (contacts.length === 0) {
    return;
  }

  const records = contacts.map((contact) => ({
    user_id: userId,
    tiktok_user_id: contact.tiktok_user_id,
    username: contact.username,
    display_name: contact.display_name,
    avatar_url: contact.avatar_url || null,
    followed_at: contact.followed_at ? new Date(contact.followed_at).toISOString() : null,
    synced_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('tiktok_followed')
    .upsert(records, {
      onConflict: 'user_id,tiktok_user_id',
      ignoreDuplicates: false,
    });

  if (error) {
    console.error('Error syncing TikTok contacts:', error);
    throw new Error(`Failed to sync TikTok contacts: ${error.message}`);
  }
}

export async function getTikTokContacts(userId: string): Promise<TikTokContact[]> {
  const { data, error } = await supabase
    .from('tiktok_followed')
    .select('*')
    .eq('user_id', userId)
    .order('is_favorite', { ascending: false })
    .order('display_name', { ascending: true });

  if (error) {
    console.error('Error fetching TikTok contacts:', error);
    throw new Error(`Failed to fetch TikTok contacts: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  return data.map((row) => ({
    tiktok_user_id: row.tiktok_user_id,
    username: row.username,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    followed_at: row.followed_at || new Date().toISOString(),
    is_favorite: row.is_favorite || false,
  }));
}

export async function syncInstagramContacts(
  userId: string,
  contacts: InstagramContact[]
): Promise<void> {
  if (contacts.length === 0) {
    return;
  }

  const records = contacts.map((contact) => ({
    user_id: userId,
    instagram_user_id: contact.instagram_user_id,
    username: contact.username,
    display_name: contact.display_name,
    avatar_url: contact.avatar_url || null,
    followed_at: contact.followed_at ? new Date(contact.followed_at).toISOString() : null,
    synced_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('instagram_followed')
    .upsert(records, {
      onConflict: 'user_id,instagram_user_id',
      ignoreDuplicates: false,
    });

  if (error) {
    console.error('Error syncing Instagram contacts:', error);
    throw new Error(`Failed to sync Instagram contacts: ${error.message}`);
  }
}

export async function getInstagramContacts(userId: string): Promise<InstagramContact[]> {
  const { data, error } = await supabase
    .from('instagram_followed')
    .select('*')
    .eq('user_id', userId)
    .order('is_favorite', { ascending: false })
    .order('display_name', { ascending: true });

  if (error) {
    console.error('Error fetching Instagram contacts:', error);
    throw new Error(`Failed to fetch Instagram contacts: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  return data.map((row) => ({
    instagram_user_id: row.instagram_user_id,
    username: row.username,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    followed_at: row.followed_at || new Date().toISOString(),
    is_favorite: row.is_favorite || false,
  }));
}

export async function syncTelegramContacts(
  userId: string,
  contacts: TelegramContact[]
): Promise<void> {
  if (contacts.length === 0) {
    return;
  }

  const records = contacts.map((contact) => ({
    user_id: userId,
    telegram_user_id: contact.telegram_user_id,
    username: contact.username || null,
    first_name: contact.first_name || null,
    last_name: contact.last_name || null,
    display_name: contact.display_name,
    phone_number: contact.phone_number || null,
    is_bot: typeof contact.is_bot === 'boolean' ? contact.is_bot : null,
    language_code: contact.language_code || null,
    avatar_url: contact.avatar_url || null,
    synced_at: contact.synced_at ? new Date(contact.synced_at).toISOString() : new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('telegram_contacts')
    .upsert(records, {
      onConflict: 'user_id,telegram_user_id',
      ignoreDuplicates: false,
    });

  if (error) {
    console.error('Error syncing Telegram contacts:', error);
    throw new Error(`Failed to sync Telegram contacts: ${error.message}`);
  }
}

export async function getTelegramContacts(userId: string): Promise<TelegramContact[]> {
  const { data, error } = await supabase
    .from('telegram_contacts')
    .select('*')
    .eq('user_id', userId)
    .order('is_favorite', { ascending: false })
    .order('display_name', { ascending: true });

  if (error) {
    console.error('Error fetching Telegram contacts:', error);
    throw new Error(`Failed to fetch Telegram contacts: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  return data.map((row) => ({
    telegram_user_id: row.telegram_user_id,
    username: row.username || undefined,
    first_name: row.first_name || undefined,
    last_name: row.last_name || undefined,
    display_name: row.display_name || row.username || row.first_name || row.last_name || row.telegram_user_id,
    phone_number: row.phone_number || undefined,
    avatar_url: row.avatar_url || undefined,
    is_bot: typeof row.is_bot === 'boolean' ? row.is_bot : undefined,
    language_code: row.language_code || undefined,
    synced_at: row.synced_at || undefined,
    is_favorite: row.is_favorite || false,
  }));
}

export async function getAllSocialContacts(userId: string): Promise<Contact[]> {
  const [twitchContacts, twitterContacts, tiktokContacts, instagramContacts, telegramContacts] = await Promise.all([
    getTwitchContacts(userId).catch(() => []),
    getTwitterContacts(userId).catch(() => []),
    getTikTokContacts(userId).catch(() => []),
    getInstagramContacts(userId).catch(() => []),
    getTelegramContacts(userId).catch(() => []),
  ]);

  const unified: Contact[] = [];

  twitchContacts.forEach((contact) => {
    unified.push({
      name: contact.broadcaster_name,
      source: 'twitch',
      socialId: contact.broadcaster_id,
      username: contact.broadcaster_login,
      displayName: contact.broadcaster_name,
      isFavorite: (contact as any).is_favorite || false,
    });
  });

  twitterContacts.forEach((contact) => {
    unified.push({
      name: contact.display_name,
      source: 'twitter',
      socialId: contact.twitter_user_id,
      username: contact.username,
      displayName: contact.display_name,
      isFavorite: (contact as any).is_favorite || false,
    });
  });

  tiktokContacts.forEach((contact) => {
    unified.push({
      name: contact.display_name,
      source: 'tiktok',
      socialId: contact.tiktok_user_id,
      username: contact.username,
      displayName: contact.display_name,
      avatarUrl: contact.avatar_url,
      isFavorite: (contact as any).is_favorite || false,
    });
  });

  instagramContacts.forEach((contact) => {
    unified.push({
      name: contact.display_name,
      source: 'instagram',
      socialId: contact.instagram_user_id,
      username: contact.username,
      displayName: contact.display_name,
      avatarUrl: contact.avatar_url,
      isFavorite: (contact as any).is_favorite || false,
    });
  });

  telegramContacts.forEach((contact) => {
    unified.push({
      name: contact.display_name,
      source: 'telegram',
      socialId: contact.telegram_user_id,
      username: contact.username,
      displayName: contact.display_name,
      avatarUrl: contact.avatar_url,
      isFavorite: (contact as any).is_favorite || false,
    });
  });

  // Sort: favorites first, then alphabetically
  return unified.sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return a.name.localeCompare(b.name);
  });
}

export async function syncPersonalContact(
  userId: string,
  contact: { name: string; wallet: string }
): Promise<void> {
  if (!contact.name || !contact.wallet) {
    throw new Error('Name and wallet are required');
  }

  console.log('[syncPersonalContact] Attempting to save via Edge Function:', { userId, contact });

  // Use Edge Function to bypass RLS (uses service_role key)
  const { apiCall } = await import('./client');
  
  try {
    const response = await apiCall('/contacts/personal', {
      method: 'POST',
      body: JSON.stringify({
        userId,
        name: contact.name,
        wallet: contact.wallet,
      }),
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to save personal contact');
    }

    console.log('[syncPersonalContact] Successfully saved via Edge Function:', response.data);
  } catch (error) {
    console.error('[syncPersonalContact] Edge Function error:', error);
    throw error instanceof Error ? error : new Error('Failed to sync personal contact');
  }
}

export async function getPersonalContacts(userId: string): Promise<Contact[]> {
  console.log('[getPersonalContacts] Fetching contacts for userId:', userId);

  // Use Edge Function to bypass RLS (uses service_role key)
  const { apiCall } = await import('./client');
  
  try {
    const response = await apiCall(`/contacts/personal?userId=${encodeURIComponent(userId)}`, {
      method: 'GET',
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch personal contacts');
    }

    const contacts: Contact[] = (response.data || []).map(
      (row: { name: string; wallet?: string; is_favorite?: boolean }) => ({
      name: row.name,
      wallet: row.wallet,
      source: 'manual' as const,
      isFavorite: row.is_favorite || false,
      })
    );

    // Sort: favorites first, then alphabetically
    contacts.sort((a: Contact, b: Contact) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return a.name.localeCompare(b.name);
    });

    console.log('[getPersonalContacts] Successfully fetched:', contacts.length, 'contacts');
    return contacts;
  } catch (error) {
    console.error('[getPersonalContacts] Edge Function error:', error);
    throw error instanceof Error ? error : new Error('Failed to fetch personal contacts');
  }
}

export async function deletePersonalContact(
  userId: string,
  wallet: string
): Promise<void> {
  // Use Edge Function to bypass RLS (uses service_role key)
  const { apiCall } = await import('./client');
  
  try {
    const response = await apiCall('/contacts/personal', {
      method: 'DELETE',
      body: JSON.stringify({
        userId,
        wallet,
      }),
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete personal contact');
    }

    console.log('[deletePersonalContact] Successfully deleted via Edge Function');
  } catch (error) {
    console.error('[deletePersonalContact] Edge Function error:', error);
    throw error instanceof Error ? error : new Error('Failed to delete personal contact');
  }
}

export async function toggleFavoritePersonalContact(
  userId: string,
  wallet: string,
  isFavorite: boolean
): Promise<void> {
  const { apiCall } = await import('./client');
  
  try {
    const response = await apiCall('/contacts/personal/favorite', {
      method: 'PATCH',
      body: JSON.stringify({
        userId,
        wallet,
        isFavorite,
      }),
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to update favorite status');
    }
  } catch (error) {
    console.error('[toggleFavoritePersonalContact] Edge Function error:', error);
    throw error instanceof Error ? error : new Error('Failed to update favorite status');
  }
}

export async function toggleFavoriteSocialContact(
  userId: string,
  platform: 'twitch' | 'twitter' | 'tiktok' | 'instagram' | 'telegram',
  socialId: string,
  isFavorite: boolean
): Promise<void> {
  const { apiCall } = await import('./client');
  
  try {
    const response = await apiCall('/contacts/social/favorite', {
      method: 'PATCH',
      body: JSON.stringify({
        userId,
        platform,
        socialId,
        isFavorite,
      }),
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to update favorite status');
    }
  } catch (error) {
    console.error('[toggleFavoriteSocialContact] Edge Function error:', error);
    throw error instanceof Error ? error : new Error('Failed to update favorite status');
  }
}

