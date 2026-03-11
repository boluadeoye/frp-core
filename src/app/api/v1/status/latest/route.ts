import { NextResponse } from 'next/server';
import { db } from '@/db';
import { auditLedger } from '@/db/schema';
import { desc, lt } from 'drizzle-orm';

export const runtime = 'edge';

export async function GET() {
  try {
    const burned = await db.query.auditLedger.findMany({
      where: lt(auditLedger.fcsScore, "0.400"),
      orderBy: [desc(auditLedger.startedAt)],
      limit: 10,
    });
    return NextResponse.json({ burned });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
