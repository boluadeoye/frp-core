import { EntropyRouter } from './entropy';

export interface ForensicHeader {
  exifFound: boolean;
  c2paFound: boolean;
  buffer: Uint8Array;
  contentType: string | null;
  contentLength: number;
}

export class StreamParser {
  // Reduced to 8KB for absolute safety on Free Tier token limits.
  private static readonly CHUNK_SIZE_LIMIT = 8 * 1024; 

  static async extractHeaders(imageUrl: string): Promise<ForensicHeader> {
    console.log(`[FRP] Initiating 8KB Surgical Stream: ${imageUrl.substring(0, 50)}...`);
    
    const organicHeaders = EntropyRouter.getHeaders("");
    delete (organicHeaders as any)["Authorization"];

    const response = await fetch(imageUrl, {
      headers: {
        ...organicHeaders,
        'Range': `bytes=0-${this.CHUNK_SIZE_LIMIT}`
      }
    });
    
    if (!response.ok && response.status !== 206) {
      const errorText = await response.text();
      throw new Error(`[FRP] Target rejected stream: ${errorText.substring(0, 100)}`);
    }

    const contentType = response.headers.get('content-type');
    const contentLength = parseInt(response.headers.get('content-length') || '0', 10);

    if (!response.body) {
      throw new Error('[FRP] Target returned empty body stream.');
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
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

    return {
      exifFound,
      c2paFound,
      buffer: combinedBuffer,
      contentType,
      contentLength: contentLength > receivedLength ? contentLength : receivedLength
    };
  }
}
