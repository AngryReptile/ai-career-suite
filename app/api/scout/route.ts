import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { generateWithRetry } from '@/lib/gemini';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow more time for deep scraping

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized access detected." }, { status: 401 });
    }
    const userId = (session.user as any).id || session.user.email;
    
    const { input, mode, page = 1, schemaKeys, schemaIntent } = await req.json(); // mode can be 'url' or 'search', page defaults to 1
    
    if (!input) {
      return NextResponse.json({ error: "Input is required." }, { status: 400 });
    }

    // Fetch Active User Resume for AI Matching
    let userResume = null;
    let resumeKeywordsStr = "";
    if (userId) {
      userResume = await (prisma as any).userResume.findFirst({
        where: { userId, isSelected: true },
      });
      if (userResume?.content) {
        // Feed the raw unstructured resume text directly to the LLM (first 1500 chars) instead of relying on a hardcoded string array, ensuring all niche skills (e.g. cybersecurity) organically route into the prompt.
        resumeKeywordsStr = JSON.stringify(userResume.content).slice(0, 1500).replace(/\\n/g, ' ').trim();
      }
    }

    let markdown = "";
    let isResearch = false;
    
    if (mode === 'url') {
      // Direct Web Scraping
      const jinaRes = await fetch(`https://r.jina.ai/${input}`, {
        headers: { "X-Return-Format": "markdown" },
        cache: 'no-store'
      });
      if (!jinaRes.ok) throw new Error("Failed to scrape the provided URL.");
      markdown = await jinaRes.text();
    } else {
      // Direct Multi-Platform Search Implementation
      let keywords = input;
      let location = "";

      // AGENTIC NLP PRE-PROCESSING
      const nlpInstruction = `You are an elite Intent Detection Router. Calculate the user's explicit intent.
If the query asks "WHERE to buy" or for a PHYSICAL store/shop/location, actively rewrite the query to aggressively prioritize maps, directories, and physical storefronts. CRITICAL: To prevent foreign search-engine IP bias, you MUST correct any misspellings of the city and explicitly compute and append the correct COUNTRY NAME:
Output {"intent": "research", "query": "[Product] physical store locations map [Corrected City] [Computed Country]"}

If the query is related to PRODUCTS, E-COMMERCE, GADGETS, or PRICING (e.g. "nothing phone prices", "macbook under 50k", "iphone cost in india"):
Output {"intent": "research", "query": "Optimal DuckDuckGo query string. CRITICAL: STRICTLY preserve specific locations like 'in india', 'in US' if the user requested them!"}

If the query is asking for GENERAL RESEARCH, COMPANY INFO, Tech News, Layoffs, or Analysis:
Output {"intent": "research", "query": "Optimal DuckDuckGo query string"}

If the query is STRICTLY looking for JOBS, CAREERS, INTERNSHIPS, or HIRING ROLES (e.g. "front end roles pune", "mca fresher", "find me jobs"):
Output {"intent": "job", "keywords": "pure Job Title", "location": "City (or empty)"}
CRITICAL PROFILE INJECTION: If the user says something extremely vague like "find me a job" or "get me an internship" WITHOUT explicitly stating a Role, you MUST intelligently read their Resume Skills Context (provided below). You MUST map their database skills into a formal Job Title (e.g., if their skills are "React, Node" and they ask for "jobs", strictly rewrite the output keywords to "React Developer" or "Full Stack Engineer"). DO NOT leave the keywords generic if you have their skills!

USER RESUME CONTEXT (TOP SKILLS): ${resumeKeywordsStr || "No specific resume profile active."}

Example 1: "find me front end roles in pune" -> {"intent": "job", "keywords": "Frontend Developer", "location": "Pune"}
Example 2: "nothing phone prices" -> {"intent": "research", "query": "nothing phone prices buy cost"}
Example 3: "buy apple earphone bagnlore" -> {"intent": "research", "query": "buy apple earphones physical store map location Bangalore India"}
Example 4: "what is apple's hiring process?" -> {"intent": "research", "query": "apple hiring process interview steps"}
Respond ONLY with perfect JSON.`;

      try {
        const nlpResult = await generateWithRetry(`Input: "${input}"`, nlpInstruction, 2);
        let nlpText = (await nlpResult.response).text().trim();
        if (nlpText.startsWith('```json')) nlpText = nlpText.slice(7);
        if (nlpText.startsWith('```')) nlpText = nlpText.slice(3);
        if (nlpText.endsWith('```')) nlpText = nlpText.slice(0, -3);
        
        const parsed = JSON.parse(nlpText.trim());
        isResearch = parsed.intent === 'research';
        
        if (isResearch && parsed.query) {
           console.log(`[SOVEREIGN AGENT] Phase 1: Research Planning for "${input}"`);
           
           // STAGE 1: ADAPTIVE QUERY DIVERSIFICATION
           const planningInstruction = `You are a Deep Web Research Strategist. 
Given the user query: "${input}", generate 3 distinct, highly targeted search strings to find the rawest, deepest data possible.
- Query 1: Broad aggregator search (e.g. "top 10 sites for...")
- Query 2: Direct transactional/booking search (e.g. "official booking showtimes", "price list store")
- Query 3: Localized or specific query (e.g. "site:.in", "neighborhood specific shop")
Respond ONLY with a JSON array of 3 strings: ["q1", "q2", "q3"]`;

           let tacticalQueries = [parsed.query];
           try {
             const planResult = await generateWithRetry(`User Input: "${input}"`, planningInstruction, 2);
             const planText = (await planResult.response).text().trim();
             const planMatch = planText.match(/\[[\s\S]*\]/);
             if (planMatch) tacticalQueries = JSON.parse(planMatch[0]);
           } catch (e) { console.warn("[SOVEREIGN] Planning failed, falling back to single query."); }

           console.log(`[SOVEREIGN AGENT] Phase 2: Executing Parallel Discovery (${tacticalQueries.length} streams)...`);
           
           // STAGE 2: MULTI-STREAM DISCOVERY
           const searchPromises = tacticalQueries.map(q => 
             fetch(`https://r.jina.ai/https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`, { headers: { "X-Return-Format": "markdown" }, cache: 'no-store' })
             .then(r => r.text())
             .catch(() => "")
           );
           const searchRes = await Promise.all(searchPromises);
           let discoveryMarkdown = searchRes.join("\n\n---\n\n");

           // Decrypt DDG redirect wrappers
           const dggTrackerRegex = /https?:\/\/(?:lite\.)?duckduckgo\.com\/l\/\?uddg=([^&\s'"]+)[^\s'")]*/gi;
           discoveryMarkdown = discoveryMarkdown.replace(dggTrackerRegex, (match, encodedUrl) => {
              try { return decodeURIComponent(encodedUrl); } catch { return match; }
           });

           // STAGE 3: TACTICAL TARGET EVALUATION
           console.log("[SOVEREIGN AGENT] Phase 3: Analyzing SERP snippets for high-value Deep Links...");
           const targetInstruction = `You are a Tactical Link Evaluator for an AI Agent. Read these search results and identify the TOP 8 URLs that are most likely to contain DIRECT, RAW DATA (e.g. Booking pages, Store product pages, price grids).
PRIORITIZE: Official brand sites, known aggregators (BookMyShow, 91mobiles, JustDial).
REJECT: Generic news homepages, login screens, or unrelated blogs.
Respond ONLY with a JSON array of absolute URLs: ["url1", "url2", ...]`;

           let deepSourceUrls: string[] = [];
           try {
             const targetResult = await generateWithRetry(discoveryMarkdown.slice(0, 50000), targetInstruction, 2);
             const targetText = (await targetResult.response).text().trim();
             const targetMatch = targetText.match(/\[[\s\S]*\]/);
             if (targetMatch) deepSourceUrls = JSON.parse(targetMatch[0]);
           } catch (e) {
             console.warn("[SOVEREIGN] Link evaluation failed, using regex fallback.");
             deepSourceUrls = [...discoveryMarkdown.matchAll(/https?:\/\/[^\s\)]+/gi)]
                .map(m => m[0])
                .filter(url => !url.includes('duckduckgo') && !url.includes('wikipedia.org') && !url.includes('youtube.com') && !url.includes('apple.com'))
                .slice(0, 8);
           }

           // STAGE 4: MASSIVE RECURSIVE RECRUSION
           if (deepSourceUrls.length > 0) {
              console.log(`[SOVEREIGN AGENT] Phase 4: Recursing into ${deepSourceUrls.length} Targeted Nodes...`);
              const recursiveRes = await Promise.allSettled(deepSourceUrls.slice(0, 8).map(u => 
                fetch(`https://r.jina.ai/${u}`, { headers: {"X-Return-Format": "markdown"} })
                .then(async r => `[SOURCE_NODE: ${u}]\n\n` + await r.text())
                .catch(() => "")
              ));
              const deepText = recursiveRes.map((r: any) => r.status === 'fulfilled' ? r.value : "").join('\n\n---\n\n');
              markdown = deepText + "\n\n---\n\n[DISCOVERY_SERP_SUMMARY]:\n" + discoveryMarkdown.slice(0, 10000);
           } else {
              markdown = discoveryMarkdown;
           }
        } else {
           if (parsed.keywords) keywords = parsed.keywords;
           if (parsed.location) location = parsed.location; else location = "India";
           console.log(`[NLP ROUTER] Routed to Job Crawler: "${keywords}" | Loc: "${location}"`);
        }
      } catch (e) {
        console.warn("[NLP ROUTER] Failed, using regex fallback.");
      }

      if (!isResearch) {
        // Auto-correct extremely common typos that break LinkedIn's strict geo-routing DB
        const typoMap: Record<string, string> = {
          'banglore': 'Bangalore', 'bengaluru': 'Bangalore', 'gurugram': 'Gurgaon', 'delhi ncr': 'New Delhi', 'navi mumbai': 'Mumbai'
        };
        if (location && typoMap[location.toLowerCase()]) location = typoMap[location.toLowerCase()];

        const kwEncoded = encodeURIComponent(keywords.replace(/[^\w\s-]/g, '').trim());
        const locEncoded = encodeURIComponent(location);
        const pageNum = page || 1;
        const linkedinStart = (pageNum - 1) * 25;
        
        const platforms = [
          `https://www.linkedin.com/jobs/search?keywords=${kwEncoded}${location ? `&location=${locEncoded}` : ''}${pageNum > 1 ? `&start=${linkedinStart}` : ''}`,
          `https://internshala.com/jobs/${keywords.replace(/\s+/g, '-')}-jobs${location ? `-in-${location.toLowerCase().replace(/\s+/g, '-')}` : ''}${pageNum > 1 ? `/page-${pageNum}` : ''}`,
          `https://www.foundit.in/srp/results?query=${kwEncoded}${location ? `&locations=${locEncoded}` : ''}${pageNum > 1 ? `&pageNo=${pageNum}` : ''}`,
          `https://www.adzuna.in/search?q=${kwEncoded}${location ? `&w=${locEncoded}` : ''}${pageNum > 1 ? `&p=${pageNum}` : ''}`,
          `https://remoteok.com/remote-${keywords.replace(/\s+/g, '-')}-jobs`
        ];

        const fetchPromises = platforms.map(url => 
          fetch(`https://r.jina.ai/${url}`, { headers: { "X-Return-Format": "markdown" }, cache: 'no-store' })
            .then(async res => {
              const txt = await res.text();
              console.log(`NEXT.JS FETCH: ${url} | Length: ${txt.length}`);
              return res.ok ? txt : "";
            }).catch(() => "")
        );

        const results = await Promise.allSettled(fetchPromises);
        markdown = results.map((result: any) => result.status === 'fulfilled' ? result.value : "").filter(text => text.length > 100).join("\n\n---\n\n");
      }

      if (!markdown.trim()) {
        throw new Error("Failed to extract data from targeted domains.");
      }
    }

    // Truncate markdown to prevent token overflow (200k chars is ~50k tokens, well within Gemini Flash's 1M limit)
    const safeMarkdown = markdown.slice(0, 200000);

    const systemInstruction = schemaKeys && Array.isArray(schemaKeys) && schemaKeys.length > 0 ? `
You are an elite, autonomous Data Extraction AI Agent. 
You have been provided with CONCATENATED RAW MARKDOWN scraped directly from a Target Web Search and/or Deep Scraped Sites.
Your strict task is to extract information and structure it into a perfect custom JSON format based on the exact keys requested by the user. DO NOT return markdown blocks, just the raw JSON object.

CRITICAL INSTRUCTION: You must extract the relevant items into a JSON array, where EVERY object has exactly the keys listed below.
REQUESTED KEYS: ${JSON.stringify(schemaKeys)}

DATA QUALITY RULES:
1. DIVERSITY ENFORCEMENT: You MUST prioritize finding and including as many distinct companies, sellers, or domains as possible in your results. Do not ignore a different retailer just because one retailer has many items.
2. UNLIMITED DOMAIN YIELD: If a single website or domain contains multiple distinct valid items (e.g., 10 different showtimes or 5 different product models), you MUST extract EVERY single one of them as a separate row. There is no limit per domain.
3. MAXIMUM VOLUME: Extract AS MANY valid items as you can find in the provided text (aim for 10-20+ items if possible).
4. STRICT DATA REJECTION: If an item in the text does not explicitly state the core metric (like Price or Location), YOU MUST NOT EXTRACT IT. Do NOT output "-", "N/A", or "Unknown". If a requested field is missing from the source text, skip the entire item.
4. TRANSACTIONAL PRIORITY: While you should prioritize extracting from official stores, you MAY scrape news articles or blogs if they contain specific prices and booking links. CRITICAL: If you find a direct booking URL (e.g. BookMyShow, Amazon, Flipkart) buried inside a news article, you MUST extract the direct booking URL as the main Link, not the news article's URL.
5. ABSOLUTE LINKING RULE: You MUST NEVER output Search Engine links (DuckDuckGo, Google, Bing). You must meticulously extract the EXACT, DIRECT deep-link to the specific item page. If the real deep-link is missing, skip the item.

Format exactly as:
{
  "type": "dynamic",
  "data": [
    {
${schemaKeys.map(k => `      "${k}": "data value"`).join(',\n')}
    }
  ]
}

If no data exists or no items meet the strict criteria, return "data": [].
` : mode === 'url' || (mode === 'search' && typeof isResearch !== 'undefined' && isResearch) ? `
You are an elite, autonomous Career & Research AI Agent: **SOVEREIGN CORE**. 
You have been provided with a MASSIVE DATA POOL containing:
1. RAW SCRAPED DATA from 6-8 specifically targeted "Deep Web" nodes (Booking pages, store grids).
2. A summary of the original search results (SERP).

Your task is to synthesize this multi-source data into one highly accurate, clean result. 
CRITICAL: If different sources provide conflicting info (e.g. different prices for the same seat), prioritize the one that appears to be the direct official storefront link.
ABSOLUTE LINKING RULE: You MUST extract the EXACT, DIRECT deep-link to the item. DO NOT output search engine links. If a deep link is found in a "SOURCE_NODE" block, use that as the primary URL.

If the query is a LIST of items or products, format exactly as:
{
  "type": "jobs",
  "data": [
    {
      "id": "1",
      "title": "Item Name or Title",
      "company": "Source/Brand (e.g. Amazon, GitHub, NYT)",
      "location": "Context or N/A",
      "salary": "Price/Metric if applicable",
      "experience": "N/A",
      "match_score": 90,
      "ai_insight": "A brief summary of this item.",
      "source_url": "The exact absolute URL directly deep-linked to this specific item. ABSOLUTELY NO duckduckgo or search engine links."
    }
  ]
}

Otherwise, if the user requested a general SUMMARY or RESEARCH report of a single topic, format exactly as:
{
  "type": "research",
  "data": {
    "title": "A precise title for your research report",
    "summary": "A comprehensive 2-3 paragraph technical summary synthesizing the web search results.",
    "key_takeaways": ["Point 1", "Point 2", "Point 3", "Point 4"]
  }
}
` : `
You are an elite, autonomous Career & Research AI Agent. 
You have been provided with CONCATENATED RAW MARKDOWN scraped directly from MULTIPLE job boards (e.g. LinkedIn, Internshala, Adzuna).
Your strict task is to extract job listings and structure them into a perfect JSON format. DO NOT return markdown blocks, just the raw JSON object.

CRITICAL INSTRUCTION: You MUST extract approximately 15 top job listings in total. 
IMPORTANT: The provided text contains 5 different job platforms separated by '---'. You MUST mathematically scan ALL 5 platforms and extract exactly 3-4 jobs from EACH '---' delimited section! DO NOT extract all 15 jobs from the very first top platform! You must force yourself to read all completely to the bottom of the text and pull jobs evenly from all sources.
ABSOLUTE RULE: If a platform's text section contains a "0 results found" or "Page Not Found" message, or completely lacks explicit job descriptions, you may skip that specific section. DO NOT hallucinate or blindly fabricate fake jobs to fill the quota! ONLY extract mathematically authentic job listings explicitly visible in the markdown text. 
CRITICAL EXCLUSION RULE: Job boards are heavily polluted with Paid Training Courses and Bootcamps masquerading as jobs (e.g. "Master AI", "Data Science Training", "Pay to Learn"). You MUST detect these and explicitly EXCLUDE ANY listings that are actually courses, training programs, bootcamps, or charge money to learn! ONLY extract authentic, paid employment opportunities, true internships, or legitimate freelance work!

If the markdown contains JOB LISTINGS, format exactly as:
{
  "type": "jobs",
  "data": [
    {
      "id": "1",
      "title": "Job Title",
      "company": "Company Name",
      "location": "Job Location",
      "salary": "Salary or Competitive",
      "experience": "Fresher / 1-3 Years / etc",
      "match_score": 95,
      "ai_insight": "Why this matches.",
      "source_url": "Extract the SPECIFIC explicit URL for the job application if available. DO NOT return the search page root URL. DO NOT fabricate URLs."
    }
  ]
}

If no clear job listings exist anywhere in the text, gracefully output:
{
  "type": "research",
  "data": {
    "title": "Article/Page Title",
    "summary": "A comprehensive 2-3 paragraph technical summary of the content.",
    "key_takeaways": ["Point 1", "Point 2", "Point 3"]
  }
}

CRITICAL:
- The user's top skills are: ${resumeKeywordsStr || "Not provided"}. Use these to calculate the 'match_score' accurately for jobs. If no skills provided, default score to 70.
- If it's a search result, prioritize grabbing the actual direct links to the job postings.
- Output ONLY valid, parsable JSON.
`;

    const prompt = `RAW SCRAPED MARKDOWN:\n\n${safeMarkdown}`;
    
    let parsedData = null;
    let attempts = 0;
    const maxParseAttempts = 3;
    let outputText = "";

    while (attempts < maxParseAttempts) {
      try {
        // Call Gemini
        const result = await generateWithRetry(prompt, systemInstruction);
        
        // Safely extract text - the SDK throws "The string did not match the expected pattern"
        // when the response has no valid candidates (empty response, safety block, or non-STOP finish).
        let rawText: string;
        try {
          rawText = (await result.response).text().trim();
        } catch (sdkError: any) {
          console.warn(`[SCOUT] Gemini SDK .text() extraction failed on attempt ${attempts + 1}:`, sdkError?.message);
          attempts++;
          if (attempts < maxParseAttempts) {
            await new Promise(r => setTimeout(r, 1500)); // Brief cooldown before retry
            continue;
          }
          throw new Error("The AI model returned an empty or blocked response. Please try again.");
        }
        outputText = rawText;
        
        // Robust JSON extraction matching
        let cleanedText = outputText;
        const jsonMatch = cleanedText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            cleanedText = jsonMatch[1];
        } else {
            // Fallback: extract substring from first { to last }
            const startIdx = cleanedText.indexOf('{');
            const endIdx = cleanedText.lastIndexOf('}');
            if (startIdx !== -1 && endIdx !== -1) {
                cleanedText = cleanedText.slice(startIdx, endIdx + 1);
            }
        }

        parsedData = JSON.parse(cleanedText.trim());
        break; // Successfully parsed!
      } catch (parseError) {
        attempts++;
        console.warn(`JSON Parse or LLM Extraction failed on attempt ${attempts}:`, parseError);
        if (attempts >= maxParseAttempts) {
           const errMsg = (parseError as any).message || "";
           if (errMsg.includes('429') || errMsg.includes('Quota')) {
             return NextResponse.json({
               type: "jobs",
               data: [],
               error: "API QUOTA DEPLETED: Google blocked the request due to Free Tier limits. Please wait 60 seconds for the quota to replenish and try again."
             });
           }

           // HEURISTIC REGEXP PARSER:
           // If Gemma fails strict JSON parsing, forcefully extract the properties using Regex!
           const jobs = [];
           const jobBlocks = outputText.split(/\{[^{}]*"title"/i);
           if (jobBlocks.length > 1) {
             jobBlocks.shift();
             for (const block of jobBlocks) {
               const str = '"title"' + block;
               const titleMatch = str.match(/"title"\s*:\s*"?([^"}]+)/i);
               const companyMatch = str.match(/"company"\s*:\s*"?([^",}]+)/i);
               const locationMatch = str.match(/"location"\s*:\s*"?([^",}]+)/i);
               const insightMatch = str.match(/"ai_insight"\s*:\s*"?([^"}]+)/i);
               const scoreMatch = str.match(/"match_score"\s*:\s*(\d+)/i);
               const urlMatch = str.match(/"source_url"\s*:\s*"?([^"}]+)/i);
               
               if (titleMatch && titleMatch[1].trim().length > 2) {
                 jobs.push({
                   id: Math.random().toString(36).substring(7),
                   title: titleMatch[1].replace(/["']/g, '').replace(/,/g, '').trim(),
                   company: companyMatch ? companyMatch[1].replace(/["']/g, '').trim() : "Unknown Company",
                   location: locationMatch ? locationMatch[1].replace(/["']/g, '').trim() : "Remote",
                   ai_insight: insightMatch ? insightMatch[1].replace(/["']/g, '').trim() : "Direct company hiring initiative detected.",
                   match_score: scoreMatch ? parseInt(scoreMatch[1]) : 85,
                   source_url: urlMatch ? urlMatch[1].replace(/["']/g, '').trim() : ""
                 });
               }
             }
           }

           if (jobs.length > 0) {
             return NextResponse.json({
               type: "jobs",
               data: jobs,
               error: "Data recovered using Heuristic RegExp Parser due to Gemma JSON syntax collapse."
             });
           }

          // Gracefully down-shift the unparseable Array into a raw Research document only if RegExp fails entirely
          return NextResponse.json({
            type: "research",
            data: {
              title: "Raw Data Extraction Log",
              summary: outputText || "The model returned an empty string.",
              key_takeaways: ["JSON Array Extraction Failed.", "Displaying unstructured payload backup."]
            },
            error: "The agent extracted the data, but the backup LLM model (Gemma) corrupted the table syntax. Displaying the raw extraction dump instead. Please wait 60 seconds for the elite Gemini Flash UI schema-engine to replenish."
          });
        }
      }
    }

    // FINAL SANITIZATION PASS: Guarantee no malformed 'https:https' or remaining duckduckgo tracker wrappers reach the UI
    if (parsedData?.data && Array.isArray(parsedData.data)) {
        // Filter out items that are functionally useless (missing deep links or filled with empty/dash placeholders)
        parsedData.data = parsedData.data.filter((item: any) => {
            const values = Object.values(item).map(v => typeof v === 'string' ? v.trim().toLowerCase() : v);
            // Deep RegEx to instantly destroy any field filled with dashes, em-dashes, underscores, or 'N/A' variants.
            const emptyFields = values.filter(v => typeof v === 'string' && (v === '' || /^[-—_~]+$/.test(v) || v === 'n/a' || v === 'unknown' || v === 'null' || v.includes('not specified')));
            
            // If the schema requested a 'price', it MUST have a valid price.
            const hasEmptyPrice = Object.entries(item).some(([k, v]) => 
               k.toLowerCase().includes('price') && 
               (typeof v !== 'string' || v.trim().toLowerCase() === '' || /^[-—_~]+$/.test(v.trim()) || v.trim().toLowerCase() === 'n/a' || v.trim().toLowerCase().includes('unknown'))
            );

            if (hasEmptyPrice) return false;
            
            // Strict rejection if 2 or more fields are totally empty/dash
            if (emptyFields.length >= 2) {
                return false;
            }
            return true;
        }).map((item: any) => {
            // Iterate over all keys since dynamic schema keys could be 'url', 'link', 'website', etc.
            for (const key of Object.keys(item)) {
                if (typeof item[key] === 'string') {
                    if (item[key].startsWith('https:https://')) {
                        item[key] = item[key].replace('https:https://', 'https://');
                    }
                    if (item[key].includes('duckduckgo.com/l/?uddg=')) {
                        const match = item[key].match(/uddg=([^&]+)/);
                        item[key] = match ? decodeURIComponent(match[1]) : "";
                    } else if (item[key].includes('duckduckgo.com')) {
                        item[key] = ""; 
                    }
                }
            }
            return item;
        });
    }

    if (userId && parsedData) {
      // Passively log successful scraping arrays into the Prisma database for User Dashboard caching. Does not await to preserve split-second UI rendering speed.
      (prisma as any).scoutHistory.create({
        data: {
          userId,
          query: input,
          type: parsedData.type || 'jobs',
          data: JSON.stringify(parsedData.data || parsedData)
        }
      }).catch((err: any) => console.error("Scout History telemetry push failed: ", err));
    }

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error("Omni-Scout API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
