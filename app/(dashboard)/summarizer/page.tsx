"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Youtube, Search, Play, ChevronDown, Loader2, Clock, CheckCircle2, FileText, Sparkles } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { YouTubeSummarizerBox } from "@/components/YouTubeSummarizerBox";
import dynamic from 'next/dynamic';

const ReactMarkdown = dynamic(() => import('react-markdown'), { ssr: false });

const fetcher = (url: string) => fetch(url).then((res) => { if (!res.ok) throw new Error('API Error'); return res.json(); });

export default function SummarizerView() {
  const router = useRouter();
  const { data: history, mutate } = useSWR('/api/summarize', fetcher, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60000
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
         <div className="flex flex-col h-full md:border-r border-white/5">
          <div className="h-16 px-6 border-b border-white/10 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2 font-bold tracking-wide text-xs uppercase text-zinc-400">
              <Clock className="w-4 h-4" /> Previous Scans
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
            {!history && <div className="p-4 text-center text-zinc-400 text-xs flex justify-center"><Loader2 className="w-4 h-4 animate-spin" /></div>}
            {history && history.length === 0 && <div className="p-4 text-center text-zinc-500 font-medium text-xs">No summaries generated yet.</div>}
            {history && Array.isArray(history) && history.map((item: any) => (
              <button 
                key={item.id}
                onClick={() => loadHistoryItem(item)}
                className={`w-full text-left px-4 py-3.5 rounded-xl transition-all border ${selectedHistoryId === item.id ? 'bg-white/10 border-white/10 shadow-sm text-white font-semibold' : 'bg-transparent border-transparent hover:bg-white/5 text-zinc-400 hover:text-white'}`}
              >
                <div className="text-sm tracking-tight truncate font-sans">{item.title}</div>
                <div className="text-[10px] tracking-wide mt-1 flex justify-between items-center opacity-70">
                  <span className="truncate max-w-[120px]">{item.url}</span>
                  <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
              </button>
            ))}
          </div>
         </div>
      }
    >
              <div className="min-h-[4rem] p-4 md:px-6 md:py-0 border-b border-white/10 bg-white/5 flex flex-col justify-center shrink-0">
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
                    <div className="border border-white/10 bg-white/5 backdrop-blur-3xl rounded-[2rem] overflow-hidden opacity-50 w-full shadow-2xl">
                      <div className="px-8 py-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                        <div className="w-1/3 h-6 bg-white/10 rounded-full animate-pulse"></div>
                      </div>
                      <div className="p-10 space-y-6">
                        <div className="w-full h-4 bg-white/10 rounded-full animate-pulse"></div>
                        <div className="w-5/6 h-4 bg-white/10 rounded-full animate-pulse"></div>
                        <div className="w-3/4 h-4 bg-white/10 rounded-full animate-pulse"></div>
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
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3 text-white font-bold text-2xl tracking-tight">
                          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl shadow-inner border border-emerald-500/30">
                            <CheckCircle2 className="w-6 h-6" />
                          </div>
                          Analysis Complete
                        </div>
                        <button 
                          onClick={handleChatWithVideo}
                          disabled={isTutorLearning}
                          className="bg-white text-black hover:bg-zinc-200 text-sm font-bold tracking-wide px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-xl active:scale-95 disabled:opacity-50 border border-white/20"
                        >
                          {isTutorLearning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-rose-500" />}
                          {isTutorLearning ? 'Redirecting...' : 'Chat with Video'}
                        </button>
                      </div>
                      <div className="border border-white/10 bg-white/5 backdrop-blur-3xl rounded-[2.5rem] overflow-hidden shadow-2xl">
                         <div className="p-8 md:p-12 prose prose-invert prose-indigo max-w-none font-sans text-zinc-300 leading-relaxed space-y-4">
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
                                  h2: ({ children }) => <h2 className="text-2xl font-bold text-white mb-6 mt-10 pb-4 border-b border-white/10">{children}</h2>,
                                  h3: ({ children }) => <h3 className="text-lg font-semibold text-zinc-200 mb-4 mt-8">{children}</h3>
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
                        className="w-full py-4 bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-xl rounded-2xl text-sm font-semibold transition-all shadow-lg disabled:opacity-50 flex justify-center items-center gap-2 active:scale-[0.98]"
                      >
                        {isMakingNote ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : <FileText className="w-5 h-5" />}
                        {isMakingNote ? 'Transferring...' : 'Make Note'}
                      </button>
                    </div>
                  )}

                 {!summaryData && !isSummarizing && !isDeepScanning && !errorMsg && (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-sm pb-12">
                       <div className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-white/10">
                         <Youtube className="w-10 h-10 text-zinc-400 drop-shadow-lg" />
                       </div>
                       <p className="font-bold text-xl tracking-tight text-white">Your summaries will appear here</p>
                       <p className="text-zinc-500 mt-2 max-w-xs text-center font-medium leading-relaxed">Select a previous scan from the sidebar or generate a new one above.</p>
                    </div>
                 )}
             </div>
         </DashboardShell>
  );
}
