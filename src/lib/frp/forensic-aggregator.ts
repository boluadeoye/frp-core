import { db } from "@/db";
import { auditLedger, burnRegistry } from "@/db/schema";
import { eq } from "drizzle-orm";
import { KeyManager } from "./key-manager";
import { EntropyRouter } from "./entropy";
import * as SunCalc from "suncalc";
import crypto from "crypto";

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

  private static calculatePhysics(clientExif: any) {
    try {
      if (!clientExif || !clientExif.latitude || !clientExif.longitude) return { error: "GPS_MISSING" };
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
        iso: clientExif.iso || 0,
        exposureTime: clientExif.exposureTime || "0"
      };
    } catch (e: any) {
      return { error: "CALC_FAILED" };
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
      const physics: any = this.calculatePhysics(clientExif);
      
      // DETERMINISTIC OVERRIDE: If Sun is below horizon but ISO is low, it's a lie.
      let physicalLie = false;
      if (physics.sunAltitude && parseFloat(physics.sunAltitude) < -2 && physics.iso < 400) {
        physicalLie = true;
      }

      const key = await KeyManager.getValidKey();
      if (!key) throw new Error("POOL_EMPTY");

      const base64Sliver = this.toBase64Safe(headerBuffer.slice(0, 4096));
      const payload = {
        model: "llama-3.3-70b-versatile",
        messages:[
          {
            role: "system",
            content: "You are a Forensic Auditor. Analyze the physics and binary data. Return ONLY JSON: {\"confidence_score\": 0.0-1.0, \"analysis\": \"string\"}"
          },
          {
            role: "user",
            content: `Physics: ${JSON.stringify(physics)}\nHeader: ${base64Sliver}`
          }
        ],
        response_format: { type: "json_object" }
      };

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: EntropyRouter.getHeaders(key.keyValue),
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      const analysis = JSON.parse(data.choices[0].message.content);
      
      // ENFORCE DETERMINISM: If physics lie detected, force score to 0.1
      let finalScore = parseFloat(analysis.confidence_score);
      if (physicalLie) {
        finalScore = 0.100;
        analysis.analysis = "CRITICAL DISCREPANCY: " + analysis.analysis;
      }

      const signature = this.generateOracleSignature(traceId, headerHash, finalScore.toFixed(3));

      await db.update(auditLedger).set({
        status: finalScore < 0.4 ? "flagged" : "verified",
        fcsScore: finalScore.toFixed(3),
        oracleSignature: signature,
        forensicManifest: { visual: analysis.analysis, physics_report: physics },
        completedAt: new Date()
      }).where(eq(auditLedger.requestId, traceId));

    } catch (error: any) {
      await db.update(auditLedger).set({ status: "failed" }).where(eq(auditLedger.requestId, traceId));
    }
  }
}
