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
      if (!key) throw new Error("POOL_EMPTY");

      // We use the 120B model as the "Judge" to analyze the metadata
      const modelId = "openai/gpt-oss-120b";
      console.log(`[AGGREGATOR] Using Key: ${key.id.substring(0,8)} | Model: ${modelId}`);

      // In a full implementation, we would pass the actual EXIF JSON here.
      // For this test, we simulate the metadata extraction.
      const simulatedMetadata = {
        "Software": "Adobe Photoshop 25.0",
        "DateTimeOriginal": "2023-10-27T14:32:00Z",
        "GPSLatitude": "34.0522 N",
        "GPSLongitude": "118.2437 W"
      };

      const payload = {
        model: modelId,
        messages:[
          {
            role: "system",
            content: "You are a Deloitte-trained forensic auditor. Analyze the provided image metadata. If you see editing software (like Photoshop), the confidence score must be below 0.5. Return ONLY a valid JSON object: {\"confidence_score\": 0.0-1.0, \"analysis\": \"string\"}"
          },
          {
            role: "user",
            content: `Analyze this metadata: ${JSON.stringify(simulatedMetadata)}`
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
          forensicManifest: { metadata_analysis: analysis.analysis, model: modelId },
          completedAt: new Date()
        })
        .where(eq(auditLedger.requestId, traceId));

      console.log(`[AGGREGATOR] Success: ${traceId} - FCS: ${analysis.confidence_score}`);

    } catch (error: any) {
      console.error(`[AGGREGATOR] Critical Failure: ${error.message}`);
      await db.update(auditLedger)
        .set({ status: "failed", forensicManifest: { error: error.message } })
        .where(eq(auditLedger.requestId, traceId))
        .catch(() => {});
    }
  }
}
