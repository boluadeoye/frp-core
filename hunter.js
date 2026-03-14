const fs = require('fs');
const exifr = require('exifr');

// --- CONFIGURATION ---
const PROXY_URL = "https://frp-proxy.boluadeoye97.workers.dev/?url=";
const FRP_ORACLE_URL = "https://frp-core.vercel.app/api/v1/verify";
const HIVEMAPPER_FEED = "https://map-backend.hivemapper.com/footprint?limit=20&zoom=12";
const BOUNTY_FILE = "./bounties.json";

async function executeHunt() {
    console.log("\n\x1b[32m[FRP // MERCENARY_HUNT // ACTIVE]\x1b[0m");
    
    try {
        console.log("[1/3] Sniffing Hivemapper Network via Cloudflare Proxy...");
        const res = await fetch(PROXY_URL + encodeURIComponent(HIVEMAPPER_FEED));
        
        if (!res.ok) throw new Error(`Proxy Rejected: ${res.status}`);
        
        const data = await res.json();
        const targets = data.features.filter(f => f.properties.preview_url);

        console.log(`[2/3] Acquired ${targets.length} live targets. Initializing audits...`);

        for (const target of targets) {
            const p = target.properties;
            const c = target.geometry.coordinates;
            
            console.log(`\n[SCANNING] Tile: ${p.id.substring(0,8)}...`);

            // Local EXIF Extraction via Proxy
            const imgRes = await fetch(PROXY_URL + encodeURIComponent(p.preview_url));
            const buffer = await imgRes.arrayBuffer();
            const metadata = await exifr.parse(new Uint8Array(buffer)).catch(() => null);

            const payload = {
                imageUrl: p.preview_url,
                agentId: "mercenary-bot-01",
                clientExif: {
                    latitude: c[1],
                    longitude: c[0],
                    timestamp: p.timestamp,
                    iso: metadata?.ISO || 100,
                    exposureTime: metadata?.ExposureTime || "1/500"
                }
            };

            // The Strike
            const oracleRes = await fetch(FRP_ORACLE_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const oracleData = await oracleRes.json();

            // Poll for result
            await new Promise(r => setTimeout(r, 2500));
            const statusRes = await fetch(`https://frp-core.vercel.app/api/v1/status/${oracleData.traceId}`);
            const statusData = await statusRes.json();

            const fcs = parseFloat(statusData.fcsScore);
            if (fcs < 0.4) {
                console.log(`  └─ \x1b[31m[FRAUD_DETECTED]\x1b[0m FCS: ${fcs} | ID: ${oracleData.traceId}`);
                const bounty = {
                    traceId: oracleData.traceId,
                    url: `https://frp-core.vercel.app/cert/${oracleData.traceId}`,
                    timestamp: new Date().toISOString(),
                    reason: statusData.manifest?.reasoning_code
                };
                const current = fs.existsSync(BOUNTY_FILE) ? JSON.parse(fs.readFileSync(BOUNTY_FILE)) : [];
                current.push(bounty);
                fs.writeFileSync(BOUNTY_FILE, JSON.stringify(current, null, 2));
                console.log(`     \x1b[33m>> SAVED TO BOUNTIES.JSON <<\x1b[0m`);
            } else {
                console.log(`  └─ \x1b[32m[VERIFIED]\x1b[0m FCS: ${fcs}`);
            }
        }
        console.log("\n[3/3] Hunt Complete. Check bounties.json.");
    } catch (e) {
        console.error("\x1b[31mHUNT_FAILED:\x1b[0m", e.message);
    }
}

executeHunt();
