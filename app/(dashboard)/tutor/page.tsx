"use client";

import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { GraduationCap, Star, Send, Loader2, Clock, Plus, BookOpen } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function TutorView() {
  const { data: history, mutate } = useSWR('/api/tutor', fetcher);

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
    <div className="flex flex-col h-[calc(100vh-6rem)] animate-in fade-in duration-500 font-sans p-6 lg:p-8">
      <div className="max-w-[1400px] mx-auto w-full flex flex-col h-full">
        <header className="flex items-center justify-between shrink-0 mb-6 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 shadow-sm backdrop-blur-md">
           <div>
              <h1 className="text-xl font-bold text-zinc-50 flex items-center gap-2">AI Tutor Chat</h1>
              <p className="text-sm text-zinc-400 font-medium">Your dedicated mentor for mastering topics and interview prep.</p>
           </div>
        </header>

        <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
           {/* History Sidebar (Left) */}
           <aside className="lg:w-[320px] shrink-0 border border-zinc-800/50 bg-zinc-950/50 flex flex-col overflow-hidden shadow-lg transition-all duration-300 rounded-2xl">
              <div className="p-4 border-b border-zinc-800/80 bg-zinc-900 flex justify-between items-center shrink-0">
                 <div className="flex items-center gap-2 font-semibold text-zinc-50/80">
                   <Clock className="w-4 h-4 text-zinc-400" /> Past Sessions
                 </div>
                 <button onClick={startNewConversation} className="bg-indigo-500 hover:bg-indigo-500/80 text-white rounded p-1.5 transition-colors">
                   <Plus className="w-4 h-4" />
                 </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                 {!history && <div className="p-4 text-center text-zinc-400 text-xs flex justify-center"><Loader2 className="w-4 h-4 animate-spin" /></div>}
                 {history && history.length === 0 && <div className="p-4 text-center text-zinc-400 text-xs">No conversations yet.</div>}
                 {history && Array.isArray(history) && history.map((item: any) => (
                    <button 
                       key={item.id}
                       onClick={() => loadConversation(item)}
                       className={`w-full text-left px-3 py-3 rounded-xl transition-all border ${activeConversationId === item.id ? 'bg-zinc-900 border-indigo-500/30 shadow-md text-indigo-400' : 'bg-transparent border-transparent hover:bg-zinc-900/40 text-zinc-50/80'}`}
                    >
                       <div className="text-sm font-semibold truncate">{item.topic}</div>
                       <div className="text-[10px] text-zinc-400 mt-1 flex justify-between items-center">
                          <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                       </div>
                    </button>
                 ))}
              </div>
           </aside>

           {/* Main Content */}
           <div className="flex-1 bg-zinc-900/60 border border-zinc-800/50 rounded-2xl flex flex-col overflow-hidden shadow-lg relative">
            {/* Toggle Banner */}
            <div className="bg-zinc-950/80 border-b border-zinc-800 p-2 flex justify-center shrink-0">
               <div className="bg-zinc-900 rounded-lg p-1 flex items-center w-full max-w-xs border border-zinc-800 text-xs font-medium relative">
                  <div 
                    className={`absolute left-1 top-1 bottom-1 w-[calc(50%-4px)] bg-zinc-950 rounded shadow-sm transition-transform duration-300 ${tutorMode === 'direct' ? 'translate-x-full' : ''}`}
                  />
                  <button 
                    onClick={() => setTutorMode('socratic')}
                    className={`flex-1 py-1.5 rounded transition-colors z-10 ${tutorMode === 'socratic' ? 'text-zinc-50' : 'text-zinc-400 hover:text-zinc-50'}`}
                  >Socratic Mode</button>
                  <button 
                    onClick={() => setTutorMode('direct')}
                    className={`flex-1 py-1.5 rounded transition-colors z-10 ${tutorMode === 'direct' ? 'text-zinc-50' : 'text-zinc-400 hover:text-zinc-50'}`}
                  >Direct Answers</button>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {tutorMessages.map((msg: any, i: number) => (
                 msg.role === 'user' ? (
                   <div key={i} className="flex justify-end animate-in slide-in-from-bottom-2 duration-300">
                      <div className="bg-zinc-800 text-sm text-zinc-200 px-4 py-3 rounded-2xl rounded-tr-sm max-w-[90%] border border-zinc-700/50">
                         {msg.content}
                      </div>
                   </div>
                 ) : (
                   <div key={i} className="flex justify-start animate-in slide-in-from-bottom-2 duration-300">
                      <div className="flex gap-4 max-w-full">
                         <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-1">
                            <GraduationCap className="w-4 h-4 text-indigo-400" />
                         </div>
                         <div className="bg-zinc-950 border border-zinc-800 text-sm text-zinc-300 px-5 py-4 rounded-2xl rounded-tl-sm leading-relaxed shadow-sm whitespace-pre-wrap">
                            {msg.content}
                            
                            {i === 0 && !activeConversationId && (
                               <div className="flex flex-wrap gap-2 mt-4">
                                  <button onClick={() => handleTutorSubmit(undefined, "Explain Event Loop in JavaScript")} className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-indigo-500/50 rounded-lg text-xs font-medium text-zinc-400 hover:text-indigo-300 transition-colors">
                                    <BookOpen className="h-3.5 w-3.5" /> Explain Event Loop
                                  </button>
                                  <button onClick={() => handleTutorSubmit(undefined, "Let's do a mock System Design Interview")} className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-indigo-500/50 rounded-lg text-xs font-medium text-zinc-400 hover:text-indigo-300 transition-colors">
                                    <Star className="h-3.5 w-3.5" /> Mock System Design
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
                       <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-1">
                          <GraduationCap className="w-4 h-4 text-indigo-400" />
                       </div>
                       <div className="bg-zinc-950 border border-zinc-800 px-5 py-4 rounded-2xl rounded-tl-sm flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                          <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                          <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"></div>
                       </div>
                    </div>
                 </div>
              )}
            </div>

            <form onSubmit={handleTutorSubmit} className="p-4 bg-zinc-950 border-t border-zinc-800 shrink-0">
               <div className="relative w-full">
                  <input 
                    type="text" 
                    value={tutorInput}
                    onChange={(e) => setTutorInput(e.target.value)}
                    placeholder="Ask a question..." 
                    disabled={isTyping}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-4 pl-4 pr-14 text-sm text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-500/50 shadow-inner disabled:opacity-50"
                  />
                  <button 
                    type="submit"
                    disabled={isTyping || !tutorInput.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-500 hover:bg-indigo-500/80 text-white p-2.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
                  >
                     <Send className="w-4 h-4" />
                  </button>
               </div>
            </form>
         </div>
        </div>
      </div>
    </div>
  );
}
