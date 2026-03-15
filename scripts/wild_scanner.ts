import { Groq } from "groq-sdk";

/**
 * FRP WILD SCANNER v1.4 - BYTECODE EDITION
 * Strategy: Bypass Etherscan entirely. Pull raw EVM Bytecode via RPC.
 * Target: Aerodrome Gauge (0x207369c34CCd2559b4910df6f5162F297A0389e7)
 */

const GROQ_API_KEY = process.env.GROQ_API_KEY_1;
const groq = new Groq({ apiKey: GROQ_API_KEY });
const RPC_URL = "https://mainnet.base.org"; // Public RPC - No Key Required

async function scanBytecode() {
    console.log("[+] INITIATING BYTECODE SNIPER (BASE)...");

    const targetContract = "0x207369c34CCd2559b4910df6f5162F297A0389e7"; 
    
    try {
        // 1. Pull raw bytecode via standard JSON-RPC
        const res = await fetch(RPC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: "2.0",
                method: "eth_getCode",
                params: [targetContract, "latest"],
                id: 1
            })
        });
        
        const data = await res.json();
        const bytecode = data.result;

        if (!bytecode || bytecode === "0x") {
            console.error("[-] RPC ERROR: Could not retrieve bytecode.");
            return;
        }

        console.log(`[+] BYTECODE RETRIEVED (${bytecode.length} bytes). DECOMPILING WITH GROQ...`);

        // 2. Pipe Bytecode to Groq for Forensic Decompilation
        const prompt = `
            [MERCENARY DECOMPILER MODE]
            Target: EVM Bytecode for a DeFi Gauge/Voter.
            Task: Identify the 'claim' or 'getReward' logic.
            
            Analyze this raw bytecode. Does the reward claiming logic check for a historical snapshot of ownership, or does it simply check the current 'ownerOf' the NFT?
            
            IF VULNERABLE TO SNAPSHOT-LESS CLAIMING: State 'VULNERABLE' and explain the entry point.
            IF SAFE: State 'SAFE'.
            
            BYTECODE: ${bytecode.substring(0, 10000)}
        `;

        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.3-70b-versatile",
            temperature: 0
        });

        console.log("[!] GROQ ANALYSIS:");
        console.log(chatCompletion.choices[0].message.content);

    } catch (e: any) {
        console.error("[-] SNIPER EXECUTION ERROR:", e.message);
    }
}

scanBytecode();
