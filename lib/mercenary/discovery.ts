import { Groq } from "groq-sdk";

/**
 * FRP DISCOVERY ENGINE
 * Repurposes pooled Groq keys to find pregnant assets.
 */

const GROQ_KEYS = [
  process.env.GROQ_API_KEY_1,
  process.env.GROQ_API_KEY_2,
  process.env.GROQ_API_KEY_3
].filter(Boolean);

export async function analyzeContractForYield(sourceCode: string) {
  if (GROQ_KEYS.length === 0) throw new Error("No Groq keys pooled.");
  
  const randomKey = GROQ_KEYS[Math.floor(Math.random() * GROQ_KEYS.length)];
  const groq = new Groq({ apiKey: randomKey });

  const prompt = `
    Analyze this Solidity contract for 'Snapshot-less' yield opportunities.
    Look for:
    1. claim(), withdraw(), or getReward() functions.
    2. Check if they verify the CURRENT owner of an NFT/Token (msg.sender or ownerOf).
    3. Check if there is NO historical snapshot block recorded.
    
    If found, return JSON: { "target": "address", "function": "signature", "profit_potential": "high/med" }.
    Code: ${sourceCode.substring(0, 10000)}
  `;

  const completion = await groq.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "llama-3.3-70b-versatile",
    temperature: 0,
  });

  return completion.choices[0].message.content;
}
