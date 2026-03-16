import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user ? ((session.user as any).id || session.user.email) : 'demo_user';

    const activities = await prisma.activity.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(activities);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
