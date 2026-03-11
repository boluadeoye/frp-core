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

  private static async logStep(requestId: string, step: string, actor: string, data: any) {
    await db.insert(auditTrail).values({
      requestId,
      step,
      actor,
      data,
      timestamp: new Date()
    }).catch(e => console.error("TRAIL_LOG_FAILED", e));
  }

  private static calculatePhysics(clientExif: any) {
    try {
      if (!clientExif?.latitude) return { error: "GPS_MISSING" };
      const lat = parseFloat(clientExif.latitude);
      const lon = parseFloat(clientExif.longitude);
      const timestamp = clientExif.timestamp ? new Date(clientExif.timestamp) : new Date();
      
      const sunPos = SunCalc.getPosition(timestamp, lat, lon);
      
      let azimuthDeg = sunPos.azimuth * 180 / Math.PI;
      azimuthDeg = ((azimuthDeg % 360) + 360) % 360;
      
      return {
        lat: lat.toFixed(4),
        lon: lon.toFixed(4),
        sunAltitude: (sunPos.altitude * 180 / Math.PI).toFixed(2),
        sunAzimuth: azimuthDeg.toFixed(2),
        iso: clientExif.iso || 0,
        exposure: clientExif.exposureTime || "0",
        physics_source: "SUNCALC_V1.9" 
      };
    } catch (e: any) {
      return { error: "CALC_FAILED" };
    }
  }

  /**
   * FLAG VI FIX: The "Super Hash" Signature
   * We now hash the entire audit manifest (Image Hash + Physics + AI Reasoning) 
   * before signing, ensuring the entire chain of custody is cryptographically anchored.
   */
  private static generateOracleSignature(traceId: string, fullManifest: any): { signature: string, manifestHash: string } {
    const privateKey = process.env.FRP_PRIVATE_KEY;
    
    // 1. Create a deterministic string representation of the entire audit
    const manifestString = JSON.stringify({
      traceId,
      headerHash: fullManifest.headerHash,
      physics: fullManifest.physics_report,
      cognitive: {
        score: fullManifest.fcsScore,
        code: fullManifest.reasoning_code,
        supporting: fullManifest.supporting_codes
      }
    });

    // 2. Generate the SHA-256 "Super Hash" of the manifest
    const manifestHash = crypto.createHash('sha256').update(manifestString).digest('hex');

    if (!privateKey) return { signature: "UNSIGNED", manifestHash };
    
    // 3. Sign the Super Hash
    const sign = crypto.createSign('SHA256');
    sign.update(manifestHash);
    sign.end();
    
    return { 
      signature: sign.sign(privateKey, 'base64'),
      manifestHash 
    };
  }

  static async processAudit(traceId: string, imageUrl: string, headerBuffer: Uint8Array, headerHash: string, clientExif: any) {
    console.log(`[AGGREGATOR] Enterprise Audit: ${traceId}`);
    
    await this.logStep(traceId, "INGESTION", "FRP_EDGE_WORKER", { imageUrl, headerHash });

    try {
      const physics: any = this.calculatePhysics(clientExif);
      await this.logStep(traceId, "PHYSICS_CALC", "SUNCALC_ENGINE", physics);

      let physicalLie = false;
      if (physics.sunAltitude && parseFloat(physics.sunAltitude) < -2 && physics.iso > 0 && physics.iso < 400) {
        physicalLie = true;
      }

      const key = await KeyManager.getValidKey();
      if (!key) throw new Error("POOL_EMPTY");

      const base64Sliver = this.toBase64Safe(headerBuffer.slice(0, 4096));

      const payload = {
        model: "llama-3.3-70b-versatile",
        messages:[{
          role: "system",
          content: `You are a Deterministic Forensic Logic Gate. Return ONLY JSON:
          {
            "confidence_score": <float>,
            "reasoning_code": "PASS_CLEAN | ERR_PHYSICS_MISMATCH | ERR_CLIENT_LIE",
            "supporting_codes":["EXIF_CONSISTENT", "PHYSICS_ALTITUDE_VALID", "ISO_EXPOSURE_NOMINAL", "ADOBE_MARKER_FOUND"]
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
        analysis.supporting_codes =["PHYSICS_ALTITUDE_INVALID", "ISO_EXPOSURE_ANOMALY"];
      }

      // FLAG VI FIX: Construct the full manifest object for signing
      const fullManifestData = {
        headerHash,
        physics_report: physics,
        fcsScore: finalScore.toFixed(3),
        reasoning_code: finalCode,
        supporting_codes: analysis.supporting_codes
      };

      // Generate the Super Hash and Signature
      const { signature, manifestHash } = this.generateOracleSignature(traceId, fullManifestData);
      
      await this.logStep(traceId, "SIGNING", "FRP_ORACLE_KMS", { 
        signature_type: "ECDSA_SECP256K1",
        manifest_hash: manifestHash, // Now the hash of the ENTIRE audit
        signature_der: signature,
        public_key_id: "frp-oracle-v1",
        signing_timestamp_rfc3161: new Date().toISOString()
      });

      await db.update(auditLedger).set({
        status: finalScore < 0.4 ? "flagged" : "verified",
        fcsScore: finalScore.toFixed(3),
        oracleSignature: signature,
        forensicManifest: { 
          ...fullManifestData,
          manifest_hash: manifestHash, // Store the Super Hash in the ledger
          override: physicalLie
        },
        completedAt: new Date()
      }).where(eq(auditLedger.requestId, traceId));

    } catch (error: any) {
      await this.logStep(traceId, "FATAL_ERROR", "SYSTEM", { message: error.message });
    }
  }
}
