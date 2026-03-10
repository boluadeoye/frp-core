import { NextResponse } from 'next/server';
import { StreamParser } from '@/lib/frp/stream-parser';
import { db } from '@/db';
import { auditLedger } from '@/db/schema';
import { ForensicAggregator } from '@/lib/frp/forensic-aggregator';

// REMOVED: export const runtime = 'edge';
// This route now runs on Vercel's Heavyweight Node.js Serverless infrastructure.

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { imageUrl, agentId } = body;

    if (!imageUrl || !agentId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const traceId = crypto.randomUUID();

    // 1. Surgical Header Extraction (64KB)
    const headerData = await StreamParser.extractHeaders(imageUrl);

    // 2. Log to Ledger
    await db.insert(auditLedger).values({
      agentId,
      requestId: traceId,
      imageUrlRef: imageUrl,
      headerHash: headerData.hash,
      status: 'processing',
      forensicManifest: { preliminary: { exifDetected: headerData.exifFound } }
    });

    // 3. Execute Weaponized Physics Audit
    await ForensicAggregator.processAudit(traceId, imageUrl, headerData.buffer, headerData.hash);

    return NextResponse.json({
      status: 'completed',
      traceId,
      fingerprint: headerData.hash,
      fcs_preliminary: headerData.exifFound ? 0.8 : 0.2
    }, { status: 200 });

  } catch (error: any) {
    console.error('[FRP] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
