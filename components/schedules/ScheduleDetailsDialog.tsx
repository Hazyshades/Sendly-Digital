import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Button } from '../ui/button';
import type { ScheduleDetail } from '../../src/types/agentSchedules';

interface ScheduleDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detail: ScheduleDetail | null;
  onRefreshExecutions?: () => void;
}

const EXECUTION_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700' },
  running: { label: 'Running', color: 'bg-blue-100 text-blue-600' },
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
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(value));
  } catch (error) {
    return value;
  }
}

function formatCurrency(amount: string | number, currency: string) {
  const numeric = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(numeric)) {
    return `${amount} ${currency}`;
  }
  return `${numeric.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ${currency}`;
}

export function ScheduleDetailsDialog({
  open,
  onOpenChange,
  detail,
  onRefreshExecutions,
}: ScheduleDetailsDialogProps) {
  const schedule = detail?.schedule;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{schedule?.name ?? 'Schedule Details'}</DialogTitle>
          {schedule?.description && (
            <DialogDescription className="text-gray-600">
              {schedule.description}
            </DialogDescription>
          )}
        </DialogHeader>

        {schedule ? (
          <div className="space-y-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                <Badge variant="outline">
                  Source: {SOURCE_LABELS[schedule.source_type] ?? schedule.source_type}
                </Badge>
                <Badge variant="outline">Network: {schedule.network}</Badge>
                <Badge variant="outline">Token: {schedule.token_symbol}</Badge>
                <Badge variant="outline">Status: {schedule.status}</Badge>
              </div>
              <div className="mt-3 grid gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 sm:grid-cols-2">
                <div>
                  <div className="font-medium text-gray-700">Next Run</div>
                  <div>{formatDateTime(schedule.next_run_at)}</div>
                </div>
                <div>
                  <div className="font-medium text-gray-700">Last Run</div>
                  <div>{formatDateTime(schedule.last_run_at)}</div>
                </div>
                <div>
                  <div className="font-medium text-gray-700">Total Runs</div>
                  <div>{schedule.total_runs}</div>
                </div>
                <div>
                  <div className="font-medium text-gray-700">Successful Payout Total</div>
                  <div>{formatCurrency(schedule.total_amount, schedule.currency)}</div>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">Run History</h3>
                {onRefreshExecutions && (
                  <Button size="sm" variant="outline" onClick={onRefreshExecutions}>
                    Refresh History
                  </Button>
                )}
              </div>
              <Separator className="my-3" />
              <ScrollArea className="max-h-72">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Status</TableHead>
                      <TableHead className="min-w-[160px]">Queued At</TableHead>
                      <TableHead className="min-w-[140px]">Finished At</TableHead>
                      <TableHead className="min-w-[120px]">Recipients</TableHead>
                      <TableHead className="min-w-[120px]">Amount</TableHead>
                      <TableHead className="min-w-[180px]">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.executions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-sm text-gray-500">
                          No runs yet.
                        </TableCell>
                      </TableRow>
                    )}
                    {detail.executions.map((execution) => {
                      const statusConfig = EXECUTION_STATUS[execution.status] || EXECUTION_STATUS.pending;
                      return (
                        <TableRow key={execution.id} className="text-sm">
                          <TableCell>
                            <Badge variant="outline" className={`${statusConfig.color} text-[11px]`}>
                              {statusConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDateTime(execution.queued_at)}</TableCell>
                          <TableCell>{formatDateTime(execution.finished_at)}</TableCell>
                          <TableCell>
                            {execution.success_count}/{execution.total_recipients}
                          </TableCell>
                          <TableCell>{formatCurrency(execution.total_amount, execution.amount_currency)}</TableCell>
                          <TableCell className="text-xs text-gray-500">
                            {execution.error_message || '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-gray-500">
            Select a schedule to view details.
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

