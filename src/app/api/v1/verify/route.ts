import { NextResponse } from 'next/server';
import { StreamParser } from '@/lib/frp/stream-parser';
import { db } from '@/db';
import { auditLedger } from '@/db/schema';

export const runtime = 'edge'; // Force Vercel Edge Runtime

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { imageUrl, agentId, callbackUrl } = body;

    if (!imageUrl || !agentId) {
      return NextResponse.json({ error: 'Missing required fields: imageUrl, agentId' }, { status: 400 });
    }

    const traceId = crypto.randomUUID();
    console.log(`[FRP] Audit Started: ${traceId} for Agent: ${agentId}`);

    // 1. Immediate Surgical Header Extraction (Low Memory)
    // We await this because it's fast (< 500ms) and we want to return preliminary data
    const headerData = await StreamParser.extractHeaders(imageUrl);

    // 2. Log the initial request to the "Machine Money" Ledger
    await db.insert(auditLedger).values({
      agentId,
      requestId: traceId,
      imageUrlRef: imageUrl,
      status: 'processing',
      forensicManifest: {
        preliminary: {
          exifDetected: headerData.exifFound,
          c2paDetected: headerData.c2paFound,
          contentType: headerData.contentType,
          bytesAnalyzed: headerData.buffer.length
        }
      }
    });

    // 3. Trigger the Background Forensic Audit (Fire and Forget)
    // In a full implementation, this would trigger a background worker or queue.
    // For now, we log the handoff.
    console.log(`[FRP] Handoff to Llama 4 Scout pending for Trace: ${traceId}`);

    // Return 202 Accepted immediately
    return NextResponse.json({
      status: 'accepted',
      traceId,
      preliminary: {
        exifDetected: headerData.exifFound,
        c2paDetected: headerData.c2paFound,
        contentType: headerData.contentType
      },
      message: 'Forensic audit is processing asynchronously. Results will be available via GET /api/v1/status/[traceId]'
    }, { status: 202 });

  } catch (error: any) {
    console.error('[FRP] Entry Error:', error.message);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
