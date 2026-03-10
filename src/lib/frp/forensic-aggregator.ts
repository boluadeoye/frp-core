import { db } from "@/db";
import { auditLedger, burnRegistry } from "@/db/schema";
import { eq } from "drizzle-orm";
import { KeyManager } from "./key-manager";
import { EntropyRouter } from "./entropy";
import * as SunCalc from "suncalc";

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

  /**
   * Calculates Physics based on Client-Provided EXIF data.
   */
  private static calculatePhysics(clientExif: any) {
    try {
      if (!clientExif || !clientExif.latitude || !clientExif.longitude) {
        return { error: "CLIENT_GPS_MISSING" };
      }

      const lat = parseFloat(clientExif.latitude);
      const lon = parseFloat(clientExif.longitude);
      const timestamp = clientExif.timestamp ? new Date(clientExif.timestamp) : new Date();

      const sunPos = SunCalc.getPosition(timestamp, lat, lon);

      return {
        lat: lat.toFixed(4),
        lon: lon.toFixed(4),
        timestamp: timestamp.toISOString(),
        sunAzimuth: (sunPos.azimuth * 180 / Math.PI).toFixed(2),
        sunAltitude: (sunPos.altitude * 180 / Math.PI).toFixed(2),
        iso: clientExif.iso || "Unknown",
        exposureTime: clientExif.exposureTime || "Unknown"
      };
    } catch (e: any) {
      return { error: `PHYSICS_CALC_FAILED: ${e.message}` };
    }
  }

  static async processAudit(traceId: string, imageUrl: string, headerBuffer: Uint8Array, headerHash: string, clientExif: any) {
    console.log(`[AGGREGATOR] Zero-Trust Physics Audit Started: ${traceId}`);

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

      // 1. Calculate Physics from Client Data
      const physics = this.calculatePhysics(clientExif);
      console.log(`[AGGREGATOR] Physics Calculated:`, physics);
      
      const key = await KeyManager.getValidKey();
      if (!key) throw new Error("POOL_EMPTY");

      const modelId = "llama-3.3-70b-versatile";
      const aiBuffer = headerBuffer.slice(0, 4096);
      const base64Sliver = this.toBase64Safe(aiBuffer);

      const payload = {
        model: modelId,
        messages:[
          {
            role: "system",
            content: `You are a Forensic Physics Auditor. 
            1. Analyze the Physics Context (calculated from client GPS). Does the sun altitude match the ISO/Exposure? (e.g., High altitude = bright day = low ISO).
            2. Inspect the Header Sliver (Base64) for 'Adobe', 'Photoshop', or 'Canva'.
            Return ONLY JSON: {"confidence_score": 0.0-1.0, "analysis": "string"}`
          },
          {
            role: "user",
            content: `Physics Context: ${JSON.stringify(physics)}\nHeader Sliver (Base64): ${base64Sliver}`
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
            physics_report: physics,
            client_exif_provided: !!clientExif,
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
