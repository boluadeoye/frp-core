import { db } from "@/db";
import { auditLedger } from "@/db/schema";
import { eq } from "drizzle-orm";
import { KeyManager } from "./key-manager";
import { EntropyRouter } from "./entropy";

export class ForensicAggregator {
  /**
   * Background process to analyze the image using Groq Vision and update the ledger.
   */
  static async processAudit(traceId: string, imageUrl: string, callbackUrl?: string) {
    console.log(`[FRP-Aggregator] Starting deep audit for Trace: ${traceId}`);

    try {
      // 1. Check out a Groq API Key from the Pool
      const key = await KeyManager.getValidKey();
      if (!key) {
        throw new Error("No available API keys in the pool.");
      }

      // 2. Prepare the Forensic Prompt for Llama 4 Scout
      const systemPrompt = `You are a Deloitte-trained forensic image analyst. Analyze this image for physical inconsistencies. 
Look for: 1. Inconsistent light source vectors (shadows not matching). 2. Diffusion noise or GAN artifacts. 3. Spatial anomalies.
You must respond ONLY with a valid JSON object in this exact format:
{"confidence_score": 0.95, "visual_trace": "No diffusion noise detected. Shadows align with a single top-left light source."}`;

      const payload = {
        model: "llama-3.2-11b-vision-preview", // Fallback/Current Groq Vision Model ID. Update to Llama 4 Scout ID when fully mapped.
        messages: [
          {
            role: "user",
            content:[
              { type: "text", text: systemPrompt },
              { type: "image_url", image_url: { url: imageUrl } }
            ]
          }
        ],
        temperature: 0.1, // Low temperature for deterministic forensic analysis
        max_tokens: 256,
        response_format: { type: "json_object" }
      };

      // 3. Execute the Vision API Call with Entropy Headers
      const headers = EntropyRouter.getHeaders(key.keyValue);
      
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });

      if (response.status === 429) {
        await KeyManager.reportRateLimit(key.id);
        throw new Error("Rate limit hit. Key benched.");
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Groq API Error: ${errText}`);
      }

      const data = await response.json();
      const resultText = data.choices[0].message.content;
      const analysis = JSON.parse(resultText);

      // 4. Update the Neon Ledger with the Final FCS
      await db.update(auditLedger)
        .set({
          status: "verified",
          fcsScore: analysis.confidence_score.toString(),
          forensicManifest: {
            visual_analysis: analysis.visual_trace,
            model_used: payload.model
          },
          completedAt: new Date()
        })
        .where(eq(auditLedger.requestId, traceId));

      console.log(`[FRP-Aggregator] Audit ${traceId} completed. FCS: ${analysis.confidence_score}`);

      // 5. Dispatch Webhook (If requested by the AI Agent)
      if (callbackUrl) {
        await fetch(callbackUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            traceId,
            status: "verified",
            fcsScore: analysis.confidence_score,
            manifest: analysis.visual_trace
          })
        }).catch(e => console.warn(`[FRP-Aggregator] Webhook dispatch failed: ${e.message}`));
      }

    } catch (error: any) {
      console.error(`[FRP-Aggregator] Audit ${traceId} failed:`, error.message);
      
      // Mark as failed in the ledger
      await db.update(auditLedger)
        .set({ status: "failed", forensicManifest: { error: error.message }, completedAt: new Date() })
        .where(eq(auditLedger.requestId, traceId));
    }
  }
}
