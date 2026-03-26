export interface AIMLAPIRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
}

export interface AIMLAPIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ParsedPaymentCommand {
  recipientName: string;
  amount: number;
  currency: 'USDC' | 'EURC' | 'USYC';
  message?: string;
  occasion?: string;
}

export class AIMLAPIService {
  private apiKey: string;
  private baseUrl = 'https://api.aimlapi.com/v1/chat/completions';
  private openAIApiKey: string;
  private openAIBaseUrl = 'https://api.openai.com/v1/chat/completions';

  constructor() {
    this.apiKey = import.meta.env.VITE_AIMLAPI_API_KEY || '7ed88c0107294ab280db8ad2ddfbc485';
    const env = import.meta.env as Record<string, string | undefined>;
    this.openAIApiKey = import.meta.env.VITE_OPENAI_API_KEY || env?.OPENAI_API_KEY || '';
  }

  private async requestCompletion(
    provider: 'aimlapi' | 'openai',
    systemPrompt: string,
    userPrompt: string
  ): Promise<string> {
    const isAiml = provider === 'aimlapi';
    const baseUrl = isAiml ? this.baseUrl : this.openAIBaseUrl;
    const apiKey = isAiml ? this.apiKey : this.openAIApiKey;
    const model = isAiml ? 'deepseek/deepseek-chat' : 'gpt-4o-mini';

    if (!apiKey) {
      throw new Error(
        `API key for ${provider.toUpperCase()} is not configured.`
      );
    }

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${provider.toUpperCase()} API error: ${response.status} - ${errorText}`);
    }

    const data: AIMLAPIResponse = await response.json();
    const content = data.choices[0]?.message?.content || '';

    if (!content.trim()) {
      throw new Error(`${provider.toUpperCase()} API returned empty response`);
    }

    console.log(`AI provider used: ${provider}`);

    return content;
  }

  async parsePaymentCommand(
    userCommand: string,
    contacts: Array<{ name: string; wallet: string }>
  ): Promise<ParsedPaymentCommand | null> {
    const contactsList = contacts.map(c => `${c.name}: ${c.wallet}`).join('\n');
    
    const systemPrompt = `You are an AI agent for processing voice commands for creating gift cards. Your task is to extract from the user's command: 1. Recipient name (find it in the contacts list), 2. Amount in dollars, 3. Currency (USDC, EURC, or USYC - default USDC), 4. Occasion/reason (e.g., "for birthday", "for Christmas", "congratulations", etc.), 5. Message (if specified). User's contacts list: ${contactsList || 'List is empty'}. Reply ONLY with a valid JSON object in the format: {"recipientName": "name from contacts list or null if not found", "amount": number, "currency": "USDC", "EURC", or "USYC", "message": "message text or empty string", "occasion": "occasion or empty string"}. If the recipient name is not found in the contacts list, set recipientName to null. You must return only JSON, without any additional text.`;

    const userPrompt = `Process this command: "${userCommand}"`;

    try {
      let content: string;
      try {
        content = await this.requestCompletion('aimlapi', systemPrompt, userPrompt);
      } catch (primaryError) {
        console.error('Error calling AI/ML API (AIML):', primaryError);

        if (!this.openAIApiKey) {
          throw primaryError;
        }

        console.warn('Falling back to OpenAI API...');
        content = await this.requestCompletion('openai', systemPrompt, userPrompt);
      }

      console.log('AI API response content:', content);
      
      try {
        let jsonString = content.trim();
        
        if (!jsonString.startsWith('{')) {
          const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            jsonString = jsonMatch[0];
          } else {
            throw new Error('No JSON found in response');
          }
        }
        
        const parsed = JSON.parse(jsonString) as ParsedPaymentCommand;
        
        console.log('Parsed JSON:', parsed);
        
        if (parsed.recipientName === null) {
          return null;
        }
        
        return parsed;
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError, 'Content:', content);
        return null;
      }
    } catch (error) {
      console.error('Error calling AI/ML API:', error);
      throw error;
    }
  }
}

const aimlapiService = new AIMLAPIService();
export default aimlapiService;

