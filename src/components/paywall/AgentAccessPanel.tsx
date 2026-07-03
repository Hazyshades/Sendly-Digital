import { useCallback, useMemo, useState } from 'react';
import { Bot, Copy, Check, Eye, EyeOff, Loader2, Play } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getCreatorPaywallApiBase } from '@/lib/paywall/creatorPaywallAPI';
import { publicAnonKey } from '@/lib/supabase/info';

type EndpointId = 'llms.txt' | 'openapi.json' | 'lepton-hackathon' | 'paywall';

type ApiResponse = {
  status: number;
  timeMs: number;
  contentType: string;
  body: string;
  error?: string;
};

function encodeSlug(slug: string): string {
  return slug
    .split('/')
    .map(encodeURIComponent)
    .join('/');
}

function maskKey(key: string): string {
  if (key.length <= 16) return '••••••••';
  return `${key.slice(0, 8)}…${key.slice(-6)}`;
}

function formatBody(text: string, contentType: string): string {
  if (contentType.includes('json')) {
    try {
      return JSON.stringify(JSON.parse(text), null, 2);
    } catch {
      return text;
    }
  }
  return text;
}

function statusColor(status: number): string {
  if (status >= 200 && status < 300) return 'text-green-700 bg-green-50';
  if (status === 402) return 'text-amber-700 bg-amber-50';
  if (status >= 400) return 'text-red-700 bg-red-50';
  return 'text-gray-700 bg-gray-100';
}

export function AgentAccessPanel({ slug }: { slug: string }) {
  const base = getCreatorPaywallApiBase();
  const [endpointId, setEndpointId] = useState<EndpointId>('paywall');
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ApiResponse | null>(null);

  const endpoints = useMemo(
    () =>
      ({
        'llms.txt': { label: 'llms.txt', url: `${base}/llms.txt` },
        'openapi.json': { label: 'openapi.json', url: `${base}/openapi.json` },
        'lepton-hackathon': { label: 'lepton-hackathon', url: `${base}/lepton-hackathon` },
        paywall: {
          label: `paywall/${slug}`,
          url: `${base}/paywall/${encodeSlug(slug)}`,
        },
      }) satisfies Record<EndpointId, { label: string; url: string }>,
    [base, slug],
  );

  const selected = endpoints[endpointId];

  const curl = [
    `curl -H "Authorization: Bearer ${publicAnonKey}" \\`,
    `  "${selected.url}"`,
  ].join('\n');

  const sendRequest = useCallback(async () => {
    setLoading(true);
    setResponse(null);
    const started = performance.now();
    try {
      const res = await fetch(selected.url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      });
      const contentType = res.headers.get('content-type') ?? 'text/plain';
      const raw = await res.text();
      setResponse({
        status: res.status,
        timeMs: Math.round(performance.now() - started),
        contentType,
        body: formatBody(raw, contentType),
      });
    } catch (err) {
      setResponse({
        status: 0,
        timeMs: Math.round(performance.now() - started),
        contentType: 'text/plain',
        body: '',
        error: err instanceof Error ? err.message : 'Network error',
      });
    } finally {
      setLoading(false);
    }
  }, [selected.url]);

  const onCopyCurl = async () => {
    try {
      await navigator.clipboard.writeText(curl);
      setCopied(true);
      toast.success('curl copied');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Copy failed');
    }
  };

  const presetIds: EndpointId[] = ['llms.txt', 'openapi.json', 'lepton-hackathon', 'paywall'];

  return (
    <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50/60 p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <Bot className="h-4 w-4 text-gray-700" />
        <h2 className="text-sm font-semibold text-gray-900">Agent Access</h2>
      </div>
      <p className="mt-1.5 text-xs text-gray-600">
        This resource is payable by an AI agent - no browser required. Use Try it to call endpoints
        with the anon key and see live responses (including HTTP 402).
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {presetIds.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setEndpointId(id);
              setResponse(null);
            }}
            className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
              endpointId === id
                ? 'border-blue-300 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:text-blue-700'
            }`}
          >
            {endpoints[id].label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3 rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
            Try it
          </span>
          <Select value={endpointId} onValueChange={(v) => {
            setEndpointId(v as EndpointId);
            setResponse(null);
          }}>
            <SelectTrigger className="h-8 w-full sm:w-[220px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {presetIds.map((id) => (
                <SelectItem key={id} value={id} className="text-xs">
                  {endpoints[id].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Request</p>
          <pre className="overflow-x-auto rounded-md bg-gray-900 p-3 text-[11px] leading-relaxed text-gray-100">
            <code>{`GET ${selected.url}\nAuthorization: Bearer ${showKey ? publicAnonKey : maskKey(publicAnonKey)}`}</code>
          </pre>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="default"
              className="h-8 gap-1.5 text-xs"
              onClick={() => void sendRequest()}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              Send
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs"
              onClick={() => setShowKey((v) => !v)}
            >
              {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {showKey ? 'Hide key' : 'Show key'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs"
              onClick={onCopyCurl}
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy curl'}
            </Button>
          </div>
        </div>

        {response ? (
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Response</p>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span
                className={`rounded-md px-2 py-0.5 font-mono font-semibold ${statusColor(response.status)}`}
              >
                HTTP {response.status || 'ERR'}
              </span>
              <span className="text-gray-500">{response.timeMs}ms</span>
              {response.contentType ? (
                <span className="truncate text-gray-400">{response.contentType}</span>
              ) : null}
            </div>
            {response.error ? (
              <p className="text-xs text-red-600">{response.error}</p>
            ) : (
              <pre className="max-h-64 overflow-auto rounded-md border border-gray-200 bg-gray-50 p-3 text-[11px] leading-relaxed text-gray-800">
                <code>{response.body || '(empty body)'}</code>
              </pre>
            )}
            {response.status === 402 ? (
              <p className="text-[11px] text-amber-700">
                HTTP 402 is expected - agent pays on Arc, then retries with payment headers.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
