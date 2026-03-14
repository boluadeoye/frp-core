import { Connection, PublicKey } from '@solana/web3.js';
import exifr from 'exifr';
import fs from 'fs';
import path from 'path';
import { executeTribunal } from '../lib/forensics/tribunal';

/**
 * FRP MERCENARY SIPHON v1.2 - DEEP TRENCH EDITION
 * Target: Hivemapper Program Logs (The Firehose)
 * Strategy: WebSocket Subscription + Gateway Swarm
 */

const HIVEMAPPER_PROGRAM_ID = new PublicKey('4vMsoUT2BWatFweudnQM1xedRLfJgJ7hswhcpz4xgBTy');
const DOSSIER_PATH = path.join(process.cwd(), 'data', 'dossier.json');

// GATEWAY SWARM: Parallel racing to beat Lagos latency
const GATEWAY_SWARM = [
  'https://dweb.link/ipfs/',
  'https://w3s.link/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://ipfs.io/ipfs/'
];

async function swarmBiopsy(cid: string): Promise<Buffer | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s total swarm timeout

  const promises = GATEWAY_SWARM.map(async (baseUrl) => {
    try {
      const response = await fetch(`${baseUrl}${cid}`, {
        headers: { 'Range': 'bytes=0-131071', 'X-Requested-With': 'XMLHttpRequest' },
        signal: controller.signal
      });
      if (response.status === 206 || response.status === 200) {
        const buffer = Buffer.from(await response.arrayBuffer());
        controller.abort(); // Kill other racing requests
        return buffer;
      }
    } catch (e) { return null; }
    return null;
  });

  try {
    const result = await Promise.any(promises.filter(p => p !== null));
    clearTimeout(timeoutId);
    return result;
  } catch (e) {
    return null;
  }
}

async function processCID(cid: string, signature: string) {
  process.stdout.write(`[~] Swarm Biopsy on CID: ${cid.substring(0, 8)}... `);
  
  const buffer = await swarmBiopsy(cid);
  if (!buffer) {
    console.log(`[FAILED: Swarm Timeout]`);
    return;
  }

  try {
    const output = await exifr.parse(buffer, {
      gps: true, tiff: true, exif: true,
      pick: ['ISO', 'ExposureTime', 'FNumber', 'DateTimeOriginal', 'latitude', 'longitude']
    });

    if (!output || !output.latitude) {
      console.log(`[SKIPPED: No Telemetry]`);
      return;
    }

    const telemetry = {
      gps_lat: output.latitude,
      gps_lng: output.longitude,
      unix_timestamp: output.DateTimeOriginal ? new Date(output.DateTimeOriginal).getTime() / 1000 : Date.now() / 1000,
      iso: output.ISO,
      shutter_speed: output.ExposureTime ? output.ExposureTime.toString() : "1/500",
      aperture: output.FNumber
    };

    const verdict = executeTribunal(telemetry);
    
    if (verdict.status === 'PHYSICAL_LIE') {
      console.log(`\n[!!!] PHYSICAL LIE DETECTED [!!!]`);
      const proof = { cid, signature, telemetry, verdict, auditedAt: new Date().toISOString() };
      
      let dossier = [];
      if (fs.existsSync(DOSSIER_PATH)) dossier = JSON.parse(fs.readFileSync(DOSSIER_PATH, 'utf-8'));
      dossier.push(proof);
      fs.writeFileSync(DOSSIER_PATH, JSON.stringify(dossier, null, 2));
      console.log(`[+] Proof Locked. Total: ${dossier.length}\n`);
    } else {
      console.log(`[${verdict.status}]`);
    }
  } catch (e) {
    console.log(`[ERROR: Parsing]`);
  }
}

async function startSiphon() {
  console.log(`[+] INITIATING DEEP TRENCH SIPHON v1.2...`);
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

  console.log(`[+] Subscribing to Hivemapper Program Logs...`);
  
  connection.onLogs(HIVEMAPPER_PROGRAM_ID, (logs) => {
    const logString = logs.logs.join(' ');
    const ipfsRegex = /(Qm[1-9A-HJ-NP-Za-km-z]{44,}|bafy[a-zA-Z0-9]{40,})/g;
    const cids = logString.match(ipfsRegex);

    if (cids) {
      console.log(`[!] Detected ${cids.length} CIDs in Transaction: ${logs.signature.substring(0, 8)}...`);
      cids.forEach(cid => processCID(cid, logs.signature));
    }
  }, 'confirmed');

  console.log(`[+] WebSocket Active. Listening for Data Firehose...`);
}

startSiphon();
