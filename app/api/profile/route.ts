import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user ? ((session.user as any).id || session.user.email) : 'demo_user';

    let profile = await prisma.userProfile.findUnique({
      where: { userId }
    });

    if (!profile) {
      profile = await prisma.userProfile.create({
        data: { 
          userId,
          name: session?.user?.name || 'User',
          title: 'AI Career Specialist',
          bio: 'Helping developers master technical interviews.'
        }
      });
    }

    return NextResponse.json(profile);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user ? ((session.user as any).id || session.user.email) : 'demo_user';
    const body = await req.json();

    const profile = await prisma.userProfile.upsert({
      where: { userId },
      update: {
        title: body.title,
        bio: body.bio,
        location: body.location,
        name: body.name
      },
      create: {
        userId,
        name: body.name || session?.user?.name || 'User',
        title: body.title || 'AI Career Specialist',
        bio: body.bio || 'Helping developers master technical interviews.',
        location: body.location
      }
    });

    return NextResponse.json(profile);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
