import { useState } from 'react';
import { MessageSquare, X, ThumbsDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { cn } from './ui/utils';
import { submitFeedback, type FeedbackInsert } from '../utils/supabase/feedback';
import { usePrivy } from '@privy-io/react-auth';
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
  const [selectedType, setSelectedType] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = usePrivy();
  const { address } = useAccount();

  const toggleExpand = () => {
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
      
      toast.success('Thank you for your feedback! We will definitely review it.');
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
        isExpanded ? 'w-[calc(100vw-1rem)] md:w-96 max-w-md' : 'w-14 md:w-16'
      )}
    >
      <Card
        className={cn(
          'bg-white/95 backdrop-blur-sm shadow-circle-card border-gray-200 overflow-hidden transition-all duration-300',
          isExpanded ? 'h-[500px] md:h-[600px] max-h-[calc(100vh-2rem)]' : 'h-14 md:h-16'
        )}
      >
        {!isExpanded ? (
          <button
            onClick={toggleExpand}
            className="w-full h-full flex items-center justify-center hover:bg-gray-50 transition-colors"
            aria-label="Open feedback form"
          >
            <MessageSquare className="w-6 h-6 text-orange-500" />
          </button>
        ) : (
          <>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b">
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
            <CardContent className="p-4 overflow-y-auto h-[calc(100%-73px)]">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">
                    What could be better? (Select one)
                  </p>
                  <div className="space-y-2">
                    {feedbackTypes.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setSelectedType(type.value)}
                        className={cn(
                          'w-full text-left px-4 py-2.5 rounded-xl border transition-all text-sm font-medium',
                          selectedType === type.value
                            ? 'bg-orange-50 border-orange-300 text-orange-700 shadow-sm'
                            : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                        )}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Additional details (optional)
                  </label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tell us what went wrong or what you expected..."
                    className="min-h-24 resize-none"
                    rows={4}
                  />
                </div>

                <div className="flex gap-3 pt-2">
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

