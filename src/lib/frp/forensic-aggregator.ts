import { db } from "@/db";
import { auditLedger, burnRegistry } from "@/db/schema";
import { eq } from "drizzle-orm";
import { KeyManager } from "./key-manager";
import { EntropyRouter } from "./entropy";
import * as SunCalc from "suncalc";
import crypto from "crypto";
import fastExif from "fast-exif";

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
   * SERVER-SIDE EXTRACTION: The only source of truth.
   * Uses fast-exif to parse the raw buffer on the server.
   * Casts to 'any' to bypass strict TypeScript string-only definitions.
   */
  private static async extractServerExif(buffer: Uint8Array) {
    try {
      // Force the buffer through the reader
      const data = await (fastExif as any).read(Buffer.from(buffer));
      
      if (!data || !data.gps || !data.gps.GPSLatitude) {
        return { error: "NO_GPS_IN_BINARY" };
      }

      // Convert EXIF GPS format [degrees, minutes, seconds] to decimal
      const lat = data.gps.GPSLatitude[0] + data.gps.GPSLatitude[1]/60 + data.gps.GPSLatitude[2]/3600;
      const lon = data.gps.GPSLongitude[0] + data.gps.GPSLongitude[1]/60 + data.gps.GPSLongitude[2]/3600;
      
      // Handle GPS North/South and East/West references
      const finalLat = data.gps.GPSLatitudeRef === 'S' ? -lat : lat;
      const finalLon = data.gps.GPSLongitudeRef === 'W' ? -lon : lon;

      const timestamp = data.exif.DateTimeOriginal || new Date();
      const sunPos = SunCalc.getPosition(timestamp, finalLat, finalLon);

      return {
        lat: finalLat.toFixed(4),
        lon: finalLon.toFixed(4),
        sunAltitude: (sunPos.altitude * 180 / Math.PI).toFixed(2),
        iso: data.exif.ISO || 0,
        exposure: data.exif.ExposureTime || 0,
        timestamp: timestamp instanceof Date ? timestamp.toISOString() : timestamp
      };
    } catch (e: any) {
      return { error: `BINARY_PARSE_FAILED: ${e.message}` };
    }
  }

  private static generateOracleSignature(traceId: string, hash: string, fcs: string): string {
    const privateKey = process.env.FRP_PRIVATE_KEY;
    if (!privateKey) return "UNSIGNED";
    const payload = `${traceId}:${hash}:${fcs}`;
    const sign = crypto.createSign('SHA256');
    sign.update(payload);
    sign.end();
    return sign.sign(privateKey, 'base64');
  }

  static async processAudit(traceId: string, imageUrl: string, headerBuffer: Uint8Array, headerHash: string, clientExif: any) {
    console.log(`[AGGREGATOR] Hardened Audit: ${traceId}`);

    try {
      // 1. SERVER-SIDE TRUTH EXTRACTION
      const serverExif: any = await this.extractServerExif(headerBuffer);
      console.log(`[AGGREGATOR] Server-Side Truth:`, serverExif);
      
      // 2. CROSS-CHECK: Did the client lie?
      let clientLie = false;
      if (clientExif && serverExif.lat) {
        const latDiff = Math.abs(parseFloat(clientExif.latitude) - parseFloat(serverExif.lat));
        const lonDiff = Math.abs(parseFloat(clientExif.longitude) - parseFloat(serverExif.lon));
        if (latDiff > 0.01 || lonDiff > 0.01) {
          clientLie = true;
          console.warn(`[AGGREGATOR] CLIENT_LIE_DETECTED: Mismatch between binary and provided JSON.`);
        }
      }

      // 3. PHYSICS OVERRIDE
      let physicalLie = false;
      if (serverExif.sunAltitude && parseFloat(serverExif.sunAltitude) < -2 && serverExif.iso > 0 && serverExif.iso < 400) {
        physicalLie = true;
        console.warn(`[AGGREGATOR] PHYSICAL_LIE_DETECTED: Sun at ${serverExif.sunAltitude} but ISO is ${serverExif.iso}`);
      }

      const key = await KeyManager.getValidKey();
      if (!key) throw new Error("POOL_EMPTY");

      const base64Sliver = this.toBase64Safe(headerBuffer.slice(0, 4096));

      const payload = {
        model: "llama-3.3-70b-versatile",
        messages: [{
          role: "system",
          content: "Analyze physics vs binary. Return ONLY JSON: {\"confidence_score\": 0.0-1.0, \"analysis\": \"string\"}"
        }, {
          role: "user",
          content: `Server_Exif: ${JSON.stringify(serverExif)}\nClient_Exif: ${JSON.stringify(clientExif)}\nHeader_Sliver: ${base64Sliver}`
        }],
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
      
      // FINAL DETERMINISTIC SCORE
      let finalScore = parseFloat(analysis.confidence_score || "0");
      let finalAnalysis = analysis.analysis;

      if (physicalLie || clientLie) {
        finalScore = 0.050;
        finalAnalysis = `CRITICAL_TRUST_VIOLATION: ${clientLie ? "Client metadata mismatch." : "Physical impossibility detected."} ${finalAnalysis}`;
      }

      const signature = this.generateOracleSignature(traceId, headerHash, finalScore.toFixed(3));

      await db.update(auditLedger).set({
        status: finalScore < 0.4 ? "flagged" : "verified",
        fcsScore: finalScore.toFixed(3),
        oracleSignature: signature,
        forensicManifest: { 
          visual: finalAnalysis, 
          server_physics: serverExif,
          client_mismatch: clientLie,
          override: physicalLie,
          model: "llama-3.3-70b"
        },
        completedAt: new Date()
      }).where(eq(auditLedger.requestId, traceId));

      console.log(`[AGGREGATOR] Audit Finalized. Score: ${finalScore.toFixed(3)}`);

    } catch (error: any) {
      console.error(`[AGGREGATOR] Failure: ${error.message}`);
      await db.update(auditLedger)
        .set({ status: "failed", forensicManifest: { error: error.message } })
        .where(eq(auditLedger.requestId, traceId))
        .catch(() => {});
    }
  }
}
