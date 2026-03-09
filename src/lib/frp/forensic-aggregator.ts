import { db } from "@/db";
import { auditLedger } from "@/db/schema";
import { eq } from "drizzle-orm";
import { KeyManager } from "./key-manager";
import { EntropyRouter } from "./entropy";

export class ForensicAggregator {
  /**
   * Memory-Safe Base64 Encoder for Vercel Edge.
   * Processes the buffer in 32KB chunks to prevent "Maximum call stack size exceeded".
   */
  private static toBase64Safe(buffer: Uint8Array): string {
    let binary = '';
    const chunkSize = 32768; // 32KB chunks
    for (let i = 0; i < buffer.length; i += chunkSize) {
      const chunk = buffer.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
    }
    return btoa(binary);
  }

  static async processAudit(traceId: string, imageUrl: string, headerBuffer: Uint8Array) {
    console.log(`[AGGREGATOR] Starting Deep Audit: ${traceId}`);

    try {
      const key = await KeyManager.getValidKey();
      if (!key) throw new Error("POOL_EMPTY");

      const modelId = "openai/gpt-oss-120b";
      
      // 1. Safe Base64 Encoding
      console.log(`[AGGREGATOR] Encoding ${headerBuffer.length} bytes...`);
      const base64Header = this.toBase64Safe(headerBuffer);
      console.log(`[AGGREGATOR] Encoding complete. Payload size: ${base64Header.length} chars.`);

      // 2. The 120B Forensic Prompt
      const payload = {
        model: modelId,
        messages:[
          {
            role: "system",
            content: `You are a Deloitte Forensic Auditor. You are inspecting the BINARY HEADER of an image.
            1. Analyze the provided Base64-encoded header for signs of manipulation.
            2. Look for 'Adobe', 'Photoshop', or 'Canva' strings in the decoded data.
            3. If the header is stripped of all metadata, flag it as 'High Risk'.
            Return ONLY a JSON object: {"confidence_score": 0.0-1.0, "analysis": "string"}`
          },
          {
            role: "user",
            content: `Forensic Header Bytes (Base64): ${base64Header}`
          }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      };

      // 3. Execute the 120B Audit
      console.log(`[AGGREGATOR] Dispatching to ${modelId} via Key: ${key.id.substring(0,8)}`);
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: EntropyRouter.getHeaders(key.keyValue),
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errText = await response.text();
        if (response.status === 429) await KeyManager.reportRateLimit(key.id);
        throw new Error(`GROQ_ERROR: ${response.status} - ${errText.substring(0, 100)}`);
      }

      const data = await response.json();
      const resultText = data.choices[0].message.content;
      const cleanedText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
      const analysis = JSON.parse(cleanedText);

      // 4. Update Ledger
      await db.update(auditLedger)
        .set({
          status: "verified",
          fcsScore: analysis.confidence_score.toString(),
          forensicManifest: { 
            binary_analysis: analysis.analysis,
            bytes_inspected: headerBuffer.length,
            model: modelId 
          },
          completedAt: new Date()
        })
        .where(eq(auditLedger.requestId, traceId));

      console.log(`[AGGREGATOR] Success: ${traceId} - FCS: ${analysis.confidence_score}`);

    } catch (error: any) {
      console.error(`[AGGREGATOR] Failure: ${error.message}`);
      await db.update(auditLedger)
        .set({ status: "failed", forensicManifest: { error: error.message } })
        .where(eq(auditLedger.requestId, traceId))
        .catch(() => {});
    }
  }
}
