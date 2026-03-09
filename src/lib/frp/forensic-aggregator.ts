import { db } from "@/db";
import { auditLedger } from "@/db/schema";
import { eq } from "drizzle-orm";
import { KeyManager } from "./key-manager";
import { EntropyRouter } from "./entropy";

export class ForensicAggregator {
  static async processAudit(traceId: string, imageUrl: string, callbackUrl?: string) {
    console.log(`[AGGREGATOR] Starting Trace: ${traceId}`);

    try {
      // 1. Key Check
      const key = await KeyManager.getValidKey();
      if (!key) throw new Error("POOL_EMPTY: No active Groq keys found in Neon.");
      console.log(`[AGGREGATOR] Using Key: ${key.id.substring(0,8)}`);

      // 2. Vision Call
      const payload = {
        model: "llama-3.2-11b-vision-preview", 
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this image for forensic anomalies. Return JSON: { 'confidence_score': 0.0-1.0, 'analysis': 'string' }" },
              { type: "image_url", image_url: { url: imageUrl } }
            ]
          }
        ],
        response_format: { type: "json_object" }
      };

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: EntropyRouter.getHeaders(key.keyValue),
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        if (response.status === 429) await KeyManager.reportRateLimit(key.id);
        throw new Error(`GROQ_API_ERROR: ${response.status}`);
      }

      const data = await response.json();
      const analysis = JSON.parse(data.choices[0].message.content);

      // 3. Ledger Update
      await db.update(auditLedger)
        .set({
          status: "verified",
          fcsScore: analysis.confidence_score.toString(),
          forensicManifest: { visual: analysis.analysis },
          completedAt: new Date()
        })
        .where(eq(auditLedger.requestId, traceId));

      console.log(`[AGGREGATOR] Success: ${traceId} - FCS: ${analysis.confidence_score}`);

      // 4. Webhook
      if (callbackUrl) {
        await fetch(callbackUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ traceId, fcs: analysis.confidence_score })
        });
      }

    } catch (error: any) {
      console.error(`[AGGREGATOR] Critical Failure: ${error.message}`);
      await db.update(auditLedger)
        .set({ status: "failed", forensicManifest: { error: error.message } })
        .where(eq(auditLedger.requestId, traceId))
        .catch(() => console.error("DB_UPDATE_FAILED_DURING_ERROR_HANDLING"));
    }
  }
}
