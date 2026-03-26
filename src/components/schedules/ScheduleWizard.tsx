import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { CalendarIcon, Clock, FileSpreadsheet, Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/components/ui/utils';
import type { ScheduleInput, ScheduleFrequency, ScheduleSkipStrategy, ScheduleSourceType } from '@/types/agentSchedules';
import { getPersonalContacts, type Contact as PersonalContact } from '@/lib/supabase/contacts';

interface ScheduleWizardProps {
  onSubmit: (input: ScheduleInput) => Promise<void> | void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

type PersonalMode = 'all' | 'favorites' | 'tag' | 'selected';

const WEEK_DAYS: Array<{ value: number; label: string }> = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
];

const TIMEZONES = [
  'UTC',
  'Europe/Moscow',
  'Europe/Berlin',
  'America/New_York',
  'Asia/Tokyo',
];

const SKIP_STRATEGIES: Array<{ value: ScheduleSkipStrategy; label: string; description: string }> = [
  {
    value: 'catch_up',
    label: 'Catch up missed runs',
    description: 'Process every missed iteration on the next run.',
  },
  {
    value: 'skip',
    label: 'Skip',
    description: 'Skip missed iterations and move on to the next date.',
  },
  {
    value: 'manual',
    label: 'Manual only',
    description: 'Execute missed iterations only when run manually.',
  },
];

const SOURCE_OPTIONS: Array<{ value: ScheduleSourceType; label: string; icon: typeof Users | typeof FileSpreadsheet }> = [
  { value: 'personal_contacts', label: 'Personal Contacts', icon: Users },
  { value: 'twitch_table', label: 'Twitch Sheet', icon: FileSpreadsheet },
  { value: 'manual', label: 'Manual List', icon: Users },
];

function toTimeString(date: Date) {
  return date.toISOString().slice(11, 16);
}

function toDateTimeLocalString(date: Date) {
  const adjusted = new Date(date);
  adjusted.setMinutes(adjusted.getMinutes() - adjusted.getTimezoneOffset());
  return adjusted.toISOString().slice(0, 16);
}

export function ScheduleWizard({ onSubmit, onCancel, isSubmitting }: ScheduleWizardProps) {
  const { address } = useAccount();
  const normalizedUserId = useMemo(() => (address ? address.toLowerCase() : null), [address]);

  const defaultStart = useMemo(() => {
    const date = new Date();
    date.setMinutes(date.getMinutes() + 10);
    return date;
  }, []);

  const [errors, setErrors] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    sourceType: 'personal_contacts' as ScheduleSourceType,
    personalMode: 'all' as PersonalMode,
    personalTag: '',
    personalSelected: [] as string[],
    twitchSheetUrl: '',
    twitchWalletColumn: 'wallet',
    twitchAmountColumn: 'payout',
    manualRecipientsNote: '',
    syncBeforeRun: true,
    amountValue: '10',
    amountType: 'fixed' as const,
    currency: 'USDC',
    network: 'ARC-TESTNET',
    scheduleType: 'weekly' as ScheduleFrequency,
    dayOfWeek: new Date().getDay(),
    dayOfMonth: 1,
    timeOfDay: toTimeString(defaultStart),
    startAt: toDateTimeLocalString(defaultStart),
    timezone: 'UTC',
    maxRuns: '',
    skipStrategy: 'catch_up' as ScheduleSkipStrategy,
  });

  const handleChange = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors(null);
  };

  const handlePersonalModeChange = (mode: PersonalMode) => {
    setForm((prev) => ({
      ...prev,
      personalMode: mode,
      personalSelected: mode === 'selected' ? prev.personalSelected : [],
    }));
    setErrors(null);
  };

  const handleTogglePersonalContact = (wallet: string | undefined) => {
    if (!wallet) return;
    const normalized = wallet.toLowerCase();
    setForm((prev) => {
      const exists = prev.personalSelected.includes(normalized);
      return {
        ...prev,
        personalSelected: exists
          ? prev.personalSelected.filter((value) => value !== normalized)
          : [...prev.personalSelected, normalized],
      };
    });
    setErrors(null);
  };

  const personalContactsQuery = useQuery({
    queryKey: ['personal-contacts', normalizedUserId],
    queryFn: () => getPersonalContacts(normalizedUserId!),
    enabled: Boolean(normalizedUserId && form.sourceType === 'personal_contacts'),
    staleTime: 60_000,
  });

  const personalContacts = (personalContactsQuery.data ?? []) as PersonalContact[];

  const validate = () => {
    if (!form.name.trim()) {
      return 'Enter a schedule name';
    }
    const amount = Number(form.amountValue);
    if (!Number.isFinite(amount) || amount <= 0) {
      return 'Enter an amount greater than zero';
    }
    if (!form.startAt) {
      return 'Select a start date and time';
    }
    if (form.scheduleType === 'monthly') {
      const day = Number(form.dayOfMonth);
      if (!Number.isInteger(day) || day < 1 || day > 31) {
        return 'Day of month must be between 1 and 31';
      }
    }
    if (form.sourceType === 'twitch_table' && !form.twitchSheetUrl.trim()) {
      return 'Provide a link to the Twitch sheet';
    }
    if (form.sourceType === 'manual' && !form.manualRecipientsNote.trim()) {
      return 'Describe where the recipient list is stored or how it is prepared';
    }
    if (
      form.sourceType === 'personal_contacts' &&
      form.personalMode === 'selected' &&
      form.personalSelected.length === 0
    ) {
      return 'Select at least one contact for the payout';
    }
    return null;
  };

  const buildPayload = (): ScheduleInput => {
    const amount = Number(form.amountValue) || 0;
    const startAtIso = form.startAt ? new Date(form.startAt).toISOString() : new Date().toISOString();

    let sourceConfig: Record<string, unknown> = {};
    if (form.sourceType === 'personal_contacts') {
      sourceConfig = {
        mode: form.personalMode,
        tag: form.personalMode === 'tag' ? form.personalTag.trim() : undefined,
        selectedWallets: form.personalMode === 'selected' ? form.personalSelected : undefined,
      };
    } else if (form.sourceType === 'twitch_table') {
      sourceConfig = {
        sheetUrl: form.twitchSheetUrl.trim(),
        walletColumn: form.twitchWalletColumn.trim() || 'wallet',
        amountColumn: form.twitchAmountColumn.trim() || 'payout',
        syncBeforeRun: form.syncBeforeRun,
      };
    } else if (form.sourceType === 'manual') {
      sourceConfig = {
        instructions: form.manualRecipientsNote.trim(),
      };
    }

    return {
      name: form.name.trim(),
      description: form.description?.trim() || undefined,
      sourceType: form.sourceType,
      sourceConfig,
      tokenSymbol: form.currency,
      tokenAddress: null,
      network: form.network,
      amountType: form.amountType,
      amountValue: amount,
      amountField: form.sourceType === 'twitch_table' ? form.twitchAmountColumn.trim() : null,
      currency: form.currency,
      scheduleType: form.scheduleType,
      dayOfWeek: form.scheduleType === 'weekly' ? Number(form.dayOfWeek) : null,
      dayOfMonth: form.scheduleType === 'monthly' ? Number(form.dayOfMonth) : null,
      timeOfDay: form.timeOfDay || null,
      timezone: form.timezone || null,
      startAt: startAtIso,
      endAt: undefined,
      maxRuns: form.maxRuns ? Number(form.maxRuns) : undefined,
      skipStrategy: form.skipStrategy,
      metadata: {
        uiVersion: 'agent-schedules-v1',
        createdFrom: 'web-app',
      },
    };
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setErrors(validationError);
      return;
    }

    const payload = buildPayload();
    await onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Core Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="schedule-name">Name</Label>
              <Input
                id="schedule-name"
                placeholder="e.g., Twitch team payouts"
                value={form.name}
                onChange={(event) => handleChange('name', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="schedule-network">Network</Label>
              <Select
                value={form.network}
                onValueChange={(value) => handleChange('network', value)}
              >
                <SelectTrigger id="schedule-network">
                  <SelectValue placeholder="Select a network" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ARC-TESTNET">ARC Testnet</SelectItem>
                  <SelectItem value="ETH-SEPOLIA">Ethereum Sepolia</SelectItem>
                  <SelectItem value="BASE-SEPOLIA">Base Sepolia</SelectItem>
                  <SelectItem value="MATIC-AMOY">Polygon Amoy</SelectItem>
                  <SelectItem value="SOL-DEVNET">Solana Devnet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="schedule-description">Description (optional)</Label>
              <Textarea
                id="schedule-description"
                placeholder="Briefly describe who the payouts go to and why"
                value={form.description}
                onChange={(event) => handleChange('description', event.target.value)}
                rows={3}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Recipient Source</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {SOURCE_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isActive = form.sourceType === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleChange('sourceType', option.value)}
                  className={cn(
                    'flex items-start gap-3 rounded-lg border p-3 text-left transition hover:border-purple-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500',
                    isActive ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
                  )}
                >
                  <Icon className={cn('h-5 w-5 mt-0.5', isActive ? 'text-purple-600' : 'text-gray-500')} />
                  <div>
                    <div className="font-medium text-sm">{option.label}</div>
                    <p className="text-xs text-gray-500 mt-1">
                      {option.value === 'personal_contacts' && 'Use contacts saved in Sendly.'}
                      {option.value === 'twitch_table' && 'Connect a payout sheet from Twitch / Google Sheets.'}
                      {option.value === 'manual' && 'Describe how the recipient list will be prepared manually.'}
                    </p>
                  </div>
                  {isActive && <Badge variant="secondary" className="ml-auto">Selected</Badge>}
                </button>
              );
            })}
          </div>

          {form.sourceType === 'personal_contacts' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Contact subset</Label>
                <Select value={form.personalMode} onValueChange={(value) => handlePersonalModeChange(value as PersonalMode)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All contacts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All contacts</SelectItem>
                    <SelectItem value="favorites">Favorites only</SelectItem>
                    <SelectItem value="tag">By tag/label</SelectItem>
                    <SelectItem value="selected">Custom selection</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.personalMode === 'tag' && (
                <div className="space-y-2">
                  <Label htmlFor="personal-tag">Tag name</Label>
                  <Input
                    id="personal-tag"
                    placeholder="e.g., twitch-vip"
                    value={form.personalTag}
                    onChange={(event) => handleChange('personalTag', event.target.value)}
                  />
                </div>
              )}
              {form.personalMode === 'selected' && (
                <div className="space-y-2 sm:col-span-2">
                  <Label>Select recipients</Label>
                  {!normalizedUserId ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                      Connect your wallet to load personal contacts.
                    </div>
                  ) : personalContactsQuery.isLoading ? (
                    <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading contacts...
                    </div>
                  ) : personalContactsQuery.isError ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                      Failed to load contacts. Try refreshing the page.
                    </div>
                  ) : personalContacts.length === 0 ? (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">
                      No personal contacts found. Add contacts first in the Contacts section.
                    </div>
                  ) : (
                    <ScrollArea className="max-h-60 rounded-xl border border-gray-200 bg-white/80">
                      <div className="divide-y divide-gray-100">
                        {personalContacts.map((contact) => {
                          const wallet = contact.wallet?.toLowerCase();
                          if (!wallet) {
                            return null;
                          }
                          const isChecked = form.personalSelected.includes(wallet);
                          return (
                            <label
                              key={wallet}
                              className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-purple-50/60 transition"
                            >
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() => handleTogglePersonalContact(contact.wallet)}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium text-gray-900">{contact.name || contact.wallet}</span>
                                <span className="text-xs text-gray-500">{contact.wallet}</span>
                              </div>
                              {contact.isFavorite && (
                                <Badge variant="outline" className="ml-auto text-xs">
                                  Favorite
                                </Badge>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              )}
            </div>
          )}

          {form.sourceType === 'twitch_table' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="twitch-sheet-url">Sheet link</Label>
                <Input
                  id="twitch-sheet-url"
                  placeholder="https://docs.google.com/spreadsheets/..."
                  value={form.twitchSheetUrl}
                  onChange={(event) => handleChange('twitchSheetUrl', event.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="twitch-wallet-column">Wallet column</Label>
                  <Input
                    id="twitch-wallet-column"
                    placeholder="wallet"
                    value={form.twitchWalletColumn}
                    onChange={(event) => handleChange('twitchWalletColumn', event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="twitch-amount-column">Amount column</Label>
                  <Input
                    id="twitch-amount-column"
                    placeholder="payout"
                    value={form.twitchAmountColumn}
                    onChange={(event) => handleChange('twitchAmountColumn', event.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Sync sheet before run</p>
                  <p className="text-xs text-gray-500">Reload and validate the data before every execution.</p>
                </div>
                <Switch
                  checked={form.syncBeforeRun}
                  onCheckedChange={(value) => handleChange('syncBeforeRun', value)}
                />
              </div>
            </div>
          )}

          {form.sourceType === 'manual' && (
            <div className="space-y-2">
              <Label htmlFor="manual-note">Recipient preparation instructions</Label>
              <Textarea
                id="manual-note"
                placeholder="Describe where the list is stored (CSV, Airtable, API) and how to prepare it."
                value={form.manualRecipientsNote}
                onChange={(event) => handleChange('manualRecipientsNote', event.target.value)}
                rows={3}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Transaction Template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Amount type</Label>
              <Select
                value={form.amountType}
                onValueChange={(value) => handleChange('amountType', value as typeof form.amountType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Fixed amount" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed amount</SelectItem>
                  <SelectItem value="percentage">Percentage from column</SelectItem>
                  <SelectItem value="formula">Custom formula</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount-value">Amount</Label>
              <Input
                id="amount-value"
                type="number"
                min="0"
                step="0.01"
                value={form.amountValue}
                onChange={(event) => handleChange('amountValue', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Token</Label>
              <Select value={form.currency} onValueChange={(value) => handleChange('currency', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a token" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USDC">USDC</SelectItem>
                  <SelectItem value="EURC">EURC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {form.amountType !== 'fixed' && (
            <p className="text-xs text-gray-500">
              For percentage or formula-based payouts, specify the column in the data source above.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Schedule & Limits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select
                value={form.scheduleType}
                onValueChange={(value) => handleChange('scheduleType', value as ScheduleFrequency)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="time-of-day">Send time</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="time-of-day"
                  type="time"
                  value={form.timeOfDay}
                  onChange={(event) => handleChange('timeOfDay', event.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {form.scheduleType === 'weekly' && (
            <div className="space-y-2">
              <Label>Day of week</Label>
              <Select
                value={String(form.dayOfWeek)}
                onValueChange={(value) => handleChange('dayOfWeek', Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {WEEK_DAYS.map((day) => (
                    <SelectItem key={day.value} value={String(day.value)}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {form.scheduleType === 'monthly' && (
            <div className="space-y-2">
              <Label htmlFor="day-of-month">Day of month</Label>
              <Input
                id="day-of-month"
                type="number"
                min="1"
                max="31"
                value={form.dayOfMonth}
                onChange={(event) => handleChange('dayOfMonth', Number(event.target.value))}
              />
            </div>
          )}

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start-at">First run date</Label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="start-at"
                  type="datetime-local"
                  value={form.startAt}
                  onChange={(event) => handleChange('startAt', event.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Time zone</Label>
              <Select
                value={form.timezone}
                onValueChange={(value) => handleChange('timezone', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="UTC" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((zone) => (
                    <SelectItem key={zone} value={zone}>
                      {zone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="max-runs">Run limit (optional)</Label>
              <Input
                id="max-runs"
                type="number"
                min="1"
                placeholder="e.g., 10"
                value={form.maxRuns}
                onChange={(event) => handleChange('maxRuns', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Skip strategy</Label>
              <Select
                value={form.skipStrategy}
                onValueChange={(value) => handleChange('skipStrategy', value as ScheduleSkipStrategy)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a strategy" />
                </SelectTrigger>
                <SelectContent>
                  {SKIP_STRATEGIES.map((strategy) => (
                    <SelectItem key={strategy.value} value={strategy.value}>
                      <div>
                        <div className="font-medium text-sm">{strategy.label}</div>
                        <div className="text-xs text-gray-500">{strategy.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {errors && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errors}
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create schedule'}
        </Button>
      </div>
    </form>
  );
}

