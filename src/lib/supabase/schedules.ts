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

const buildQueryString = (params: Record<string, string | number | boolean | undefined | null>) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    searchParams.set(key, String(value));
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
};

export async function listAgentSchedules(
  userId: string,
  options: ListSchedulesOptions = {}
): Promise<ScheduleWithStats[]> {
  const query = buildQueryString({
    userId,
    status: options.status,
    includeHistory: options.includeHistory ? 'true' : undefined,
  });

  const response = await apiCall(`/agent/schedules${query}`, {
    method: 'GET',
  });

  if (!response?.success) {
    throw new Error(response?.error || 'Failed to load schedules');
  }

  return (response.data ?? []) as ScheduleWithStats[];
}

export async function createAgentSchedule(
  userId: string,
  payload: ScheduleInput
): Promise<ScheduleRow> {
  const response = await apiCall('/agent/schedules', {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      userId,
    }),
  });

  if (!response?.success || !response.data) {
    throw new Error(response?.error || 'Failed to create schedule');
  }

  return response.data as ScheduleRow;
}

export async function getAgentSchedule(
  scheduleId: string,
  userId: string,
  limit = 20
): Promise<ScheduleDetail> {
  const query = buildQueryString({
    userId,
    limit,
  });

  const response = await apiCall(`/agent/schedules/${scheduleId}${query}`, {
    method: 'GET',
  });

  if (!response?.success || !response.data) {
    throw new Error(response?.error || 'Failed to fetch schedule detail');
  }

  return response.data as ScheduleDetail;
}

export async function listAgentScheduleExecutions(
  scheduleId: string,
  userId: string,
  options: ScheduleExecutionsOptions = {}
): Promise<ScheduleExecutionPage> {
  const query = buildQueryString({
    userId,
    page: options.page,
    pageSize: options.pageSize,
  });

  const response = await apiCall(`/agent/schedules/${scheduleId}/executions${query}`, {
    method: 'GET',
  });

  if (!response?.success) {
    throw new Error(response?.error || 'Failed to fetch schedule executions');
  }

  return {
    data: response.data ?? [],
    pagination: response.pagination ?? {
      page: options.page ?? 1,
      pageSize: options.pageSize ?? 20,
      total: 0,
    },
  };
}

export async function updateAgentSchedule(
  scheduleId: string,
  userId: string,
  updates: Partial<ScheduleInput>
): Promise<ScheduleRow> {
  const response = await apiCall(`/agent/schedules/${scheduleId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      ...updates,
      userId,
    }),
  });

  if (!response?.success || !response.data) {
    throw new Error(response?.error || 'Failed to update schedule');
  }

  return response.data as ScheduleRow;
}

export async function deleteAgentSchedule(scheduleId: string, userId: string): Promise<void> {
  const query = buildQueryString({ userId });

  const response = await apiCall(`/agent/schedules/${scheduleId}${query}`, {
    method: 'DELETE',
    body: JSON.stringify({ userId }),
  });

  if (!response?.success) {
    throw new Error(response?.error || 'Failed to delete schedule');
  }
}

export async function triggerManualScheduleRun(
  scheduleId: string,
  userId: string,
  metadata?: Record<string, unknown>,
  note?: string
) {
  const query = buildQueryString({ userId });

  const response = await apiCall(`/agent/schedules/${scheduleId}/run${query}`, {
    method: 'POST',
    body: JSON.stringify({
      userId,
      metadata,
      note,
    }),
  });

  if (!response?.success) {
    throw new Error(response?.error || 'Failed to enqueue manual run');
  }

  return response.data;
}




