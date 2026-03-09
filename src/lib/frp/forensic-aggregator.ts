import { db } from "@/db";
import { auditLedger, burnRegistry } from "@/db/schema";
import { eq } from "drizzle-orm";
import { KeyManager } from "./key-manager";
import { EntropyRouter } from "./entropy";
import SunCalc from "suncalc";
import exif from "exif-reader";

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
   * Extracts GPS and Timestamp from the 8KB buffer.
   */
  private static extractPhysicalContext(buffer: Uint8Array) {
    try {
      const metadata = exif(Buffer.from(buffer));
      const gps = metadata.gps;
      const exifData = metadata.exif;

      if (!gps || !gps.GPSLatitude || !gps.GPSLongitude) {
        return { error: "No GPS metadata found in 8KB header." };
      }

      // Convert EXIF GPS format to decimal
      const lat = gps.GPSLatitude[0] + gps.GPSLatitude[1]/60 + gps.GPSLatitude[2]/3600;
      const lon = gps.GPSLongitude[0] + gps.GPSLongitude[1]/60 + gps.GPSLongitude[2]/3600;
      const timestamp = exifData.DateTimeOriginal || new Date();

      // Calculate Sun Position
      const sunPos = SunCalc.getPosition(new Date(timestamp), lat, lon);

      return {
        lat,
        lon,
        timestamp,
        sunAzimuth: (sunPos.azimuth * 180 / Math.PI).toFixed(2),
        sunAltitude: (sunPos.altitude * 180 / Math.PI).toFixed(2),
        iso: exifData.ISO,
        exposureTime: exifData.ExposureTime
      };
    } catch (e) {
      return { error: "Failed to parse EXIF physics." };
    }
  }

  static async processAudit(traceId: string, imageUrl: string, headerBuffer: Uint8Array, headerHash: string) {
    console.log(`[AGGREGATOR] Physics Audit Started: ${traceId}`);

    try {
      // 1. Registry Check
      const burned = await db.query.burnRegistry.findFirst({
        where: eq(burnRegistry.hash, headerHash)
      });

      if (burned) {
        await db.update(auditLedger).set({
          status: "flagged",
          fcsScore: "0.000",
          forensicManifest: { reason: "Blacklisted Fingerprint", registry_match: true },
          completedAt: new Date()
        }).where(eq(auditLedger.requestId, traceId));
        return;
      }

      // 2. Extract Physics Context
      const physics = this.extractPhysicalContext(headerBuffer);
      console.log(`[AGGREGATOR] Physics Extracted: ${JSON.stringify(physics)}`);

      // 3. AI Physics Audit
      const key = await KeyManager.getValidKey();
      if (!key) throw new Error("POOL_EMPTY");

      const modelId = "llama-3.3-70b-versatile";
      const base64Header = this.toBase64Safe(headerBuffer);

      const payload = {
        model: modelId,
        messages:[
          {
            role: "system",
            content: `You are a Forensic Physics Auditor. Analyze the image header and the calculated solar position.
            Solar Context: The sun was at Altitude ${physics.sunAltitude}° and Azimuth ${physics.sunAzimuth}°.
            EXIF Context: ISO ${physics.iso}, Exposure ${physics.exposureTime}.
            Task: 
            1. Check if the EXIF light settings (ISO/Exposure) are consistent with the sun's altitude.
            2. Check the binary header for 'Adobe' or 'Photoshop' strings.
            Return ONLY JSON: {"confidence_score": 0.0-1.0, "analysis": "string"}`
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

      if (!response.ok) throw new Error(`GROQ_ERROR: ${response.status}`);

      const data = await response.json();
      const analysis = JSON.parse(data.choices[0].message.content);

      // 4. Update Ledger
      const finalScore = analysis.confidence_score || 0;
      await db.update(auditLedger)
        .set({
          status: finalScore < 0.4 ? "flagged" : "verified",
          fcsScore: finalScore.toString(),
          headerHash: headerHash,
          forensicManifest: { 
            visual: analysis.analysis, 
            physics_report: physics,
            model: modelId 
          },
          completedAt: new Date()
        })
        .where(eq(auditLedger.requestId, traceId));

      console.log(`[AGGREGATOR] Success: ${traceId} - FCS: ${finalScore}`);

    } catch (error: any) {
      console.error(`[AGGREGATOR] Failure: ${error.message}`);
      await db.update(auditLedger)
        .set({ status: "failed", forensicManifest: { error: error.message } })
        .where(eq(auditLedger.requestId, traceId))
        .catch(() => {});
    }
  }
}
