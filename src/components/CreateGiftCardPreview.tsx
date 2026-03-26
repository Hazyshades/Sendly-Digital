import { Gift, QrCode, Share2, Clock, Lock, ExternalLink, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const TwitterIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const TwitchIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
  </svg>
);

const TelegramIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M9.50039 15.0005L9.30305 18.7916C9.63343 18.7916 9.77653 18.6502 9.94861 18.4803L11.4982 16.9898L15.251 19.7367C15.9373 20.1197 16.4205 19.9285 16.6027 19.0304L18.9395 7.42573L18.9402 7.42504C19.1555 6.32428 18.5201 5.86444 17.851 6.13415L4.90234 11.1053C3.84037 11.5206 3.85629 12.1181 4.7964 12.3878L8.10118 13.3485L15.8533 8.52547C16.2199 8.28796 16.5538 8.42039 16.2799 8.6579L9.50039 15.0005Z" />
  </svg>
);

interface CreateGiftCardPreviewProps {
  compact?: boolean;
}

export function CreateGiftCardPreview({ compact }: CreateGiftCardPreviewProps) {
  const previewData = {
    recipientType: 'twitter' as const,
    recipientUsername: 'alice',
    amount: '25',
    currency: 'USDC' as const,
    design: 'pink' as const,
    message: 'Happy birthday!',
  };

  const cardColor = 'from-pink-400 to-purple-500';

  return (
    <div className={`${compact ? 'p-3' : 'p-6'} space-y-4 pointer-events-none select-none`}>
      <h2 className={`${compact ? 'text-lg' : 'text-2xl'} font-semibold`}>Create a gift card</h2>

      <div className={`grid grid-cols-1 ${compact ? '' : 'lg:grid-cols-2'} gap-4`}>
        {/* Form */}
        <div className="space-y-3">
          {/* Wallet source */}
          <div>
            <Label className={compact ? 'text-xs' : ''}>Wallet source</Label>
            <RadioGroup value="metamask" className="mt-1.5 space-y-1.5 rounded-lg border border-gray-200 bg-gray-50/50 p-2">
              <div className="flex items-center space-x-2.5 rounded-md p-2 bg-white shadow-sm border border-gray-300">
                <RadioGroupItem value="metamask" id="preview-wallet" className="mt-0" />
                <Wallet className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <Label htmlFor="preview-wallet" className={`font-normal ${compact ? 'text-xs' : 'text-sm'}`}>
                  MetaMask (0x1a2B...9f4E)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Recipient type */}
          <div>
            <Label className={compact ? 'text-xs' : ''}>Recipient type</Label>
            <RadioGroup value="twitter" className="mt-1.5 space-y-1.5 rounded-lg border border-gray-200 bg-gray-50/50 p-2">
              {[
                { value: 'address', label: 'Wallet address', icon: <Wallet className="w-4 h-4" />, color: 'text-blue-600' },
                { value: 'twitter', label: 'Twitter', icon: <TwitterIcon className="w-4 h-4" />, color: 'text-gray-900' },
                { value: 'twitch', label: 'Twitch', icon: <TwitchIcon className="w-4 h-4" />, color: 'text-purple-600' },
                { value: 'telegram', label: 'Telegram', icon: <TelegramIcon className="w-4 h-4" />, color: 'text-sky-500' },
              ].map((opt) => (
                <div
                  key={opt.value}
                  className={`flex items-center space-x-2.5 rounded-md p-2 transition-all ${
                    opt.value === 'twitter' ? 'bg-white shadow-sm border border-gray-300' : 'hover:bg-white/60'
                  }`}
                >
                  <RadioGroupItem value={opt.value} id={`prev-${opt.value}`} className="mt-0" />
                  <div className={`flex-shrink-0 ${opt.color}`}>{opt.icon}</div>
                  <Label htmlFor={`prev-${opt.value}`} className={`font-normal ${compact ? 'text-xs' : 'text-sm'}`}>
                    {opt.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Username */}
          <div>
            <Label className={compact ? 'text-xs' : ''} htmlFor="preview-username">Twitter username</Label>
            <Input
              id="preview-username"
              readOnly
              value={previewData.recipientUsername}
              className="mt-1.5"
              tabIndex={-1}
            />
          </div>

          {/* Amount */}
          <div>
            <Label className={compact ? 'text-xs' : ''} htmlFor="preview-amount">Amount (in $)</Label>
            <Input
              id="preview-amount"
              readOnly
              value={previewData.amount}
              className="mt-1.5"
              tabIndex={-1}
            />
          </div>

          {/* Card design */}
          <div>
            <Label className={compact ? 'text-xs' : ''}>Card design</Label>
            <div className="flex gap-2 mt-1.5">
              {[
                { value: 'pink', label: 'Pink', color: 'bg-pink-400' },
                { value: 'blue', label: 'Blue', color: 'bg-blue-400' },
                { value: 'green', label: 'Green', color: 'bg-green-400' },
              ].map((d) => (
                <Button
                  key={d.value}
                  variant={d.value === previewData.design ? 'default' : 'outline'}
                  size="sm"
                  className="flex items-center gap-1.5"
                  tabIndex={-1}
                >
                  <div className={`w-3 h-3 rounded-full ${d.color}`} />
                  {d.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Currency */}
          <div>
            <Label className={compact ? 'text-xs' : ''}>Currency</Label>
            <Select value={previewData.currency}>
              <SelectTrigger className="mt-1.5" tabIndex={-1}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USDC">USDC</SelectItem>
                <SelectItem value="EURC">EURC</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Preview card + buttons */}
        <div className="space-y-3">
          <Label className={compact ? 'text-xs' : ''}>Preview of gift card</Label>

          <Card className={`bg-gradient-to-br ${cardColor} text-white border-0 shadow-lg`}>
            <CardContent className={`${compact ? 'p-4' : 'p-6'} text-center`}>
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <Gift className={compact ? 'w-4 h-4' : 'w-6 h-6'} />
                  <span className={`${compact ? 'text-sm' : 'text-lg'} font-medium`}>Gift Card</span>
                </div>
                <div className={`${compact ? 'text-2xl' : 'text-4xl'} font-bold`}>
                  ${previewData.amount}
                </div>
                <div className="text-sm opacity-90">{previewData.currency}</div>
                <div className="text-sm bg-white/20 rounded-lg p-2 mt-2">
                  &ldquo;{previewData.message}&rdquo;
                </div>
                <div className="flex flex-wrap gap-1.5 justify-center mt-2">
                  <Badge variant="secondary" className="bg-white/20 text-white text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    24h delay
                  </Badge>
                  <Badge variant="secondary" className="bg-white/20 text-white text-xs">
                    <Lock className="w-3 h-3 mr-1" />
                    Protected
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-1.5">
            <Button variant="outline" className="w-full" size="sm" tabIndex={-1}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Top up USDC on Arc (Circle Bridge)
            </Button>
            <Button className="w-full" size={compact ? 'default' : 'lg'} tabIndex={-1}>
              Create a card
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" tabIndex={-1} disabled>
                <QrCode className="w-4 h-4 mr-2" />
                Generate QR
              </Button>
              <Button variant="outline" size="sm" className="flex-1" tabIndex={-1} disabled>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </div>

        {/* Message */}
        <div className={compact ? '' : 'lg:col-span-2'}>
          <Label className={compact ? 'text-xs' : ''} htmlFor="preview-message">Message</Label>
          <Textarea
            id="preview-message"
            readOnly
            value={previewData.message}
            className="mt-1.5 w-full"
            tabIndex={-1}
          />
        </div>
      </div>
    </div>
  );
}
