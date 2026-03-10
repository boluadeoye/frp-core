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

  /**
   * SOVEREIGN HEX SCANNER: Scans raw bytes for forensic markers.
   * No libraries. No polyfills. Pure logic.
   */
  private static scanBinary(buffer: Uint8Array) {
    const hex = Array.from(buffer.slice(0, 8192))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    const markers = {
      adobe: hex.includes('41646f6265'), // "Adobe"
      photoshop: hex.includes('50686f746f73686f70'), // "Photoshop"
      nikon: hex.includes('4e696b6f6e'), // "Nikon"
      apple: hex.includes('4170706c65'), // "Apple"
      gps: hex.includes('47505320'), // "GPS "
    };

    return { markers, hex_sample: hex.substring(0, 512) };
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
    console.log(`[AGGREGATOR] Sovereign Audit: ${traceId}`);

    try {
      // 1. RAW BINARY SCAN
      const binaryReport = this.scanBinary(headerBuffer);
      
      // 2. PHYSICS CALCULATION (From Client Data, verified by AI)
      let physics: any = { error: "NO_CLIENT_DATA" };
      if (clientExif?.latitude) {
        const sunPos = SunCalc.getPosition(new Date(clientExif.timestamp), clientExif.latitude, clientExif.longitude);
        physics = {
          sunAltitude: (sunPos.altitude * 180 / Math.PI).toFixed(2),
          sunAzimuth: (sunPos.azimuth * 180 / Math.PI).toFixed(2),
          iso: clientExif.iso,
          exposure: clientExif.exposureTime
        };
      }

      // 3. AI COGNITIVE CROSS-EXAMINATION
      const key = await KeyManager.getValidKey();
      const base64Sliver = this.toBase64Safe(headerBuffer.slice(0, 4096));

      const payload = {
        model: "llama-3.3-70b-versatile",
        messages: [{
          role: "system",
          content: "You are a Forensic Auditor. Compare the Binary Markers and Physics. If the Sun is below -2.0 altitude but ISO is < 400, it is a LIE. Return ONLY JSON: {\"confidence_score\": 0.0-1.0, \"analysis\": \"string\"}"
        }, {
          role: "user",
          content: `Binary_Markers: ${JSON.stringify(binaryReport.markers)}\nPhysics_Context: ${JSON.stringify(physics)}\nHeader_Hex_Sample: ${binaryReport.hex_sample}`
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
      
      // 4. DETERMINISTIC OVERRIDE
      let finalScore = parseFloat(analysis.confidence_score);
      if (physics.sunAltitude && parseFloat(physics.sunAltitude) < -2 && physics.iso < 400) {
        finalScore = 0.050;
      }

      const signature = this.generateOracleSignature(traceId, headerHash, finalScore.toFixed(3));

      await db.update(auditLedger).set({
        status: finalScore < 0.4 ? "flagged" : "verified",
        fcsScore: finalScore.toFixed(3),
        oracleSignature: signature,
        forensicManifest: { 
          visual: analysis.analysis, 
          binary_markers: binaryReport.markers,
          physics_report: physics
        },
        completedAt: new Date()
      }).where(eq(auditLedger.requestId, traceId));

      console.log(`[AGGREGATOR] Audit Finalized: ${finalScore}`);

    } catch (error: any) {
      console.error("FATAL", error.message);
    }
  }
}
