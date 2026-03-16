"use client";

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { 
  Search, MapPin, Briefcase, Filter, ExternalLink, Sparkles, 
  Loader2, CheckCircle2, IndianRupee, Calendar, SlidersHorizontal,
  ChevronRight, Building2, Globe, AlertCircle, X, Map
} from 'lucide-react';
import Link from 'next/link';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

/**
 * Builds the best available apply URL for a job listing.
 * - If the URL is a real direct link (Adzuna redirect, or direct career page), use it.
 * - Otherwise fall back to a LinkedIn job search filtered by title + company.
 * This prevents users from hitting generic search pages or stale 404s.
 */
function getJobApplyUrl(job: any): string {
  const url: string = job.source_url || '';
  
  // Adzuna redirect URLs are real apply links - use them directly
  if (url && url.includes('adzuna.com')) return url;
  
  // If it's a LinkedIn search URL (keywords=...) or a Google search, build a smarter one
  const isSearchUrl = !url || url.includes('keywords=') || url.includes('google.com') || url.includes('#');
  
  if (!isSearchUrl && url.startsWith('http')) return url;
  
  // Construct a targeted LinkedIn search as a reliable fallback
  const titleEncoded = encodeURIComponent(job.title || '');
  const companyEncoded = encodeURIComponent(job.company || '');
  return `https://www.linkedin.com/jobs/search/?keywords=${titleEncoded}%20${companyEncoded}&f_TPR=r604800`;
}

