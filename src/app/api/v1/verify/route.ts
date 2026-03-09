import { NextResponse } from 'next/server';
import { StreamParser } from '@/lib/frp/stream-parser';
import { db } from '@/db';
import { auditLedger } from '@/db/schema';
import { ForensicAggregator } from '@/lib/frp/forensic-aggregator';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { imageUrl, agentId } = body;

    if (!imageUrl || !agentId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const traceId = crypto.randomUUID();
    console.log(`[FRP-SYNC] Audit Started: ${traceId}`);

    // 1. Extract Headers
    const headerData = await StreamParser.extractHeaders(imageUrl);

    // 2. Log to Ledger
    await db.insert(auditLedger).values({
      agentId,
      requestId: traceId,
      imageUrlRef: imageUrl,
      status: 'processing',
      forensicManifest: { preliminary: { exifDetected: headerData.exifFound } }
    });

    // 3. FORCE SYNCHRONOUS EXECUTION (For Debugging)
    console.log(`[FRP-SYNC] Waiting for Groq Vision...`);
    await ForensicAggregator.processAudit(traceId, imageUrl);
    console.log(`[FRP-SYNC] Groq Vision Completed.`);

    return NextResponse.json({
      status: 'completed',
      traceId,
      message: 'Check Neon Ledger for FCS Score.'
    }, { status: 200 });

  } catch (error: any) {
    console.error('[FRP-SYNC] Fatal Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
