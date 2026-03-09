import { NextResponse } from 'next/server';
import { db } from '@/db';
import { auditLedger } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'edge';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    // Await the params object as required by Next.js 15+
    const resolvedParams = await params;
    const { requestId } = resolvedParams;

    const audit = await db.query.auditLedger.findFirst({
      where: eq(auditLedger.requestId, requestId),
    });

    if (!audit) {
      return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
    }

    return NextResponse.json({
      status: audit.status,
      fcsScore: audit.fcsScore,
      manifest: audit.forensicManifest,
      startedAt: audit.startedAt,
      completedAt: audit.completedAt
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
