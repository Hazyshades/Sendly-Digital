import { Link } from 'react-router-dom';
import { Lock, Unlock, Github, Twitter, Twitch, Mail, Linkedin, MessageCircle, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MarkdownContent } from '@/components/creator/MarkdownContent';
import { AgentAccessPanel } from '@/components/paywall/AgentAccessPanel';
import type {
  PaywallPaymentInstructions,
  PaywallUnlockedResponse,
} from '@/lib/paywall/creatorPaywallAPI';
import { getCreatorProfilePath } from '@/lib/paywall/creatorProfileAPI';
import { ARC_CHAIN_ID, getExplorerTxUrl } from '@/lib/web3/constants';

const PLATFORM_ICONS: Record<string, LucideIcon> = {
  twitter: Twitter,
  github: Github,
  twitch: Twitch,
  gmail: Mail,
  linkedin: Linkedin,
  telegram: MessageCircle,
};

function CreatorLink({ platform, handle }: { platform: string; handle: string }) {
  const Icon = PLATFORM_ICONS[platform] ?? User;
  return (
    <Link
      to={getCreatorProfilePath(platform, handle)}
      className="inline-flex items-center gap-1.5 hover:text-blue-600 hover:underline"
    >
      <Icon className="h-3.5 w-3.5" />@{handle}
    </Link>
  );
}

interface PaywallArticleViewProps {
  loading: boolean;
  notFound: boolean;
  paying: boolean;
  checkingWallet: boolean;
  hasDeveloperWallet: boolean;
  instructions: PaywallPaymentInstructions | null;
  unlocked: PaywallUnlockedResponse | null;
  onPay: () => void;
}

export function PaywallArticleView({
  loading,
  notFound,
  paying,
  checkingWallet,
  hasDeveloperWallet,
  instructions,
  unlocked,
  onPay,
}: PaywallArticleViewProps) {
  if (loading) {
    return <p className="py-12 text-center text-muted-foreground">Loading article…</p>;
  }

  if (notFound) {
    return <p className="py-12 text-center text-muted-foreground">Article not found.</p>;
  }

  if (unlocked) {
    return (
      <Card className="bg-white shadow-circle-card rounded-2xl backdrop-blur-sm border-0 overflow-hidden">
        <CardContent className="p-6 sm:p-8">
          <div className="flex items-start gap-2 mb-2">
            <Unlock className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">{unlocked.title}</h1>
              <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1.5">
                <CreatorLink platform={unlocked.recipient.platform} handle={unlocked.recipient.handle} />
                {unlocked.txHash ? (
                  <>
                    {' · '}
                    <a
                      href={getExplorerTxUrl(ARC_CHAIN_ID, unlocked.txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-blue-600"
                    >
                      View payment
                    </a>
                  </>
                ) : null}
              </p>
            </div>
          </div>
          <div className="mt-8">
            <MarkdownContent content={unlocked.contentBody} />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!instructions) {
    return <p className="py-12 text-center text-muted-foreground">Unable to load article.</p>;
  }

  return (
    <Card className="bg-white shadow-circle-card rounded-2xl backdrop-blur-sm border-0 overflow-hidden">
      <CardContent className="p-6 sm:p-8">
        <div className="flex items-start gap-2 mb-4">
          <Lock className="h-5 w-5 text-gray-600 shrink-0 mt-1" />
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">{instructions.title}</h1>
            <p className="text-sm text-muted-foreground mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
              <CreatorLink platform={instructions.recipient.platform} handle={instructions.recipient.handle} />
              <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-2.5 py-0.5 text-xs font-medium">
                {instructions.priceUsdc} USDC
              </span>
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-5 py-8 text-center space-y-4 my-6">
          <p className="text-sm text-gray-600">
            This article is locked. Pay {instructions.priceUsdc} USDC on Arc to read the full content.
          </p>
          <Button onClick={onPay} disabled={paying || checkingWallet || !hasDeveloperWallet} size="lg">
            {paying ? 'Paying…' : `Pay ${instructions.priceUsdc} USDC & unlock`}
          </Button>
          {!hasDeveloperWallet && !checkingWallet ? (
            <p className="text-xs text-amber-700">
              Create an Internal Wallet on Dashboard to pay on Arc testnet.
            </p>
          ) : null}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Settlement via ZkSend - payment goes to the creator&apos;s social identity on Arc.
        </p>

        <AgentAccessPanel slug={instructions.slug} />
      </CardContent>
    </Card>
  );
}
