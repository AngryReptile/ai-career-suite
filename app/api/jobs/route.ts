import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID || 'ad0fc7be';
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY || '1796be4b4a1f6874eb0594a86b51c3ea';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user ? ((session.user as any).id || session.user.email) : null;
    
    const { searchParams } = new URL(req.url);
    // Use an empty string as the default query
    const query = searchParams.get('q') || '';
    const location = searchParams.get('location') || '';
    const page = searchParams.get('page') || '1';
    const isFresher = searchParams.get('is_fresher') === 'true';
    const resultsPerPage = searchParams.get('results_per_page') || '50';
    const salaryMin = searchParams.get('salary_min');
    const salaryMax = searchParams.get('salary_max');
    const freshness = searchParams.get('freshness');
    const jobType = searchParams.get('job_type');

    // Fix typos and normalize basic Indian cities (e.g., 'bangore' -> 'Bangalore')
    const normalizeLocation = (loc: string) => {
      if (!loc) return '';
      const l = loc.toLowerCase().replace(/[^a-z]/g, '');
      if (l.includes('bang') || l.includes('beng') || l.includes('blr')) return 'Bangalore';
      if (l.includes('hyd')) return 'Hyderabad';
      if (l.includes('che') || l.includes('madra')) return 'Chennai';
      if (l.includes('mum') || l.includes('bom')) return 'Mumbai';
      if (l.includes('delhi') || l.includes('ncr')) return 'Delhi';
      if (l.includes('gur')) return 'Gurgaon';
      if (l.includes('noi')) return 'Noida';
      if (l.includes('kol') || l.includes('cal')) return 'Kolkata';
      if (l.includes('pune')) return 'Pune';
      if (l.includes('remot')) return 'Remote';
      return loc.trim();
    };
    const cleanLocation = normalizeLocation(location);
    
    // Fetch Active User Resume for AI Matching
    let userResume = null;
    if (userId) {
      userResume = await (prisma as any).userResume.findFirst({
        where: { userId, isSelected: true },
      });
    }

    const TECH_SKILLS = ['react', 'node', 'python', 'java', 'typescript', 'javascript', 'docker', 'aws', 'sql', 'next.js', 'tailwind', 'css', 'html', 'cloud', 'linux', 'git', 'kubernetes', 'azure', 'gcp', 'cpp', 'c++', 'c#', 'ruby', 'go', 'rust', 'php', 'swift', 'kotlin', 'mongodb', 'postgresql', 'mysql', 'redis', 'graphql', 'rest', 'api', 'django', 'flask', 'spring', 'angular', 'vue', 'svelte', 'express', 'nestjs', 'machine learning', 'ai', 'data science', 'ux', 'ui', 'designer', 'product manager', 'marketing', 'sales'];
    const resumeContent = userResume?.content ? (userResume.content as string).toLowerCase() : '';
    const resumeKeywords = TECH_SKILLS.filter(skill => resumeContent.includes(skill));

    // Dynamically generate search term from resume if no explicit query is provided
    let searchTerm = query;
    if (!searchTerm) {
      if (resumeKeywords.length > 0) {
        searchTerm = resumeKeywords.slice(0, 2).join(' ') || 'Software Engineer';
      } else {
        searchTerm = 'Software Engineer'; // Better default than raw "Jobs"
      }
    }

    // Build search term with fresher keywords if requested
    if (isFresher) {
      searchTerm = `${searchTerm} (Fresher OR Junior OR "New Grad" OR "Entry Level" OR Intern)`;
    }

    let url = `https://api.adzuna.com/v1/api/jobs/in/search/${page}?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&results_per_page=${resultsPerPage}&what=${encodeURIComponent(searchTerm)}&content-type=application/json`;
    
    if (cleanLocation) url += `&where=${encodeURIComponent(cleanLocation)}`;
    if (salaryMin) url += `&salary_min=${salaryMin}`;
    if (salaryMax) url += `&salary_max=${salaryMax}`;
    if (freshness) url += `&max_days_old=${freshness}`;
    
    if (jobType === 'full_time') url += `&full_time=1`;
    else if (jobType === 'contract') url += `&contract=1`;
    else if (jobType === 'permanent') url += `&permanent=1`;

    let formattedJobs: any[] = [];

    try {
      const res = await fetch(url);
      const data = await res.json();

      if (res.ok && data.results) {
        // ... existing Adzuna mapping ...
        formattedJobs = data.results.map((job: any) => {
          // Keep existing mapping logic
          const description = (job.description || '').toLowerCase();
          const title = (job.title || '').toLowerCase();
          const jobText = `${title} ${description}`;
          const jobKeywords = title.match(/\b(\w{3,})\b/g) || [];
          
          let experience = '0-3 yrs'; 
          let isFresherFriendly = false;
          if (description.includes('0 years') || description.includes('fresher') || title.includes('intern') || title.includes('junior')) {
            experience = '0-1 yrs';
            isFresherFriendly = true;
          }

          let matchScore = 50; 
          let skillGap: string[] = [];
          let aiInsight = "A solid match based on your search parameters.";

          if (userResume) {
            const overlap = resumeKeywords.filter((k: string) => jobText.includes(k));
            const overlapRatio = overlap.length / Math.max(jobKeywords.length, 5);
            matchScore = Math.min(Math.round(40 + (overlapRatio * 150)), 98);
            
            const titleKeywords = title.split(' ').filter((k: string) => k.length > 3);
            const resumeMatches = titleKeywords.filter((k: string) => resumeKeywords.includes(k));
            if (resumeMatches.length > 0) {
               aiInsight = `Matches your ${resumeMatches[0]} expertise found in your resume.`;
            } else {
               aiInsight = `This ${title} role aligns with your general tech background in ${cleanLocation || 'India'}.`;
            }

            const commonSkills = ['react', 'node', 'python', 'java', 'typescript', 'docker', 'aws', 'sql', 'next.js', 'tailwind'];
            skillGap = commonSkills.filter(s => jobText.includes(s) && !resumeKeywords.includes(s)).slice(0, 2);
          }

          return {
            id: job.id,
            title: job.title,
            company: job.company?.display_name,
            company_description: `${job.company?.display_name} is a leading player in the ${job.title.split(' ')[0]} sector, known for innovation and global impact.`,
            location: job.location?.display_name,
            salary: job.salary_min ? `₹${(job.salary_min / 100000).toFixed(1)}L - ₹${(job.salary_max / 100000).toFixed(1)}L` : 'Competitive',
            experience,
            match_score: matchScore,
            ai_insight: aiInsight,
            skill_gap: skillGap,
            source_url: job.redirect_url,
            apply_type: 'direct_url',
            isFresherFriendly,
            created: job.created,
            tags: [job.contract_time, job.contract_type, isFresherFriendly ? 'Fresher' : null].filter(Boolean)
          };
        });

        // Strictly filter Adzuna results to ensure location matches and avoid showing wrong locations
        if (cleanLocation && cleanLocation.toLowerCase() !== 'india') {
          formattedJobs = formattedJobs.filter((job: any) => {
            const jobLocNorm = normalizeLocation(job.location || '');
            return jobLocNorm.toLowerCase() === cleanLocation.toLowerCase() || 
                   (job.location && job.location.toLowerCase().includes(location.toLowerCase().trim()));
          });
        }
      }
    } catch (e) {
      console.error("Live job fetch failed:", e);
    }
    if (isFresher) {
      formattedJobs = formattedJobs.filter((job: any) => {
        const title = job.title.toLowerCase();
        const hasHighExp = title.match(/[3-9]\+\s*years/) || title.match(/senior/) || title.match(/lead/) || title.match(/manager/);
        return job.isFresherFriendly && !hasHighExp;
      });
    }

    // STRICT RESUME-BASED SORTING FOR LIVE RESULTS
    if (userResume) {
      formattedJobs.sort((a: any, b: any) => b.match_score - a.match_score);
    } else {
      // Optional: Shuffle slightly if neutral and no query so it doesn't look identical every time
      if (!query) {
         formattedJobs = formattedJobs.sort(() => Math.random() - 0.5);
      }
    }

    const summary = formattedJobs.length === 0 
      ? `No live roles found currently matching "${query || searchTerm}" in ${cleanLocation || 'any location'}. Try adjusting your filters.`
      : (userResume 
        ? `I've analyzed your resume and found live jobs matching your ${searchTerm.split(' ').join('/')} skills in ${cleanLocation || 'India'}.`
        : (query ? `I've found live jobs matching your search for "${query}" in ${cleanLocation || 'India'}.` : "Exploring diverse real-time tech opportunities."));

    return NextResponse.json({
      search_summary: summary,
      jobs: formattedJobs,
      count: formattedJobs.length
    });
  } catch (error: any) {
    return NextResponse.json({ search_summary: "Error processing search.", jobs: [], count: 0 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user ? ((session.user as any).id || session.user.email) : 'demo_user';
    const { jobId, jobTitle } = await req.json();

    await (prisma as any).activity.create({
      data: {
        userId,
        type: 'job_apply',
        title: `Applied to: ${jobTitle}`
      }
    });

    return NextResponse.json({ success: true, message: `Applied for ${jobTitle}` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
