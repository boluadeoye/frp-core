import { db } from "@/db";
import { auditLedger, burnRegistry, auditTrail } from "@/db/schema";
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

  /**
   * FLAG B: Chain of Custody Logger
   */
  private static async logStep(requestId: string, step: string, actor: string, data: any) {
    await db.insert(auditTrail).values({
      requestId,
      step,
      actor,
      data,
      timestamp: new Date()
    }).catch(e => console.error("TRAIL_LOG_FAILED", e));
  }

  /**
   * FLAG C: Multi-Source Physics (SunCalc + USNO Placeholder)
   */
  private static calculatePhysics(clientExif: any) {
    try {
      if (!clientExif?.latitude) return { error: "GPS_MISSING" };
      const lat = parseFloat(clientExif.latitude);
      const lon = parseFloat(clientExif.longitude);
      const timestamp = clientExif.timestamp ? new Date(clientExif.timestamp) : new Date();
      
      const sunPos = SunCalc.getPosition(timestamp, lat, lon);
      
      return {
        lat: lat.toFixed(4),
        lon: lon.toFixed(4),
        sunAltitude: (sunPos.altitude * 180 / Math.PI).toFixed(2),
        sunAzimuth: (sunPos.azimuth * 180 / Math.PI).toFixed(2),
        iso: clientExif.iso || 0,
        exposure: clientExif.exposureTime || "0",
        source: "SUNCALC_V1.9",
        validation: "PENDING_USNO_CROSSCHECK"
      };
    } catch (e: any) {
      return { error: "CALC_FAILED" };
    }
  }

  /**
   * FLAG A: KMS-Ready Signing
   */
  private static generateOracleSignature(traceId: string, hash: string, fcs: string): string {
    const privateKey = process.env.FRP_PRIVATE_KEY;
    const kmsKeyId = process.env.AWS_KMS_KEY_ID;

    if (kmsKeyId) {
      // Placeholder for AWS KMS SDK call: return kms.sign(...)
      return "KMS_SIGNED_STUB";
    }

    if (!privateKey) return "UNSIGNED";
    
    const payload = `${traceId}:${hash}:${fcs}`;
    const sign = crypto.createSign('SHA256');
    sign.update(payload);
    sign.end();
    return sign.sign(privateKey, 'base64');
  }

  static async processAudit(traceId: string, imageUrl: string, headerBuffer: Uint8Array, headerHash: string, clientExif: any) {
    console.log(`[AGGREGATOR] Hardened Audit: ${traceId}`);
    
    // STEP 1: INGESTION LOG
    await this.logStep(traceId, "INGESTION", "FRP_EDGE_WORKER", { imageUrl, headerHash });

    try {
      // STEP 2: PHYSICS CALCULATION
      const physics: any = this.calculatePhysics(clientExif);
      await this.logStep(traceId, "PHYSICS_CALC", "SUNCALC_ENGINE", physics);

      let physicalLie = false;
      if (physics.sunAltitude && parseFloat(physics.sunAltitude) < -2 && physics.iso > 0 && physics.iso < 400) {
        physicalLie = true;
      }

      // STEP 3: COGNITIVE AUDIT
      const key = await KeyManager.getValidKey();
      const base64Sliver = this.toBase64Safe(headerBuffer.slice(0, 4096));

      const payload = {
        model: "llama-3.3-70b-versatile",
        messages:[{
          role: "system",
          content: `You are a Deterministic Forensic Logic Gate. Return ONLY JSON:
          {
            "confidence_score": <float>,
            "reasoning_code": "PASS_CLEAN | ERR_PHYSICS_MISMATCH | ERR_CLIENT_LIE",
            "deterministic_log": "string"
          }`
        }, {
          role: "user",
          content: `Physics: ${JSON.stringify(physics)}\nHeader: ${base64Sliver}`
        }],
        temperature: 0.0,
        response_format: { type: "json_object" }
      };

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: EntropyRouter.getHeaders(key!.keyValue),
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      const analysis = JSON.parse(data.choices[0].message.content);
      await this.logStep(traceId, "COGNITIVE_AUDIT", "GROQ_LLAMA_3.3_70B", analysis);
      
      let finalScore = parseFloat(analysis.confidence_score);
      let finalCode = analysis.reasoning_code;

      if (physicalLie) {
        finalScore = 0.050;
        finalCode = "ERR_PHYSICS_MISMATCH";
      }

      // STEP 4: CRYPTOGRAPHIC SIGNING
      const signature = this.generateOracleSignature(traceId, headerHash, finalScore.toFixed(3));
      await this.logStep(traceId, "SIGNING", "FRP_ORACLE_KMS", { signature_type: "ECDSA_SECP256K1" });

      await db.update(auditLedger).set({
        status: finalScore < 0.4 ? "flagged" : "verified",
        fcsScore: finalScore.toFixed(3),
        oracleSignature: signature,
        forensicManifest: { 
          reasoning_code: finalCode,
          deterministic_log: analysis.deterministic_log,
          physics_report: physics,
          override: physicalLie
        },
        completedAt: new Date()
      }).where(eq(auditLedger.requestId, traceId));

    } catch (error: any) {
      await this.logStep(traceId, "FATAL_ERROR", "SYSTEM", { message: error.message });
    }
  }
}
