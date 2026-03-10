import { EntropyRouter } from './entropy';

export interface ForensicHeader {
  exifFound: boolean;
  c2paFound: boolean;
  buffer: Uint8Array;
  hash: string;
  contentType: string | null;
}

export class StreamParser {
  private static readonly CHUNK_SIZE_LIMIT = 64 * 1024; 

  private static async generateHash(buffer: Uint8Array): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer as any);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  static async extractHeaders(imageUrl: string): Promise<ForensicHeader> {
    console.log(`[FRP] Initiating 64KB Clean Fetch: ${imageUrl.substring(0, 50)}...`);
    
    const organicHeaders = EntropyRouter.getHeaders("");
    delete (organicHeaders as any)["Authorization"];

    // We rely on the Range header to limit the payload size
    const response = await fetch(imageUrl, {
      headers: {
        ...organicHeaders,
        'Range': `bytes=0-${this.CHUNK_SIZE_LIMIT}`
      }
    });
    
    if (!response.ok && response.status !== 206) {
      throw new Error(`[FRP] Target rejected stream: ${response.status}`);
    }

    // Node.js safe buffer extraction (No hanging stream readers)
    const arrayBuffer = await response.arrayBuffer();
    const combinedBuffer = new Uint8Array(arrayBuffer);

    // Quick byte-pattern check
    const chunkStr = Array.from(combinedBuffer.slice(0, 100))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const exifFound = chunkStr.includes('ffe1');
    const c2paFound = chunkStr.includes('ffe2');

    const hash = await this.generateHash(combinedBuffer);

    return {
      exifFound,
      c2paFound,
      buffer: combinedBuffer,
      hash,
      contentType: response.headers.get('content-type')
    };
  }
}
