import { EntropyRouter } from './entropy';

export interface ForensicHeader {
  exifFound: boolean;
  buffer: Uint8Array;
  hash: string;
  contentType: string | null;
  scanDepth: string;
}

export class StreamParser {
  private static readonly INITIAL_STRIKE = 128 * 1024; // 128KB
  private static readonly DEEP_SCAN = 2 * 1024 * 1024; // 2MB for RAW formats

  private static async generateHash(buffer: Uint8Array): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer as any);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Detects if the buffer contains a valid EXIF/TIFF header.
   * Signatures: FFE1 (JPEG), 4949 (TIFF Little Endian), 4D4D (TIFF Big Endian)
   */
  private static hasValidHeader(buffer: Uint8Array): boolean {
    const hex = Array.from(buffer.slice(0, 4))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return hex.includes('ffe1') || hex.includes('4949') || hex.includes('4d4d');
  }

  static async extractHeaders(imageUrl: string): Promise<ForensicHeader> {
    const organicHeaders = EntropyRouter.getHeaders("");
    delete (organicHeaders as any)["Authorization"];

    // STRIKE 1: 128KB
    console.log(`[FRP] Strike 1: 128KB Biopsy...`);
    let response = await fetch(imageUrl, {
      headers: { ...organicHeaders, 'Range': `bytes=0-${this.INITIAL_STRIKE}` }
    });

    if (!response.ok) {
      response = await fetch(imageUrl, { headers: organicHeaders });
    }

    let arrayBuffer = await response.arrayBuffer();
    let buffer = new Uint8Array(arrayBuffer);
    let depth = "128KB";

    // DYNAMIC SCALING: If no header found, trigger 2MB Deep Scan
    if (!this.hasValidHeader(buffer)) {
      console.log(`[FRP] Header not found. Scaling to 2MB Deep Scan...`);
      const deepResponse = await fetch(imageUrl, {
        headers: { ...organicHeaders, 'Range': `bytes=0-${this.DEEP_SCAN}` }
      });
      if (deepResponse.ok) {
        arrayBuffer = await deepResponse.arrayBuffer();
        buffer = new Uint8Array(arrayBuffer);
        depth = "2MB";
      }
    }

    const hash = await this.generateHash(buffer);

    return {
      exifFound: this.hasValidHeader(buffer),
      buffer,
      hash,
      contentType: response.headers.get('content-type'),
      scanDepth: depth
    };
  }
}
