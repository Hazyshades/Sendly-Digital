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
 * Uses a database function to bypass RLS issues
 */
export async function submitFeedback(feedback: FeedbackInsert): Promise<FeedbackRecord> {
  // Try using the function first (if it exists), fallback to direct insert
  try {
    const { data: functionData, error: functionError } = await supabase.rpc('insert_feedback', {
      p_user_id: feedback.user_id || null,
      p_user_address: feedback.user_address || null,
      p_user_email: feedback.user_email || null,
      p_feedback_type: feedback.feedback_type,
      p_title: feedback.title || null,
      p_description: feedback.description,
      p_status: feedback.status || 'new',
    });

    if (!functionError && functionData) {
      // Function exists and worked - functionData is an array
      const result = Array.isArray(functionData) ? functionData[0] : functionData;
      if (result) {
        return result as FeedbackRecord;
      }
    }
  } catch (rpcError) {
    // Function might not exist yet, fall through to direct insert
    console.log('RPC function not available, using direct insert:', rpcError);
  }

  // Fallback to direct insert (in case function doesn't exist yet)
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

