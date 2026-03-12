import { NextResponse } from 'next/server';
import { StreamParser } from '@/lib/frp/stream-parser';
import { db } from '@/db';
import { auditLedger } from '@/db/schema';
import { ForensicAggregator } from '@/lib/frp/forensic-aggregator';
import { ratelimit } from '@/lib/frp/ratelimit';

export async function POST(req: Request) {
  // 1. TITANIUM RATE LIMITING
  if (ratelimit) {
    const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
    const { success } = await ratelimit.limit(ip);
    if (!success) {
      return NextResponse.json({ error: "TOO_MANY_REQUESTS" }, { status: 429 });
    }
  }

  try {
    const body = await req.json();
    const { imageUrl, agentId, clientExif } = body;

    if (!imageUrl || !agentId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const traceId = crypto.randomUUID();

    // 2. DYNAMIC RANGE EXTRACTION
    const headerData = await StreamParser.extractHeaders(imageUrl);

    // 3. LOG TO LEDGER
    await db.insert(auditLedger).values({
      agentId,
      requestId: traceId,
      imageUrlRef: imageUrl,
      headerHash: headerData.hash,
      status: 'processing',
      forensicManifest: { preliminary: { scanDepth: headerData.scanDepth } }
    });

    // 4. EXECUTE HARDENED AUDIT
    await ForensicAggregator.processAudit(traceId, imageUrl, headerData.buffer, headerData.hash, clientExif);

    return NextResponse.json({
      status: 'completed',
      traceId,
      fingerprint: headerData.hash,
      scanDepth: headerData.scanDepth
    }, { status: 200 });

  } catch (error: any) {
    console.error('[FRP] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
