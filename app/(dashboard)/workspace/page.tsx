"use client";

import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { Youtube, Search, CheckCircle2, Play, MessageSquare, ChevronDown, GraduationCap, StickyNote, Tag, Star, Sparkles, Send, Loader2, Plus, ChevronLeft, ChevronRight, X, RotateCw, User } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from "next-auth/react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function WorkspaceView() {
   const { data: session } = useSession();
  // SWR for Notes
  const { data: notes, mutate } = useSWR('/api/notes', fetcher);
  
  // State for YouTube Summarizer
  const [url, setUrl] = useState("https://youtube.com/watch?v=EngW7tCbLHY");
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isDeepScanning, setIsDeepScanning] = useState(false);
  const [summaryLevel, setSummaryLevel] = useState<'short' | 'medium' | 'comprehensive'>('medium');
  const [summaryData, setSummaryData] = useState<any | null>(null);
  
  // State for Note Generation
  const [isMakingNote, setIsMakingNote] = useState(false);
  const [isTutorLearning, setIsTutorLearning] = useState(false);
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // State for Flashcards
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);
  const [showFlashcardModal, setShowFlashcardModal] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // State for AI Tutor
  const [tutorMode, setTutorMode] = useState<'socratic' | 'direct'>('socratic');
  const [tutorInput, setTutorInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [tutorMessages, setTutorMessages] = useState([
    { role: 'assistant', content: "Hello! I am your AI Tutor. What would you like to learn today?" }
  ]);

  // Chat Input Reference for focus maintenance
  const tutorInputRef = useRef<HTMLInputElement>(null);

  // Focus input when typing finishes or on mount
  useEffect(() => {
    if (!isTyping) {
      tutorInputRef.current?.focus();
    }
  }, [isTyping]);

  // Chat Scroll Reference
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll effect
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [tutorMessages]);

  const handleSummarize = async (e?: React.FormEvent, deepScanFallback = false, fallbackTitle?: string, fallbackAuthor?: string) => {
    e?.preventDefault();
    if (!url) return;
    
    if (deepScanFallback) {
      setIsDeepScanning(true);
    } else {
      setIsSummarizing(true);
      setIsDeepScanning(false);
      setSummaryData(null);
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
         // Auto fallback to Deep Scan, passing the metadata we just extracted
         const meta = data.metadata || {};
         await handleSummarize(e, true, meta.title, meta.author);
         return;
      }
      
      if (data.summary) {
        setSummaryData(data.summary);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to connect to backend APIs. Did you restart the server?");
    } finally {
      if (!deepScanFallback) {
         setIsSummarizing(false);
      }
      setIsDeepScanning(false);
    }
  };

  const handleMakeNote = async (e?: React.FormEvent, isManual?: boolean) => {
    e?.preventDefault();
    // If no summaryData and no isManual, ignore
    if (!summaryData && !isManual) return;
    
    setIsMakingNote(true);
    setErrorMsg("");
    try {
      const payload = isManual ? { title: "Untitled Note", content: "" } : { summaryData };
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save note');
      
      // Force SWR to re-fetch the notes list instantly
      await mutate('/api/notes');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to make a note.");
    } finally {
      setIsMakingNote(false);
    }
  };

  const handleTutorSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!tutorInput.trim() || isTyping) return;
    
    const newMessages = [...tutorMessages, { role: 'user', content: tutorInput }];
    setTutorMessages(newMessages);
    setTutorInput("");
    setIsTyping(true);
    
    try {
      const res = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, mode: tutorMode })
      });
      const data = await res.json();
      if (data.reply) {
         setTutorMessages([...newMessages, { role: 'assistant', content: data.reply }]);
      }
    } catch (err) {
       console.error(err);
       setTutorMessages([...newMessages, { role: 'assistant', content: "Sorry, the tutor is currently disconnected. Did you restart the dev server?" }]);
    } finally {
       setIsTyping(false);
    }
  };

  const flipStyles = `
    .perspective-1000 {
      perspective: 1000px;
    }
    .backface-hidden {
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
    }
  `;

  const handleChatWithVideo = async () => {
    if (!summaryData || isTutorLearning) return;
    
    setIsTutorLearning(true);
    setErrorMsg("");
    
    try {
      // 1. Prepare the context injection message
      const contextMessage = { 
        role: 'user', 
        content: `I've just summarized a video. Here is the context summary to help you teach me about it:\n\n${typeof summaryData === 'string' ? summaryData : JSON.stringify(summaryData)}` 
      };
      
      // 2. Add an optimistic acknowledgment from the AI
      const assistantAcknowledgment = {
        role: 'assistant',
        content: "I've processed the video context! I'm ready to help you explore the key concepts, technical details, or any specific questions you have about this video. What should we start with?"
      };

      // 3. Update the tutor messages locally
      setTutorMessages(prev => [
        ...prev, 
        contextMessage,
        assistantAcknowledgment
      ]);

      // 4. (Optional) We could call the API to "prime" the backend, 
      // but since the API takes the full history, adding the context to the next prompt effectively does this.
      // However, to make it feel premium, we'll wait 1s for "processing"
      await new Promise(r => setTimeout(r, 1200));
      
    } catch (err) {
      setErrorMsg("Failed to transfer video context to AI Tutor.");
    } finally {
      setIsTutorLearning(false);
    }
  };

  const handleGenerateFlashcards = async () => {
    if (!selectedNote || isGeneratingFlashcards) return;

    setIsGeneratingFlashcards(true);
    setErrorMsg("");
    try {
      const res = await fetch('/api/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: selectedNote.title,
          content: selectedNote.content
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate flashcards');
      
      setFlashcards(data);
      setCurrentCardIndex(0);
      setIsFlipped(false);
      setShowFlashcardModal(true);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to generate flashcards.");
    } finally {
      setIsGeneratingFlashcards(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] animate-in fade-in duration-500 font-sans p-6 lg:p-8 overflow-hidden">
      <style>{flipStyles}</style>
      <div className="max-w-[1400px] mx-auto w-full flex flex-col h-full min-h-0">
        {/* 1. Unified Workspace Header */}
        <header className="flex items-center justify-between shrink-0 mb-6 bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-4 shadow-sm backdrop-blur-md">
            <div>
              <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                 Unified Workspace 
              </h1>
              <p className="text-sm text-zinc-500 font-medium">Synced ecosystem connected to your unified schema.</p>
           </div>
           <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                 <div className="text-sm font-bold text-zinc-200">{session?.user?.name || 'Demo User'}</div>
                 <div className="text-xs text-zinc-500 font-medium">Active Session</div>
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-zinc-800 shadow-md overflow-hidden bg-zinc-950 flex items-center justify-center">
                 {session?.user?.image ? (
                   <img src={session.user.image} alt="Profile" className="w-full h-full object-cover" />
                 ) : (
                   <div className="w-full h-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center">
                     <span className="text-white font-bold text-sm">
                       {session?.user?.name?.split(' ').map(n => n[0]).join('') || 'DU'}
                     </span>
                   </div>
                 )}
              </div>
           </div>
        </header>

        {/* 2. Three-Column Workspace */}
        <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden min-h-0 items-stretch">
          
          {/* COLUMN 1: YouTube Summarizer */}
          <section className="bg-zinc-900/60 border border-zinc-800/50 rounded-2xl flex flex-col h-full min-h-0 lg:w-[30%] overflow-hidden shadow-lg hover:border-zinc-700/50 transition-colors shrink-0">
            <div className="h-16 px-4 border-b border-zinc-800/80 bg-zinc-900 flex justify-between items-center shrink-0">
               <div className="flex items-center gap-2 font-semibold text-zinc-200">
                 <Youtube className="w-4 h-4 text-rose-500" />
                 YT Summarizer
               </div>
               <button 
                 onClick={handleChatWithVideo}
                 disabled={!summaryData || isTutorLearning}
                 className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded flex items-center gap-1 transition-all ${
                   summaryData 
                     ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 active:scale-95' 
                     : 'bg-zinc-800 text-zinc-600 border border-zinc-700/50 opacity-50 cursor-not-allowed'
                 }`}
               >
                 {isTutorLearning ? <Loader2 className="w-3 h-3 animate-spin text-purple-400" /> : <Sparkles className="w-3 h-3" />}
                 {isTutorLearning ? 'Learning...' : 'Chat with Video'}
               </button>
            </div>

             <div className="p-4 shrink-0 space-y-3">
                <form onSubmit={handleSummarize} className="relative group w-full flex flex-col gap-3">
                   <div className="relative group flex-1 bg-zinc-950 border border-zinc-800 rounded-xl transition-all shadow-inner overflow-hidden">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 z-10" />
                      <input 
                        type="url" 
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="Paste YouTube Link..." 
                        className="w-full bg-transparent border-none py-2.5 pl-10 pr-4 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-rose-500/50 transition-all font-mono"
                        style={{
                          maskImage: 'linear-gradient(to right, black 80%, transparent 95%)',
                          WebkitMaskImage: 'linear-gradient(to right, black 80%, transparent 95%)'
                        }}
                      />
                   </div>
                   
                   <div className="flex gap-2">
                      <div className="flex flex-1 items-center bg-zinc-950 border border-zinc-800 rounded-xl p-0.5">
                         {(['short', 'medium', 'comprehensive'] as const).map((level) => (
                            <button
                              key={level}
                              type="button"
                              onClick={() => setSummaryLevel(level)}
                              className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${summaryLevel === level ? 'bg-zinc-800 text-rose-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                              {level === 'short' ? 'Brief' : level === 'medium' ? 'Moderate' : 'Comprehensive'}
                            </button>
                         ))}
                      </div>
                      <button 
                        onClick={(e) => handleSummarize(e)}
                        disabled={isSummarizing || isDeepScanning || !url}
                        className="bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-semibold text-xs rounded-xl transition-all border border-rose-400/20 disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(225,29,72,0.15)] hover:shadow-[0_0_25px_rgba(225,29,72,0.25)] w-[90px] h-9 shrink-0"
                      >
                        {(isSummarizing || isDeepScanning) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Generate</span>}
                      </button>
                   </div>
                </form>
             </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
               {isDeepScanning && (
                  <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm rounded-xl font-medium flex items-center justify-center gap-2 mb-4 animate-in fade-in">
                    <Loader2 className="w-4 h-4 animate-spin" /> Deep Scanning Video...
                  </div>
               )}
               
               {(isSummarizing || isDeepScanning) && !summaryData && (
                  <div className="border border-zinc-800/50 rounded-xl overflow-hidden opacity-50">
                    <div className="px-4 py-3 bg-zinc-900 border-b border-zinc-800 flex justify-between items-center">
                      <div className="w-1/2 h-4 bg-zinc-800 rounded animate-pulse"></div>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="w-full h-3 bg-zinc-800 rounded animate-pulse"></div>
                    </div>
                  </div>
               )}

               {summaryData && !(isSummarizing || isDeepScanning) && (
                  <div className="space-y-4">
                    <div className="border border-zinc-800/80 bg-zinc-950/50 rounded-xl overflow-hidden">
                       <div className="px-4 py-3 bg-zinc-900 text-sm font-medium text-zinc-300 flex justify-between items-center">
                          <span>Generated Summary</span>
                          <ChevronDown className="w-4 h-4 text-zinc-500" />
                       </div>
                       <div className="p-4 space-y-3">
                          <div className="text-zinc-300 text-sm leading-relaxed prose prose-invert prose-rose max-w-none">
                            <ReactMarkdown
                              components={{
                                p: ({ children }) => {
                                  if (typeof children === 'string') {
                                    const parts = children.split(/(\[?\d{1,2}:\d{2}(?::\d{2})?\]?)/g);
                                    return (
                                      <p className="mb-3">
                                        {parts.map((part, i) => {
                                          const isTimestamp = /^\[?\d{1,2}:\d{2}(?::\d{2})?\]?$/.test(part);
                                          if (isTimestamp) {
                                            return (
                                              <span key={i} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 font-mono text-[9px] font-bold border border-rose-500/20 mr-1.5">
                                                <Play className="w-2 h-2 text-rose-500" />
                                                {part.replace(/[\[\]]/g, '')}
                                              </span>
                                            );
                                          }
                                          return <span key={i}>{part}</span>;
                                        })}
                                      </p>
                                    );
                                  }
                                  return <p className="mb-3">{children}</p>;
                                },
                                strong: ({ children }) => <strong className="font-bold text-zinc-100">{children}</strong>,
                                h2: ({ children }) => <h2 className="text-sm font-bold text-rose-400 mb-2 mt-4">{children}</h2>,
                                h3: ({ children }) => <h3 className="text-xs font-bold text-zinc-200 mb-1 mt-3">{children}</h3>
                              }}
                            >
                               {typeof summaryData === 'string' ? summaryData : JSON.stringify(summaryData, null, 2)}
                            </ReactMarkdown>
                          </div>
                       </div>
                    </div>
                    <button 
                      onClick={(e) => handleMakeNote(e)}
                      disabled={isMakingNote}
                      className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-medium transition-colors shadow-sm disabled:opacity-50 flex justify-center items-center gap-2"
                    >
                      {isMakingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Make Note'}
                    </button>
                  </div>
               )}
               
               {errorMsg && (
                 <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-xl font-medium">
                    {errorMsg}
                 </div>
               )}
               
               {!summaryData && !(isSummarizing || isDeepScanning) && (
                 <div className="text-center text-sm text-zinc-500 py-10">Paste a YouTube URL and click Generate.</div>
               )}
            </div>
          </section>

          {/* COLUMN 2: AI Tutor Chat */}
          <section className="bg-zinc-900/60 border border-zinc-800/50 rounded-2xl flex flex-col h-full min-h-0 lg:w-[35%] overflow-hidden shadow-lg hover:border-zinc-700/50 transition-colors shrink-0">
            <div className="p-4 border-b border-zinc-800/80 bg-zinc-900 flex justify-between items-center shrink-0">
               <div className="flex items-center gap-2 font-semibold text-zinc-200">
                 <GraduationCap className="w-4 h-4 text-indigo-500" />
                 AI Tutor Chat
               </div>
            </div>
            
            <div className="bg-zinc-950 border-b border-zinc-800 p-2 flex justify-center shrink-0">
               <div className="bg-zinc-900 rounded-lg p-1 flex items-center w-full max-w-xs border border-zinc-800 text-xs font-medium relative">
                  <div 
                    className={`absolute left-1 top-1 bottom-1 w-[calc(50%-4px)] bg-zinc-800 rounded shadow-sm transition-transform duration-300 ${tutorMode === 'direct' ? 'translate-x-full' : ''}`}
                  />
                  <button 
                    onClick={() => setTutorMode('socratic')}
                    className={`flex-1 py-1.5 rounded transition-colors z-10 ${tutorMode === 'socratic' ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >Socratic Mode</button>
                  <button 
                    onClick={() => setTutorMode('direct')}
                    className={`flex-1 py-1.5 rounded transition-colors z-10 ${tutorMode === 'direct' ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >Direct Answers</button>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 min-h-0 break-words">
              {tutorMessages.map((msg, i) => (
                 msg.role === 'user' ? (
                   <div key={i} className="flex justify-end animate-in slide-in-from-bottom-2 duration-300">
                      <div className="bg-zinc-800 text-sm text-zinc-200 px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-[85%] border border-zinc-700/50">
                         {msg.content}
                      </div>
                   </div>
                 ) : (
                   <div key={i} className="flex justify-start animate-in slide-in-from-bottom-2 duration-300">
                      <div className="flex gap-3 max-w-[90%]">
                         <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-1">
                            <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                         </div>
                         <div className="bg-zinc-950 border border-zinc-800 text-sm text-zinc-300 px-4 py-3 rounded-2xl rounded-tl-sm leading-relaxed shadow-sm whitespace-pre-wrap">
                            {msg.content}
                         </div>
                      </div>
                   </div>
                 )
              ))}
              <div ref={chatEndRef} />
              
              {isTyping && (
                 <div className="flex justify-start">
                    <div className="flex gap-3">
                       <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-1">
                          <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                       </div>
                       <div className="bg-zinc-950 border border-zinc-800 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1">
                          <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                          <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                          <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"></div>
                       </div>
                    </div>
                 </div>
              )}
            </div>

            <form onSubmit={handleTutorSubmit} className="p-4 bg-zinc-950/80 border-t border-zinc-800 shrink-0">
               <div className="relative">
                  <input 
                    ref={tutorInputRef}
                    type="text" 
                    value={tutorInput}
                    onChange={(e) => setTutorInput(e.target.value)}
                    placeholder="Ask a question..." 
                    disabled={isTyping}
                    className="w-full bg-zinc-900 border border-zinc-700/50 rounded-xl py-3 pl-4 pr-12 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500/50 shadow-inner disabled:opacity-50"
                  />
                  <button 
                    type="submit"
                    disabled={isTyping || !tutorInput.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                     <Send className="w-3.5 h-3.5" />
                  </button>
               </div>
            </form>
          </section>

          {/* COLUMN 3: Notes Saver */}
          <section className="bg-zinc-900/60 border border-zinc-800/50 rounded-2xl flex flex-col h-full min-h-0 lg:grow overflow-hidden shadow-lg hover:border-zinc-700/50 transition-colors">
            <div className="p-4 border-b border-zinc-800/80 bg-zinc-900 flex justify-between items-center shrink-0">
               <div className="flex items-center gap-2 font-semibold text-zinc-200">
                 <StickyNote className="w-4 h-4 text-emerald-500" />
                 Notes Saver
               </div>
                <button
                  onClick={handleGenerateFlashcards}
                  disabled={!selectedNote || isGeneratingFlashcards}
                  className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded flex items-center gap-1 transition-all ${
                    selectedNote
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 active:scale-95'
                      : 'bg-zinc-800 text-zinc-600 border border-zinc-700/50 opacity-50 cursor-not-allowed'
                  }`}
                >
                  {isGeneratingFlashcards ? <Loader2 className="w-3 h-3 animate-spin text-emerald-400" /> : <Sparkles className="w-3 h-3" />}
                  {isGeneratingFlashcards ? 'Generating...' : 'Flashcards'}
                </button>
            </div>

            <div className="flex flex-1 overflow-hidden min-h-0">
               <div className="w-2/5 border-r border-zinc-800/80 bg-zinc-950/50 flex flex-col min-h-0">
                 <div className="p-3 border-b border-zinc-800/50 bg-zinc-900 shrink-0">
                    <button
                      onClick={(e) => handleMakeNote(e, true)}
                      disabled={isMakingNote}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 rounded-lg py-2 flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors shadow-sm"
                    >
                       {isMakingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Plus className="w-3.5 h-3.5"/>} New Note
                    </button>
                 </div>
                 <div className="p-2 space-y-1 overflow-y-auto flex-1">
                   {!notes && <div className="p-4 text-center text-zinc-500 text-xs"><Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />Loading...</div>}
                   {notes && notes.length === 0 && <div className="p-4 text-center text-zinc-500 text-xs">No notes.</div>}
                   {notes && Array.isArray(notes) && notes.map((note: any) => (
                     <button 
                       key={note.id}
                       onClick={() => setSelectedNote(note)}
                       className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors border shadow-sm ${selectedNote?.id === note.id ? 'bg-zinc-800/80 border-zinc-700 text-emerald-400 font-semibold' : 'bg-transparent border-transparent hover:bg-zinc-800/30 text-zinc-500 font-medium'}`}
                     >
                        <div className="truncate">{note.title}</div>
                        <div className="text-[10px] text-zinc-600 mt-1">{new Date(note.createdAt).toLocaleDateString()}</div>
                     </button>
                   ))}
                 </div>
               </div>

               <div className="w-3/5 overflow-y-auto p-4 flex flex-col justify-between min-h-0">
                  {selectedNote ? (
                    <>
                      <div className="flex flex-col h-full min-h-0">
                         <h2 className="text-sm font-bold text-zinc-100 mb-2 shrink-0">{selectedNote.title}</h2>
                         <div className="flex-1 overflow-y-auto text-xs text-zinc-400 leading-relaxed font-mono space-y-2 whitespace-pre-wrap break-words pr-2">
                           {selectedNote.content}
                         </div>
                      </div>
                      {selectedNote.tags && (
                        <div className="mt-4 pt-4 border-t border-zinc-800/80 flex flex-wrap gap-2 shrink-0">
                          {selectedNote.tags.split(',').map((tag: string, i: number) => (
                             <span key={i} className="text-[10px] font-semibold text-zinc-400 bg-zinc-800 px-2 py-1 rounded-md flex items-center gap-1 border border-zinc-700/50">
                               <Tag className="w-2.5 h-2.5" /> {tag.trim()}
                             </span>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm font-medium">
                      Select a note.
                    </div>
                  )}
               </div>
            </div>
          </section>
        </div>
      </div>

      {/* Flashcard Modal */}
      <AnimatePresence>
        {showFlashcardModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-zinc-950/90 backdrop-blur-md"
          >
            <div className="w-full max-w-2xl relative">
              <button 
                onClick={() => setShowFlashcardModal(false)}
                className="absolute -top-12 right-0 p-2 text-zinc-400 hover:text-zinc-100 bg-zinc-900/50 rounded-xl border border-zinc-800 transition-all hover:scale-110"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-zinc-100">Study Flashcards</h2>
                  <p className="text-xs text-zinc-500">Master your notes with AI-generated drills.</p>
                </div>
                <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                  {currentCardIndex + 1} / {flashcards.length}
                </div>
              </div>

              <div className="perspective-1000 h-[380px] w-full relative group cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
                <motion.div 
                  initial={false}
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                  style={{ transformStyle: 'preserve-3d' }}
                  className="w-full h-full relative"
                >
                  {/* Front */}
                  <div className={`absolute inset-0 w-full h-full bg-zinc-900/60 border-2 ${isFlipped ? 'border-transparent' : 'border-emerald-500/30'} rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center backdrop-blur-2xl shadow-2xl backface-hidden transition-all duration-500`}>
                     <div className="absolute top-6 left-6 p-2 bg-emerald-500/10 rounded-xl">
                        <Star className="w-4 h-4 text-emerald-400" />
                     </div>
                     <h3 className="text-2xl font-bold text-zinc-50 leading-tight">
                        {flashcards[currentCardIndex]?.front}
                     </h3>
                     <div className="absolute bottom-10 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 group-hover:text-emerald-400 transition-colors">
                        <RotateCw className="w-3.5 h-3.5" /> Tap to flip
                     </div>
                  </div>

                  {/* Back */}
                  <div 
                    className={`absolute inset-0 w-full h-full bg-zinc-950 border-2 ${isFlipped ? 'border-emerald-500/30' : 'border-transparent'} rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center backdrop-blur-2xl shadow-2xl backface-hidden transition-all duration-500`}
                    style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}
                  >
                     <p className="text-zinc-300 text-lg leading-relaxed italic">
                        {flashcards[currentCardIndex]?.back}
                     </p>
                     <div className="absolute bottom-10 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
                        <RotateCw className="w-3.5 h-3.5" /> Tap to unflip
                     </div>
                  </div>
                </motion.div>
              </div>

              <div className="mt-10 flex items-center justify-between gap-4">
                <button 
                  onClick={(e) => { e.stopPropagation(); if(currentCardIndex > 0) { setCurrentCardIndex(currentCardIndex-1); setIsFlipped(false); } }}
                  disabled={currentCardIndex === 0}
                  className="flex-1 py-4 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed border border-zinc-800 text-zinc-100 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all active:scale-95"
                >
                   <ChevronLeft className="w-5 h-5" /> Previous
                </button>
                <button 
                   onClick={(e) => { e.stopPropagation(); if(currentCardIndex < flashcards.length - 1) { setCurrentCardIndex(currentCardIndex+1); setIsFlipped(false); } }}
                   disabled={currentCardIndex === flashcards.length - 1}
                   className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-2xl flex items-center justify-center gap-2 font-bold transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                >
                   Next <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
