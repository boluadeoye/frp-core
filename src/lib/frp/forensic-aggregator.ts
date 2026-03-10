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
        iso: clientExif.iso || 0,
        exposureTime: clientExif.exposureTime || "Unknown"
      };
    } catch (e: any) {
      return { error: `PHYSICS_CALC_FAILED: ${e.message}` };
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
    console.log(`[AGGREGATOR] Hardened Audit Started: ${traceId}`);

    try {
      // 1. Calculate Physics
      const physics: any = this.calculatePhysics(clientExif);
      
      // DETERMINISTIC OVERRIDE LOGIC
      // If Sun is below horizon (Altitude < -2) but ISO is low (< 400), it is a Physical Lie.
      let physicalLieDetected = false;
      if (physics.sunAltitude && parseFloat(physics.sunAltitude) < -2 && physics.iso > 0 && physics.iso < 400) {
        physicalLieDetected = true;
        console.warn(`[AGGREGATOR] PHYSICAL LIE DETECTED: Sun at ${physics.sunAltitude} but ISO is ${physics.iso}`);
      }

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
            content: "You are a Forensic Auditor. Analyze the Physics Context and Header Sliver. Return ONLY JSON: {\"confidence_score\": 0.0-1.0, \"analysis\": \"string\"}"
          },
          {
            role: "user",
            content: `Physics: ${JSON.stringify(physics)}\nHeader Sliver (Base64): ${base64Sliver}`
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

      // 2. Apply Deterministic Override
      let finalScore = parseFloat(analysis.confidence_score || "0");
      let finalAnalysis = analysis.analysis;

      if (physicalLieDetected) {
        finalScore = 0.100; // Force failure
        finalAnalysis = `CRITICAL PHYSICAL DISCREPANCY: ${finalAnalysis}`;
      }

      // 3. Generate Cryptographic Anchor for the FINAL score
      const signature = this.generateOracleSignature(traceId, headerHash, finalScore.toFixed(3));

      await db.update(auditLedger)
        .set({
          status: finalScore < 0.4 ? "flagged" : "verified",
          fcsScore: finalScore.toFixed(3),
          headerHash: headerHash,
          oracleSignature: signature,
          forensicManifest: { 
            visual: finalAnalysis, 
            physics_report: physics,
            override_applied: physicalLieDetected,
            model: modelId 
          },
          completedAt: new Date()
        })
        .where(eq(auditLedger.requestId, traceId));

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
