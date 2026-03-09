export interface ForensicHeader {
  exifFound: boolean;
  c2paFound: boolean;
  buffer: Uint8Array;
  contentType: string | null;
  contentLength: number;
}

export class StreamParser {
  // We only need the first 256KB to find EXIF (APP1) and C2PA (JUMBF) markers
  private static readonly CHUNK_SIZE_LIMIT = 256 * 1024; 

  /**
   * Performs a partial stream fetch to extract headers without loading the full image into Edge memory.
   */
  static async extractHeaders(imageUrl: string): Promise<ForensicHeader> {
    console.log(`[FRP] Initiating Surgical Stream: ${imageUrl.substring(0, 50)}...`);
    
    const response = await fetch(imageUrl, {
      headers: {
        // Ask the server to only send the first 256KB if it supports range requests
        'Range': `bytes=0-${this.CHUNK_SIZE_LIMIT}`
      }
    });
    
    if (!response.ok && response.status !== 206) { // 206 is Partial Content
      throw new Error(`[FRP] Target rejected stream: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    const contentLength = parseInt(response.headers.get('content-length') || '0', 10);

    if (!response.body) {
      throw new Error('[FRP] Target returned empty body stream.');
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] =[];
    let receivedLength = 0;
    let exifFound = false;
    let c2paFound = false;

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done || receivedLength >= this.CHUNK_SIZE_LIMIT) {
          // The "Violent Sever": Cancel the stream immediately to save memory
          await reader.cancel();
          console.log(`[FRP] Stream severed at ${receivedLength} bytes.`);
          break;
        }

        chunks.push(value);
        receivedLength += value.length;

        // Quick byte-pattern check for JPEG markers
        // APP1 (Exif) is usually 0xFFE1
        // C2PA (JUMBF) is usually 0xFFE2 or specific box headers
        const chunkStr = Array.from(value.slice(0, 100))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');

        if (chunkStr.includes('ffe1')) exifFound = true;
        if (chunkStr.includes('ffe2')) c2paFound = true;
      }
    } catch (error) {
      console.warn('[FRP] Stream interrupted early, proceeding with extracted bytes.');
    }

    // Combine chunks into a single Uint8Array for the Cryptographer model
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
