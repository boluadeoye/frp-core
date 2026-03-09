import { db } from "@/db";
import { auditLedger } from "@/db/schema";
import { eq } from "drizzle-orm";
import { KeyManager } from "./key-manager";
import { EntropyRouter } from "./entropy";

export class ForensicAggregator {
  private static toBase64Safe(buffer: Uint8Array): string {
    let binary = '';
    const chunkSize = 8192; 
    for (let i = 0; i < buffer.length; i += chunkSize) {
      const chunk = buffer.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
    }
    return btoa(binary);
  }

  static async processAudit(traceId: string, imageUrl: string, headerBuffer: Uint8Array) {
    console.log(`[AGGREGATOR] Starting 16KB Audit: ${traceId}`);

    try {
      const key = await KeyManager.getValidKey();
      if (!key) throw new Error("POOL_EMPTY");

      const modelId = "openai/gpt-oss-120b";
      const base64Header = this.toBase64Safe(headerBuffer);
      console.log(`[AGGREGATOR] Payload: ${base64Header.length} chars (~${Math.round(base64Header.length/4)} tokens).`);

      const payload = {
        model: modelId,
        messages:[
          {
            role: "system",
            content: "You are a Deloitte Forensic Auditor. Analyze the provided Base64 image header for 'Adobe', 'Photoshop', or 'Canva' strings. If found, flag as edited. Return ONLY JSON: {\"confidence_score\": 0.0-1.0, \"analysis\": \"string\"}"
          },
          {
            role: "user",
            content: `Header Bytes: ${base64Header}`
          }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      };

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: EntropyRouter.getHeaders(key.keyValue),
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`GROQ_ERROR: ${response.status} - ${errText.substring(0, 100)}`);
      }

      const data = await response.json();
      const analysis = JSON.parse(data.choices[0].message.content);

      await db.update(auditLedger)
        .set({
          status: "verified",
          fcsScore: analysis.confidence_score.toString(),
          forensicManifest: { visual: analysis.analysis, model: modelId },
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
