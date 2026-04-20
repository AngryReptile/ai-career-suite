"use client";

import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { GraduationCap, Star, Send, Loader2, Clock, Plus, BookOpen } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";

const fetcher = (url: string) => fetch(url).then((res) => { if (!res.ok) throw new Error('API Error'); return res.json(); });

export default function TutorView() {
  const { data: history, mutate } = useSWR('/api/tutor', fetcher, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60000
  });

  const [tutorMode, setTutorMode] = useState<'socratic' | 'direct'>('socratic');
  const [tutorInput, setTutorInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  
  const [tutorMessages, setTutorMessages] = useState([
    { role: 'assistant', content: "Hello! I am your AI Tutor. What would you like to learn today?" }
  ]);

  // Chat Scroll Reference
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll effect
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [tutorMessages]);

  // Handle cross-page context injection
  useEffect(() => {
    const pendingContext = sessionStorage.getItem('pending_video_context');
    if (pendingContext) {
      try {
        const { summary, url } = JSON.parse(pendingContext);
        
        // Prepare the context injection
        const contextMessage = { 
          role: 'user', 
          content: `I've just summarized a video (${url}). Here is the context summary to help you teach me about it:\n\n${summary}` 
        };
        
        const assistantAcknowledgment = {
          role: 'assistant',
          content: "I've processed the video context! I'm ready to help you explore the key concepts, technical details, or any specific questions you have about this video. What should we start with?"
        };

        // Inject into current session
        setTutorMessages(prev => [
          ...prev, 
          contextMessage,
          assistantAcknowledgment
        ]);

        // Clear the context so it doesn't re-inject on refresh
        sessionStorage.removeItem('pending_video_context');
      } catch (e) {
        console.error("Failed to parse pending video context", e);
      }
    }
  }, []);

  const loadConversation = (conv: any) => {
    setActiveConversationId(conv.id);
    try {
      setTutorMessages(JSON.parse(conv.messages));
    } catch (e) {
      console.error("Failed to parse DB conversation");
    }
  };

  const startNewConversation = () => {
    setActiveConversationId(null);
    setTutorMessages([{ role: 'assistant', content: "Hello! I am your AI Tutor. What would you like to learn today?" }]);
  };

  const handleTutorSubmit = async (e?: React.FormEvent, directInput?: string) => {
    e?.preventDefault();
    const input = directInput || tutorInput;
    if (!input.trim() || isTyping) return;
    
    const newMessages = [...tutorMessages, { role: 'user', content: input }];
    setTutorMessages(newMessages);
    if(!directInput) setTutorInput("");
    setIsTyping(true);
    
    try {
      const res = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
           messages: newMessages, 
           mode: tutorMode,
           conversationId: activeConversationId
        })
      });
      const data = await res.json();
      if (data.reply) {
         setTutorMessages([...newMessages, { role: 'assistant', content: data.reply }]);
         if (data.conversationId && data.conversationId !== activeConversationId) {
             setActiveConversationId(data.conversationId);
         }
         await mutate(); // Refresh sidebar history
      }
    } catch (err) {
       console.error(err);
       setTutorMessages([...newMessages, { role: 'assistant', content: "Sorry, the tutor is currently disconnected. Did you restart the dev server?" }]);
    } finally {
       setIsTyping(false);
    }
  };

  return (
    <DashboardShell
      header={
         <div>
            <h1 className="text-xl font-bold text-zinc-50 flex items-center gap-2">AI Tutor Chat</h1>
            <p className="text-sm text-zinc-400 font-medium">Your dedicated mentor for mastering topics and interview prep.</p>
         </div>
      }
      sidebar={
         <div className="flex flex-col h-full md:border-r border-white/5">
            <div className="h-16 px-6 border-b border-white/10 flex justify-between items-center shrink-0">
               <div className="flex items-center gap-2 font-bold tracking-wide text-xs uppercase text-zinc-400">
                 <Clock className="w-4 h-4" /> Past Sessions
               </div>
               <button onClick={startNewConversation} className="bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-lg p-1.5 transition-all shadow-sm active:scale-95">
                 <Plus className="w-4 h-4" />
               </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
               {!history && <div className="p-4 text-center text-zinc-400 text-xs flex justify-center"><Loader2 className="w-4 h-4 animate-spin" /></div>}
               {history && history.length === 0 && <div className="p-4 text-center text-zinc-400 text-xs">No conversations yet.</div>}
               {history && Array.isArray(history) && history.map((item: any) => (
                  <button 
                     key={item.id}
                     onClick={() => loadConversation(item)}
                     className={`w-full text-left px-4 py-3.5 rounded-xl transition-all border ${activeConversationId === item.id ? 'bg-white/10 border-white/10 shadow-sm text-white font-semibold' : 'bg-transparent border-transparent hover:bg-white/5 text-zinc-400 hover:text-white'}`}
                  >
                     <div className="text-sm font-sans truncate">{item.topic}</div>
                     <div className="text-[10px] tracking-wide mt-1 flex justify-between items-center opacity-70">
                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                     </div>
                  </button>
               ))}
            </div>
         </div>
      }
    >
            {/* Toggle Banner */}
            <div className="bg-white/5 border-b border-white/10 p-3 flex justify-center shrink-0 backdrop-blur-md">
               <div className="bg-black/20 rounded-xl p-1 flex items-center w-full max-w-xs border border-white/5 text-xs font-semibold relative shadow-inner">
                  <div 
                    className={`absolute left-1 top-1 bottom-1 w-[calc(50%-4px)] bg-white/10 rounded-lg shadow-sm border border-white/10 transition-transform duration-300 ${tutorMode === 'direct' ? 'translate-x-[calc(100%+2px)]' : ''}`}
                  />
                  <button 
                    onClick={() => setTutorMode('socratic')}
                    className={`flex-1 py-1.5 rounded-lg transition-colors z-10 ${tutorMode === 'socratic' ? 'text-white' : 'text-zinc-400 hover:text-white'}`}
                  >Socratic Mode</button>
                  <button 
                    onClick={() => setTutorMode('direct')}
                    className={`flex-1 py-1.5 rounded-lg transition-colors z-10 ${tutorMode === 'direct' ? 'text-white' : 'text-zinc-400 hover:text-white'}`}
                  >Direct Answers</button>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {tutorMessages.map((msg: any, i: number) => (
                 msg.role === 'user' ? (
                   <div key={i} className="flex justify-end animate-in slide-in-from-bottom-2 duration-300">
                      <div className="bg-white/10 text-sm text-white px-5 py-3.5 rounded-3xl rounded-tr-sm max-w-[85%] border border-white/20 shadow-lg backdrop-blur-md font-sans">
                         {msg.content}
                      </div>
                   </div>
                 ) : (
                   <div key={i} className="flex justify-start animate-in slide-in-from-bottom-2 duration-300">
                      <div className="flex gap-4 max-w-full">
                         <div className="w-8 h-8 rounded-full bg-white/20 border border-white/30 flex items-center justify-center shrink-0 mt-2 shadow-inner">
                            <GraduationCap className="w-4 h-4 text-white" />
                         </div>
                         <div className="bg-white/5 backdrop-blur-[20px] backdrop-saturate-150 border border-white/20 text-sm text-zinc-300 px-6 py-5 rounded-[2rem] rounded-tl-sm leading-relaxed shadow-xl whitespace-pre-wrap font-sans">
                            {msg.content}
                            
                            {i === 0 && !activeConversationId && (
                               <div className="flex flex-wrap gap-3 mt-6">
                                  <button onClick={() => handleTutorSubmit(undefined, "Explain Event Loop in JavaScript")} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white transition-all shadow-sm active:scale-95">
                                    <BookOpen className="h-4 w-4" /> Explain Event Loop
                                  </button>
                                  <button onClick={() => handleTutorSubmit(undefined, "Let's do a mock System Design Interview")} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white transition-all shadow-sm active:scale-95">
                                    <Star className="h-4 w-4" /> Mock System Design
                                  </button>
                               </div>
                            )}
                         </div>
                      </div>
                   </div>
                 )
              ))}
              <div ref={chatEndRef} />
              
              {isTyping && (
                 <div className="flex justify-start">
                    <div className="flex gap-4">
                       <div className="w-8 h-8 rounded-full bg-white/20 border border-white/30 flex items-center justify-center shrink-0 mt-2 shadow-inner">
                          <GraduationCap className="w-4 h-4 text-white" />
                       </div>
                       <div className="bg-white/5 backdrop-blur-[20px] backdrop-saturate-150 border border-white/20 px-5 py-5 rounded-[2rem] rounded-tl-sm flex items-center gap-2 shadow-xl">
                          <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                          <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                          <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce"></div>
                       </div>
                    </div>
                 </div>
              )}
            </div>

            <form onSubmit={handleTutorSubmit} className="p-4 md:p-6 bg-white/5 border-t border-white/10 shrink-0 backdrop-blur-md">
               <div className="relative w-full max-w-4xl mx-auto">
                  <input 
                    type="text" 
                    value={tutorInput}
                    onChange={(e) => setTutorInput(e.target.value)}
                    placeholder="Ask a question..." 
                    disabled={isTyping}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-6 pr-16 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/30 focus:bg-white/10 shadow-inner disabled:opacity-50 transition-all font-sans"
                  />
                  <button 
                    type="submit"
                    disabled={isTyping || !tutorInput.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white text-black hover:bg-zinc-200 p-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-lg active:scale-95"
                  >
                     <Send className="w-4 h-4" />
                  </button>
               </div>
            </form>
    </DashboardShell>
  );
}
