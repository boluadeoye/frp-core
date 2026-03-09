import { db } from "@/db";
import { auditLedger, burnRegistry } from "@/db/schema";
import { eq } from "drizzle-orm";
import { KeyManager } from "./key-manager";
import { EntropyRouter } from "./entropy";

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

  static async processAudit(traceId: string, imageUrl: string, headerBuffer: Uint8Array, headerHash: string) {
    console.log(`[AGGREGATOR] Weaponized Audit Started: ${traceId}`);

    try {
      // 1. THE BURN REGISTRY CHECK (Instant Kill)
      const burned = await db.query.burnRegistry.findFirst({
        where: eq(burnRegistry.hash, headerHash)
      });

      if (burned) {
        console.warn(`[AGGREGATOR] HASH MATCH FOUND IN BURN REGISTRY. TERMINATING.`);
        await db.update(auditLedger)
          .set({
            status: "flagged",
            fcsScore: "0.000",
            forensicManifest: { 
              reason: "Blacklisted Fingerprint", 
              registry_match: true,
              original_flag_reason: burned.reason 
            },
            completedAt: new Date()
          })
          .where(eq(auditLedger.requestId, traceId));
        return;
      }

      // 2. PROCEED TO AI PHYSICS AUDIT
      const key = await KeyManager.getValidKey();
      if (!key) throw new Error("POOL_EMPTY");

      const modelId = "llama-3.3-70b-versatile";
      const base64Header = this.toBase64Safe(headerBuffer);

      const payload = {
        model: modelId,
        messages:[
          {
            role: "system",
            content: "You are a Forensic Auditor. Analyze the Base64 image header. Look for 'Adobe', 'Photoshop', or 'Canva'. Also, check if the metadata structure is consistent with a raw camera sensor. Return ONLY JSON: {\"confidence_score\": 0.0-1.0, \"analysis\": \"string\"}"
          },
          {
            role: "user",
            content: `Header Fingerprint: ${headerHash}\nHeader Bytes: ${base64Header}`
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

      // 3. UPDATE LEDGER & AUTO-BURN IF FRAUD DETECTED
      const finalScore = analysis.confidence_score || 0;

      await db.update(auditLedger)
        .set({
          status: finalScore < 0.4 ? "flagged" : "verified",
          fcsScore: finalScore.toString(),
          headerHash: headerHash,
          forensicManifest: { visual: analysis.analysis, model: modelId },
          completedAt: new Date()
        })
        .where(eq(auditLedger.requestId, traceId));

      if (finalScore < 0.2) {
        console.log(`[AGGREGATOR] AUTO-BURNING HASH: ${headerHash}`);
        await db.insert(burnRegistry).values({
          hash: headerHash,
          reason: `Auto-flagged: FCS Score ${finalScore}`,
          severity: "1.00"
        }).onConflictDoNothing();
      }

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
