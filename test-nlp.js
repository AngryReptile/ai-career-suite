require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function main() {
  const nlpInstruction = `You are an elite Intent Detection Router. Calculate the user's explicit intent.
If the query is related to PRODUCTS, E-COMMERCE, GADGETS, or PRICING (e.g. "nothing phone prices", "macbook under 50k", "iphone cost"):
Output {"intent": "research", "query": "Optimal DuckDuckGo query string (e.g. nothing phone current prices)"}

If the query is asking for GENERAL RESEARCH, COMPANY INFO, Tech News, Layoffs, or Analysis:
Output {"intent": "research", "query": "Optimal DuckDuckGo query string"}

If the query is STRICTLY looking for JOBS, CAREERS, INTERNSHIPS, or HIRING ROLES (e.g. "front end roles pune", "mca fresher", "react dev"):
Output {"intent": "job", "keywords": "pure Job Title", "location": "City (or empty)"}

Example 1: "find me front end roles in pune" -> {"intent": "job", "keywords": "Frontend Developer", "location": "Pune"}
Example 2: "nothing phone prices" -> {"intent": "research", "query": "nothing phone prices buy cost"}
Example 3: "what is apple's hiring process?" -> {"intent": "research", "query": "apple hiring process interview steps"}
Respond ONLY with perfect JSON.`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction: nlpInstruction });
    const result = await model.generateContent(`Input: "nothing phone prices"`);
    console.log("RAW NLP:", result.response.text());
  } catch(e) { console.log("ERR:", e.message); }
}
main();
