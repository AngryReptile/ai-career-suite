import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { generateWithRetry } from '@/lib/gemini';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user ? ((session.user as any).id || session.user.email) : 'demo_user';

    const resumes = await (prisma as any).userResume.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(resumes);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user ? ((session.user as any).id || session.user.email) : 'demo_user';
    const { filename, content, fileData } = await req.json();

    // Unselect all others to make the new one active
    await (prisma as any).userResume.updateMany({
      where: { userId },
      data: { isSelected: false }
    });

    // AI Extraction Logic: If fileData is present, use Gemini to extract text for matching/scoring
    let extractedContent = content;
    if (fileData && fileData.includes('base64')) {
      try {
        const base64Data = fileData.split(',')[1];
        const mimeType = fileData.split(';')[0].split(':')[1] || 'application/pdf';
        
        const promptParts = [
          { text: "ACT AS A PROFESSIONAL RESUME PARSER. EXTRACT THE FULL TEXT CONTENT FROM THIS RESUME FILE PRECISELY. MAINTAIN THE ORIGINAL STRUCTURE AS MUCH AS POSSIBLE. DO NOT ADD ANY COMMENTARY, ACKNOWLEDGMENTS, OR FORMATTING NOTES. RETURN ONLY THE TEXT FOUND IN THE DOCUMENT." },
          { inlineData: { mimeType, data: base64Data } }
        ];
        
        const result = await generateWithRetry(promptParts);
        const responseText = (await result.response).text().trim();
        
        if (responseText && responseText.length > 50) {
          extractedContent = responseText;
        }
      } catch (aiError: any) {
        // AI extraction failed, continue with placeholder
      }
    }

    try {
      const resume = await (prisma as any).userResume.create({
        data: {
          userId,
          filename,
          content: extractedContent,
          fileData,
          isSelected: true
        }
      });

      // Log Activity
      await (prisma as any).activity.create({
        data: {
          userId,
          type: 'resume_upload',
          title: `Uploaded: ${filename}`
        }
      });

      return NextResponse.json(resume);
    } catch (dbError: any) {
      console.error("DATABASE UPLOAD ERROR:", dbError);
      return NextResponse.json({ 
        error: "Database failure", 
        details: dbError.message,
        code: dbError.code 
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error("RESUME UPLOAD TOP-LEVEL ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user ? ((session.user as any).id || session.user.email) : 'demo_user';
    const { id, action } = await req.json();

    if (action === 'unselect') {
      await (prisma as any).userResume.updateMany({
        where: { userId },
        data: { isSelected: false }
      });
      return NextResponse.json({ success: true });
    }

    // Use a transaction for atomic swap
    const resume = await prisma.$transaction(async (tx: any) => {
      // 1. Unselect EVERYTHING for this user first
      await tx.userResume.updateMany({
        where: { userId },
        data: { isSelected: false }
      });

      // 2. Select this specific one
      return await tx.userResume.update({
        where: { id },
        data: { isSelected: true }
      });
    });

    return NextResponse.json(resume);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user ? ((session.user as any).id || session.user.email) : 'demo_user';
    
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      await (prisma as any).userResume.delete({
        where: { id, userId }
      });
    } else {
      await (prisma as any).userResume.deleteMany({
        where: { userId }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
