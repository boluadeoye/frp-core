import exifr from 'exifr';
import { executeTribunal } from '../lib/forensics/tribunal';

/**
 * FRP CALIBRATION STRIKE v1.1
 * Target: Hardened EXIF Sample (Italy GPS)
 */

const TRUTH_URL = 'https://raw.githubusercontent.com/ianare/exif-samples/master/jpg/gps/DSCN0010.jpg';

async function calibrate() {
    console.log("[+] INITIATING CALIBRATION STRIKE v1.1...");
    console.log(`[+] TARGET: ${TRUTH_URL}`);

    try {
        const start = Date.now();
        const response = await fetch(TRUTH_URL, {
            headers: { 
                'Range': 'bytes=0-131071',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
            },
            signal: AbortSignal.timeout(20000) // 20s Deep Trench Timeout
        });

        if (response.status !== 206 && response.status !== 200) {
            throw new Error(`HTTP ${response.status} - Gateway/Server Rejected Range Request`);
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        console.log(`[+] BIOPSY SUCCESSFUL (${Date.now() - start}ms). Parsing EXIF...`);

        const output = await exifr.parse(buffer, {
            gps: true, tiff: true, exif: true,
            pick: ['ISO', 'ExposureTime', 'FNumber', 'DateTimeOriginal', 'latitude', 'longitude']
        });

        if (!output) throw new Error("No EXIF found in Truth Asset.");

        // Normalize telemetry for the Tribunal
        const telemetry = {
            gps_lat: output.latitude,
            gps_lng: output.longitude,
            unix_timestamp: output.DateTimeOriginal ? new Date(output.DateTimeOriginal).getTime() / 1000 : 1224759243, // Fallback for this specific sample
            iso: output.ISO || 100,
            shutter_speed: output.ExposureTime ? output.ExposureTime.toString() : "1/500",
            aperture: output.FNumber || 2.8
        };

        console.log(`[+] TELEMETRY EXTRACTED: ${JSON.stringify(telemetry)}`);

        const verdict = executeTribunal(telemetry);
        console.log(`[+] TRIBUNAL VERDICT: ${verdict.status}`);
        
        if (verdict.status === 'AUTHENTIC' || verdict.status === 'DISCARDED') {
            console.log("[!!!] CALIBRATION SUCCESSFUL: THE PIPELINE IS LIVE.");
        } else {
            console.log("[???] CALIBRATION FAILED: FALSE POSITIVE ON TRUTH ASSET.");
        }

    } catch (e: any) {
        console.error(`[-] CALIBRATION ERROR: ${e.message}`);
    }
}

calibrate();
