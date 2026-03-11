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
      if (!data || !data.gps || !data.gps.GPSLatitude) return { error: "NO_GPS_IN_BINARY" };

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
    console.log(`[AGGREGATOR] Deterministic Audit: ${traceId}`);

    try {
      const serverExif: any = await this.extractServerExif(headerBuffer);
      
      let clientLie = false;
      if (clientExif && serverExif.lat) {
        const latDiff = Math.abs(parseFloat(clientExif.latitude) - parseFloat(serverExif.lat));
        const lonDiff = Math.abs(parseFloat(clientExif.longitude) - parseFloat(serverExif.lon));
        if (latDiff > 0.01 || lonDiff > 0.01) clientLie = true;
      }

      let physicalLie = false;
      if (serverExif.sunAltitude && parseFloat(serverExif.sunAltitude) < -2 && serverExif.iso > 0 && serverExif.iso < 400) {
        physicalLie = true;
      }

      const key = await KeyManager.getValidKey();
      if (!key) throw new Error("POOL_EMPTY");

      const base64Sliver = this.toBase64Safe(headerBuffer.slice(0, 4096));

      // THE DETERMINISTIC PROMPT (FLAG E RESOLUTION)
      const payload = {
        model: "llama-3.3-70b-versatile",
        messages:[{
          role: "system",
          content: `You are a Deterministic Forensic Logic Gate. Analyze the provided data.
          You MUST return ONLY a JSON object matching this exact schema:
          {
            "confidence_score": <float between 0.0 and 1.0>,
            "reasoning_code": "<ENUM: PASS_CLEAN | WARN_SOFTWARE_MARKER | ERR_PHYSICS_MISMATCH | ERR_CLIENT_LIE>",
            "deterministic_log": "<Strict, factual 1-sentence summary of findings>"
          }`
        }, {
          role: "user",
          content: `Server_Exif: ${JSON.stringify(serverExif)}\nClient_Exif: ${JSON.stringify(clientExif)}\nHeader_Sliver: ${base64Sliver}`
        }],
        temperature: 0.0, // Absolute zero for maximum determinism
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
      
      let finalScore = parseFloat(analysis.confidence_score || "0");
      let finalCode = analysis.reasoning_code;

      if (physicalLie) {
        finalScore = 0.050;
        finalCode = "ERR_PHYSICS_MISMATCH";
      } else if (clientLie) {
        finalScore = 0.050;
        finalCode = "ERR_CLIENT_LIE";
      }

      const signature = this.generateOracleSignature(traceId, headerHash, finalScore.toFixed(3));

      await db.update(auditLedger).set({
        status: finalScore < 0.4 ? "flagged" : "verified",
        fcsScore: finalScore.toFixed(3),
        oracleSignature: signature,
        forensicManifest: { 
          reasoning_code: finalCode,
          deterministic_log: analysis.deterministic_log,
          server_physics: serverExif,
          client_mismatch: clientLie,
          override: physicalLie || clientLie
        },
        completedAt: new Date()
      }).where(eq(auditLedger.requestId, traceId));

    } catch (error: any) {
      console.error(`[AGGREGATOR] Failure: ${error.message}`);
    }
  }
}