export default function JobSearchPage() {
  const { data: resumes } = useSWR('/api/resume', fetcher);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  const [jobs, setJobs] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [searchSummary, setSearchSummary] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const activeResume = resumes?.find((r: any) => r.isSelected);

  // Filter States
  const [experience, setExperience] = useState("0");
  const [minSalary, setMinSalary] = useState("");
  const [maxSalary, setMaxSalary] = useState("");
  const [jobType, setJobType] = useState("");
  const [freshness, setFreshness] = useState("");
  const [workMode, setWorkMode] = useState<string[]>([]);
  const [isFresher, setIsFresher] = useState(false);

  const handleSearch = async (e?: React.FormEvent, pageNumber = 1, append = false) => {
    e?.preventDefault();
    if (pageNumber === 1) setIsSearching(true);
    else setIsLoadingMore(true);
    
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        location: locationQuery,
        page: pageNumber.toString(),
        results_per_page: '20',
        is_fresher: isFresher.toString()
      });

      if (minSalary) params.append('salary_min', (parseInt(minSalary) * 100000).toString());
      if (maxSalary) params.append('salary_max', (parseInt(maxSalary) * 100000).toString());
      if (freshness) params.append('freshness', freshness);
      if (jobType) params.append('job_type', jobType);

      const res = await fetch(`/api/jobs?${params.toString()}`);
      const data = await res.json();
      
      if (res.ok) {
        if (append) {
          setJobs(prev => [...prev, ...(data.jobs || [])]);
        } else {
          setJobs(data.jobs || []);
          setCurrentPage(1);
        }
        setTotalCount(data.count || 0);
        setSearchSummary(data.search_summary || "");
      }
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setIsSearching(false);
      setIsLoadingMore(false);
    }
  };

  const handleQuickApply = (id: string, url: string) => {
    setApplyingId(id);
    setTimeout(() => {
      setApplyingId(null);
      window.open(url, '_blank');
    }, 2000);
  };

  const handleLoadMore = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    handleSearch(undefined, nextPage, true);
  };

  const handleWorkModeToggle = (mode: string) => {
    setWorkMode(prev => 
      prev.includes(mode) ? prev.filter(m => m !== mode) : [...prev, mode]
    );
  };

  useEffect(() => {
    handleSearch();
  }, []);

  const SkeletonCard = () => (
    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl animate-pulse space-y-4">
      <div className="flex justify-between items-start">
        <div className="space-y-2 flex-1">
          <div className="h-6 bg-zinc-950 rounded w-1/3"></div>
          <div className="h-4 bg-zinc-950 rounded w-1/4"></div>
        </div>
        <div className="h-10 bg-zinc-950 rounded w-24"></div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 font-sans p-6 lg:p-10">
      <div className="max-w-7xl mx-auto w-full flex flex-col h-full bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 shadow-sm">
        
        {/* Header Section */}
        <header className="px-8 py-6 border-b border-zinc-800 bg-zinc-900">
           <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex-1 w-full">
                 <div className="flex items-center gap-4 mb-8">
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter italic uppercase">
                      GLOBAL CAREER SEARCH
                    </h1>
                 </div>
                 
                 <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
                    <div className="flex-[2] relative group">
                       <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                       <input 
                         type="text" 
                         value={searchQuery}
                         onChange={(e) => setSearchQuery(e.target.value)}
                         placeholder="Skill, Designations, Companies" 
                         className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-4 pl-14 pr-6 text-sm text-zinc-50 focus:outline-none focus:border-indigo-500 transition-all shadow-inner"
                       />
                    </div>
                    <div className="flex-1 relative group">
                       <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                       <input 
                         type="text" 
                         value={locationQuery}
                         onChange={(e) => setLocationQuery(e.target.value)}
                         placeholder="Location" 
                         className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-4 pl-14 pr-6 text-sm text-zinc-50 focus:outline-none focus:border-indigo-500 transition-all shadow-inner"
                       />
                    </div>
                    <button className="bg-indigo-500 hover:bg-indigo-500/90 text-white font-medium px-8 rounded-lg transition-all h-[54px]">
                       Search
                    </button>
                 </form>
              </div>
           </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          
          {/* Filters Sidebar */}
          <aside className="w-72 border-r border-zinc-800 bg-zinc-950 flex flex-col shrink-0 overflow-y-auto p-6 space-y-8 custom-scrollbar">
             <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-50 flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4" /> Filters
                </h3>
             </div>

             <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-[1.5rem] p-5 space-y-3">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2 text-indigo-400">
                     <Sparkles className="h-4 w-4" />
                     <span className="text-xs font-black uppercase">Fresher Mode</span>
                   </div>
                   <button 
                     onClick={() => setIsFresher(!isFresher)}
                     className={`w-10 h-5 rounded-full transition-all relative ${isFresher ? 'bg-indigo-500' : 'bg-app-muted/30'}`}
                   >
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isFresher ? 'right-1' : 'left-1'}`}></div>
                   </button>
                </div>
                <p className="text-[10px] text-zinc-400 leading-relaxed">Prioritizes entry-level roles and internships.</p>
             </div>

             {!isFresher && (
               <div className="space-y-4">
                  <div className="flex justify-between">
                     <label className="text-sm font-bold text-zinc-50">Experience</label>
                     <span className="text-xs font-medium text-indigo-400">{experience} yrs</span>
                  </div>
                  <input type="range" min="0" max="30" value={experience} onChange={(e) => setExperience(e.target.value)} className="w-full h-1.5 bg-app-border rounded-full appearance-none cursor-pointer accent-app-primary" />
               </div>
             )}

             <div className="space-y-4">
                <label className="text-sm font-bold text-zinc-50">Annual Salary (Lakhs)</label>
                <div className="grid grid-cols-2 gap-3">
                   <input type="number" placeholder="Min" value={minSalary} onChange={(e) => setMinSalary(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-zinc-50" />
                   <input type="number" placeholder="Max" value={maxSalary} onChange={(e) => setMaxSalary(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-zinc-50" />
                </div>
             </div>

             <div className="space-y-4">
                <label className="text-sm font-bold text-zinc-50">Freshness</label>
                <select value={freshness} onChange={(e) => setFreshness(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-xs text-zinc-50">
                   <option value="">Any Time</option>
                   <option value="1">Last 24 Hours</option>
                   <option value="7">Last 7 Days</option>
                   <option value="30">Last Month</option>
                </select>
             </div>

             <button onClick={() => handleSearch()} className="w-full py-4 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 font-black rounded-2xl text-[10px] uppercase tracking-widest transition-all">
               Apply All Filters
             </button>
          </aside>

          {/* Jobs List Area */}
          <main className="flex-1 bg-zinc-950/10 overflow-y-auto p-10 custom-scrollbar">
            
            {/* AI Status Bar */}
            <div className={`mb-8 p-4 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-4 ${activeResume ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400'}`}>
               <div className="flex items-center gap-4">
                 <div className={`p-2 rounded-md ${activeResume ? 'bg-emerald-500/20' : 'bg-zinc-800'}`}>
                   {activeResume ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <AlertCircle className="h-5 w-5 text-zinc-500" />}
                 </div>
                 <div>
                    <h3 className="font-bold text-sm text-zinc-100">
                      {activeResume ? 'Searching Based on Active Resume' : 'Neutral Search Mode'}
                    </h3>
                    <p className="text-xs mt-1">
                      {activeResume ? `AI is currently filtering matches based on your skills in: ${activeResume.filename}` : 'No resume attached. Results are based strictly on text input and filters.'}
                    </p>
                 </div>
               </div>
               
               {activeResume && (
                  <Link href="/resume" className="text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 px-4 py-2 rounded-md transition-colors font-medium whitespace-nowrap">
                    Change Resume
                  </Link>
               )}
            </div>

            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
               <div>
                  <h2 className="text-xl font-semibold text-zinc-50">
                     {searchSummary || "Career Opportunities"}
                  </h2>
               </div>
               <div className="px-4 py-1.5 bg-zinc-900 text-indigo-400 rounded-full border border-zinc-800 text-sm font-medium">
                  {jobs.length} Matches Found
               </div>
            </div>

            <div className="flex flex-col gap-4">
              {isSearching ? (
                 Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)
              ) : (
                <>
                  {jobs.length === 0 && (
                    <div className="col-span-full py-32 text-center bg-zinc-900/20 border-2 border-dashed border-zinc-800 rounded-[2.5rem]">
                       <Briefcase className="h-16 w-16 text-zinc-400 mx-auto mb-6 opacity-30" />
                       <h3 className="text-xl font-bold text-zinc-400">No matching roles found.</h3>
                    </div>
                  )}
                  {jobs.map((job, idx) => (
                    <div 
                      key={idx} 
                      className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 hover:shadow-md transition-all group flex flex-col md:flex-row gap-6 items-start relative overflow-hidden"
                    >
                      {/* Logo */}
                      <div className="w-16 h-16 bg-zinc-950 border border-zinc-800 rounded-md flex items-center justify-center text-indigo-400 font-bold text-2xl shrink-0">
                        {job.company.substring(0, 1)}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 space-y-3 w-full">
                        <div>
                          <h3 className="text-lg font-semibold text-zinc-50 group-hover:text-indigo-400 transition-colors">{job.title}</h3>
                          <p className="text-zinc-400 text-sm">{job.company}</p>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400">
                          <div className="flex items-center gap-1.5"><Briefcase className="h-4 w-4" /> {job.experience}</div>
                          <div className="flex items-center gap-1.5"><IndianRupee className="h-4 w-4" /> {job.salary}</div>
                          <div className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {job.location}</div>
                        </div>
                        
                        <div className="bg-indigo-500/5 p-3 rounded-md border border-indigo-500/10">
                          <p className="text-sm text-zinc-50 flex items-start gap-2">
                             <Sparkles className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                             {job.ai_insight}
                          </p>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex flex-col items-end gap-3 shrink-0 md:min-w-[140px] w-full md:w-auto h-full justify-between">
                        <div className="px-3 py-1 bg-indigo-500/10 text-indigo-400 text-xs font-semibold rounded-full border border-indigo-500/20">
                          {job.match_score}% Match
                        </div>
                        <div className="w-full mt-auto pt-4">
                          <Link 
                            href={getJobApplyUrl(job)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md border border-indigo-500 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                          >
                            Apply Now <ExternalLink className="h-4 w-4" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {jobs.length > 0 && jobs.length < totalCount && (
                    <div className="col-span-full py-12 flex justify-center">
                       <button 
                         onClick={handleLoadMore}
                         disabled={isLoadingMore}
                         className="px-10 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-50 text-xs font-black uppercase tracking-widest hover:bg-zinc-950 transition-all flex items-center gap-3"
                       >
                          {isLoadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4 rotate-90" />}
                          Load More Results
                       </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
