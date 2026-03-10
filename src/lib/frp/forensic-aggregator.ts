import { db } from "@/db";
import { auditLedger, burnRegistry } from "@/db/schema";
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

  static async processAudit(traceId: string, imageUrl: string, headerBuffer: Uint8Array, headerHash: string) {
    console.log(`[AGGREGATOR] AI-Native Physics Audit Started: ${traceId}`);

    try {
      const burned = await db.query.burnRegistry.findFirst({
        where: eq(burnRegistry.hash, headerHash)
      });

      if (burned) {
        await db.update(auditLedger).set({
          status: "flagged",
          fcsScore: "0.000",
          forensicManifest: { reason: "Blacklisted Fingerprint" },
          completedAt: new Date()
        }).where(eq(auditLedger.requestId, traceId));
        return;
      }

      const key = await KeyManager.getValidKey();
      if (!key) throw new Error("POOL_EMPTY");

      const modelId = "llama-3.3-70b-versatile";
      
      // Send a 16KB sliver. This is enough for the AI to find the EXIF tags 
      // without hitting the 413 Token Limit.
      const aiBuffer = headerBuffer.slice(0, 16384);
      const base64Sliver = this.toBase64Safe(aiBuffer);

      const payload = {
        model: modelId,
        messages:[
          {
            role: "system",
            content: `You are a Forensic Physics Auditor. Analyze the provided Base64 image header.
            Task:
            1. Extract the GPS Latitude, Longitude, and Timestamp from the EXIF data embedded in the Base64 string.
            2. If GPS is found, estimate if the lighting conditions (ISO/Exposure) match an outdoor daytime shot.
            3. Look for 'Adobe', 'Photoshop', or 'Canva' strings.
            Return ONLY JSON: 
            {
              "confidence_score": 0.0-1.0, 
              "analysis": "string",
              "physics_report": { "gps_found": boolean, "details": "string" }
            }`
          },
          {
            role: "user",
            content: `Header Sliver (Base64): ${base64Sliver}`
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

      if (!response.ok) throw new Error(`GROQ_ERROR: ${response.status}`);

      const data = await response.json();
      const analysis = JSON.parse(data.choices[0].message.content);

      await db.update(auditLedger)
        .set({
          status: analysis.confidence_score < 0.4 ? "flagged" : "verified",
          fcsScore: analysis.confidence_score.toString(),
          headerHash: headerHash,
          forensicManifest: { 
            visual: analysis.analysis, 
            physics_report: analysis.physics_report,
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
