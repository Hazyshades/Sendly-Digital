/*
import { supabase } from './client';

export async function insertFakeUri(uri: string, tokenId?: string | null): Promise<boolean> {
  try {
    const { error } = await supabase.from('uri').insert({
      uri,
      token_id: tokenId ?? null,
    });

    if (error) {
      console.warn('Failed to insert into uri table (table may not exist):', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Uri insert error:', e);
    return false;
  }
}
*/
