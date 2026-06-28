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
  private transcribeEndpoint: string;

  constructor() {
    this.transcribeEndpoint = (import.meta.env.VITE_AUDIO_TRANSCRIBE_FUNCTION_URL || '').trim();
  }

  private getTranscribeEndpoint(): string {
    if (!this.transcribeEndpoint) {
      throw new Error(
        'Audio transcription requires a backend endpoint. Set VITE_AUDIO_TRANSCRIBE_FUNCTION_URL to a server route that keeps ElevenLabs credentials off the client.'
      );
    }
    return this.transcribeEndpoint;
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
      const response = await fetch(this.getTranscribeEndpoint(), {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Audio transcription error: ${response.status} - ${errorText}`);
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





