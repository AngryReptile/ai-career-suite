import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateWithRetry } from '@/lib/gemini';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, content } = await req.json();

    if (!content || content.length < 20) {
      return NextResponse.json({ error: "Note content is too short to generate flashcards." }, { status: 400 });
    }

    const prompt = `You are a world-class technical educator. Create a set of 5-8 comprehensive and effective flashcards based on the following note titled "${title}".

Note Content:
"${content}"

CRITICAL FORMATTING RULES:
1. Return ONLY a raw JSON array of objects.
2. Each object must have a "front" key (the question or term) and a "back" key (the concise explanation or answer).
3. Do NOT include Markdown code blocks (e.g., no \`\`\`json).
4. Do NOT include any text before or after the JSON.
5. Ensure the content is accurate and educational.

Format:
[{"front": "Question 1", "back": "Answer 1"}, ...]`;

    const result = await generateWithRetry(prompt);
    const responseText = (await result.response).text().trim();
    
    // Clean potential markdown blocks if AI ignored instructions
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    try {
      const flashcards = JSON.parse(cleanJson);
      return NextResponse.json(flashcards);
    } catch (parseError) {
      console.error("Flashcard Parse Error:", parseError, "Raw:", responseText);
      return NextResponse.json({ error: "Failed to parse AI response into flashcards. Please try again." }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Flashcard API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
