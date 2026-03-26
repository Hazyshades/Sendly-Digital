// Image Generator for Gift Cards
import type { GiftCardImageData } from '@/types/giftCard';

export class ImageGenerator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 400;
    this.canvas.height = 600;
    this.ctx = this.canvas.getContext('2d')!;
  }

  private getGradientColors(design: string): { from: string; to: string } {
    switch (design) {
      case 'pink':
        return { from: '#ec4899', to: '#8b5cf6' };
      case 'blue':
        return { from: '#3b82f6', to: '#06b6d4' };
      case 'green':
        return { from: '#10b981', to: '#059669' };
      default:
        return { from: '#6b7280', to: '#374151' };
    }
  }

  async generateGiftCardImage(data: GiftCardImageData): Promise<Blob> {
    const { amount, currency, message, design, customImage } = data;
    const { from, to } = this.getGradientColors(design);

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Create gradient background
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, from);
    gradient.addColorStop(1, to);
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Add custom image if provided
    if (customImage) {
      try {
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = customImage;
        });

        // Draw custom image as background with overlay
        this.ctx.globalAlpha = 0.3;
        this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
        this.ctx.globalAlpha = 1.0;

        // Add dark overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      } catch (error) {
        console.warn('Failed to load custom image:', error);
      }
    }

    // Add gift icon
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.font = 'bold 48px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('🎁', this.canvas.width / 2, 80);

    // Add "Gift Card" text
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.font = 'bold 24px Arial';
    this.ctx.fillText('Gift Card', this.canvas.width / 2, 130);

    // Add amount
    this.ctx.fillStyle = 'white';
    this.ctx.font = 'bold 64px Arial';
    this.ctx.fillText(`$${amount}`, this.canvas.width / 2, 220);

    // Add currency
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.font = '20px Arial';
    this.ctx.fillText(currency, this.canvas.width / 2, 250);

    // Add message
    if (message) {
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      this.ctx.font = '16px Arial';
      
      // Wrap text if too long
      const words = message.split(' ');
      const lines: string[] = [];
      let currentLine = '';
      
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = this.ctx.measureText(testLine);
        
        if (metrics.width > this.canvas.width - 40) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      lines.push(currentLine);

      // Draw message lines
      const startY = 320;
      const lineHeight = 25;
      lines.forEach((line, index) => {
        this.ctx.fillText(line, this.canvas.width / 2, startY + index * lineHeight);
      });
    }

    // Add decorative elements
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(20, 20, this.canvas.width - 40, this.canvas.height - 40);

    // Add corner decorations
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.fillRect(20, 20, 30, 30);
    this.ctx.fillRect(this.canvas.width - 50, 20, 30, 30);
    this.ctx.fillRect(20, this.canvas.height - 50, 30, 30);
    this.ctx.fillRect(this.canvas.width - 50, this.canvas.height - 50, 30, 30);

    // Convert to blob
    return new Promise((resolve) => {
      this.canvas.toBlob((blob) => {
        resolve(blob!);
      }, 'image/png', 0.9);
    });
  }

  // Generate QR code for the gift card
  async generateQRCode(_data: string): Promise<Blob> {
    // For now, we'll create a simple placeholder
    // In a real implementation, you'd use a QR code library like qrcode.js
    
    this.canvas.width = 200;
    this.canvas.height = 200;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Create a simple QR-like pattern
    this.ctx.fillStyle = 'white';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.ctx.fillStyle = 'black';
    this.ctx.font = '12px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('QR Code', this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.fillText('Placeholder', this.canvas.width / 2, this.canvas.height / 2 + 20);

    return new Promise((resolve) => {
      this.canvas.toBlob((blob) => {
        resolve(blob!);
      }, 'image/png', 0.9);
    });
  }
}

export default new ImageGenerator();
