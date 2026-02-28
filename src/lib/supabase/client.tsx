import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

// Create a singleton instance of the Supabase client
const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);

export { supabase };

// Helper function to get the API base URL
export const getApiUrl = () => `https://${projectId}.supabase.co/functions/v1`;

// Helper function to get the full Edge Function URL
export const getFunctionUrl = (functionName: string = 'smart-action') => `${getApiUrl()}/${functionName}`;

// Helper function to make authenticated API calls
export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || publicAnonKey;

  // Ensure endpoint starts with /smart-action for the smart-action function
  const fullEndpoint = endpoint.startsWith('/smart-action') 
    ? endpoint 
    : `/smart-action${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const response = await fetch(`${getApiUrl()}${fullEndpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    const error = new Error(errorData.error || `HTTP ${response.status}`);
    // Attach full error data to the error object for detailed error handling
    (error as any).errorData = errorData;
    (error as any).details = errorData.details;
    (error as any).error = errorData.error;
    throw error;
  }

  return response.json();
};