import { Groq } from "groq-sdk";

// Using your pooled Groq keys to find "Snapshot-less" claim logic
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY_1 });

async function findTarget() {
    console.log("[+] INITIATING PROSPECTING SCAN...");
    
    // We are looking for the 'claim' pattern in recent Base contracts
    const prompt = "Analyze the following Solidity pattern: 'function claim() public { uint256 reward = rewards[msg.sender]; ... }'. Does this logic allow a NEW owner of an NFT to claim rewards immediately after purchase, or is there a snapshot/cooldown? Explain the exploit potential.";
    
    const chatCompletion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.3-70b-versatile",
    });

    console.log("[!] GROQ ANALYSIS:");
    console.log(chatCompletion.choices[0].message.content);
}

findTarget();
