export interface TranscriptionResult {
  text: string;
  language_code?: string;
  language_probability?: number;
  words?: Array<{
    text: string;
    start: number;
    end: number;
    type: 'word' | 'spacing' | 'audio_event';
    speaker_id?: string;
  }>;
}

export class ElevenLabsService {
  private apiKey: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY || 'sk_e93b8144735060aaf5df2e8fd49e75d51fb6571a05663001';
  }

  async transcribeAudio(audioBlob: Blob): Promise<TranscriptionResult> {
    if (!audioBlob || audioBlob.size === 0) {
      throw new Error('Empty audio blob provided');
    }

    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model_id', 'scribe_v1');
    formData.append('language_code', 'en');

    try {
      const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data as TranscriptionResult;
    } catch (error) {
      console.error('Error transcribing audio:', error);
      throw error;
    }
  }
}

const elevenLabsService = new ElevenLabsService();
export default elevenLabsService;





