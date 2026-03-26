import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);

export { supabase };

export const getApiUrl = () => `https://${projectId}.supabase.co/functions/v1`;

export const getFunctionUrl = (functionName: string = 'smart-action') =>
  `${getApiUrl()}/${functionName}`;

export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || publicAnonKey;
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
    (error as any).errorData = errorData;
    (error as any).details = errorData.details;
    (error as any).error = errorData.error;
    throw error;
  }
  return response.json();
};
