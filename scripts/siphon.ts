import { Connection, PublicKey } from '@solana/web3.js';
import exifr from 'exifr';
import fs from 'fs';
import path from 'path';
import { executeTribunal, PhysicsEligibilityCheck } from '../lib/forensics/tribunal';

/**
 * FRP MERCENARY SIPHON v1.1
 * Anti-Throttle Edition with RPC Rotation and Direct CID Override.
 */

// Rotating Public RPCs to bypass IP bans
const RPC_POOLS =[
  'https://solana-rpc.publicnode.com',
  'https://api.mainnet-beta.solana.com'
];

const TARGET_PROGRAM_ID = new PublicKey('4vMsoUT2BWatFweudnQM1xedRLfJgJ7hswhcpz4xgBTy');
const DOSSIER_PATH = path.join(process.cwd(), 'data', 'dossier.json');

const GATEWAYS =[
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://gateway.pinata.cloud/ipfs/'
];

// A known IPFS CID containing EXIF data to test the Biopsy/Tribunal 
// even if the blockchain RPC completely blocks us.
const OVERRIDE_CIDS =[
  'QmSnuWmxptJZdLJpKRarxBMS2Ju2oANVrgbr2xWbie9b2D' // Example IPFS image
];

async function performBiopsy(cid: string): Promise<Buffer | null> {
  for (const gateway of GATEWAYS) {
    try {
      const url = `${gateway}${cid}`;
      const response = await fetch(url, {
        headers: { 'Range': 'bytes=0-131072' },
        signal: AbortSignal.timeout(5000)
      });

      if (response.status === 206 || response.status === 200) {
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }
    } catch (e) {
      continue;
    }
  }
  return null;
}

async function extractTelemetry(buffer: Buffer): Promise<Partial<PhysicsEligibilityCheck> | null> {
  try {
    const output = await exifr.parse(buffer, {
      tiff: true,
      exif: true,
      gps: true,
      pick:['ISO', 'ExposureTime', 'FNumber', 'DateTimeOriginal', 'latitude', 'longitude']
    });

    if (!output) return null;

    return {
      gps_lat: output.latitude,
      gps_lng: output.longitude,
      unix_timestamp: output.DateTimeOriginal ? new Date(output.DateTimeOriginal).getTime() / 1000 : undefined,
      iso: output.ISO,
      shutter_speed: output.ExposureTime ? output.ExposureTime.toString() : undefined,
      aperture: output.FNumber
    };
  } catch (e) {
    return null;
  }
}

async function processCID(cid: string, signature: string, dossier: any[]) {
  process.stdout.write(`[~] Biopsy on CID: ${cid.substring(0, 8)}... `);
  
  const buffer = await performBiopsy(cid);
  if (!buffer) {
    console.log(`[FAILED: Gateway Timeout]`);
    return;
  }

  const telemetry = await extractTelemetry(buffer);
  if (!telemetry) {
    console.log(`[FAILED: No EXIF/Telemetry]`);
    return;
  }

  const verdict = executeTribunal(telemetry);
  
  if (verdict.status === 'PHYSICAL_LIE') {
    console.log(`\n[!!!] PHYSICAL LIE DETECTED [!!!]`);
    console.log(`      Confidence: ${verdict.confidence}`);
    console.log(`      Metrics: ${JSON.stringify(verdict.metrics)}`);
    
    const proof = {
      cid,
      signature_hash: signature,
      telemetry,
      verdict,
      timestamp_audited: new Date().toISOString()
    };
    
    dossier.push(proof);
    fs.writeFileSync(DOSSIER_PATH, JSON.stringify(dossier, null, 2));
    console.log(`[+] Proof locked in Dossier. Total Proofs: ${dossier.length}\n`);
  } else {
    console.log(`[${verdict.status}]`);
  }
}

async function runSiphon() {
  console.log(`[+] INITIATING MERCENARY SIPHON v1.1...`);
  
  let dossier: any[] =[];
  if (fs.existsSync(DOSSIER_PATH)) {
    dossier = JSON.parse(fs.readFileSync(DOSSIER_PATH, 'utf-8'));
  }

  // 1. RUN THE OVERRIDE CIDS FIRST (Guarantees the Biopsy/Tribunal fires)
  console.log(`[+] Executing Direct CID Overrides...`);
  for (const cid of OVERRIDE_CIDS) {
    await processCID(cid, "DIRECT_OVERRIDE", dossier);
  }

  // 2. ATTEMPT RPC EXTRACTION
  console.log(`[+] Attempting Web3 Extraction...`);
  for (const rpc of RPC_POOLS) {
    try {
      console.log(`[+] Connecting to RPC: ${rpc}`);
      const connection = new Connection(rpc, 'confirmed');
      
      // Reduced limit to 5 to avoid instant bans, increased delay
      const signatures = await connection.getSignaturesForAddress(TARGET_PROGRAM_ID, { limit: 5 });

      for (const sigInfo of signatures) {
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3-second throttle

        const tx = await connection.getParsedTransaction(sigInfo.signature, { maxSupportedTransactionVersion: 0 });
        if (!tx) continue;

        const txString = JSON.stringify(tx);
        const ipfsRegex = /(Qm[1-9A-HJ-NP-Za-km-z]{44,}|bafy[a-zA-Z0-9]{40,})/g;
        const uniqueCIDs = [...new Set(txString.match(ipfsRegex) || [])];

        for (const cid of uniqueCIDs) {
          await processCID(cid, sigInfo.signature, dossier);
        }
      }
      break; // If successful, break out of the RPC loop
    } catch (error: any) {
      console.log(`[-] RPC ${rpc} Failed: ${error.message.substring(0, 50)}... Switching...`);
    }
  }
  
  console.log(`[+] SIPHON CYCLE COMPLETE. Dossier size: ${dossier.length}`);
}

runSiphon();
