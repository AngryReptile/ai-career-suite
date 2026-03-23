import { generateWithRetry } from "@/lib/gemini";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { input } = await req.json();

    if (!input || typeof input !== 'string') {
      return NextResponse.json({ is_vague: false });
    }

    // Do not clarify valid URLs
    if (input.startsWith('http://') || input.startsWith('https://')) {
      return NextResponse.json({ is_vague: false });
    }

    const instruction = `You are an elite Ambiguity Detector for a Deep Web Search Agent (similar to Perplexity Pro Search).
Your explicit job is to determine if a user's search query is too VAGUE or broad, requiring further clarification before scraping the internet.

RULES:
1. If the query is lacking critical context (e.g., missing a specific model version, missing a geographical region for pricing/jobs, missing a time frame for news, or is just a very abstract noun like "software jobs"), it IS vague.
2. If the query is already reasonably specific and actionable (e.g., "nothing phone 2a prices in india", "senior react developer jobs in london", "apple hiring process 2026"), it is NOT vague.
3. If it IS vague, you must ask exactly ONE short follow-up question, and generate 3-4 highly probable clickable 'suggestion chips' the user might want.
4. If it is NOT vague, you MUST generate an "extraction_schema" which explicitly details the JSON format the backend will extract from the web, and a "search_target" explaining precisely what you intend to search for.
CRITICAL MANDATORY RULE: Your 'fields_to_extract' array MUST ALWAYS include EXACTLY ONE field specifically for the exact hyper-link/URL (e.g. "Source URL" or "Link"). Do NOT create redundant or duplicate link fields. NEVER omit a link field!

OUTPUT FORMAT (JSON ONLY):
If VAGUE:
{
  "is_vague": true,
  "question": "Which specific region or version are you looking for?",
  "suggestions": ["Phone 2a", "Phone 2", "In India", "In USA"]
}

If NOT VAGUE:
{
  "is_vague": false,
  "search_target": "Detailed explanation of the exact Deep Web query you will execute",
  "extraction_schema": {
    "intent": "Jobs or Research or Products",
    "fields_to_extract": ["Title", "Company", "Salary", "Insight", "URL"],
    "reasoning": "A short rationale for why these fields best answer the query"
  }
}

Example 1: "nothing phone prices" -> VAGUE (needs model + region)
Example 2: "software jobs" -> VAGUE (needs specific role + location)
Example 3: "react frontend developer pune" -> NOT VAGUE (Specific role + location) -> Generate schema for jobs.
Example 4: "latest AI news 2026" -> NOT VAGUE -> Generate schema for research (title, summary, key_takeaways).
`;

    const result = await generateWithRetry(`User Query: "${input}"`, instruction, 2);
    let nlpText = (await result.response).text().trim();
    if (nlpText.startsWith('```json')) nlpText = nlpText.slice(7);
    if (nlpText.startsWith('```')) nlpText = nlpText.slice(3);
    if (nlpText.endsWith('```')) nlpText = nlpText.slice(0, -3);
    
    const parsed = JSON.parse(nlpText.trim());

    // Fallback schema if LLM omits it but it wasn't vague
    if (!parsed.is_vague && !parsed.extraction_schema) {
      parsed.extraction_schema = {
         intent: "Web Extraction",
         fields_to_extract: ["Title", "Summary", "Details", "Links"],
         reasoning: "Standard web page analysis framework"
      };
      parsed.search_target = input;
    }

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("[CLARIFY API ERROR]", error);
    // Fail semi-silently and allow the main search to proceed to avoid hard-blocking the user
    return NextResponse.json({ 
      is_vague: false, 
      search_target: "Executing fallback string search",
      extraction_schema: { intent: "Web Scrape", fields_to_extract: ["Title", "Data"], reasoning: "Fallback engaged" }
    });
  }
}
