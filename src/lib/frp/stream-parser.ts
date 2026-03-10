import { EntropyRouter } from './entropy';

export interface ForensicHeader {
  exifFound: boolean;
  c2paFound: boolean;
  buffer: Uint8Array;
  hash: string;
  contentType: string | null;
}

export class StreamParser {
  // 64KB ensures we capture the full EXIF directory for the Node.js parser
  private static readonly CHUNK_SIZE_LIMIT = 64 * 1024; 

  private static async generateHash(buffer: Uint8Array): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer as any);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  static async extractHeaders(imageUrl: string): Promise<ForensicHeader> {
    console.log(`[FRP] Initiating 64KB Surgical Stream: ${imageUrl.substring(0, 50)}...`);
    
    const organicHeaders = EntropyRouter.getHeaders("");
    delete (organicHeaders as any)["Authorization"];

    const response = await fetch(imageUrl, {
      headers: {
        ...organicHeaders,
        'Range': `bytes=0-${this.CHUNK_SIZE_LIMIT}`
      }
    });
    
    if (!response.ok && response.status !== 206) {
      throw new Error(`[FRP] Target rejected stream: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("[FRP] No stream body");

    const chunks: Uint8Array[] =[];
    let receivedLength = 0;
    let exifFound = false;
    let c2paFound = false;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done || receivedLength >= this.CHUNK_SIZE_LIMIT) {
          await reader.cancel();
          break;
        }
        chunks.push(value);
        receivedLength += value.length;

        const chunkStr = Array.from(value.slice(0, 100))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        if (chunkStr.includes('ffe1')) exifFound = true;
        if (chunkStr.includes('ffe2')) c2paFound = true;
      }
    } catch (error) {
      console.warn('[FRP] Stream interrupted.');
    }

    const combinedBuffer = new Uint8Array(receivedLength);
    let position = 0;
    for (const chunk of chunks) {
      combinedBuffer.set(chunk, position);
      position += chunk.length;
    }

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
