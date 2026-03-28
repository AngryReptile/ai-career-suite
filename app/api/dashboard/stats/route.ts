import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { generateWithRetry } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    const userId = (session.user as any).id || session.user.email;

    // 1. Get active resume - Prioritize the one the user explicitly marked as selected
    const activeResume = await (prisma as any).userResume.findFirst({
      where: { userId, isSelected: true },
      orderBy: { createdAt: 'desc' } // If multiple are selected (shouldn't happen), pick newest
    }) || await (prisma as any).userResume.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    if (!activeResume) {
      return NextResponse.json({
        score: 0,
        status: "No Resume Found",
        tips: ["Upload a resume to see your strength score.", "Active matching is currently disabled."],
        filename: null
      });
    }

    let content = (activeResume.content as string) || "";
    
    // AUTO-HEALING: If content is the placeholder and fileData exists, try re-extraction
    if (activeResume.fileData && (content.includes("This document has been uploaded for AI analysis") || content.length < 100)) {
      try {
        const fileData = activeResume.fileData as string;
        if (fileData.includes('base64')) {
          const base64Data = fileData.split(',')[1];
          const mimeType = fileData.split(';')[0].split(':')[1] || 'application/pdf';
          
          const promptParts = [
            { text: "ACT AS A PROFESSIONAL RESUME PARSER. EXTRACT THE FULL TEXT CONTENT FROM THIS RESUME FILE PRECISELY. RETURN ONLY THE RAW TEXT." },
            { inlineData: { mimeType, data: base64Data } }
          ];
          
          const result = await generateWithRetry(promptParts);
          const responseText = (await result.response).text().trim();
          
          if (responseText && responseText.length > 100) {
            content = responseText;
            // Persist the fix!
            await (prisma as any).userResume.update({
              where: { id: activeResume.id },
              data: { content: responseText }
            });
          }
        }
      } catch (err) {
        // Silent fail for auto-healing to avoid disrupting user experience
      }
    }
    
    let score = 10; // Base commitment points for uploading a resume
    const tips = [];

    // 1. LENGTH CHECK (up to 25 points)
    if (content.length > 2000) score += 25;
    else if (content.length > 800) score += 20;
    else if (content.length > 300) score += 10;
    else if (content.length > 100) score += 5;
    else tips.push("Your resume seems very short. Ensure it contains your full work history.");

    // 2. COMPREHENSIVE SKILL SETS - covers all career domains (up to 30 points)
    const skillSets = [
      // Frontend / Web Dev
      ['react', 'next.js', 'typescript', 'javascript', 'tailwind', 'html', 'css', 'frontend', 'vue', 'angular', 'svelte', 'webpack', 'figma'],
      // Backend / Systems
      ['node', 'python', 'java', 'sql', 'postgresql', 'mongodb', 'api', 'backend', 'golang', 'rust', 'php', 'ruby', 'spring', 'django', 'flask'],
      // Cloud / DevOps / Infra
      ['cloud', 'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'devops', 'linux', 'git', 'ci/cd', 'terraform', 'ansible'],
      // Data / AI / ML
      ['data science', 'machine learning', 'ai', 'tensorflow', 'pytorch', 'pandas', 'numpy', 'analytics', 'tableau', 'power bi', 'excel', 'r'],
      // Design / Product / Creative
      ['ui', 'ux', 'figma', 'design', 'prototype', 'wireframe', 'adobe', 'photoshop', 'illustrator', 'brand', 'creative', 'product manager'],
      // Management / Business / Operations
      ['leadership', 'management', 'strategy', 'operations', 'stakeholder', 'agile', 'scrum', 'project manager', 'team lead', 'kpi', 'okr'],
      // Marketing / Sales / HR
      ['marketing', 'seo', 'sem', 'content', 'social media', 'sales', 'crm', 'hr', 'recruitment', 'talent', 'growth', 'campaign'],
      // Finance / Accounting / Legal
      ['finance', 'accounting', 'audit', 'compliance', 'legal', 'financial analysis', 'budgeting', 'forecasting', 'investment', 'risk'],
    ];
    
    let matchedSkillSets = 0;
    let totalSkillMatches = 0;
    skillSets.forEach(set => {
      const setMatches = set.filter(skill => content.toLowerCase().includes(skill));
      if (setMatches.length > 0) matchedSkillSets++;
      totalSkillMatches += setMatches.length;
    });
    
    // Award up to 30 pts: 10 for breadth (diverse domains), 20 for depth (number of skills)
    score += Math.min(matchedSkillSets * 3, 12); // breadth bonus (max 12)
    score += Math.min(totalSkillMatches * 1.5, 18); // depth bonus (max 18)
    if (totalSkillMatches < 4) tips.push("Highlight more of your professional skills and tools throughout your resume.");

    // 3. STANDARD STRUCTURE CHECK (up to 20 points)
    const sectionKeywords = [
       ['education', 'university', 'college', 'degree', 'b.tech', 'b.e.', 'mba', 'bachelor', 'master'],
       ['experience', 'work history', 'employment', 'career', 'internship', 'worked at'],
       ['projects', 'portfolio', 'achievements', 'contributions', 'built', 'developed'],
       ['skills', 'competencies', 'expertise', 'toolkit', 'technologies', 'tools'],
       ['summary', 'profile', 'about', 'objective', 'overview'],
       ['certification', 'licenses', 'courses', 'training', 'certificate'],
    ];
    
    let foundSections = 0;
    sectionKeywords.forEach(set => {
      if (set.some(kw => content.toLowerCase().includes(kw))) foundSections++;
    });

    score += Math.min(foundSections * 4, 20);
    if (foundSections < 3) tips.push("Use standard headings like 'Experience', 'Skills', and 'Education'.");

    // 4. ACTION VERBS / IMPACT CHECK (up to 10 points)
    const actionVerbs = ['led', 'built', 'developed', 'designed', 'managed', 'launched', 'created', 'improved', 'achieved', 'implemented', 'delivered', 'increased', 'reduced', 'optimized', 'drove', 'coordinated', 'spearheaded', 'established'];
    const hasActionVerbs = actionVerbs.some(verb => content.toLowerCase().includes(verb));
    if (hasActionVerbs) score += 5;

    // 5. QUANTIFIABLE IMPACT CHECK (up to 5 points)
    const hasNumbers = /(\d+%|₹\d+|\$\d+|\d+ (users|clients|team|members|projects|million|lakh|k\+))/.test(content);
    if (hasNumbers) score += 5;

    // Cap at 100 and floor to reasonable levels
    score = Math.min(Math.round(score), 100);
    if (score < 50 && content.length > 200) tips.push("Add specific achievements and quantifiable results (e.g., 'Increased sales by 30%').");

    // 2. Fetch Aggregated Counts for Dashboard
    const [jobCount, summaryCount, noteCount, tutorCount] = await Promise.all([
      (prisma as any).activity.count({ where: { userId, type: 'job_apply' } }),
      (prisma as any).summary.count({ where: { userId } }),
      (prisma as any).note.count({ where: { userId } }),
      (prisma as any).conversation.count({ where: { userId } })
    ]);
    
    let status = "Needs Work";
    if (score >= 90) status = "Elite Profile";
    else if (score >= 75) status = "Looks Good";
    else if (score >= 50) status = "Solid Start";

    return NextResponse.json({
      score,
      status,
      tips: tips.slice(0, 2), // Top 2 tips
      filename: activeResume.filename,
      jobCount,
      summaryCount,
      noteCount,
      tutorCount
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
