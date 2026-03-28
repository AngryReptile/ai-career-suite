import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const [totalUsers, totalResumes, totalScouts, totalNotes, latestActivities] = await Promise.all([
      prisma.user.count(),
      prisma.userResume.count(),
      prisma.scoutHistory.count(),
      prisma.note.count(),
      prisma.activity.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, email: true } } }
      })
    ]);

    return NextResponse.json({
      stats: {
        totalUsers,
        totalResumes,
        totalScouts,
        totalNotes
      },
      latestActivities
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json({ error: 'Failed to fetch platform analytics' }, { status: 500 });
  }
}
