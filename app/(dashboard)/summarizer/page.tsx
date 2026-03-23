"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Youtube, Search, Play, ChevronDown, Loader2, Clock, CheckCircle2, FileText, Sparkles } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { YouTubeSummarizerBox } from "@/components/YouTubeSummarizerBox";
import dynamic from 'next/dynamic';

const ReactMarkdown = dynamic(() => import('react-markdown'), { ssr: false });

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function SummarizerView() {
  const router = useRouter();
  const { data: history, mutate } = useSWR('/api/summarize', fetcher, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false
  });
  
  const [url, setUrl] = useState("");
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isDeepScanning, setIsDeepScanning] = useState(false);
  const [summaryData, setSummaryData] = useState<string | null>(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [isMakingNote, setIsMakingNote] = useState(false);
  const [summaryLevel, setSummaryLevel] = useState<'short' | 'medium' | 'comprehensive'>('medium');
  const [isTutorLearning, setIsTutorLearning] = useState(false);

  const handleSummarize = async (e?: React.FormEvent, deepScanFallback = false, fallbackTitle?: string, fallbackAuthor?: string) => {
    e?.preventDefault();
    if (!url) return;
    
    if (deepScanFallback) {
      setIsDeepScanning(true);
    } else {
      setIsSummarizing(true);
      setIsDeepScanning(false);
      setSummaryData(null);
      setSelectedHistoryId(null);
    }
    setErrorMsg("");
    
    try {
      const payload = deepScanFallback 
         ? { url, deepScan: true, title: fallbackTitle, author: fallbackAuthor, summaryLevel }
         : { url, deepScan: false, summaryLevel };

      const res = await fetch(`/api/summarize?_t=${Date.now()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to summarize');
      
      if (data.requiresDeepScan) {
         const meta = data.metadata || {};
         await handleSummarize(e, true, meta.title, meta.author);
         return;
      }
      
      if (data.summary) {
        setSummaryData(data.summary);
        await mutate(); // Refresh history sidebar
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to connect to backend APIs.");
    } finally {
      if (!deepScanFallback) setIsSummarizing(false);
      setIsDeepScanning(false);
    }
  };

  const loadHistoryItem = (item: any) => {
     setSelectedHistoryId(item.id);
     setSummaryData(item.content);
  };

  const handleChatWithVideo = () => {
    if (!summaryData) return;
    setIsTutorLearning(true);
    
    // Store context in sessionStorage to pass to the /tutor page
    const context = {
      summary: summaryData,
      url: url,
      timestamp: Date.now()
    };
    sessionStorage.setItem('pending_video_context', JSON.stringify(context));
    
    // Redirect to standalone Tutor page
    router.push('/tutor');
  };

  const handleMakeNoteRedir = () => {
    if (!summaryData) return;
    setIsMakingNote(true);
    
    // Store summary for the /notes page
    sessionStorage.setItem('pending_note_context', JSON.stringify({
      summary: summaryData,
      title: url.split('v=')[1] ? `YT Summary: ${url.split('v=')[1].substring(0,6)}` : "YouTube Summary"
    }));
    
    // Redirect to standalone Notes Saver page
    router.push('/notes');
  };

  return (
    <DashboardShell
      header={
        <div>
          <h1 className="text-xl font-bold text-zinc-50 flex items-center gap-2">YouTube Summarizer</h1>
          <p className="text-sm text-zinc-400 font-medium">Extract key insights from any YouTube video instantly.</p>
        </div>
      }
      sidebar={
        <>
          <div className="h-16 px-4 border-b border-zinc-800/80 bg-zinc-900 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2 font-semibold text-zinc-50/80">
              <Clock className="w-4 h-4 text-zinc-400" /> Previous Scans
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {!history && <div className="p-4 text-center text-zinc-400 text-xs flex justify-center"><Loader2 className="w-4 h-4 animate-spin" /></div>}
            {history && history.length === 0 && <div className="p-4 text-center text-zinc-500 font-medium text-xs">No summaries generated yet.</div>}
            {history && Array.isArray(history) && history.map((item: any) => (
              <button 
                key={item.id}
                onClick={() => loadHistoryItem(item)}
                className={`w-full text-left px-3 py-3 rounded-xl transition-all border ${selectedHistoryId === item.id ? 'bg-white/[0.06] border-white/[0.04] shadow-sm text-zinc-50 font-bold' : 'bg-transparent border-transparent hover:bg-white/[0.02] text-zinc-500 hover:text-zinc-300'}`}
              >
                <div className="text-sm tracking-tight truncate">{item.title}</div>
                <div className="text-[10px] tracking-wide mt-1 flex justify-between items-center opacity-70">
                  <span className="truncate max-w-[120px]">{item.url}</span>
                  <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
              </button>
            ))}
          </div>
        </>
      }
    >
              <div className="min-h-[4rem] p-4 md:px-6 md:py-0 border-b border-white/[0.04] bg-black/20 flex flex-col justify-center shrink-0">
                  <YouTubeSummarizerBox
                    url={url} 
                    setUrl={setUrl} 
                    summaryLevel={summaryLevel} 
                    setSummaryLevel={setSummaryLevel} 
                    isSummarizing={isSummarizing} 
                    isDeepScanning={isDeepScanning} 
                    handleSummarize={handleSummarize} 
                  />
              </div>

             <div className="flex-1 overflow-y-auto p-6 space-y-6">
                 {isDeepScanning && (
                    <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm rounded-xl font-medium flex items-center justify-center gap-3 mb-4 animate-in fade-in w-full">
                      <Loader2 className="w-5 h-5 animate-spin" /> Deep Scanning Video (Processing Metadata)...
                    </div>
                 )}
                 
                 {(isSummarizing || isDeepScanning) && !summaryData && (
                    <div className="border border-zinc-800/50 rounded-xl overflow-hidden opacity-50 w-full">
                      <div className="px-4 py-3 bg-zinc-900 border-b border-zinc-800 flex justify-between items-center">
                        <div className="w-1/3 h-4 bg-zinc-800 rounded animate-pulse"></div>
                      </div>
                      <div className="p-6 space-y-4">
                        <div className="w-full h-3 bg-zinc-800 rounded animate-pulse"></div>
                        <div className="w-5/6 h-3 bg-zinc-800 rounded animate-pulse"></div>
                        <div className="w-3/4 h-3 bg-zinc-800 rounded animate-pulse"></div>
                      </div>
                    </div>
                 )}

                 {errorMsg && (
                   <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-xl font-medium w-full text-center">
                      {errorMsg}
                   </div>
                 )}

                  {summaryData && !(isSummarizing || isDeepScanning) && (
                    <div className="w-full space-y-6 animate-in slide-in-from-bottom-4 duration-700">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-rose-500 font-black text-xl tracking-tight">
                          <CheckCircle2 className="w-6 h-6" /> Comprehensive Summary Ready
                        </div>
                        <button 
                          onClick={handleChatWithVideo}
                          disabled={isTutorLearning}
                          className="bg-zinc-50 hover:bg-zinc-200 text-zinc-950 text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95 disabled:opacity-50"
                        >
                          {isTutorLearning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                          {isTutorLearning ? 'Redirecting...' : 'Chat with Video'}
                        </button>
                      </div>
                      <div className="border border-white/[0.04] bg-white/[0.01] rounded-[2rem] overflow-hidden shadow-inner">
                         <div className="p-8 md:p-12 prose prose-invert prose-rose max-w-none text-zinc-300 leading-relaxed space-y-4">
                            <div className="text-zinc-300 leading-relaxed pt-2">
                              <ReactMarkdown
                                components={{
                                  p: ({ children }) => {
                                    if (typeof children === 'string') {
                                      const parts = children.split(/(\[?\d{1,2}:\d{2}(?::\d{2})?\]?)/g);
                                      return (
                                        <p className="mb-4 text-zinc-300 leading-relaxed">
                                          {parts.map((part, i) => {
                                            const isTimestamp = /^\[?\d{1,2}:\d{2}(?::\d{2})?\]?$/.test(part);
                                            if (isTimestamp) {
                                              return (
                                                <span key={i} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 font-mono text-[10px] font-bold border border-rose-500/20 mr-2 shadow-sm">
                                                  <Play className="w-2.5 h-2.5" />
                                                  {part.replace(/[\[\]]/g, '')}
                                                </span>
                                              );
                                            }
                                            return <span key={i}>{part}</span>;
                                          })}
                                        </p>
                                      );
                                    }
                                    return <p className="mb-4">{children}</p>;
                                  },
                                  strong: ({ children }) => <strong className="font-bold text-zinc-100">{children}</strong>,
                                  h2: ({ children }) => <h2 className="text-xl font-bold text-zinc-100 mb-4 mt-8 pb-2 border-b border-zinc-800/50">{children}</h2>,
                                  h3: ({ children }) => <h3 className="text-lg font-bold text-zinc-200 mb-3 mt-6">{children}</h3>
                                }}
                              >
                                {typeof summaryData === 'string' ? summaryData : JSON.stringify(summaryData, null, 2)}
                              </ReactMarkdown>
                            </div>
                         </div>
                      </div>
                      <button 
                        onClick={handleMakeNoteRedir}
                        disabled={isMakingNote}
                        className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-sm font-bold transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex justify-center items-center gap-2 active:scale-[0.98]"
                      >
                        {isMakingNote ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : <FileText className="w-5 h-5" />}
                        {isMakingNote ? 'Transferring...' : 'Make Note'}
                      </button>
                    </div>
                  )}

                 {!summaryData && !isSummarizing && !isDeepScanning && !errorMsg && (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-sm pb-12">
                       <Youtube className="w-16 h-16 text-zinc-800 mb-4" />
                       <p className="font-medium text-zinc-400">Your summaries will appear here.</p>
                       <p className="text-zinc-600 mt-1 max-w-xs text-center">Select a previous scan from the sidebar or generate a new one.</p>
                    </div>
                 )}
             </div>
         </DashboardShell>
  );
}
