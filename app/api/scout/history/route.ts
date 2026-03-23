import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const userId = (session.user as any).id || session.user.email;
    
    const history = await (prisma as any).scoutHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20 // Keep it lightweight, last 20 queries only currently
    });

    return NextResponse.json({ history });
  } catch (error: any) {
    console.error("Scout History GET Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
