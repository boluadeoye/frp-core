import { db } from "@/db";
import { auditLedger, burnRegistry } from "@/db/schema";
import { eq } from "drizzle-orm";
import { KeyManager } from "./key-manager";
import { EntropyRouter } from "./entropy";
import * as SunCalc from "suncalc";
import exif from "exif-reader";

export class ForensicAggregator {
  /**
   * Memory-safe Base64 encoder.
   */
  private static toBase64Safe(buffer: Uint8Array): string {
    let binary = '';
    const chunkSize = 4096; 
    for (let i = 0; i < buffer.length; i += chunkSize) {
      const chunk = buffer.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
    }
    return btoa(binary);
  }

  private static extractPhysicalContext(buffer: Uint8Array) {
    try {
      // exif-reader uses the full 32KB buffer here
      const metadata = exif(Buffer.from(buffer) as any);
      const gps = metadata.gps;
      const exifData = metadata.exif;

      if (!gps || !gps.GPSLatitude || !gps.GPSLongitude) {
        return { error: "GPS_MISSING" };
      }

      const lat = gps.GPSLatitude[0] + gps.GPSLatitude[1]/60 + gps.GPSLatitude[2]/3600;
      const lon = gps.GPSLongitude[0] + gps.GPSLongitude[1]/60 + gps.GPSLongitude[2]/3600;
      const timestamp = exifData.DateTimeOriginal || new Date();

      const sunPos = SunCalc.getPosition(new Date(timestamp), lat, lon);

      return {
        lat: lat.toFixed(4),
        lon: lon.toFixed(4),
        timestamp,
        sunAzimuth: (sunPos.azimuth * 180 / Math.PI).toFixed(2),
        sunAltitude: (sunPos.altitude * 180 / Math.PI).toFixed(2),
        iso: exifData.ISO,
        exposureTime: exifData.ExposureTime
      };
    } catch (e) {
      return { error: "EXIF_PARSE_FAILED" };
    }
  }

  static async processAudit(traceId: string, imageUrl: string, headerBuffer: Uint8Array, headerHash: string) {
    console.log(`[AGGREGATOR] Starting Hybrid Audit: ${traceId}`);

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

      // 1. Extract Physics using the FULL 32KB buffer
      const physics = this.extractPhysicalContext(headerBuffer);
      
      const key = await KeyManager.getValidKey();
      if (!key) throw new Error("POOL_EMPTY");

      const modelId = "llama-3.3-70b-versatile";
      
      // 2. SURGICAL SLIVER: Only send the first 4KB to the AI to avoid 413 error
      const aiBuffer = headerBuffer.slice(0, 4096);
      const base64Sliver = this.toBase64Safe(aiBuffer);
      
      console.log(`[AGGREGATOR] Physics Extracted. Sending 4KB sliver to AI.`);

      const payload = {
        model: modelId,
        messages:[
          {
            role: "system",
            content: `You are a Forensic Auditor. Analyze the image header sliver and physics context.
            Physics: ${JSON.stringify(physics)}
            Task: 
            1. Verify if EXIF light settings match the sun altitude.
            2. Inspect binary sliver for 'Adobe', 'Photoshop', 'Canva'.
            Return ONLY JSON: {"confidence_score": 0.0-1.0, "analysis": "string"}`
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

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`GROQ_ERROR: ${response.status} - ${errText.substring(0, 100)}`);
      }

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
