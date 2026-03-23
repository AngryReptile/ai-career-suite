"use client";

import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { 
  Search, MapPin, Briefcase, ExternalLink, Sparkles, 
  Loader2, CheckCircle2, IndianRupee, LayoutTemplate, Network,
  Globe, AlertCircle, ChevronRight, Terminal, FileText, Bot, ArrowDown, History
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardShell } from "@/components/DashboardShell";
import ReactMarkdown from 'react-markdown';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const getJobApplyUrl = (job: any) => {
  if (job.source_url) {
      if (job.source_url.startsWith('/')) {
         // Resolve relative paths scraped directly from the boards
         if (job.company.toLowerCase().includes('remoteok') || job.source_url.includes('remote-jobs')) {
            return `https://remoteok.com${job.source_url}`;
         }
      }
      if (job.source_url.startsWith('http')) {
          // Prevent ALL LLM hallucinated ID schemas that result in 404s on LinkedIn
          if (!job.source_url.includes('linkedin.com/')) {
              return job.source_url;
          }
      }
  }
  // Force a deterministic search URL to completely prevent hallucinated 404 AI links
  return `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(job.title + " " + (job.company !== 'Unknown Company' ? job.company : ''))}&location=${encodeURIComponent(job.location || 'Remote')}`;
};

const getDomainIcon = (url: string) => {
   if (!url) return "linkedin.com";
   
   try {
      const parsedUrl = new URL(url);
      let hostname = parsedUrl.hostname;
      // Strip 'www.' to ensure the cleanest root domain for Google Favicon API
      hostname = hostname.replace(/^www\./i, '');
      return hostname || "linkedin.com";
   } catch {
      // Fallback domain heuristics for broken relative URLs
      if (url.includes('internshala')) return "internshala.com";
      if (url.includes('adzuna')) return "adzuna.in";
      if (url.includes('foundit')) return "foundit.in";
      if (url.includes('remoteok')) return "remoteok.com";
      return "linkedin.com";
   }
};

