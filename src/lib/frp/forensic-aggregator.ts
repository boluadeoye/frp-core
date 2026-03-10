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

  private static async extractServerExif(buffer: Uint8Array) {
    try {
      const data = await (fastExif as any).read(Buffer.from(buffer));
      if (!data || !data.gps || !data.gps.GPSLatitude) return { error: "DATA_NOT_FOUND_IN_128KB" };

      const lat = data.gps.GPSLatitude[0] + data.gps.GPSLatitude[1]/60 + data.gps.GPSLatitude[2]/3600;
      const lon = data.gps.GPSLongitude[0] + data.gps.GPSLongitude[1]/60 + data.gps.GPSLongitude[2]/3600;
      const finalLat = data.gps.GPSLatitudeRef === 'S' ? -lat : lat;
      const finalLon = data.gps.GPSLongitudeRef === 'W' ? -lon : lon;

      const timestamp = data.exif.DateTimeOriginal || new Date();
      const sunPos = SunCalc.getPosition(timestamp, finalLat, finalLon);

      return {
        lat: finalLat.toFixed(4),
        lon: finalLon.toFixed(4),
        sunAltitude: (sunPos.altitude * 180 / Math.PI).toFixed(2),
        iso: data.exif.ISO || 0,
        exposure: data.exif.ExposureTime || 0
      };
    } catch (e) {
      return { error: "PARSE_FAILED" };
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
    try {
      const serverExif: any = await this.extractServerExif(headerBuffer);
      
      // TRUST BOUNDARY CHECK
      let trustViolation = false;
      let violationReason = "";

      if (serverExif.error && clientExif.latitude) {
        trustViolation = true;
        violationReason = "Server could not verify GPS in binary, but client provided GPS.";
      } else if (serverExif.lat && clientExif.latitude) {
        const diff = Math.abs(parseFloat(clientExif.latitude) - parseFloat(serverExif.lat));
        if (diff > 0.01) {
          trustViolation = true;
          violationReason = "Client GPS does not match Binary GPS.";
        }
      }

      const key = await KeyManager.getValidKey();
      const base64Sliver = this.toBase64Safe(headerBuffer.slice(0, 4096));

      const payload = {
        model: "llama-3.3-70b-versatile",
        messages: [{
          role: "system",
          content: "You are a Forensic Auditor. Compare the Server_Exif and Client_Exif. If they mismatch or if physics are impossible, the score must be 0.05. Return ONLY JSON: {\"confidence_score\": 0.0-1.0, \"analysis\": \"string\"}"
        }, {
          role: "user",
          content: `Server_Exif: ${JSON.stringify(serverExif)}\nClient_Exif: ${JSON.stringify(clientExif)}\nHeader: ${base64Sliver}`
        }],
        response_format: { type: "json_object" }
      };

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: EntropyRouter.getHeaders(key!.keyValue),
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      const analysis = JSON.parse(data.choices[0].message.content);
      
      let finalScore = trustViolation ? 0.050 : parseFloat(analysis.confidence_score);
      let finalAnalysis = trustViolation ? `TRUST_VIOLATION: ${violationReason}` : analysis.analysis;

      const signature = this.generateOracleSignature(traceId, headerHash, finalScore.toFixed(3));

      await db.update(auditLedger).set({
        status: finalScore < 0.4 ? "flagged" : "verified",
        fcsScore: finalScore.toFixed(3),
        oracleSignature: signature,
        forensicManifest: { visual: finalAnalysis, server_physics: serverExif, client_mismatch: trustViolation },
        completedAt: new Date()
      }).where(eq(auditLedger.requestId, traceId));

    } catch (error: any) {
      console.error("FATAL", error.message);
    }
  }
}
