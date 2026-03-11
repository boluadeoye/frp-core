const fs = require('fs');

// --- CONFIGURATION ---
const FRP_ORACLE_URL = "https://frp-core.vercel.app/api/v1/verify";
const HIVEMAPPER_API = "https://api.hivemapper.com/public/v1/footprint"; // Public footprint API

async function runShadowAudit() {
    console.log("\n\x1b[34m[FRP // SHADOW_AUDIT // HIVEMAPPER_SOLANA]\x1b[0m");
    console.log("--------------------------------------------------");

    try {
        // 1. Acquire Live Network Data
        // We pull the latest 'footprints' (mapping submissions)
        const response = await fetch(`${HIVEMAPPER_API}?limit=20`);
        const data = await response.json();

        if (!data.features) throw new Error("Unable to access Hivemapper data stream.");

        console.log(`[SYSTEM] Acquired ${data.features.length} live mapping tiles.`);

        for (const feature of data.features) {
            const props = feature.properties;
            const coords = feature.geometry.coordinates; // [lon, lat]
            
            // Hivemapper tiles often have a preview image
            // Note: In a full strike, we would iterate through their S3 bucket
            const imageUrl = props.preview_url || "https://raw.githubusercontent.com/ianare/exif-samples/master/jpg/gps/DSCN0010.jpg";

            console.log(`\n[SCANNING] Tile_ID: ${props.id || 'unknown'}`);
            console.log(`  ├─ Location: ${coords[1]}, ${coords[0]}`);
            
            const payload = {
                imageUrl: imageUrl,
                agentId: "shadow-audit-hm",
                clientExif: {
                    latitude: coords[1],
                    longitude: coords[0],
                    timestamp: props.timestamp || new Date().toISOString(),
                    iso: 100, // We test against a baseline
                    exposureTime: "1/500"
                }
            };

            const oracleRes = await fetch(FRP_ORACLE_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const oracleData = await oracleRes.json();
            console.log(`  ├─ Oracle_Trace: ${oracleData.traceId}`);
            console.log(`  └─ Result: https://frp-core.vercel.app/cert/${oracleData.traceId}`);
        }

    } catch (e) {
        console.log(`\x1b[31m[FATAL] ${e.message}\x1b[0m`);
    }
}

runShadowAudit();
