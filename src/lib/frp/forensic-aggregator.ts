import { db } from "@/db";
import { auditLedger } from "@/db/schema";
import { eq } from "drizzle-orm";
import { KeyManager } from "./key-manager";
import { EntropyRouter } from "./entropy";

export class ForensicAggregator {
  private static toBase64Safe(buffer: Uint8Array): string {
    let binary = '';
    const chunkSize = 4096; 
    for (let i = 0; i < buffer.length; i += chunkSize) {
      const chunk = buffer.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
    }
    return btoa(binary);
  }

  static async processAudit(traceId: string, imageUrl: string, headerBuffer: Uint8Array) {
    console.log(`[AGGREGATOR] Starting 8KB Audit: ${traceId}`);

    try {
      const key = await KeyManager.getValidKey();
      if (!key) throw new Error("POOL_EMPTY");

      // Switching to 70B Versatile - Better instruction following than 20B
      const modelId = "llama-3.3-70b-versatile";
      const base64Header = this.toBase64Safe(headerBuffer);
      console.log(`[AGGREGATOR] Payload: ${base64Header.length} chars (~${Math.round(base64Header.length/4)} tokens).`);

      const payload = {
        model: modelId,
        messages:[
          {
            role: "system",
            content: "You are a Forensic Auditor. Your task is to inspect the provided Base64 image header for strings like 'Adobe', 'Photoshop', 'Canva', or 'GIMP'. If these are found, it indicates the image has been edited. You must respond ONLY with a JSON object. No preamble, no explanation."
          },
          {
            role: "user",
            content: `Analyze the following image header data:
<header_data>
${base64Header}
</header_data>

Return JSON format:
{
  "confidence_score": 0.0 to 1.0,
  "analysis": "detailed forensic findings"
}`
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
      const resultText = data.choices[0].message.content;
      
      // Robust parsing
      const cleanedText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
      const analysis = JSON.parse(cleanedText);

      await db.update(auditLedger)
        .set({
          status: "verified",
          fcsScore: (analysis.confidence_score || 0).toString(),
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