export default function OmniScoutPage() {
  const { data: resumes } = useSWR('/api/resume', fetcher);
  const activeResume = resumes?.find((r: any) => r.isSelected);

  const { data: historyRes, mutate: mutateHistory } = useSWR('/api/scout/history', fetcher);
  const historyList = historyRes?.history || [];

  const [query, setQuery] = useState("");
  const [scoutMode, setScoutMode] = useState<'aggregator' | 'agent'>('agent');
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isClarifying, setIsClarifying] = useState(false);
  const [isDynamic, setIsDynamic] = useState(false);
  const [dynamicSchemaKeys, setDynamicSchemaKeys] = useState<string[]>([]);
  
  // Results
  const [jobs, setJobs] = useState<any[]>([]);
  const [researchData, setResearchData] = useState<any>(null);
  const [productsData, setProductsData] = useState<any[]>([]);
  const [searchSummary, setSearchSummary] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [clarification, setClarification] = useState<{question: string, suggestions: string[]} | null>(null);
  const [customClarification, setCustomClarification] = useState("");
  const [pendingSchema, setPendingSchema] = useState<any>(null);
  
  // Agent Logs
  const [agentLogs, setAgentLogs] = useState<string[]>([]);

  // Automatically switch mode if URL is pasted
  useEffect(() => {
    if (query.startsWith('http://') || query.startsWith('https://')) {
      setScoutMode('agent');
    }
  }, [query]);

  const addLog = (msg: string) => {
    setAgentLogs(prev => [...prev, msg]);
  };

  const loadHistoryItem = (h: any) => {
    try {
       let parsedData = JSON.parse(h.data);
       
       // Handle recursive double-stringification from Prisma cache gracefully
       if (typeof parsedData === 'string') {
          try { parsedData = JSON.parse(parsedData); } catch {}
       }
       if (parsedData && typeof parsedData.data === 'string') {
          try { parsedData.data = JSON.parse(parsedData.data); } catch {}
       }

       setScoutMode('agent');
       setQuery(h.query);
       setHasSearched(true);
       setIsSearching(false);
       setClarification(null);
       setPendingSchema(null);
       
       setJobs([]);
       setResearchData(null);
       setProductsData([]);
       
       if (h.type === 'jobs' || h.type === 'products') {
         setIsDynamic(false);
         setDynamicSchemaKeys([]);
         // Because list and products merged to type jobs array schema, push array directly
         if (Array.isArray(parsedData)) setJobs(parsedData);
         else setJobs(parsedData.data || []);
       } else if (h.type === 'dynamic') {
         setIsDynamic(true);
         const rows = Array.isArray(parsedData) ? parsedData : (parsedData.data || []);
         setDynamicSchemaKeys(rows.length > 0 ? Object.keys(rows[0]) : []);
         setJobs(rows);
       } else if (h.type === 'research') {
         setIsDynamic(false);
         setDynamicSchemaKeys([]);
         setResearchData(parsedData);
       }
       setSearchSummary("Loaded from Omni-Scout Global Cache.");
    } catch (e: any) {
       console.error("Failed to parse history data", e);
       setSearchSummary("Error: Failed to load corrupted cache item.");
    }
  }

  const handleScout = async (e?: React.FormEvent, skipClarify = false, overrideQuery?: string) => {
    e?.preventDefault();
    const activeQuery = overrideQuery || query;
    if (!activeQuery.trim()) return;

    const isUrl = activeQuery.startsWith('http');

    // Remove leading/trailing spaces but keep the exact query
    const sanitizedQuery = activeQuery.trim();

    if (scoutMode === 'agent' && !isUrl && !skipClarify) {
       setIsClarifying(true);
       setHasSearched(true);
       setClarification(null);
       setPendingSchema(null);
       try {
           const clarifyRes = await fetch('/api/clarify', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ input: sanitizedQuery })
           });
           const clarifyData = await clarifyRes.json();
           if (clarifyData.is_vague) {
               setClarification({ question: clarifyData.question, suggestions: clarifyData.suggestions || [] });
               setIsClarifying(false);
               return; // Pause execution for interactive refinement
           } else {
               setPendingSchema({
                 target: clarifyData.search_target,
                 schema: clarifyData.extraction_schema,
                 query: sanitizedQuery
               });
               setIsClarifying(false);
               return; // Pause execution for schema confirmation
           }
       } catch (err) {
           console.error("Clarification API Error:", err);
           setIsClarifying(false);
       }
    }

    setClarification(null);
    setPendingSchema(null);
    setIsSearching(true);
    setHasSearched(true);
    setIsDynamic(false);
    setDynamicSchemaKeys([]);
    setJobs([]);
    setResearchData(null);
    setProductsData([]);
    setAgentLogs([]);
    setSearchSummary("");
    setCurrentPage(1);

    try {
      if (scoutMode === 'aggregator') {
        const params = new URLSearchParams({
          q: sanitizedQuery,
          results_per_page: '20'
        });
        const res = await fetch(`/api/jobs?${params.toString()}`);
        const data = await res.json();
        
        if (res.ok) {
          setJobs(data.jobs || []);
          setSearchSummary(data.search_summary || `Found ${data.jobs?.length || 0} real-time matches.`);
        }
      } else {
        // AGENT MODE
        addLog("Initializing Jina Stealth Endpoint...");
        await new Promise(r => setTimeout(r, 800));
        
        const isUrl = query.startsWith('http');
        if (isUrl) addLog(`Bypassing site firewalls for ${new URL(activeQuery).hostname}...`);
        else addLog(`Executing Google Dork for deep platform search...`);
        
        await new Promise(r => setTimeout(r, 1500));
        addLog("Converting raw DOM into LLM-ready Markdown...");

        const res = await fetch('/api/scout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
             input: sanitizedQuery, 
             mode: isUrl ? 'url' : 'search', 
             page: 1,
             schemaKeys: pendingSchema?.schema?.fields_to_extract || null,
             schemaIntent: pendingSchema?.schema?.intent || 'data'
          })
        });

        addLog("Feeding Markdown to Groq for strict JSON extraction...");

        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Scout failed");
        
        await new Promise(r => setTimeout(r, 500));
        addLog("Extraction complete. Rendering UI.");

        if (data.type === 'jobs') {
          setJobs(data.data || []);
          setSearchSummary(data.error ? data.error : `Omni-Scout explicitly extracted ${data.data?.length || 0} roles from the target footprint.`);
        } else if (data.type === 'dynamic') {
          setIsDynamic(true);
          const rawKeys = pendingSchema?.schema?.fields_to_extract || [];
          // Use explicitly returned keys if missing from schema template
          const keys = rawKeys.length > 0 ? rawKeys : (data.data?.length > 0 ? Object.keys(data.data[0]) : []);
          setDynamicSchemaKeys(keys);
          setJobs(data.data || []);
          setSearchSummary(`Omni-Scout dynamically extracted ${data.data?.length || 0} items based on your custom schema.`);
        } else if (data.type === 'research') {
          setResearchData(data.data);
          setSearchSummary(`Omni-Scout generated technical research summary for the target.`);
        } else if (data.type === 'products') {
          setProductsData(data.data || []);
          setSearchSummary(`Omni-Scout extracted pricing data for ${data.data?.length || 0} products.`);
        } else {
           // Fallback array format if LLM hallucinates JSON schema wrapping
           if (Array.isArray(data)) {
             const first = data[0] || {};
             if (first.price || first.name) {
               setProductsData(data);
               setSearchSummary(`Omni-Scout explicitly extracted ${data.length} product matches.`);
             } else {
               setJobs(data);
               setSearchSummary(`Omni-Scout extracted ${data.length} items.`);
             }
           }
        }
        mutateHistory();
      }
    } catch (err: any) {
      console.error(err);
      setSearchSummary(`Error: ${err.message || "An unknown error occurred."}`);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLoadMore = async () => {
    if (!query.trim() || scoutMode !== 'agent') return;
    const nextPage = currentPage + 1;
    setIsLoadingMore(true);

    const isUrl = query.startsWith('http');
    const sanitizedQuery = isUrl 
      ? query 
      : query.toLowerCase()
          .replace(/\b(find|me|some|job|jobs|openings|looking|for|i|want|search|relating|to|show|give|any|please|can|you|get|the|a|an)\b/gi, '')
          .replace(/[^a-z0-9#+.]/gi, ' ')
          .replace(/\s+/g, ' ')
          .trim() || query;

    try {
      const res = await fetch('/api/scout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: sanitizedQuery, mode: isUrl ? 'url' : 'search', page: nextPage })
      });
      const data = await res.json();
      if (res.ok && data.type === 'jobs') {
        const existingUrls = new Set(jobs.map((j: any) => j.source_url));
        const newUniqueJobs = data.data.filter((j: any) => !existingUrls.has(j.source_url));
        setJobs(prev => [...prev, ...newUniqueJobs]);
        setCurrentPage(nextPage);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const SkeletonCard = () => (
    <div className="bg-white/[0.02] border border-white/[0.04] p-6 rounded-2xl animate-pulse space-y-4">
      <div className="space-y-3">
        <div className="h-6 bg-white/[0.05] rounded w-1/3"></div>
        <div className="h-4 bg-white/[0.05] rounded w-1/4"></div>
      </div>
      <div className="h-10 bg-white/[0.05] rounded w-full mt-4"></div>
    </div>
  );

  const getHistoryMeta = (h: any) => {
     try {
       const p = JSON.parse(h.data);
       if (h.type === 'research') return "Technical Summary";
       const len = Array.isArray(p) ? p.length : (p.data?.length || 0);
       return `${len} Extracted Items`;
     } catch {
       return "Archived Data";
     }
  }

  return (
    <DashboardShell 
      unconstrainedHeight={true}
      header={
        <div className="flex items-center justify-between">
          <div>
             <h1 className="text-2xl font-black text-white tracking-tight">Omni-Scout</h1>
             <p className="text-sm text-zinc-400 font-medium">Deep Research & Auto-Aggregator</p>
          </div>
        </div>
      }
    >
      <div className={`transition-all duration-700 ease-in-out flex flex-col ${hasSearched ? 'pt-6 px-4 md:px-8' : 'min-h-[80vh] py-12 items-center justify-center p-6'}`}>
        
        {/* Massive Centered Search Bar UI */}
        <motion.div 
          layout
          className={`w-full relative z-10 ${hasSearched ? 'w-full mb-8' : 'w-full max-w-[80%] mx-auto'}`}
        >
          {!hasSearched && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10 w-full">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-6 whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
                <Sparkles className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Introducing Omni-Scout</span>
              </div>
              <h1 className="font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-500 mb-4 tracking-tight leading-[1.1] pb-2" style={{ fontSize: 'clamp(2rem, 6vw, 3.5rem)' }}>AI Career & Web Researcher</h1>
              <p className="text-zinc-400 font-medium mx-auto leading-relaxed" style={{ fontSize: 'clamp(0.875rem, 2vw, 1.125rem)', maxWidth: '600px' }}>
                Directly scrape career domains, explore articles, or aggregate 1000s of live jobs instantly. Your unified scout agent.
              </p>
            </motion.div>
          )}

          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-fuchsia-500/20 via-indigo-500/20 to-emerald-500/20 rounded-[2.5rem] blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <form onSubmit={handleScout} className="relative flex flex-col md:flex-row bg-zinc-950 border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden p-2">
              <div className="flex-1 flex items-center px-4 relative w-full">
                <Search className="w-5 h-5 md:w-6 md:h-6 text-zinc-500 shrink-0" />
                <input 
                  type="text" 
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Paste URL or search 'React Dev'" 
                  className="w-full bg-transparent border-none py-3 md:py-4 px-3 md:px-4 text-[clamp(0.875rem,2.5vw,1.125rem)] text-zinc-50 placeholder:text-zinc-600 focus:outline-none"
                />
              </div>

              <div className="flex p-2 shrink-0 border-t md:border-t-0 md:border-l border-white/10 mt-2 md:mt-0 w-full md:w-auto">
                <button 
                  type="submit" 
                  disabled={isSearching || isClarifying || !query.trim()}
                  className="w-full md:w-auto bg-indigo-500 hover:bg-indigo-400 text-white px-6 h-12 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(99,102,241,0.5)] font-bold text-sm tracking-wide"
                >
                  {(isSearching || isClarifying) ? <Loader2 className="w-5 h-5 animate-spin shrink-0" /> : <Sparkles className="w-5 h-5 shrink-0" />}
                  <span className="whitespace-nowrap">{isClarifying ? 'Translating...' : isSearching ? 'Executing...' : 'Run Agent'}</span>
                </button>
              </div>
            </form>

             {/* CLARIFYING CHAT LOADER */}
             <AnimatePresence>
               {isClarifying && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="mt-4 p-4 border border-indigo-500/10 bg-black/60 rounded-2xl flex items-center gap-3">
                     <div className="flex gap-1.5 ml-2">
                        <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-2 h-2 rounded-full bg-indigo-500/50"></motion.div>
                        <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-2 h-2 rounded-full bg-indigo-500/70"></motion.div>
                        <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-2 h-2 rounded-full bg-indigo-400"></motion.div>
                     </div>
                     <span className="text-zinc-400 text-sm font-medium tracking-tight">Analyzing intent...</span>
                  </motion.div>
               )}
             </AnimatePresence>

            {/* CLARIFICATION CHIPS UI */}
            <AnimatePresence>
              {clarification && (
                 <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mt-4 p-5 md:p-6 border border-indigo-500/20 bg-black shadow-[0_10px_40px_rgba(99,102,241,0.1)] rounded-2xl relative overflow-hidden z-20">
                    <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 opacity-50"></div>
                    <h3 className="text-zinc-200 font-bold text-sm mb-4 flex items-center gap-2"><Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" /> {clarification.question}</h3>
                    <div className="flex flex-wrap gap-2.5">
                       {clarification.suggestions.map((sug, i) => (
                          <button 
                            key={i}
                            type="button"
                            onClick={() => {
                               const newQ = query.trim() + " " + sug;
                               setQuery(newQ);
                               setClarification(null);
                               handleScout(undefined, false, newQ);
                            }}
                            className="px-4 py-2 rounded-xl border border-zinc-800 bg-[#0a0a0c] hover:bg-indigo-500/10 hover:border-indigo-500/30 text-xs font-bold text-zinc-300 hover:text-indigo-300 transition-all active:scale-95 shadow-sm"
                          >
                             {sug}
                          </button>
                       ))}
                       <button type="button" onClick={() => { setClarification(null); handleScout(undefined, false, query); }} className="px-4 py-2 rounded-xl border border-transparent hover:border-white/5 text-xs font-bold text-zinc-500 hover:text-zinc-300 transition-all active:scale-95 ml-auto">Skip</button>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-4 w-full border-t border-white/5 pt-4">
                      <input 
                        type="text" 
                        value={customClarification}
                        onChange={(e) => setCustomClarification(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && customClarification.trim()) {
                             e.preventDefault();
                             const newQ = query.trim() + " " + customClarification.trim();
                             setQuery(newQ);
                             setClarification(null);
                             setCustomClarification("");
                             handleScout(undefined, false, newQ);
                          }
                        }}
                        placeholder="Or type your own specific requirement..." 
                        className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all shadow-inner"
                      />
                      <button 
                        type="button" 
                        onClick={() => {
                          if (customClarification.trim()) {
                             const newQ = query.trim() + " " + customClarification.trim();
                             setQuery(newQ);
                             setClarification(null);
                             setCustomClarification("");
                             handleScout(undefined, false, newQ);
                          }
                        }}
                        disabled={!customClarification.trim()}
                        className="bg-indigo-500 hover:bg-indigo-400 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Refine
                      </button>
                    </div>
                 </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Active Resume Context */}
          {!hasSearched && activeResume && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mt-8 flex justify-center">
               <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                 <CheckCircle2 className="w-4 h-4" />
                 Context Linked: <span className="font-bold text-emerald-300">{activeResume.filename}</span>
               </div>
            </motion.div>
          )}

          {/* HISTORICAL CACHE MODULE */}
          {!hasSearched && historyList.length > 0 && (
             <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-12 w-full max-w-[80%] mx-auto">
                <h3 className="text-zinc-600 font-bold text-xs uppercase tracking-widest mb-4 flex items-center gap-2"><History className="w-4 h-4" /> Global Knowledge Cache</h3>
                <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto custom-scrollbar pr-2 p-1 rounded-2xl">
                   {historyList.map((h: any, i: number) => (
                      <button 
                        onClick={() => loadHistoryItem(h)} 
                        key={i} 
                        className="text-left w-full p-4 rounded-xl border border-white/5 bg-zinc-950/40 hover:bg-zinc-900/80 hover:border-indigo-500/30 hover:shadow-[0_0_20px_rgba(99,102,241,0.1)] transition-all flex items-center justify-between group shadow-sm shrink-0"
                      >
                         <div className="flex flex-col">
                            <span className="text-zinc-300 font-bold text-sm group-hover:text-indigo-400 transition-colors">{h.query}</span>
                            <span className="text-zinc-500 text-xs mt-1.5 flex items-center gap-2">
                               <Sparkles className="w-3 h-3 text-indigo-500/70" /> {getHistoryMeta(h)} • {new Date(h.createdAt).toLocaleDateString()}
                            </span>
                         </div>
                         <ChevronRight className="w-5 h-5 text-zinc-700 group-hover:text-indigo-400 transition-colors" />
                      </button>
                   ))}
                 </div>
              </motion.div>
           )}

           {/* SCHEMA PREVIEW UI */}
           <AnimatePresence>
             {pendingSchema && (
               <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-6 md:p-8 bg-black border border-indigo-500/30 rounded-2xl relative overflow-hidden z-20 shadow-[0_20px_60px_rgba(99,102,241,0.15)] mt-6">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none"></div>
                  <div className="flex items-center gap-3 text-indigo-400 mb-6 border-b border-indigo-500/20 pb-4 relative z-10">
                    <Terminal className="w-5 h-5" />
                    <span className="font-bold uppercase tracking-widest text-sm text-indigo-300">Execution Schema Ready</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 relative z-10">
                     <div>
                        <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">Search Target</h4>
                        <p className="text-zinc-200 text-sm bg-indigo-500/5 p-3.5 rounded-xl border border-indigo-500/10 font-mono shadow-inner">{pendingSchema.target}</p>
                     </div>
                     <div>
                        <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">Intent Mapping</h4>
                        <p className="text-zinc-200 text-sm bg-fuchsia-500/5 p-3.5 rounded-xl border border-fuchsia-500/10 font-mono shadow-inner">{pendingSchema.schema?.intent}</p>
                     </div>
                  </div>

                  <div className="mb-8 relative z-10">
                     <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-3">Extraction Fields</h4>
                     <div className="flex flex-wrap gap-2.5">
                       {pendingSchema.schema?.fields_to_extract?.map((field: string, i: number) => (
                          <span key={i} className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-bold text-emerald-400 shadow-inner inline-flex items-center gap-1.5">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500/50" /> {field}
                          </span>
                       ))}
                     </div>
                     <p className="text-zinc-500 text-xs mt-4 italic border-l-2 border-indigo-500/30 pl-3">Reasoning: {pendingSchema.schema?.reasoning}</p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4 pt-5 border-t border-white/5 relative z-10">
                     <button 
                       type="button" 
                       onClick={() => {
                          handleScout(undefined, true, pendingSchema.query);
                          setPendingSchema(null);
                       }}
                       className="w-full sm:w-auto bg-indigo-500 hover:bg-indigo-400 text-white px-8 py-3 rounded-xl text-sm font-bold transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] active:scale-95 flex items-center justify-center gap-2 group"
                     >
                        <Bot className="w-4 h-4 group-hover:animate-bounce" /> Run Deep Agent
                     </button>

                     <div className="flex-1 w-full relative group">
                        <input 
                           type="text" 
                           placeholder="Add constraints or change intent..." 
                           className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all shadow-inner placeholder:text-zinc-600"
                           onKeyDown={(e) => {
                              if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                 e.preventDefault();
                                 const refinedQuery = pendingSchema.query + " [" + e.currentTarget.value.trim() + "]";
                                 setQuery(refinedQuery);
                                 setPendingSchema(null);
                                 handleScout(undefined, false, refinedQuery);
                              }
                           }}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-[10px] text-zinc-600 font-bold uppercase pointer-events-none">
                          Press Enter ↵
                        </div>
                     </div>
                  </div>
               </motion.div>
             )}
           </AnimatePresence>

         </motion.div>

        {/* Dynamic Results Area */}
        <AnimatePresence mode="wait">
          {hasSearched && (
            <motion.div 
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 w-full"
            >
              
              {/* Agent Mode Loading / Logs */}
              {isSearching && scoutMode === 'agent' && (
                <div className="bg-black/60 border border-indigo-500/30 rounded-2xl p-6 font-mono text-xs w-full max-w-2xl mx-auto shadow-[0_0_30px_rgba(99,102,241,0.1)] mb-8">
                  <div className="flex items-center gap-3 text-indigo-400 mb-4 border-b border-indigo-500/20 pb-4">
                    <Bot className="w-5 h-5" />
                    <span className="font-bold uppercase tracking-widest">Agent Execution Log</span>
                  </div>
                  <div className="space-y-3 text-zinc-400">
                    {agentLogs.map((log, i) => (
                      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={i} className="flex gap-3">
                         <span className="text-zinc-600">&gt;&gt;</span> {log}
                      </motion.div>
                    ))}
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ repeat: Infinity, duration: 0.8 }} className="flex gap-3 text-indigo-400 font-bold">
                       <span>&gt;&gt;</span> █
                    </motion.div>
                  </div>
                </div>
              )}

              {/* Status Bar */}
              {!isSearching && (
                <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
                   <h2 className="text-lg font-semibold text-zinc-50 flex items-center gap-2">
                     {scoutMode === 'agent' ? <Terminal className="w-5 h-5 text-indigo-400" /> : <Network className="w-5 h-5 text-fuchsia-400" />}
                     {searchSummary || "Results"}
                   </h2>
                   {jobs.length > 0 && (
                     <div className="px-3 py-1 bg-white/5 rounded-full border border-white/10 text-xs font-bold text-zinc-300">
                        {jobs.length} Matches Extracted
                     </div>
                   )}
                </div>
              )}

              {/* Grid for Aggregator or Agent Jobs */}
              <div className="flex flex-col gap-4 pb-12">
                {isSearching && scoutMode === 'aggregator' ? (
                   Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)
                ) : (
                  <>
                    {/* Render dynamic extracted objects array */}
                    {isDynamic && jobs.length > 0 && (
                       <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full border border-zinc-800 rounded-2xl bg-[#0A0A0A] shadow-2xl overflow-x-auto relative">
                         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-emerald-500 opacity-50"></div>
                         <table className="w-full text-left text-sm text-zinc-300">
                           <thead className="bg-zinc-900/40 text-[10px] font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-800">
                             <tr>
                               {dynamicSchemaKeys.map((key, i) => (
                                 <th key={i} className="py-4 px-6 whitespace-nowrap">{key}</th>
                               ))}
                             </tr>
                           </thead>
                           <tbody className="divide-y divide-zinc-800/60">
                             {jobs.map((item, idx) => (
                               <motion.tr 
                                 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: idx * 0.05 }}
                                 key={idx} className="hover:bg-white/[0.02] transition-colors"
                               >
                                 {dynamicSchemaKeys.map((key, j) => {
                                    // LLMs sometimes snake_case the keys instead, so fallback matching
                                    const val = item[key] || item[key.toLowerCase()] || item[key.toLowerCase().replace(/ /g, '_')] || item[key.replace(/ /g, '')] || "-";
                                    const isUrl = typeof val === 'string' && val.startsWith('http');
                                    return (
                                      <td key={j} className="py-4 px-6 max-w-xs truncate" title={String(val)}>
                                        {isUrl ? (
                                           <a href={val} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-indigo-400 font-bold text-xs hover:bg-zinc-800 hover:text-indigo-300 transition-colors hover:border-indigo-500/30">
                                             <img src={`https://www.google.com/s2/favicons?domain=${getDomainIcon(val)}&sz=64`} alt="logo" className="w-4 h-4 rounded-sm object-contain bg-white" onError={(e) => { (e.currentTarget as any).style.display = 'none'; }} />
                                             Visit <ExternalLink className="w-3 h-3" />
                                           </a>
                                        ) : (
                                           String(val)
                                        )}
                                      </td>
                                    );
                                 })}
                               </motion.tr>
                             ))}
                           </tbody>
                         </table>
                       </motion.div>
                    )}

                    {/* Render extracted jobs in CSV/Table Format */}
                    {!isDynamic && jobs.length > 0 && (
                      <div className="w-full border border-zinc-800 rounded-2xl overflow-hidden bg-[#0A0A0A] shadow-2xl">
                        {/* Table Header */}
                        <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b border-zinc-800 bg-zinc-900/40 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                          <div className="col-span-4 pl-2">Job Title & Company</div>
                          <div className="col-span-2">Location</div>
                          <div className="col-span-4">AI Insight</div>
                          <div className="col-span-2 text-right pr-2">Action</div>
                        </div>
                        
                        {/* Table Body */}
                        <div className="divide-y divide-zinc-800/60">
                          {jobs.map((job, idx) => (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3, delay: idx * 0.03 }}
                              key={idx} 
                              className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 md:items-center hover:bg-white/[0.02] transition-colors group relative"
                            >
                              <div className="col-span-1 md:col-span-4 flex items-center gap-4 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 shadow-inner group-hover:border-indigo-500/30 group-hover:bg-indigo-500/10 transition-colors">
                                  <Briefcase className="w-4 h-4 text-zinc-400 group-hover:text-indigo-400 transition-colors absolute z-0 opacity-50" />
                                  <img 
                                     src={`https://www.google.com/s2/favicons?domain=${getDomainIcon(job.source_url)}&sz=128`} 
                                     alt="" 
                                     className="relative z-10 w-5 h-5 object-contain rounded-[4px] shadow-sm transform group-hover:scale-110 transition-transform duration-300"
                                     onError={(e) => { (e.currentTarget as any).style.display = 'none'; }}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <h3 className="text-sm font-bold text-zinc-100 truncate group-hover:text-indigo-400 transition-colors">{job.title}</h3>
                                  <p className="text-xs text-zinc-500 truncate mt-0.5">{job.company}</p>
                                </div>
                              </div>
                              
                              <div className="col-span-1 md:col-span-2 flex flex-col justify-center min-w-0 py-2 md:py-0">
                                <span className="text-xs text-zinc-300 flex items-center gap-1.5 truncate">
                                  <MapPin className="w-3.5 h-3.5 text-zinc-600 shrink-0" /> {job.location || "Remote"}
                                </span>
                                {job.salary && job.salary !== "Competitive" && (
                                  <span className="text-[10px] text-zinc-500 truncate mt-1 pl-5">{job.salary}</span>
                                )}
                              </div>
                              
                              <div className="col-span-1 md:col-span-4 min-w-0 pr-4">
                                 <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">{job.ai_insight || job.experience}</p>
                              </div>
                              
                              <div className="col-span-1 md:col-span-2 flex items-center justify-between md:justify-end gap-3 shrink-0 mt-2 md:mt-0">
                                {job.match_score && (
                                  <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
                                    {job.match_score}% MATCH
                                  </span>
                                )}
                                <Link 
                                  href={getJobApplyUrl(job)} 
                                  target="_blank" 
                                  className="py-1.5 px-3 bg-zinc-100 hover:bg-white text-zinc-900 rounded-lg transition-all shadow-md flex items-center gap-2 text-xs font-bold active:scale-95"
                                >
                                   Apply <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
                                </Link>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                        
                        {/* Load More Button */}
                        {scoutMode === 'agent' && jobs.length > 0 && !isSearching && (
                          <div className="p-4 border-t border-zinc-800/60 flex justify-center bg-zinc-950/50">
                            <button 
                              onClick={handleLoadMore}
                              disabled={isLoadingMore}
                              className="flex items-center gap-2 px-6 py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm font-bold rounded-xl hover:bg-white hover:text-black transition-all disabled:opacity-50 disabled:hover:bg-zinc-900 disabled:hover:text-zinc-300 shadow-sm shadow-black"
                            >
                              {isLoadingMore ? (
                                 <><Loader2 className="w-4 h-4 animate-spin text-indigo-400" /> Deep Scraping Page {currentPage + 1}...</>
                              ) : (
                                 <><ArrowDown className="w-4 h-4" /> Load Next 15 Matches</>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Render Research Data */}
                    {researchData && (
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6 md:p-10 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-indigo-500 to-fuchsia-500"></div>
                        <h2 className="text-2xl font-black text-zinc-50 mb-6 flex items-center gap-3">
                           <FileText className="w-6 h-6 text-emerald-400" />
                           {researchData.title}
                        </h2>
                        
                        <div className="bg-black/40 border border-white/[0.04] p-6 rounded-2xl mb-8">
                           <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">AI Synthesis</h4>
                           <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">
                             {researchData.summary}
                           </p>
                        </div>

                        {researchData.key_takeaways && researchData.key_takeaways.length > 0 && (
                           <div>
                              <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">Key Takeaways</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {researchData.key_takeaways.map((point: string, i: number) => (
                                  <div key={i} className="flex gap-3 bg-white/[0.02] border border-white/[0.04] p-4 rounded-xl">
                                     <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black text-xs shrink-0">{i+1}</div>
                                     <p className="text-sm text-zinc-400 leading-relaxed pt-0.5">{point}</p>
                                  </div>
                                ))}
                              </div>
                           </div>
                        )}
                      </motion.div>
                    )}

                    {/* Render Products */}
                    {productsData && productsData.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                         {productsData.map((product, i) => (
                            <motion.a href={product.source_url || "#"} target="_blank" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }} key={i} className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col justify-between hover:border-indigo-500/30 transition-colors shadow-2xl relative group overflow-hidden block">
                               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-indigo-500 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                               <div>
                                  <h3 className="text-lg font-black text-white mb-2 leading-tight">{product.name}</h3>
                                  <p className="text-3xl font-black text-emerald-400 mb-4 tracking-tighter">{product.price}</p>
                                  <p className="text-sm text-zinc-400 leading-relaxed max-w-sm">{product.features}</p>
                               </div>
                               <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-indigo-400 transition-colors">{product.source}</span>
                                  <ExternalLink className="w-4 h-4 text-zinc-600 group-hover:text-indigo-400" />
                               </div>
                            </motion.a>
                         ))}
                      </div>
                    )}

                    {!isSearching && jobs.length === 0 && !researchData && productsData.length === 0 && hasSearched && !pendingSchema && !clarification && (
                      <div className="col-span-full py-20 text-center bg-zinc-900/20 border border-dashed border-zinc-800 rounded-[2.5rem]">
                         <AlertCircle className="h-12 w-12 text-zinc-500 mx-auto mb-4 opacity-50" />
                         <h3 className="text-lg font-bold text-zinc-400">No data could be extracted.</h3>
                         <p className="text-zinc-600 text-sm mt-2 max-w-sm mx-auto">Try adjusting your advanced query or ensure the target domain does not have strict firewall captchas enabled.</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardShell>
  );
}
