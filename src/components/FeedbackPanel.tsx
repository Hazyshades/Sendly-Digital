import { useState } from 'react';
import { X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import MessageCircleIcon from '@/components/itshover-icons/message-circle-icon';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/components/ui/utils';
import { submitFeedback, type FeedbackInsert } from '@/lib/supabase/feedback';
import { usePrivySafe } from '@/lib/privy/usePrivySafe';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';

const feedbackTypes = [
  { value: 'wallet_issue', label: 'Wallet connection issues' },
  { value: 'broken_error', label: 'Broken / errors' },
  { value: 'slow_unresponsive', label: 'Slow / unresponsive' },
  { value: 'bug', label: 'Report a bug' },
  { value: 'feature', label: 'Suggest a feature' },
  { value: 'question', label: 'Ask a question' },
  { value: 'other', label: 'Other' },
] as const;

export function FeedbackPanel() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFeedbackFocused, setIsFeedbackFocused] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = usePrivySafe();
  const { address } = useAccount();

  const toggleExpand = () => {
    setIsFeedbackFocused(false);
    setIsExpanded(!isExpanded);
    if (isExpanded) {
      // Reset form when closing
      setSelectedType('');
      setDescription('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedType) {
      toast.error('Please select a feedback type');
      return;
    }

    if (!description.trim()) {
      toast.error('Please describe the issue or question');
      return;
    }

    try {
      setIsSubmitting(true);

      const feedbackData: FeedbackInsert = {
        feedback_type: selectedType as FeedbackInsert['feedback_type'],
        description: description.trim(),
        user_id: user?.id,
        user_address: address,
        user_email: (user as any)?.email?.address,
        status: 'new',
      };

      await submitFeedback(feedbackData);
      
      toast.success('Thank you for your feedback! We will definitely review it and remember you.');
      setSelectedType('');
      setDescription('');
      setIsExpanded(false);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to send feedback. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={cn(
        'fixed right-2 bottom-2 md:right-4 md:bottom-4 z-50 transition-all duration-300 ease-in-out',
        isExpanded ? 'w-[calc(100vw-1rem)] md:w-96 max-w-md' : 'w-[44px]'
      )}
    >
      <Card
        className={cn(
          'overflow-hidden transition-all duration-300',
          isExpanded
            ? 'h-[500px] md:h-[600px] max-h-[calc(100vh-2rem)] rounded-2xl bg-white/95 border-gray-200'
            : 'h-[44px] w-[44px] rounded-full border-indigo-100/70 bg-white/75 hover:bg-white/95'
        )}
      >
        {!isExpanded ? (
          <button
            type="button"
            onClick={toggleExpand}
            onFocus={() => setIsFeedbackFocused(true)}
            onBlur={() => setIsFeedbackFocused(false)}
            className="flex h-full w-full items-center justify-center text-indigo-600 transition-colors hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2 motion-reduce:transition-none"
            aria-label="Open feedback form"
            aria-expanded={isExpanded}
          >
            <MessageCircleIcon
              size={24}
              active={isFeedbackFocused}
            />
          </button>
        ) : (
          <>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-semibold">Help us improve</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleExpand}
                className="h-8 w-8"
                aria-label="Close form"
              >
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-3 flex flex-col h-[calc(100%-73px)]">
              <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 min-h-0 mb-3">
                  <ScrollArea className="h-full">
                    <div className="space-y-4 pr-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          What could be better? (Select one)
                        </Label>
                        <RadioGroup
                          value={selectedType}
                          onValueChange={setSelectedType}
                          className="space-y-1.5"
                        >
                          {feedbackTypes.map((type) => (
                            <div
                              key={type.value}
                              className={cn(
                                'flex items-center space-x-2 rounded-xl border p-2 transition-all',
                                selectedType === type.value
                                  ? 'bg-orange-50 border-orange-300'
                                  : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              )}
                            >
                              <RadioGroupItem
                                value={type.value}
                                id={type.value}
                                className="flex-shrink-0"
                              />
                              <Label
                                htmlFor={type.value}
                                className={cn(
                                  'flex-1 cursor-pointer text-sm font-medium',
                                  selectedType === type.value
                                    ? 'text-orange-700'
                                    : 'text-gray-700'
                                )}
                              >
                                {type.label}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </div>

                      <Separator />

                      <div>
                        <Label htmlFor="description" className="text-sm font-medium text-gray-700 mb-1.5 block">
                          Additional details (optional)
                        </Label>
                        <Textarea
                          id="description"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Tell us what went wrong or what you expected..."
                          className="min-h-24 resize-none"
                          rows={4}
                        />
                      </div>
                    </div>
                  </ScrollArea>
                </div>
                <div className="flex gap-2 pt-3 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={toggleExpand}
                    className="flex-1"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-gray-800 hover:bg-gray-900 text-white"
                    disabled={isSubmitting || !selectedType}
                  >
                    {isSubmitting ? 'Sending...' : 'Send Feedback'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}

