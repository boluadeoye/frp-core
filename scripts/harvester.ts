import exifr from 'exifr';
import fs from 'fs';
import { executeTribunal } from '../lib/forensics/tribunal';

/**
 * FRP HARVESTER v1.1 - THE GLOBAL TRAWL
 * Strategy: Recursive Sector Raid -> Biopsy -> Tribunal
 * No more manual rotation.
 */

const CLIENT_ID = 'MLY|4624410344302810|29631d79561399761f91d74062739591';

const TARGET_SECTORS = [
    { name: 'LONDON_CORE', lat: 51.5074, lng: -0.1278 },
    { name: 'NYC_MANHATTAN', lat: 40.7831, lng: -73.9712 },
    { name: 'PARIS_CENTRE', lat: 48.8566, lng: 2.3522 },
    { name: 'LAGOS_ISLAND', lat: 6.4483, lng: 3.3971 }
];

async function raidSector(sector: typeof TARGET_SECTORS[0]) {
    console.log(`[+] RAIDING SECTOR: ${sector.name} (${sector.lat}, ${sector.lng})`);
    
    // Wider BBox (0.5 degrees) to ensure hits
    const bbox = `${sector.lng - 0.25},${sector.lat - 0.25},${sector.lng + 0.25},${sector.lat + 0.25}`;
    const searchUrl = `https://graph.mapillary.com/images?access_token=${CLIENT_ID}&fields=id,thumb_original_url&bbox=${bbox}&limit=10`;

    try {
        const res = await fetch(searchUrl);
        const { data } = await res.json();

        if (!data || data.length === 0) {
            console.log(`[-] Sector ${sector.name} empty. Moving to next...`);
            return false;
        }

        console.log(`[!] FOUND ${data.length} TARGETS IN ${sector.name}. EXECUTING BIOPSY...`);

        for (const img of data) {
            const imgUrl = img.thumb_original_url;
            process.stdout.write(`[~] Biopsy ${img.id.substring(0,8)}... `);

            try {
                const response = await fetch(imgUrl, {
                    headers: { 'Range': 'bytes=0-131071' },
                    signal: AbortSignal.timeout(15000) // Deep Trench Timeout
                });

                const buffer = Buffer.from(await response.arrayBuffer());
                const output = await exifr.parse(buffer, {
                    gps: true, tiff: true, exif: true,
                    pick: ['ISO', 'ExposureTime', 'FNumber', 'DateTimeOriginal', 'latitude', 'longitude']
                });

                if (!output || !output.latitude) {
                    console.log(`[SKIPPED: No Telemetry]`);
                    continue;
                }

                const telemetry = {
                    gps_lat: output.latitude,
                    gps_lng: output.longitude,
                    unix_timestamp: output.DateTimeOriginal ? new Date(output.DateTimeOriginal).getTime() / 1000 : Date.now() / 1000,
                    iso: output.ISO || 100,
                    shutter_speed: output.ExposureTime ? output.ExposureTime.toString() : "1/500",
                    aperture: output.FNumber || 2.8
                };

                const verdict = executeTribunal(telemetry);
                
                if (verdict.status === 'PHYSICAL_LIE') {
                    console.log(`\n[!!!] PHYSICAL LIE DETECTED [!!!]`);
                    const hit = `[${new Date().toISOString()}] HIT: ${img.id} | Metrics: ${JSON.stringify(verdict.metrics)}\n`;
                    fs.appendFileSync('hits.log', hit);
                    console.log(`[+] Proof Logged to hits.log\n`);
                } else {
                    console.log(`[${verdict.status}]`);
                }
            } catch (e) {
                console.log(`[FAILED: Network]`);
            }
        }
        return true;
    } catch (e: any) {
        console.log(`[-] Sector ${sector.name} Raid Failed: ${e.message}`);
        return false;
    }
}

async function startTrawl() {
    console.log("[+] INITIATING GLOBAL TRAWL v1.1...");
    for (const sector of TARGET_SECTORS) {
        const success = await raidSector(sector);
        if (success) {
            console.log(`[+] Trawl successful in ${sector.name}.`);
            // We continue to the next sector to maximize the Dossier
        }
    }
    console.log("[+] GLOBAL TRAWL COMPLETE.");
}

startTrawl();
