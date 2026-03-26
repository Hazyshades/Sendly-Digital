import { Play, Pause, RefreshCw, MoreHorizontal, Loader2, Clock4 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { ScheduleWithStats } from '@/types/agentSchedules';
import { cn } from '@/components/ui/utils';

interface ScheduleListProps {
  schedules: ScheduleWithStats[];
  isLoading?: boolean;
  isMutating?: boolean;
  onRefresh?: () => void;
  onRun: (schedule: ScheduleWithStats) => void;
  onTogglePause: (schedule: ScheduleWithStats) => void;
  onDelete: (schedule: ScheduleWithStats) => void;
  onInspect: (schedule: ScheduleWithStats) => void;
}

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'destructive' | 'outline' | 'secondary'; className?: string }> = {
  active: { label: 'Active', variant: 'outline', className: 'bg-emerald-100 text-emerald-700 border-transparent' },
  paused: { label: 'Paused', variant: 'outline', className: 'bg-gray-100 text-gray-700 border-transparent' },
  completed: { label: 'Completed', variant: 'outline', className: 'bg-blue-100 text-blue-700 border-transparent' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
  draft: { label: 'Draft', variant: 'outline', className: 'bg-purple-100 text-purple-700 border-transparent' },
};

const EXECUTION_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700' },
  running: { label: 'Running', color: 'bg-blue-100 text-blue-700' },
  success: { label: 'Success', color: 'bg-emerald-100 text-emerald-700' },
  partial: { label: 'Partial', color: 'bg-purple-100 text-purple-700' },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-600' },
};

const SOURCE_LABELS: Record<string, string> = {
  personal_contacts: 'Personal Contacts',
  twitch_table: 'Twitch Table',
  manual: 'Manual List',
  import: 'Import',
};

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  try {
    const formatter = new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    return formatter.format(new Date(value));
  } catch (error) {
    return value;
  }
}

function formatScheduleFrequency(schedule: ScheduleWithStats) {
  switch (schedule.schedule_type) {
    case 'daily':
      return 'Daily';
    case 'weekly':
      return 'Weekly';
    case 'monthly':
      return 'Monthly';
    case 'custom':
      return 'Custom cron';
    default:
      return schedule.schedule_type;
  }
}

export function ScheduleList({
  schedules,
  isLoading,
  isMutating,
  onRefresh,
  onRun,
  onTogglePause,
  onDelete,
  onInspect,
}: ScheduleListProps) {
  if (schedules.length === 0 && !isLoading) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white/60 p-8 text-center text-sm text-gray-500">
        No active schedules yet. Create one to automate recurring payouts.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="text-sm font-medium text-gray-700">
          Schedules
          <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">{schedules.length}</span>
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={isLoading ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'} />
              Refresh
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[220px]">Name</TableHead>
              <TableHead className="min-w-[180px]">Source</TableHead>
              <TableHead className="min-w-[140px]">Frequency</TableHead>
              <TableHead className="min-w-[160px]">Next Run</TableHead>
              <TableHead className="min-w-[160px]">Last Run</TableHead>
              <TableHead className="min-w-[120px]">Status</TableHead>
              <TableHead className="w-[140px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedules.map((schedule) => {
              const statusConfig = STATUS_MAP[schedule.status] || STATUS_MAP.active;
              const lastExecution = schedule.last_execution;
              const executionStatus = lastExecution ? EXECUTION_STATUS[lastExecution.status] : null;
              return (
                <TableRow key={schedule.id} className="hover:bg-purple-50/40">
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="font-medium text-sm text-gray-900">{schedule.name}</div>
                      {schedule.description && (
                        <div className="text-xs text-gray-500 line-clamp-2">{schedule.description}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {SOURCE_LABELS[schedule.source_type] ?? schedule.source_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {formatScheduleFrequency(schedule)}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <Clock4 className="h-4 w-4 text-gray-400" />
                      {formatDateTime(schedule.next_run_at)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {lastExecution ? (
                      <div className="flex flex-col gap-1">
                        <div className="text-sm text-gray-600">{formatDateTime(lastExecution.finished_at || lastExecution.queued_at)}</div>
                        <Badge
                          variant="outline"
                          className={executionStatus ? `${executionStatus.color} text-[10px] font-medium` : 'text-[10px]'}
                        >
                          {executionStatus ? executionStatus.label : lastExecution.status}
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusConfig.variant} className={cn('text-xs', statusConfig.className)}>
                      {statusConfig.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => onRun(schedule)}
                            disabled={isMutating || schedule.status !== 'active' || schedule.paused}
                          >
                            {isMutating ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4 text-emerald-600" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Run manually</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => onTogglePause(schedule)}
                            disabled={isMutating}
                          >
                            {schedule.paused || schedule.status === 'paused' ? (
                              <Play className="h-4 w-4 text-blue-600" />
                            ) : (
                              <Pause className="h-4 w-4 text-gray-600" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {schedule.paused || schedule.status === 'paused' ? 'Resume' : 'Pause'}
                        </TooltipContent>
                      </Tooltip>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => onInspect(schedule)}>
                            View details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => onDelete(schedule)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}

            {isLoading && (
              <TableRow>
                <TableCell colSpan={7}>
                  <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading schedules...
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

