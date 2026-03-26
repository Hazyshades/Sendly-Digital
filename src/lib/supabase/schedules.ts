import { apiCall } from './client';
import type {
  ScheduleInput,
  ScheduleRow,
  ScheduleWithStats,
  ScheduleDetail,
  ScheduleExecutionPage,
  ScheduleStatus,
} from '@/types/agentSchedules';

export interface ListSchedulesOptions {
  status?: ScheduleStatus;
  includeHistory?: boolean;
}

export interface ScheduleExecutionsOptions {
  page?: number;
  pageSize?: number;
}

function buildQueryString(params: Record<string, string | number | boolean | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params))
    if (v !== undefined && v !== null) sp.set(k, String(v));
  const q = sp.toString();
  return q ? `?${q}` : '';
}

export async function listAgentSchedules(userId: string, options: ListSchedulesOptions = {}): Promise<ScheduleWithStats[]> {
  const response = await apiCall(`/agent/schedules${buildQueryString({ userId, status: options.status, includeHistory: options.includeHistory ? 'true' : undefined })}`, { method: 'GET' });
  if (!response?.success) throw new Error(response?.error || 'Failed to load schedules');
  return (response.data ?? []) as ScheduleWithStats[];
}

export async function createAgentSchedule(userId: string, payload: ScheduleInput): Promise<ScheduleRow> {
  const response = await apiCall('/agent/schedules', { method: 'POST', body: JSON.stringify({ ...payload, userId }) });
  if (!response?.success || !response.data) throw new Error(response?.error || 'Failed to create schedule');
  return response.data as ScheduleRow;
}

export async function getAgentSchedule(scheduleId: string, userId: string, limit = 20): Promise<ScheduleDetail> {
  const response = await apiCall(`/agent/schedules/${scheduleId}${buildQueryString({ userId, limit })}`, { method: 'GET' });
  if (!response?.success || !response.data) throw new Error(response?.error || 'Failed to fetch schedule detail');
  return response.data as ScheduleDetail;
}

export async function listAgentScheduleExecutions(
  scheduleId: string,
  userId: string,
  options: ScheduleExecutionsOptions = {}
): Promise<ScheduleExecutionPage> {
  const response = await apiCall(`/agent/schedules/${scheduleId}/executions${buildQueryString({ userId, page: options.page, pageSize: options.pageSize })}`, { method: 'GET' });
  if (!response?.success) throw new Error(response?.error || 'Failed to fetch schedule executions');
  return {
    data: response.data ?? [],
    pagination: response.pagination ?? { page: options.page ?? 1, pageSize: options.pageSize ?? 20, total: 0 },
  };
}

export async function updateAgentSchedule(scheduleId: string, userId: string, updates: Partial<ScheduleInput>): Promise<ScheduleRow> {
  const response = await apiCall(`/agent/schedules/${scheduleId}`, { method: 'PATCH', body: JSON.stringify({ ...updates, userId }) });
  if (!response?.success || !response.data) throw new Error(response?.error || 'Failed to update schedule');
  return response.data as ScheduleRow;
}

export async function deleteAgentSchedule(scheduleId: string, userId: string): Promise<void> {
  const response = await apiCall(`/agent/schedules/${scheduleId}${buildQueryString({ userId })}`, { method: 'DELETE', body: JSON.stringify({ userId }) });
  if (!response?.success) throw new Error(response?.error || 'Failed to delete schedule');
}

export async function triggerManualScheduleRun(
  scheduleId: string,
  userId: string,
  metadata?: Record<string, unknown>,
  note?: string
) {
  const response = await apiCall(`/agent/schedules/${scheduleId}/run${buildQueryString({ userId })}`, {
    method: 'POST',
    body: JSON.stringify({ userId, metadata, note }),
  });
  if (!response?.success) throw new Error(response?.error || 'Failed to enqueue manual run');
  return response.data;
}
