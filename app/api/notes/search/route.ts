import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { generateWithRetry } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user ? ((session.user as any).id || session.user.email) : 'demo_user';
    
    const { query } = await req.json();

    if (!query || query.trim() === '') {
       return NextResponse.json({ error: "Query is required." }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
       return NextResponse.json({ error: "API Key Missing. Add GEMINI_API_KEY to your .env.local file." }, { status: 500 });
    }

    const notes = await prisma.note.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    if (!notes || notes.length === 0) {
       return NextResponse.json({ answer: "You don't have any saved notes yet to search through." });
    }

    // Prepare context
    const contextStr = notes.map(n => `Title: ${n.title}\nTags: ${n.tags || 'none'}\nContent:\n${n.content}\n---`).join('\n');

    const prompt = `You are an AI assistant helping a user find information strictly from their saved notes. 
Read the context below, which contains all of the user's saved notes. 
Answer the user's query BASED ONLY ON THIS CONTEXT. 
If the information is not in the notes, politely state: "I couldn't find anything related to that in your notes." Do not make up information outside the notes context.

User Query: "${query}"

User's Notes Context:
${contextStr}
`;

    const result = await generateWithRetry(prompt);
    const text = (await result.response).text();

    return NextResponse.json({ answer: text });
  } catch (error: any) {
    console.error("AI Search Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
