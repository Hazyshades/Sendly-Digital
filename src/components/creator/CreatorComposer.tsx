import { Github } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MIN_PAYWALL_PRICE_USDC } from '@/lib/paywall/creatorPaywallAPI';

export interface CreatorComposerProps {
  githubLogin: string;
  title: string;
  contentBody: string;
  slug: string;
  priceUsdc: string;
  loading: boolean;
  connectingGithub: boolean;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onSlugChange: (value: string) => void;
  onPriceChange: (value: string) => void;
  onReconnectGithub: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function CreatorComposer({
  githubLogin,
  title,
  contentBody,
  slug,
  priceUsdc,
  loading,
  connectingGithub,
  onTitleChange,
  onContentChange,
  onSlugChange,
  onPriceChange,
  onReconnectGithub,
  onSubmit,
}: CreatorComposerProps) {
  return (
    <Card className="bg-white shadow-circle-card rounded-2xl backdrop-blur-sm border-0 overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Github className="h-4 w-4" />
            <span className="font-medium">@{githubLogin}</span>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onReconnectGithub} disabled={connectingGithub}>
            Reconnect
          </Button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="px-6 pt-6 pb-2">
            <input
              id="title"
              placeholder="Article title"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              required
              className="w-full text-2xl font-semibold text-gray-900 placeholder:text-gray-400 border-0 bg-transparent focus:outline-none focus:ring-0 p-0"
            />
          </div>

          <div className="px-6 pb-6">
            <Textarea
              id="content"
              placeholder="Write your article in Markdown…"
              rows={16}
              value={contentBody}
              onChange={(e) => onContentChange(e.target.value)}
              required
              className="min-h-[320px] resize-y border-0 shadow-none focus-visible:ring-0 text-base leading-relaxed px-0"
            />
            <p className="text-xs text-muted-foreground mt-2">Markdown supported: headings, lists, links, code blocks.</p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end gap-4 px-6 py-4 bg-gray-50/80 border-t border-gray-100">
            <div className="flex-1 space-y-3 sm:space-y-0 sm:flex sm:items-end sm:gap-4">
              <div className="space-y-1.5 sm:w-28">
                <Label htmlFor="price" className="text-xs text-muted-foreground">
                  Price (USDC)
                </Label>
                <Input
                  id="price"
                  type="number"
                  min={MIN_PAYWALL_PRICE_USDC}
                  step="0.01"
                  value={priceUsdc}
                  onChange={(e) => onPriceChange(e.target.value)}
                  required
                  className="bg-white"
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="slug" className="text-xs text-muted-foreground">
                  Public link
                </Label>
                <Input
                  id="slug"
                  placeholder={`${githubLogin}/my-article`}
                  value={slug}
                  onChange={(e) => onSlugChange(e.target.value)}
                  required
                  className="bg-white font-mono text-sm"
                />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="sm:shrink-0">
              {loading ? 'Publishing…' : 'Publish'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
