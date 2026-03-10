import { EntropyRouter } from './entropy';

export interface ForensicHeader {
  exifFound: boolean;
  c2paFound: boolean;
  buffer: Uint8Array;
  hash: string;
  contentType: string | null;
}

export class StreamParser {
  // Increased to 128KB. The absolute limit for a "Surgical Strike".
  // This ensures we bypass large MakerNote blocks to find GPS tags.
  private static readonly CHUNK_SIZE_LIMIT = 128 * 1024; 

  private static async generateHash(buffer: Uint8Array): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer as any);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  static async extractHeaders(imageUrl: string): Promise<ForensicHeader> {
    console.log(`[FRP] Initiating 128KB Surgical Strike: ${imageUrl.substring(0, 40)}...`);
    
    const organicHeaders = EntropyRouter.getHeaders("");
    delete (organicHeaders as any)["Authorization"];

    const response = await fetch(imageUrl, {
      headers: {
        ...organicHeaders,
        'Range': `bytes=0-${this.CHUNK_SIZE_LIMIT}`
      }
    });
    
    if (!response.ok && response.status !== 206) {
      throw new Error(`TARGET_REJECTED_STREAM: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const combinedBuffer = new Uint8Array(arrayBuffer);

    const hash = await this.generateHash(combinedBuffer);

    return {
      exifFound: true, // Placeholder for logic
      c2paFound: false,
      buffer: combinedBuffer,
      hash,
      contentType: response.headers.get('content-type')
    };
  }
}
