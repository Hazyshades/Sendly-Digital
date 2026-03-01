import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, CheckCircle, XCircle, AlertCircle, Info, ChevronUp, ChevronDown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Spinner } from '@/components/ui/spinner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { useAccount, useWalletClient } from 'wagmi';
import { createWalletClient, custom } from 'viem';
import { useChain } from '@/contexts/ChainContext';
import web3Service from '@/lib/web3/web3Service';
import pinataService from '@/lib/pinata';
import imageGenerator from '@/lib/imageGenerator';
import elevenLabsService from '@/lib/elevenlabs';
import aimlapiService, { ParsedPaymentCommand } from '@/lib/aimlapiService';
import type { Contact } from '@/components/ContactsManager';
import { usePrivySafe } from '@/lib/privy/usePrivySafe';
import { DeveloperWalletService } from '@/lib/circle/developerWalletService';

type RecordingState = 'idle' | 'recording' | 'processing' | 'confirming' | 'creating';

const VOICE_AGENT_ENABLED = false;

export function VoicePaymentAgent() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { activeChain, activeChainId } = useChain();
  const { authenticated, user: privyUser } = usePrivySafe();
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [contacts] = useState<Contact[]>([]);
  const [transcribedText, setTranscribedText] = useState('');
  const [parsedCommand, setParsedCommand] = useState<ParsedPaymentCommand | null>(null);
  const [error, setError] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [hasDeveloperWallet, setHasDeveloperWallet] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = async () => {
    try {
      setError('');
      setTranscribedText('');
      setParsedCommand(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        'audio/wav'
      ];
      
      const supportedMimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || 'audio/webm';
      console.log('Using mime type:', supportedMimeType);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: supportedMimeType,
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: supportedMimeType });
        console.log('Audio blob size:', audioBlob.size, 'bytes');
        console.log('Number of chunks:', audioChunksRef.current.length);
        
        if (audioBlob.size === 0) {
          console.error('Empty audio blob recorded');
          setError('Recording is too short. Please try again.');
          toast.error('Recording is too short. Please try again.');
          setRecordingState('idle');
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
          return;
        }
        
        await processAudio(audioBlob);
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start();
      setRecordingState('recording');
      toast.info('Recording started... Speak now');
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Microphone access error');
      toast.error('Failed to access microphone');
      setRecordingState('idle');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.requestData();
      mediaRecorderRef.current.stop();
      setRecordingState('processing');
      toast.info('Processing voice command...');
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    try {
      const transcription = await elevenLabsService.transcribeAudio(audioBlob);
      const text = transcription.text;
      
      setTranscribedText(text);
      toast.success('Speech recognized');

      console.log('Transcribed text:', text);
      console.log('Contacts:', contacts);

      const contactsWithWallet = contacts
        .filter(c => c.wallet)
        .map(c => ({ name: c.name, wallet: c.wallet! }));
      
      const parsed = await aimlapiService.parsePaymentCommand(text, contactsWithWallet);
      
      console.log('Parsed command:', parsed);

      if (!parsed) {
        throw new Error('Failed to process command');
      }

      if (!parsed.recipientName) {
        setError('Recipient name not found in contacts');
        setRecordingState('idle');
        return;
      }

      const recipientNameLower = parsed.recipientName!.toLowerCase().trim();
      const contact = contacts.find(c => c.name.toLowerCase().trim() === recipientNameLower);
      
      console.log('Looking for contact:', parsed.recipientName, 'lowercase:', recipientNameLower);
      console.log('Available contacts:', contacts.map(c => c.name));
      console.log('Found contact:', contact);
      
      if (!contact) {
        setError('Contact not found');
        setRecordingState('idle');
        return;
      }

      setParsedCommand({
        ...parsed,
        recipientName: contact.name,
      });
      
      setRecordingState('confirming');
    } catch (err) {
      console.error('Error processing audio:', err);
      setError(err instanceof Error ? err.message : 'Audio processing error');
      toast.error('Error processing command');
      setRecordingState('idle');
    }
  };

  const confirmAndCreate = async () => {
    if (!parsedCommand || !isConnected || !address) {
      return;
    }

    const contact = contacts.find(c => c.name.toLowerCase() === parsedCommand.recipientName.toLowerCase());
    if (!contact) {
      setError('Contact not found');
      return;
    }

    setRecordingState('creating');
    setError('');

    try {
      const imageBlob = await imageGenerator.generateGiftCardImage({
        amount: parsedCommand.amount.toString(),
        currency: parsedCommand.currency,
        message: parsedCommand.message || parsedCommand.occasion || 'Best wishes',
        design: 'pink',
      });

      const metadataUri = await pinataService.createGiftCardNFT(
        parsedCommand.amount.toString(),
        parsedCommand.currency,
        parsedCommand.message || parsedCommand.occasion || 'Best wishes',
        'pink',
        imageBlob
      );

      let clientToUse = walletClient;
      if (!clientToUse) {
        clientToUse = createWalletClient({
          chain: activeChain,
          transport: custom(window.ethereum)
        });
      }

      await web3Service.initialize(clientToUse, address, activeChainId);

      if (!contact.wallet) {
        setError('Contact wallet address is missing');
        toast.error('Contact wallet address is missing');
        setRecordingState('idle');
        return;
      }

      await web3Service.createGiftCard(
        contact.wallet,
        parsedCommand.amount.toString(),
        parsedCommand.currency,
        metadataUri,
        parsedCommand.message || parsedCommand.occasion || 'Best wishes'
      );

      toast.success('Gift card created successfully!');
      
      setTranscribedText('');
      setParsedCommand(null);
      setRecordingState('idle');
    } catch (err) {
      console.error('Error creating gift card:', err);
      setError(err instanceof Error ? err.message : 'Error creating card');
      toast.error('Error creating card');
      setRecordingState('idle');
    }
  };

  const cancel = () => {
    setTranscribedText('');
    setParsedCommand(null);
    setError('');
    setRecordingState('idle');
  };

  // Checking for a Internal wallet for social networks
  // Check is performed without showing loading indicator, as DeveloperWalletComponent already shows it
  useEffect(() => {
    const checkSocialWallet = async () => {
      // If MetaMask is connected - no need to check a social wallet
      if (isConnected) {
        setHasDeveloperWallet(false);
        return;
      }

      // If no social network is linked - do not check
      if (!authenticated || !privyUser) {
        setHasDeveloperWallet(false);
        return;
      }

      try {
        // Check for a Internal wallet for linked social networks (without showing loading indicator)
        const socialPlatforms = ['twitter', 'twitch', 'telegram', 'tiktok', 'instagram'];
        const blockchain = 'ARC-TESTNET';
        
        for (const platform of socialPlatforms) {
          let socialUserId: string | null = null;
          
          if (platform === 'twitter' && privyUser.twitter) {
            socialUserId = (privyUser.twitter as any).subject;
          } else if (platform === 'twitch' && privyUser.twitch) {
            socialUserId = (privyUser.twitch as any).subject;
          } else if (platform === 'telegram' && privyUser.telegram) {
            socialUserId = privyUser.telegram.telegramUserId || (privyUser.telegram as any).subject;
          } else if (platform === 'tiktok' && privyUser.tiktok) {
            socialUserId = (privyUser.tiktok as any).subject;
          } else if (platform === 'instagram' && (privyUser as any).instagram) {
            socialUserId = ((privyUser as any).instagram as any).subject;
          }

          if (socialUserId) {
            const foundWallet = await DeveloperWalletService.getWalletBySocial(
              platform as 'twitter' | 'twitch' | 'telegram' | 'tiktok' | 'instagram',
              socialUserId,
              blockchain
            );
            
            if (foundWallet) {
              setHasDeveloperWallet(true);
              break;
            }
          }
        }
      } catch (error) {
        console.error('Error checking social wallet:', error);
        setHasDeveloperWallet(false);
      }
    };

    checkSocialWallet();
  }, [isConnected, authenticated, privyUser]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Don't show loading indicator here, as DeveloperWalletComponent already shows it at the top
  // Just hide the component if there's no wallet
  if (!isConnected && !hasDeveloperWallet) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Voice AI Agent Section (disabled) */}
      {VOICE_AGENT_ENABLED && (
      <Card className="bg-white/90 backdrop-blur-sm border border-gray-200 shadow-circle-card">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-50 border border-purple-100">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">Voice AI Agent</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Speak natural language commands to create gift cards
                  </CardDescription>
                </div>
              </div>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </CardHeader>
          
          <CollapsibleContent>
            <CardContent className="space-y-5 pt-0">
              <div className="space-y-4">
                <div className="flex items-center justify-center py-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Button
                          size="lg"
                          variant={recordingState === 'recording' ? 'destructive' : 'default'}
                          onClick={recordingState === 'recording' ? stopRecording : startRecording}
                          disabled={recordingState === 'processing' || recordingState === 'creating' || contacts.length === 0}
                          className="w-32 h-32 rounded-full"
                        >
                          {recordingState === 'recording' ? (
                            <MicOff className="w-8 h-8" />
                          ) : recordingState === 'processing' || recordingState === 'creating' ? (
                            <Spinner className="w-8 h-8" />
                          ) : (
                            <Mic className="w-8 h-8" />
                          )}
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {contacts.length === 0 && 'Add contacts first to use voice commands'}
                      {contacts.length > 0 && recordingState === 'idle' && 'Click to start recording'}
                      {recordingState === 'recording' && 'Click to stop recording'}
                      {(recordingState === 'processing' || recordingState === 'creating') && 'Processing...'}
                    </TooltipContent>
                  </Tooltip>
                </div>

                {recordingState === 'recording' && (
                  <div className="text-center">
                    <Badge variant="destructive" className="animate-pulse">
                      Recording...
                    </Badge>
                  </div>
                )}
              </div>

              <Separator />

              {/* Transcribed Text */}
              {transcribedText && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Transcribed Text</p>
                  <div className="bg-gradient-to-r from-gray-50 to-gray-50/50 p-3.5 rounded-lg border border-gray-200 text-sm">
                    {transcribedText}
                  </div>
                </div>
              )}

              {/* Confirmation Section */}
              {parsedCommand && recordingState === 'confirming' && (
                <div className="space-y-4 p-4 rounded-lg bg-blue-50/50 border border-blue-100">
                  <p className="text-sm font-semibold text-blue-900">Confirm Card Creation</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Recipient</p>
                      <Badge variant="outline" className="font-normal">
                        {parsedCommand.recipientName}
                      </Badge>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Amount</p>
                      <p className="text-sm font-medium text-gray-900">
                        ${parsedCommand.amount} {parsedCommand.currency}
                      </p>
                    </div>
                    {parsedCommand.message && (
                      <div className="space-y-1.5 col-span-2">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Message</p>
                        <p className="text-sm text-gray-700">{parsedCommand.message}</p>
                      </div>
                    )}
                    {parsedCommand.occasion && (
                      <div className="space-y-1.5 col-span-2">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Occasion</p>
                        <Badge variant="outline" className="font-normal">
                          {parsedCommand.occasion}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button onClick={confirmAndCreate} className="flex-1">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Confirm
                    </Button>
                    <Button onClick={cancel} variant="outline" className="flex-1">
                      <XCircle className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Creating Status */}
              {recordingState === 'creating' && (
                <Alert>
                  <AlertDescription>
                    <div className="flex items-center gap-2">
                      <Spinner className="w-4 h-4" />
                      Creating gift card...
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Info Alert */}
              {contacts.length === 0 && recordingState === 'idle' && (
                <div className="flex gap-3 p-3 rounded-lg bg-blue-50/50 border border-blue-100">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-900 leading-relaxed">
                    Add contacts first to use voice commands. Say commands like: "Send Alice a gift card for her birthday with $25"
                  </p>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
      )}
    </div>
  );
}

