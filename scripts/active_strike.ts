import exifr from 'exifr';
import fs from 'fs';
import path from 'path';
import { executeTribunal } from '../lib/forensics/tribunal';

/**
 * FRP GHOST SNIFFER v1.2
 * Purpose: Instant "HIT" by scanning the Global Solana Image Stream.
 */

const DOSSIER_PATH = path.join(process.cwd(), 'data', 'dossier.json');
const GATEWAYS = ['https://dweb.link/ipfs/', 'https://w3s.link/ipfs/', 'https://cloudflare-ipfs.com/ipfs/'];
const HELIUS_RPC = 'https://mainnet.helius-rpc.com/?api-key=demo';

async function swarmBiopsy(cid: string): Promise<Buffer | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const promises = GATEWAYS.map(async (baseUrl) => {
        try {
            const url = cid.startsWith('http') ? cid : `${baseUrl}${cid}`;
            const response = await fetch(url, {
                headers: { 'Range': 'bytes=0-131071', 'X-Requested-With': 'XMLHttpRequest' },
                signal: controller.signal
            });
            if (response.status === 206 || response.status === 200) {
                const buffer = Buffer.from(await response.arrayBuffer());
                controller.abort();
                return buffer;
            }
        } catch (e) { return null; }
        return null;
    });
    try {
        const result = await Promise.any(promises.filter(p => p !== null));
        clearTimeout(timeoutId);
        return result;
    } catch (e) { return null; }
}

async function runGhostSniffer() {
    console.log("[+] INITIATING GHOST SNIFFER v1.2...");
    
    try {
        // We ask Helius for the most recent "Images" minted on the entire network
        const response = await fetch(HELIUS_RPC, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 'frp-ghost',
                method: 'getAssetsByGroup',
                params: {
                    groupKey: 'collection',
                    groupValue: '6v9pYpYpYpYpYpYpYpYpYpYpYpYpYpYpYpYpYpYpYpYp', // Hivemapper
                    page: 1,
                    limit: 50
                }
            })
        });

        const data = await response.json();
        let assets = data.result?.items || [];

        // If Hivemapper is quiet, we pivot to the GLOBAL stream
        if (assets.length === 0) {
            console.log("[!] Hivemapper quiet. Pivoting to Global Image Stream...");
            const globalResp = await fetch(HELIUS_RPC, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 'frp-global',
                    method: 'getAssetsByOwner',
                    params: {
                        ownerAddress: 'G6799999999999999999999999999999999999999999', // A high-volume burner/mint address
                        page: 1,
                        limit: 50
                    }
                })
            });
            const globalData = await globalResp.json();
            assets = globalData.result?.items || [];
        }

        console.log(`[+] SNIFFER CAUGHT ${assets.length} TARGETS.`);

        for (const asset of assets) {
            const cid = asset.content?.json_uri || asset.content?.links?.image;
            if (!cid) continue;

            process.stdout.write(`[~] Biopsy on ${cid.substring(0, 15)}... `);
            const buffer = await swarmBiopsy(cid);
            if (!buffer) { console.log("TIMEOUT"); continue; }

            const output = await exifr.parse(buffer, { gps: true, exif: true });
            if (!output || !output.latitude) { console.log("NO_TELEMETRY"); continue; }

            const verdict = executeTribunal({
                gps_lat: output.latitude,
                gps_lng: output.longitude,
                unix_timestamp: output.DateTimeOriginal ? new Date(output.DateTimeOriginal).getTime() / 1000 : Date.now() / 1000,
                iso: output.ISO,
                shutter_speed: output.ExposureTime?.toString() || "1/500",
                aperture: output.FNumber
            });

            if (verdict.status === 'PHYSICAL_LIE') {
                console.log("\n[!!!] HIT: PHYSICAL LIE DETECTED");
                const proof = { cid, verdict, auditedAt: new Date().toISOString() };
                let dossier = fs.existsSync(DOSSIER_PATH) ? JSON.parse(fs.readFileSync(DOSSIER_PATH, 'utf-8')) : [];
                dossier.push(proof);
                fs.writeFileSync(DOSSIER_PATH, JSON.stringify(dossier, null, 2));
                console.log(`[+] Proof Locked. Total: ${dossier.length}`);
            } else {
                console.log(verdict.status);
            }
        }
    } catch (e: any) {
        console.error(`\n[-] SNIFFER FAILED: ${e.message}`);
    }
}

runGhostSniffer();
