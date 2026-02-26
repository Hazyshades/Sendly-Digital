import { useState, useEffect, useRef } from 'react';
import { X, Twitter, Twitch, Github, MessageCircle, Instagram, Linkedin, Mail, Wallet, ChevronDown, Loader2, CheckCircle2 } from 'lucide-react';

import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { fetchTwitterUserPreview, normalizeTwitterHandle, type TwitterUserPreview } from '../../utils/twitter';
import {
  fetchTwitchUserPreview,
  normalizeTwitchLogin,
  formatTwitchFollowers,
  type TwitchUserPreview,
} from '../../utils/twitch';
import {
  fetchGitHubUserPreview,
  normalizeGitHubLogin,
  type GitHubUserPreview,
} from '../../utils/github';
import {
  fetchTelegramUserPreview,
  normalizeTelegramUsername,
  type TelegramUserPreview,
} from '../../utils/telegram';

import type { SendRecipientType } from './ZkSendPanel';

const PREVIEW_DEBOUNCE_MS = 500;
/** Twitter preview: 3s debounce to reduce Twitter API (twitterapi.io) usage when typing. */
const TWITTER_PREVIEW_DEBOUNCE_MS = 3000;

/** Module-level cache for successful Twitter previews (key = normalized username). Survives tab switch. */
const twitterPreviewCache = new Map<string, TwitterUserPreview>();

/** Module-level cache for successful Twitch previews (key = normalized login). Survives tab switch. */
const twitchPreviewCache = new Map<string, TwitchUserPreview>();

/** Module-level cache for successful GitHub previews (key = normalized login). Survives tab switch. */
const githubPreviewCache = new Map<string, GitHubUserPreview>();

/** Module-level cache for successful Telegram previews (key = normalized username). Survives tab switch. */
const telegramPreviewCache = new Map<string, TelegramUserPreview>();

const PLATFORM_OPTIONS: {
  value: SendRecipientType;
  label: string;
  hint: string;
  icon: typeof Twitter;
  disabled?: boolean;
}[] = [
  { value: 'twitter', label: 'Twitter / X', hint: 'Send to handle', icon: Twitter },
  { value: 'twitch', label: 'Twitch', hint: 'Send to username', icon: Twitch },
  { value: 'github', label: 'GitHub', hint: 'Send to username', icon: Github },
  { value: 'telegram', label: 'Telegram', hint: 'Send to username', icon: MessageCircle },
  { value: 'instagram', label: 'Instagram', hint: 'Send to username', icon: Instagram, disabled: true },
  { value: 'gmail', label: 'Gmail', hint: 'Send to email', icon: Mail },
  { value: 'linkedin', label: 'LinkedIn', hint: 'Send to username', icon: Linkedin },
  { value: 'address', label: 'Address', hint: 'Send to wallet', icon: Wallet },
];

type Props = {
  platform: SendRecipientType;
  onPlatformChange: (platform: SendRecipientType) => void;
  username: string;
  onUsernameChange: (username: string) => void;
  label?: string;
  inputId?: string;
  ariaLabel?: string;
};

type PreviewStatus = 'idle' | 'loading' | 'success' | 'error';

