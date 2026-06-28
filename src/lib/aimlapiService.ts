export interface ParsedPaymentCommand {
  recipientName: string | null;
  amount: number;
  currency: 'USDC' | 'EURC' | 'USYC';
  message?: string;
  occasion?: string;
}

export class AIMLAPIService {
  private parseEndpoint: string;

  constructor() {
    this.parseEndpoint = (import.meta.env.VITE_AI_PARSE_FUNCTION_URL || '').trim();
  }

  private getParseEndpoint(): string {
    if (!this.parseEndpoint) {
      throw new Error(
        'AI command parsing requires a backend endpoint. Set VITE_AI_PARSE_FUNCTION_URL to a server route that keeps provider API keys off the client.'
      );
    }
    return this.parseEndpoint;
  }

  async parsePaymentCommand(
    userCommand: string,
    contacts: Array<{ name: string; wallet: string }>
  ): Promise<ParsedPaymentCommand | null> {
    const contactsList = contacts.map(c => `${c.name}: ${c.wallet}`).join('\n');

    try {
      const response = await fetch(this.getParseEndpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userCommand,
          contacts,
          contactsList,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI command parser returned HTTP ${response.status}: ${await response.text()}`);
      }

      const parsed = (await response.json()) as ParsedPaymentCommand | null;
      if (!parsed?.recipientName) return null;
      return parsed;
    } catch (error) {
      console.error('Error calling AI/ML API:', error);
      throw error;
    }
  }
}

const aimlapiService = new AIMLAPIService();
export default aimlapiService;

