import { NextResponse } from 'next/server';
import { after } from 'next/server';
import { StreamParser } from '@/lib/frp/stream-parser';
import { db } from '@/db';
import { auditLedger } from '@/db/schema';
import { ForensicAggregator } from '@/lib/frp/forensic-aggregator';

export const runtime = 'edge';

export async function POST(req: Request) {
  const traceId = crypto.randomUUID();
  console.log(`[FRP-DEBUG] Request received. Trace: ${traceId}`);

  try {
    const body = await req.json();
    const { imageUrl, agentId, callbackUrl } = body;

    if (!imageUrl || !agentId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // 1. Surgical Header Extraction
    console.log(`[FRP-DEBUG] Starting StreamParser for ${traceId}`);
    const headerData = await StreamParser.extractHeaders(imageUrl).catch(e => {
      console.error(`[FRP-DEBUG] StreamParser Failed: ${e.message}`);
      return { exifFound: false, c2paFound: false, contentType: 'unknown', buffer: new Uint8Array() };
    });

    // 2. Log to Ledger (With Error Catching)
    console.log(`[FRP-DEBUG] Attempting DB Insert for ${traceId}`);
    try {
      await db.insert(auditLedger).values({
        agentId,
        requestId: traceId,
        imageUrlRef: imageUrl,
        status: 'processing',
        forensicManifest: { preliminary: { exifDetected: headerData.exifFound } }
      });
      console.log(`[FRP-DEBUG] DB Insert Success for ${traceId}`);
    } catch (dbError: any) {
      console.error(`[FRP-DEBUG] DB Insert Failed: ${dbError.message}`);
      // We continue anyway to return the 202
    }

    // 3. Background Audit
    after(() => {
      console.log(`[FRP-DEBUG] Triggering Aggregator for ${traceId}`);
      ForensicAggregator.processAudit(traceId, imageUrl, callbackUrl).catch(e => 
        console.error(`[FRP-DEBUG] Aggregator Background Error: ${e.message}`)
      );
    });

    return NextResponse.json({
      status: 'accepted',
      traceId,
      preliminary: { exifDetected: headerData.exifFound }
    }, { status: 202 });

  } catch (error: any) {
    console.error(`[FRP-DEBUG] Fatal Route Error: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
