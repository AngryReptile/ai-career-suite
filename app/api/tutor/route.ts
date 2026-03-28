import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { generateWithRetry } from '@/lib/gemini';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    const userId = (session.user as any).id || session.user.email;
    
    const conversations = await prisma.conversation.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    return NextResponse.json(conversations);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    const userId = (session.user as any).id || session.user.email;

    const { messages, mode, conversationId } = await req.json();

    // Build the prompt context based on the mode
    let systemInstruction = "You are a helpful AI Tutor.";
    if (mode === 'socratic') {
      systemInstruction = "You are a Socratic AI Tutor. You NEVER give the exact answer right away. Instead, you ask guiding questions and provide analogies to help the user discover the answer themselves.";
    } else {
      systemInstruction = "You are a direct AI Tutor. You provide clear, concise, and direct answers to the user's questions without beating around the bush.";
    }

    let responseText = "";

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "API Key Missing. Please add GEMINI_API_KEY to your .env.local file." }, { status: 500 });
    }

    // Format history into a single text prompt to bypass strict alternating sequence requirements
    const formattedHistory = messages.map((m: any) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
    const prompt = `System Instruction: ${systemInstruction}\n\nHere is the conversation history:\n${formattedHistory}\n\nPlease respond to the user's last message.`;
    
    // We do NOT pass systemInstruction as a second argument because Gemma 3 IT does not support the developer instruction property in the Google AI SDK.
    const result = await generateWithRetry(prompt);
    responseText = (await result.response).text();

    // Save or Update the conversation in DB
    const updatedMessages = JSON.stringify([...messages, { role: 'assistant', content: responseText }]);
    let savedConv;
    
    if (conversationId) {
       savedConv = await prisma.conversation.update({
          where: { id: conversationId },
          data: { messages: updatedMessages }
       });
    } else {
       savedConv = await prisma.conversation.create({
          data: {
             userId,
             topic: messages.length > 0 ? messages[0].content.slice(0, 40) + "..." : "AI Tutor Session",
             messages: updatedMessages,
          }
       });
    }

    // Log Activity
    await (prisma as any).activity.create({
        data: {
            userId,
            type: 'tutor_ask',
            title: `AI Tutor: ${messages[messages.length-1].content.slice(0, 30)}...`
        }
    });

    return NextResponse.json({ reply: responseText, conversationId: savedConv.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
