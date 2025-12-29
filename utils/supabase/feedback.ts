import { supabase } from './client';

export interface FeedbackInsert {
  user_id?: string;
  user_address?: string;
  user_email?: string;
  feedback_type: 'bug' | 'feature' | 'question' | 'other' | 'wallet_issue' | 'broken_error' | 'slow_unresponsive';
  title?: string;
  description: string;
  status?: 'new' | 'in_progress' | 'resolved' | 'closed';
}

export interface FeedbackRecord extends FeedbackInsert {
  id: number;
  created_at: string;
  updated_at: string;
}

/**
 * Submit feedback to the database
 */
export async function submitFeedback(feedback: FeedbackInsert): Promise<FeedbackRecord> {
  const { data, error } = await supabase
    .from('feedback')
    .insert([feedback])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to submit feedback: ${error.message}`);
  }

  return data;
}

/**
 * Get user's feedback history
 */
export async function getUserFeedback(userId?: string, userAddress?: string): Promise<FeedbackRecord[]> {
  let query = supabase
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false });

  if (userId) {
    query = query.eq('user_id', userId);
  } else if (userAddress) {
    query = query.eq('user_address', userAddress);
  } else {
    throw new Error('Either userId or userAddress must be provided');
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch feedback: ${error.message}`);
  }

  return data || [];
}

