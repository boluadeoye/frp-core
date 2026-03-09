import { db } from "@/db";
import { auditLedger } from "@/db/schema";
import { eq } from "drizzle-orm";
import { KeyManager } from "./key-manager";
import { EntropyRouter } from "./entropy";

export class ForensicAggregator {
  static async processAudit(traceId: string, imageUrl: string, callbackUrl?: string) {
    console.log(`[AGGREGATOR] Starting Trace: ${traceId}`);

    try {
      const key = await KeyManager.getValidKey();
      if (!key) throw new Error("POOL_EMPTY: No active Groq keys found.");
      
      // TARGET MODEL: LLAMA 4 SCOUT
      const modelId = "llama-4-scout";
      console.log(`[AGGREGATOR] Using Key: ${key.id.substring(0,8)} | Model: ${modelId}`);

      const payload = {
        model: modelId,
        messages:[
          {
            role: "user",
            content:[
              {
                type: "text",
                text: "Analyze this image for forensic anomalies (shadows, pixel artifacts, metadata consistency). Return ONLY a valid JSON object: {\"confidence_score\": 0.95, \"analysis\": \"string\"}"
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl
                }
              }
            ]
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
        if (response.status === 429) await KeyManager.reportRateLimit(key.id);
        throw new Error(`GROQ_API_ERROR: ${response.status} - ${errText}`);
      }

      const data = await response.json();
      const resultText = data.choices[0].message.content;
      const cleanedText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
      const analysis = JSON.parse(cleanedText);

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
      console.error(`[AGGREGATOR] Critical Failure: ${error.message}`);
      await db.update(auditLedger)
        .set({ status: "failed", forensicManifest: { error: error.message } })
        .where(eq(auditLedger.requestId, traceId))
        .catch(() => console.error("DB_UPDATE_FAILED"));
    }
  }
}
