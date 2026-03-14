const { Connection, PublicKey } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

// Switched to Ankr's high-capacity public RPC
const RPC_URL = 'https://rpc.ankr.com/solana';
const connection = new Connection(RPC_URL, 'confirmed');

const TARGET_PROGRAM_ID = new PublicKey('4vMsoUT2BWatFweudnQM1xedRLfJgJ7hswhcpz4xgBTy'); 
const DB_PATH = path.join(__dirname, '..', 'data', 'suspect_cids.json');

async function runIndexer() {
    console.log(`[+] INITIATING STEALTH WEB3 BACKDOOR...`);
    console.log(`[+] RPC: Ankr Public Node`);

    try {
        console.log(`[+] Fetching recent signatures (Limit: 10 to avoid WAF)...`);
        const signatures = await connection.getSignaturesForAddress(TARGET_PROGRAM_ID, { limit: 10 });

        console.log(`[+] Found ${signatures.length} transactions. Deep scanning...`);

        const extractedData =[];

        for (const sigInfo of signatures) {
            // 2-second delay to mimic human RPC querying
            await new Promise(resolve => setTimeout(resolve, 2000));

            try {
                const tx = await connection.getParsedTransaction(sigInfo.signature, {
                    maxSupportedTransactionVersion: 0,
                });

                if (!tx) continue;

                const txString = JSON.stringify(tx);
                const ipfsRegex = /(Qm[1-9A-HJ-NP-Za-km-z]{44,}|bafy[a-zA-Z0-9]{40,})/g;
                const ipfsMatches = txString.match(ipfsRegex) || [];
                const uniqueCIDs = [...new Set(ipfsMatches)];

                if (uniqueCIDs.length > 0) {
                    console.log(`[!] HIT: ${sigInfo.signature.substring(0, 8)}... -> ${uniqueCIDs.length} CIDs`);
                    extractedData.push({
                        signature: sigInfo.signature,
                        timestamp: tx.blockTime ? new Date(tx.blockTime * 1000).toISOString() : new Date().toISOString(),
                        cids: uniqueCIDs
                    });
                } else {
                    process.stdout.write('.'); // Visual indicator of scanning
                }
            } catch (txError) {
                console.log(`\n[-] Skipped Tx ${sigInfo.signature.substring(0,8)} due to RPC drop.`);
            }
        }

        let existingData =[];
        if (fs.existsSync(DB_PATH)) {
            const raw = fs.readFileSync(DB_PATH, 'utf-8');
            if (raw) existingData = JSON.parse(raw);
        }

        const mergedData = [...existingData, ...extractedData];
        const uniqueMerged = Array.from(new Map(mergedData.map(item => [item.signature, item])).values());

        fs.writeFileSync(DB_PATH, JSON.stringify(uniqueMerged, null, 2));
        
        console.log(`\n[+] EXTRACTION COMPLETE.`);
        console.log(`[+] Total Suspect CIDs in Database: ${uniqueMerged.length}`);

    } catch (error) {
        console.error(`\n[-] FATAL ERROR:`, error.message);
    }
}

runIndexer();
