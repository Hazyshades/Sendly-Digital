/// <reference types="vite/client" />

import { supabase } from '@/lib/supabase/client';

export interface PinataMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
}

export class PinataService {
  private uploadEndpoint: string;

  constructor() {
    this.uploadEndpoint = (import.meta.env.VITE_PINATA_UPLOAD_FUNCTION_URL || '').trim();
  }

  private ensureEndpoint(): string {
    if (!this.uploadEndpoint) {
      throw new Error(
        'Pinata uploads require a backend endpoint. Set VITE_PINATA_UPLOAD_FUNCTION_URL to a server route that keeps Pinata credentials off the client.'
      );
    }
    return this.uploadEndpoint;
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async uploadImage(imageBlob: Blob): Promise<string> {
    const formData = new FormData();
    formData.append('file', imageBlob);

    const response = await fetch(`${this.ensureEndpoint().replace(/\/$/, '')}/image`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: formData,
    });

    if (!response.ok) throw new Error(`Failed to upload image: ${response.status} ${await response.text()}`);

    const result = await response.json();
    const uri = result.uri || result.imageUri || (result.IpfsHash ? `ipfs://${result.IpfsHash}` : '');

    if (!uri) {
      throw new Error('Pinata upload endpoint did not return an IPFS URI.');
    }

    return uri;
  }

  async uploadMetadata(metadata: PinataMetadata): Promise<string> {
    const response = await fetch(`${this.ensureEndpoint().replace(/\/$/, '')}/metadata`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(await this.getAuthHeaders()),
      },
      body: JSON.stringify({ metadata }),
    });

    if (!response.ok) throw new Error(`Failed to upload metadata: ${response.status} ${await response.text()}`);

    const result = await response.json();
    const uri = result.uri || result.metadataUri || (result.IpfsHash ? `ipfs://${result.IpfsHash}` : '');

    if (!uri) {
      throw new Error('Pinata metadata endpoint did not return an IPFS URI.');
    }

    return uri;
  }

  async createGiftCardNFT(
    amount: string,
    currency: string,
    message: string,
    design: string,
    imageBlob: Blob
  ): Promise<string> {
    const imageUri = await this.uploadImage(imageBlob);
    const metadata: PinataMetadata = {
      name: `Gift Card - ${amount} ${currency}`,
      description: `A digital gift card worth ${amount} ${currency}. ${message}`,
      image: imageUri,
      attributes: [
        {
          trait_type: 'Amount',
          value: amount,
        },
        {
          trait_type: 'Currency',
          value: currency,
        },
        {
          trait_type: 'Design',
          value: design,
        },
        {
          trait_type: 'Message',
          value: message,
        },
      ],
    };
    return this.uploadMetadata(metadata);
  }
}

export default new PinataService();





