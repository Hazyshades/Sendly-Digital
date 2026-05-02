import { useMemo } from 'react';
import { CheckCircle2 } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { PlatformUsernameInput } from './PlatformUsernameInput';
import { normalizeSocialUsername } from '@/lib/reclaim/identity';

import type { SendRecipientType } from './ZkSendPanel';

type Props = {
  platform: SendRecipientType;
  onPlatformChange: (platform: SendRecipientType) => void;
  username: string;
  onUsernameChange: (username: string) => void;
  isConnected?: boolean;
  readOnly?: boolean;
  previewSuggestionLabel?: string;
  previewProfileImageUrl?: string | null;
};

const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export function IdentitySelector({ platform, onPlatformChange, username, onUsernameChange, isConnected, readOnly, previewSuggestionLabel, previewProfileImageUrl }: Props) {
  const normalizedUsername = useMemo(() => normalizeSocialUsername(username.replace(/^@/, '')), [username]);
  const isValid =
    platform === 'address' ? EVM_ADDRESS_RE.test(username.trim()) : !!normalizedUsername;
  const fieldLabel = platform === 'address' ? 'Recipient address' : 'Username';

  return (
    <Card className="border-2">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            {isConnected && isValid && (
              <div className="flex items-center gap-1 text-xs text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Connected</span>
              </div>
            )}
          </div>

          <PlatformUsernameInput
            platform={platform}
            onPlatformChange={onPlatformChange}
            username={username}
            onUsernameChange={onUsernameChange}
            label={fieldLabel}
            inputId="identity-username-input"
            ariaLabel={platform === 'address' ? 'Recipient wallet address' : 'Username'}
            readOnly={readOnly}
            previewSuggestionLabel={previewSuggestionLabel}
            previewProfileImageUrl={previewProfileImageUrl}
          />

          {!isValid && username.length > 0 && (
            <div className="text-xs text-amber-600">
              {platform === 'address'
                ? 'Enter a valid wallet address (0x followed by 40 hex characters).'
                : 'Enter a valid username'}
            </div>
          )}

         {/* {!isValid && (
            <div className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2">
              Select platform and enter username to continue
            </div>
          )} */}
        </div>
      </CardContent>
    </Card>
  );
}
