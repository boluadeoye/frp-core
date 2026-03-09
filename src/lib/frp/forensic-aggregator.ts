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
      console.log(`[AGGREGATOR] Using Key: ${key.id.substring(0,8)}`);

      // Groq Vision Payload Structure
      const payload = {
        model: "llama-3.2-11b-vision-preview",
        messages:[
          {
            role: "user",
            content:[
              {
                type: "text",
                text: "Analyze this image for forensic anomalies. Return ONLY a valid JSON object in this exact format: {\"confidence_score\": 0.95, \"analysis\": \"No diffusion noise detected.\"} Do not include markdown formatting or any other text."
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
        max_tokens: 256
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
      
      // Clean the response in case the model included markdown (e.g., ```json)
      const cleanedText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
      const analysis = JSON.parse(cleanedText);

      await db.update(auditLedger)
        .set({
          status: "verified",
          fcsScore: analysis.confidence_score.toString(),
          forensicManifest: { visual: analysis.analysis },
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
