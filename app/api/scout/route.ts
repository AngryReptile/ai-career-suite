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
    const userId = session?.user ? ((session.user as any).id || session.user.email) : null;
    
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
           console.log(`[NLP ROUTER] Deep Research Triggered: "${parsed.query}"`);
           const ddgUrl = `https://r.jina.ai/https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(parsed.query)}`;
           const res = await fetch(ddgUrl, { headers: { "X-Return-Format": "markdown" }, cache: 'no-store' });
           if (!res.ok) throw new Error(`Failed to search Deep Web. Status: ${res.status}`);
           markdown = await res.text();
           
           // Decrypt DDG redirect wrappers back into clean, pure URLs for the LLM!
           const dggTrackerRegex = /https?:\/\/(?:lite\.)?duckduckgo\.com\/l\/\?uddg=([^&\s'"]+)[^\s'")]*/gi;
           markdown = markdown.replace(dggTrackerRegex, (match, encodedUrl) => {
              try { return decodeURIComponent(encodedUrl); } catch { return match; }
           });
           
           // Deep Scrape: If the user explicitly requested a schema, or is asking for physical data (prices/stores/best/in),
           // the agent MUST dynamically extract the top raw source links from the SERP, bypass them, and scrape their direct HTML.
           if (schemaKeys || /(where|buy|shop|store|best|in |near|recommend|price|cost)/i.test(input)) {
              console.log("[AGENT] Deep data extraction target detected. Attempting deep-fetch of source links...");
              const deepSourceUrls = [...markdown.matchAll(/https?:\/\/[^\s\)]+/gi)]
                 .map(m => m[0])
                 .filter(url => !url.includes('duckduckgo') && !url.includes('wikipedia.org') && !url.includes('youtube.com') && !url.includes('apple.com') && !url.includes('amazon') && !url.includes('flipkart') && !url.includes('jiomart') && !url.includes('reliance'))
                 .filter((v, i, a) => a.indexOf(v) === i)
                 .sort((a, b) => {
                     // Force the agent to prioritize mid-tier data aggregators (Smartprix, 91mobiles, etc) 
                     // because heavy platforms like Amazon/Flipkart 503-block the headless scrapers.
                     const isAggregatorA = /(smartprix|91mobiles|gadgets360|gizbot|digit\.in|gadgetsnow|mynextphone|findprix|mysmartprice)/i.test(a);
                     const isAggregatorB = /(smartprix|91mobiles|gadgets360|gizbot|digit\.in|gadgetsnow|mynextphone|findprix|mysmartprice)/i.test(b);
                     return isAggregatorA === isAggregatorB ? 0 : isAggregatorA ? -1 : 1;
                 })
                 .slice(0, 2); // Max 2 deep parses to keep execution blistering fast
              
              if (deepSourceUrls.length > 0) {
                 console.log(`[AGENT] Deep Scraping ${deepSourceUrls.length} targeted websites directly...`);
                 const deepRes = await Promise.allSettled(deepSourceUrls.map(u => fetch(`https://r.jina.ai/${u}`, { headers: {"X-Return-Format": "markdown"} }).then(async r => `[EXACT_SOURCE_URL: ${u}]\\n\\n` + await r.text())));
                 const deepText = deepRes.map((r: any) => r.status === 'fulfilled' ? r.value : "").join('\\n\\n---\\n\\n');
                 markdown = deepText + "\\n\\n---\\n\\n[ORIGINAL SERP]:\\n" + markdown;
              }
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
You have been provided with CONCATENATED RAW MARKDOWN scraped directly from a Target Web Search.
Your strict task is to extract information and structure it into a perfect custom JSON format based on the exact keys requested by the user. DO NOT return markdown blocks, just the raw JSON object.

CRITICAL INSTRUCTION: You must extract the relevant items into a JSON array, where EVERY object has exactly the keys listed below.
REQUESTED KEYS: ${JSON.stringify(schemaKeys)}

Format exactly as:
{
  "type": "dynamic",
  "data": [
    {
${schemaKeys.map(k => `      "${k}": "data value"`).join(',\n')}
    }
  ]
}

If no data exists, return "data": [].
` : mode === 'url' || (mode === 'search' && typeof isResearch !== 'undefined' && isResearch) ? `
You are an elite, autonomous Career & Research AI Agent. 
You have been provided with CONCATENATED RAW MARKDOWN scraped directly from a Target Web Search.
Your absolute strict task is to read the search results, synthesize a highly accurate answer, and structure it into a perfect JSON format. DO NOT return markdown blocks, just the raw JSON object.

CRITICAL FORMATTING RULE: ALWAYS default to the LIST format arrays ("type": "jobs") if the user is looking for products, prices, laptops, phones, tools, links, datasets, or multiple entities. You must ONLY output a continuous narrative summary ("type": "research") if the query explicitly requested an essay, abstract analysis, or biographical history.
SPECIAL EXCLUSION RULE: YOU MUST NEVER output links to social media or forums (Reddit, Quora, Facebook, Twitter) as items in your list! If the user asks where to buy something locally or requests recommendations, you MUST read the provided text, FIGURE THINGS OUT YOURSELF, and explicitly extract ONLY the actual physical store names, neighborhoods, companies, or malls.
ABSOLUTE LINKING RULE: You MUST NEVER output Search Engine links (DuckDuckGo, Google, Bing) as the source_url! You must meticulously extract the EXACT, DIRECT deep-link to the specific product/job/article page on the target website. DO NOT output generic homepage URLs or internal retailer search URLs (e.g., avoid "amazon.com/s?k=abc", you must find "amazon.com/dp/123"). If the real deep-link is missing, output an empty string "".

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
    const maxParseAttempts = 2;
    let outputText = "";

    while (attempts < maxParseAttempts) {
      try {
        // Call Gemini
        const result = await generateWithRetry(prompt, systemInstruction);
        outputText = (await result.response).text().trim();
        
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
        parsedData.data = parsedData.data.map((item: any) => {
            if (item.source_url && typeof item.source_url === 'string') {
                if (item.source_url.startsWith('https:https://')) {
                    item.source_url = item.source_url.replace('https:https://', 'https://');
                }
                if (item.source_url.includes('duckduckgo.com/l/?uddg=')) {
                    const match = item.source_url.match(/uddg=([^&]+)/);
                    item.source_url = match ? decodeURIComponent(match[1]) : "";
                } else if (item.source_url.includes('duckduckgo.com')) {
                    item.source_url = ""; 
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
