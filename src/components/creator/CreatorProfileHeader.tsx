import { Github, Twitter, Twitch, Mail, Linkedin, MessageCircle, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CreatorProfile } from '@/lib/paywall/creatorProfileAPI';
import { useCreatorAvatar } from '@/hooks/useCreatorAvatar';

const PLATFORM_ICONS: Record<string, LucideIcon> = {
  twitter: Twitter,
  github: Github,
  twitch: Twitch,
  gmail: Mail,
  linkedin: Linkedin,
  telegram: MessageCircle,
};

const PLATFORM_LABELS: Record<string, string> = {
  twitter: 'Twitter / X',
  github: 'GitHub',
  twitch: 'Twitch',
  gmail: 'Gmail',
  linkedin: 'LinkedIn',
  telegram: 'Telegram',
};

function initials(name: string): string {
  const clean = name.replace(/^@/, '').trim();
  return clean.slice(0, 2).toUpperCase() || '??';
}

export function CreatorProfileHeader({
  profile,
  articleCount,
}: {
  profile: CreatorProfile;
  articleCount: number;
}) {
  const Icon = PLATFORM_ICONS[profile.platform] ?? User;
  const platformLabel = PLATFORM_LABELS[profile.platform] ?? profile.platform;

  // Fall back to a live social lookup (same as Payments tab) when the stored
  // profile has no avatar / display name yet.
  const looked = useCreatorAvatar(profile.platform, profile.handle, !profile.avatarUrl);
  const avatarUrl = profile.avatarUrl || looked?.avatarUrl || null;
  const name = profile.displayName || looked?.displayName || profile.handle;

  return (
    <div className="flex items-start gap-4 p-6 sm:p-8">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-50 text-blue-600">
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-lg font-semibold">{initials(name)}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-semibold text-gray-900 truncate">{name}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5" />@{profile.handle}
          </span>
          <span className="text-gray-300">·</span>
          <span>{platformLabel}</span>
          <span className="text-gray-300">·</span>
          <span>
            {articleCount} {articleCount === 1 ? 'article' : 'articles'}
          </span>
        </p>
        {profile.bio ? <p className="mt-3 text-sm text-gray-700">{profile.bio}</p> : null}
      </div>
    </div>
  );
}
