import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { generateWithRetry } from '@/lib/gemini';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// POST: Save a new Note
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user ? ((session.user as any).id || session.user.email) : 'demo_user';

    if (userId === 'demo_user') {
       await prisma.user.upsert({
          where: { id: 'demo_user' },
          update: {},
          create: { id: 'demo_user', email: 'demo@example.com', name: 'Demo User' }
       });
    }

    const { summaryData, title: manualTitle, content: manualContent } = await req.json();

    let title = manualTitle || "Generated Video Note";
    let content = manualContent || "";
    let tags = "#Note";

    if (!manualContent && summaryData) {
      if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json({ error: "API Key Missing. Please add GEMINI_API_KEY to your .env.local file." }, { status: 500 });
      }

      const prompt = `Reformat this parsed video summary into a clean, structured study note. 
Return strictly a JSON object with: 
"title" (string, short descriptive title), 
"content" (string with strictly plain text or markdown formatting, summarizing the video. DO NOT USE ANY HTML TAGS like <div>, <p>, etc.), 
"tags" (string with 2-3 comma separated hash tags like "#React, #Study"). 
Do not use markdown blocks outside the json. Summary context:\n${JSON.stringify(summaryData)}`;

      const result = await generateWithRetry(prompt);
      const text = (await result.response).text();
      
      const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(jsonStr);
      title = parsed.title || title;
      content = parsed.content || content;
      tags = parsed.tags || tags;
    }

    // Save heavily formatted note to Prisma
    const note = await prisma.note.create({
      data: {
        userId,
        title,
        content,
        tags,
      }
    });

    // Log Activity
    await (prisma as any).activity.create({
        data: {
            userId,
            type: 'note',
            title: `Saved Note: ${title}`
        }
    });

    return NextResponse.json(note);
  } catch (error: any) {
    console.error("Save Note Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: Update an existing note
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user ? ((session.user as any).id || session.user.email) : 'demo_user';
    
    const { id, title, content, tags } = await req.json();

    const existingNote = await prisma.note.findUnique({ where: { id } });
    if (!existingNote || existingNote.userId !== userId) {
       return NextResponse.json({ error: "Unauthorized or not found" }, { status: 403 });
    }

    const note = await prisma.note.update({
      where: { id },
      data: {
        title,
        content,
        tags
      }
    });

    return NextResponse.json(note);
  } catch (error: any) {
    console.error("Update Note Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET: Fetch user's saved notes
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user ? ((session.user as any).id || session.user.email) : 'demo_user';
  
  const notes = await prisma.note.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });
  return NextResponse.json(notes);
}