export function PlatformUsernameInput({
  platform,
  onPlatformChange,
  username,
  onUsernameChange,
  label = 'To',
  inputId = 'platform-username-input',
  ariaLabel = 'Username',
}: Props) {
  const [platformPopoverOpen, setPlatformPopoverOpen] = useState(false);
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>('idle');
  const [previewData, setPreviewData] = useState<TwitterUserPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [twitchPreviewStatus, setTwitchPreviewStatus] = useState<PreviewStatus>('idle');
  const [twitchPreviewData, setTwitchPreviewData] = useState<TwitchUserPreview | null>(null);
  const [twitchPreviewError, setTwitchPreviewError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRequestRef = useRef<string>('');
  const inFlightRequestRef = useRef<string>('');
  const twitchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const twitchLastRequestRef = useRef<string>('');
  const twitchInFlightRequestRef = useRef<string>('');
  const [githubPreviewStatus, setGithubPreviewStatus] = useState<PreviewStatus>('idle');
  const [githubPreviewData, setGithubPreviewData] = useState<GitHubUserPreview | null>(null);
  const [githubPreviewError, setGithubPreviewError] = useState<string | null>(null);
  const githubDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const githubLastRequestRef = useRef<string>('');
  const githubInFlightRequestRef = useRef<string>('');
  const [telegramPreviewStatus, setTelegramPreviewStatus] = useState<PreviewStatus>('idle');
  const [telegramPreviewData, setTelegramPreviewData] = useState<TelegramUserPreview | null>(null);
  const [telegramPreviewError, setTelegramPreviewError] = useState<string | null>(null);
  const telegramDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const telegramLastRequestRef = useRef<string>('');
  const telegramInFlightRequestRef = useRef<string>('');

  const currentPlatformOpt = PLATFORM_OPTIONS.find((o) => o.value === platform) ?? PLATFORM_OPTIONS[0];
  const normalizedUsername = normalizeTwitterHandle(username);
  const normalizedTwitchLogin = normalizeTwitchLogin(username);
  const normalizedGitHubLogin = normalizeGitHubLogin(username);
  const normalizedTelegramUsername = normalizeTelegramUsername(username);
  const showTwitterPreview = platform === 'twitter';
  const showTwitchPreview = platform === 'twitch';
  const showGitHubPreview = platform === 'github';
  const showTelegramPreview = platform === 'telegram';

  useEffect(() => {
    if (!showTwitterPreview || !normalizedUsername) {
      setPreviewStatus('idle');
      setPreviewData(null);
      setPreviewError(null);
      inFlightRequestRef.current = '';
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      return;
    }

    const cached = twitterPreviewCache.get(normalizedUsername);
    if (cached) {
      setPreviewStatus('success');
      setPreviewData(cached);
      setPreviewError(null);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    setPreviewStatus('loading');
    setPreviewError(null);

    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      const requested = normalizedUsername;
      if (inFlightRequestRef.current === requested) return;
      inFlightRequestRef.current = requested;
      lastRequestRef.current = requested;

      fetchTwitterUserPreview(requested)
        .then((result) => {
          if (lastRequestRef.current !== requested) return;
          if (result.success) {
            twitterPreviewCache.set(requested, result.data);
            setPreviewStatus('success');
            setPreviewData(result.data);
            setPreviewError(null);
          } else {
            setPreviewStatus('error');
            setPreviewData(null);
            setPreviewError(result.error);
          }
        })
        .finally(() => {
          inFlightRequestRef.current = '';
        });
    }, TWITTER_PREVIEW_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [showTwitterPreview, normalizedUsername]);

  useEffect(() => {
    if (!showTwitchPreview || !normalizedTwitchLogin) {
      setTwitchPreviewStatus('idle');
      setTwitchPreviewData(null);
      setTwitchPreviewError(null);
      twitchInFlightRequestRef.current = '';
      if (twitchDebounceRef.current) {
        clearTimeout(twitchDebounceRef.current);
        twitchDebounceRef.current = null;
      }
      return;
    }

    const cached = twitchPreviewCache.get(normalizedTwitchLogin);
    if (cached) {
      setTwitchPreviewStatus('success');
      setTwitchPreviewData(cached);
      setTwitchPreviewError(null);
      return;
    }

    if (twitchDebounceRef.current) clearTimeout(twitchDebounceRef.current);
    setTwitchPreviewStatus('loading');
    setTwitchPreviewError(null);

    twitchDebounceRef.current = setTimeout(() => {
      twitchDebounceRef.current = null;
      const requested = normalizedTwitchLogin;
      if (twitchInFlightRequestRef.current === requested) return;
      twitchInFlightRequestRef.current = requested;
      twitchLastRequestRef.current = requested;

      fetchTwitchUserPreview(requested)
        .then((result) => {
          if (twitchLastRequestRef.current !== requested) return;
          if (result.success) {
            twitchPreviewCache.set(requested, result.data);
            setTwitchPreviewStatus('success');
            setTwitchPreviewData(result.data);
            setTwitchPreviewError(null);
          } else {
            setTwitchPreviewStatus('error');
            setTwitchPreviewData(null);
            setTwitchPreviewError(result.error);
          }
        })
        .finally(() => {
          twitchInFlightRequestRef.current = '';
        });
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      if (twitchDebounceRef.current) {
        clearTimeout(twitchDebounceRef.current);
        twitchDebounceRef.current = null;
      }
    };
  }, [showTwitchPreview, normalizedTwitchLogin]);

  useEffect(() => {
    if (!showGitHubPreview || !normalizedGitHubLogin) {
      setGithubPreviewStatus('idle');
      setGithubPreviewData(null);
      setGithubPreviewError(null);
      githubInFlightRequestRef.current = '';
      if (githubDebounceRef.current) {
        clearTimeout(githubDebounceRef.current);
        githubDebounceRef.current = null;
      }
      return;
    }

    const cached = githubPreviewCache.get(normalizedGitHubLogin);
    if (cached) {
      setGithubPreviewStatus('success');
      setGithubPreviewData(cached);
      setGithubPreviewError(null);
      return;
    }

    if (githubDebounceRef.current) clearTimeout(githubDebounceRef.current);
    setGithubPreviewStatus('loading');
    setGithubPreviewError(null);

    githubDebounceRef.current = setTimeout(() => {
      githubDebounceRef.current = null;
      const requested = normalizedGitHubLogin;
      if (githubInFlightRequestRef.current === requested) return;
      githubInFlightRequestRef.current = requested;
      githubLastRequestRef.current = requested;

      fetchGitHubUserPreview(requested)
        .then((result) => {
          if (githubLastRequestRef.current !== requested) return;
          if (result.success) {
            githubPreviewCache.set(requested, result.data);
            setGithubPreviewStatus('success');
            setGithubPreviewData(result.data);
            setGithubPreviewError(null);
          } else {
            setGithubPreviewStatus('error');
            setGithubPreviewData(null);
            setGithubPreviewError(result.error);
          }
        })
        .finally(() => {
          githubInFlightRequestRef.current = '';
        });
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      if (githubDebounceRef.current) {
        clearTimeout(githubDebounceRef.current);
        githubDebounceRef.current = null;
      }
    };
  }, [showGitHubPreview, normalizedGitHubLogin]);

  useEffect(() => {
    if (!showTelegramPreview || !normalizedTelegramUsername) {
      setTelegramPreviewStatus('idle');
      setTelegramPreviewData(null);
      setTelegramPreviewError(null);
      telegramInFlightRequestRef.current = '';
      if (telegramDebounceRef.current) {
        clearTimeout(telegramDebounceRef.current);
        telegramDebounceRef.current = null;
      }
      return;
    }

    const cached = telegramPreviewCache.get(normalizedTelegramUsername);
    if (cached) {
      setTelegramPreviewStatus('success');
      setTelegramPreviewData(cached);
      setTelegramPreviewError(null);
      return;
    }

    if (telegramDebounceRef.current) clearTimeout(telegramDebounceRef.current);
    setTelegramPreviewStatus('loading');
    setTelegramPreviewError(null);

    telegramDebounceRef.current = setTimeout(() => {
      telegramDebounceRef.current = null;
      const requested = normalizedTelegramUsername;
      if (telegramInFlightRequestRef.current === requested) return;
      telegramInFlightRequestRef.current = requested;
      telegramLastRequestRef.current = requested;

      fetchTelegramUserPreview(requested)
        .then((result) => {
          if (telegramLastRequestRef.current !== requested) return;
          if (result.success) {
            telegramPreviewCache.set(requested, result.data);
            setTelegramPreviewStatus('success');
            setTelegramPreviewData(result.data);
            setTelegramPreviewError(null);
          } else {
            setTelegramPreviewStatus('error');
            setTelegramPreviewData(null);
            setTelegramPreviewError(result.error);
          }
        })
        .finally(() => {
          telegramInFlightRequestRef.current = '';
        });
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      if (telegramDebounceRef.current) {
        clearTimeout(telegramDebounceRef.current);
        telegramDebounceRef.current = null;
      }
    };
  }, [showTelegramPreview, normalizedTelegramUsername]);

  const clearUsername = () => onUsernameChange('');

  return (
    <div className="space-y-2">
      {label ? <Label htmlFor={inputId}>{label}</Label> : null}
      <div className="flex gap-0 items-center rounded-xl border bg-background ring-offset-background has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-offset-2 overflow-hidden">
        <div className="relative flex-1 min-w-0">
          <Input
            id={inputId}
            value={username}
            onChange={(e) => onUsernameChange(e.target.value)}
            placeholder={platform === 'address' ? '0x...' : '@username'}
            aria-label={platform === 'address' ? 'Recipient wallet address' : ariaLabel}
            className="border-0 rounded-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 pr-10 font-mono"
          />
          {username.length > 0 && (
            <button
              type="button"
              onClick={clearUsername}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded"
              aria-label="Clear"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Popover open={platformPopoverOpen} onOpenChange={setPlatformPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1.5 shrink-0 h-9 pl-2 pr-2 py-1 border-input text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
              aria-label="Choose platform"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted dark:bg-muted/80 text-foreground">
                {(() => {
                  const Icon = currentPlatformOpt.icon;
                  return <Icon className="h-4 w-4 shrink-0" />;
                })()}
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 transition-transform ${platformPopoverOpen ? 'rotate-180' : ''}`}
                aria-hidden
              />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-2" align="end" sideOffset={4}>
            <div className="space-y-0.5">
              {PLATFORM_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isDisabled = opt.disabled;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={isDisabled}
                    title={isDisabled ? 'Temporarily unavailable' : undefined}
                    onClick={() => {
                      if (isDisabled) return;
                      onPlatformChange(opt.value);
                      setPlatformPopoverOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${platform === opt.value ? 'bg-muted/40' : ''} ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted/60'}`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="font-medium">{opt.label}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{opt.hint}</span>
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {showTwitterPreview && normalizedUsername && (
        <>
          {previewStatus === 'loading' && (
            <div
              className="flex items-center gap-2 rounded-full bg-muted/60 px-3 py-2 text-sm text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                <Twitter className="h-4 w-4 text-muted-foreground" />
              </span>
              <span>@{normalizedUsername}</span>
              <span>Searching…</span>
              <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
            </div>
          )}
          {previewStatus === 'success' && previewData && (
            <div
              className="flex items-center gap-2 rounded-full bg-sky-100 dark:bg-sky-900/30 px-3 py-2 text-sm"
              role="status"
            >
              {previewData.profile_image_url ? (
                <img
                  src={previewData.profile_image_url}
                  alt=""
                  className="h-8 w-8 shrink-0 rounded-full object-cover"
                  width={32}
                  height={32}
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                  <Twitter className="h-4 w-4 text-muted-foreground" />
                </span>
              )}
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                {previewData.name && previewData.name !== previewData.username && (
                  <a
                    href={`https://x.com/${previewData.username.replace(/^@/, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-foreground underline decoration-muted-foreground/50 underline-offset-2 hover:decoration-foreground"
                  >
                    {previewData.name}
                  </a>
                )}
                <span className="shrink-0 font-medium text-foreground">@{previewData.username}</span>
              </div>
              <CheckCircle2 className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden />
            </div>
          )}
          {previewStatus === 'error' && previewError && (
            <p className="text-sm text-destructive" role="alert">
              {previewError}
            </p>
          )}
        </>
      )}

      {showTwitchPreview && normalizedTwitchLogin && (
        <>
          {twitchPreviewStatus === 'loading' && (
            <div
              className="flex items-center gap-2 rounded-full bg-muted/60 px-3 py-2 text-sm text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                <Twitch className="h-4 w-4 text-muted-foreground" />
              </span>
              <span>{normalizedTwitchLogin}</span>
              <span>Searching…</span>
              <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
            </div>
          )}
          {twitchPreviewStatus === 'success' && twitchPreviewData && (
            <div
              className="flex items-center gap-2 rounded-full bg-purple-100 dark:bg-purple-900/30 px-3 py-2 text-sm"
              role="status"
            >
              {twitchPreviewData.profile_image_url ? (
                <img
                  src={twitchPreviewData.profile_image_url}
                  alt=""
                  className="h-8 w-8 shrink-0 rounded-full object-cover"
                  width={32}
                  height={32}
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                  <Twitch className="h-4 w-4 text-muted-foreground" />
                </span>
              )}
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                {twitchPreviewData.display_name && twitchPreviewData.display_name !== twitchPreviewData.login && (
                  <span className="truncate text-foreground">{twitchPreviewData.display_name}</span>
                )}
                <span className="shrink-0 font-medium text-foreground">{twitchPreviewData.login}</span>
                <span className="shrink-0 text-muted-foreground">
                  {formatTwitchFollowers(twitchPreviewData.followers_total)} followers
                </span>
              </div>
              <CheckCircle2 className="h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400" aria-hidden />
            </div>
          )}
          {twitchPreviewStatus === 'error' && twitchPreviewError && (
            <p className="text-sm text-destructive" role="alert">
              {twitchPreviewError}
            </p>
          )}
        </>
      )}

      {showGitHubPreview && normalizedGitHubLogin && (
        <>
          {githubPreviewStatus === 'loading' && (
            <div
              className="flex items-center gap-2 rounded-full bg-muted/60 px-3 py-2 text-sm text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                <Github className="h-4 w-4 text-muted-foreground" />
              </span>
              <span>{normalizedGitHubLogin}</span>
              <span>Searching…</span>
              <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
            </div>
          )}
          {githubPreviewStatus === 'success' && githubPreviewData && (
            <div
              className="flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-900/30 px-3 py-2 text-sm"
              role="status"
            >
              {githubPreviewData.avatar_url ? (
                <img
                  src={githubPreviewData.avatar_url}
                  alt=""
                  className="h-8 w-8 shrink-0 rounded-full object-cover"
                  width={32}
                  height={32}
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                  <Github className="h-4 w-4 text-muted-foreground" />
                </span>
              )}
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                {githubPreviewData.name && githubPreviewData.name !== githubPreviewData.login && (
                  <a
                    href={`https://github.com/${githubPreviewData.login}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-foreground underline decoration-muted-foreground/50 underline-offset-2 hover:decoration-foreground"
                  >
                    {githubPreviewData.name}
                  </a>
                )}
                <span className="shrink-0 font-medium text-foreground">{githubPreviewData.login}</span>
              </div>
              <CheckCircle2 className="h-4 w-4 shrink-0 text-slate-600 dark:text-slate-400" aria-hidden />
            </div>
          )}
          {githubPreviewStatus === 'error' && githubPreviewError && (
            <p className="text-sm text-destructive" role="alert">
              {githubPreviewError}
            </p>
          )}
        </>
      )}

      {showTelegramPreview && normalizedTelegramUsername && (
        <>
          {telegramPreviewStatus === 'loading' && (
            <div
              className="flex items-center gap-2 rounded-full bg-muted/60 px-3 py-2 text-sm text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
              </span>
              <span>@{normalizedTelegramUsername}</span>
              <span>Searching…</span>
              <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
            </div>
          )}
          {telegramPreviewStatus === 'success' && telegramPreviewData && (
            <div
              className="flex items-center gap-2 rounded-full bg-sky-100 dark:bg-sky-900/30 px-3 py-2 text-sm"
              role="status"
            >
              {telegramPreviewData.profile_image_url ? (
                <img
                  src={telegramPreviewData.profile_image_url}
                  alt=""
                  className="h-8 w-8 shrink-0 rounded-full object-cover"
                  width={32}
                  height={32}
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                  <MessageCircle className="h-4 w-4 text-muted-foreground" />
                </span>
              )}
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                {telegramPreviewData.name && telegramPreviewData.name !== telegramPreviewData.username && (
                  <span className="truncate text-foreground">{telegramPreviewData.name}</span>
                )}
                <span className="shrink-0 font-medium text-foreground">@{telegramPreviewData.username}</span>
              </div>
              <CheckCircle2 className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden />
            </div>
          )}
          {telegramPreviewStatus === 'error' && telegramPreviewError && (
            <p className="text-sm text-destructive" role="alert">
              {telegramPreviewError}
            </p>
          )}
        </>
      )}
    </div>
  );
}
