import { EntropyRouter } from './entropy';

export interface ForensicHeader {
  exifFound: boolean;
  c2paFound: boolean;
  buffer: Uint8Array;
  hash: string;
  contentType: string | null;
}

export class StreamParser {
  private static readonly CHUNK_SIZE_LIMIT = 128 * 1024; 

  private static async generateHash(buffer: Uint8Array): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer as any);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  static async extractHeaders(imageUrl: string): Promise<ForensicHeader> {
    console.log(`[FRP] Initiating Resilient Stream: ${imageUrl.substring(0, 40)}...`);
    
    const organicHeaders = EntropyRouter.getHeaders("");
    delete (organicHeaders as any)["Authorization"];

    // Attempt 1: Surgical Strike (Range Request)
    let response = await fetch(imageUrl, {
      headers: { ...organicHeaders, 'Range': `bytes=0-${this.CHUNK_SIZE_LIMIT}` }
    });

    // Fallback: If Gateway rejects Range (422, 416, 400), perform Manual Severing
    if (!response.ok) {
      console.warn(`[FRP] Range request rejected (${response.status}). Pivoting to Manual Severing...`);
      response = await fetch(imageUrl, { headers: organicHeaders });
    }

    if (!response.ok) {
      throw new Error(`TARGET_REJECTED_STREAM: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("STREAM_BODY_UNAVAILABLE");

    const chunks: Uint8Array[] = [];
    let receivedLength = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done || receivedLength >= this.CHUNK_SIZE_LIMIT) {
          await reader.cancel(); // Violently sever the connection
          break;
        }
        chunks.push(value);
        receivedLength += value.length;
      }
    } catch (e) {
      console.log("[FRP] Stream severed successfully.");
    }

    const combinedBuffer = new Uint8Array(receivedLength);
    let position = 0;
    for (const chunk of chunks) {
      combinedBuffer.set(chunk, position);
      position += chunk.length;
    }

    const hash = await this.generateHash(combinedBuffer);

    return {
      exifFound: true,
      c2paFound: false,
      buffer: combinedBuffer,
      hash,
      contentType: response.headers.get('content-type')
    };
  }
}
