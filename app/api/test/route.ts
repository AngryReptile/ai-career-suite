import { generateWithRetry } from "@/lib/gemini";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  let userId = null;
  if(session?.user) {
     userId = (session.user as any).id || session.user.email;
  }
  
  if(!userId) return NextResponse.json({ error: "Not logged in to test endpoint" });

  let userResume = null;
  let resumeKeywordsStr = "";
  userResume = await (prisma as any).userResume.findFirst({
    where: { userId, isSelected: true },
  });
  if (userResume?.content) {
    resumeKeywordsStr = JSON.stringify(userResume.content).slice(0, 1500).replace(/\n/g, ' ').trim();
  }

  const nlpInstruction = `You are an elite Intent Detection Router. Calculate the user's explicit intent.
If the query asks "WHERE to buy" or for a PHYSICAL store/shop/location:
Output {"intent": "research", "query": "[Product] physical store locations map [Corrected City] [Computed Country]"}

If the query is related to PRODUCTS, E-COMMERCE, GADGETS, or PRICING:
Output {"intent": "research", "query": "Optimal DuckDuckGo query string"}

If the query is asking for GENERAL RESEARCH, COMPANY INFO, Tech News, Layoffs, or Analysis:
Output {"intent": "research", "query": "Optimal DuckDuckGo query string"}

If the query is STRICTLY looking for JOBS, CAREERS, INTERNSHIPS, or HIRING ROLES (e.g. "front end roles pune", "mca fresher", "find me jobs"):
Output {"intent": "job", "keywords": "pure Job Title", "location": "City (or empty)"}

CRITICAL PROFILE INJECTION: If the user says something extremely vague like "find me a job" or "get me an internship" WITHOUT explicitly stating a Role, you MUST intelligently read their Resume Skills Context (provided below). You MUST map their database skills into a formal Job Title (e.g., if their skills are "React, Node" and they ask for "jobs", strictly rewrite the output keywords to "React Developer" or "Full Stack Engineer"). DO NOT leave the keywords generic if you have their skills!

USER RESUME CONTEXT (TOP SKILLS): ${resumeKeywordsStr || "No skills found."}
Respond ONLY with perfect JSON.`;

  try {
    const result = await generateWithRetry('Input: "find me some jobs"', nlpInstruction, 2);
    return NextResponse.json({ 
       result: await result.response.text(), 
       userStr: resumeKeywordsStr 
    });
  } catch(e: any) {
    return NextResponse.json({ error: e.message });
  }
}
