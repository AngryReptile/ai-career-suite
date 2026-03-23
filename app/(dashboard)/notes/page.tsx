"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { StickyNote, Plus, Search, Trash2, Tag, Loader2, CheckCircle2, Edit3, Save, Clock, BookOpen, AlertCircle, Sparkles, X, RotateCw, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { RichTextEditor } from "@/components/RichTextEditor";
import { motion, AnimatePresence } from 'framer-motion';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function NotesSaverView() {
  const { data: notes, mutate } = useSWR('/api/notes', fetcher);
  
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [isMakingNote, setIsMakingNote] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedContent, setEditedContent] = useState("");
  const [isProcessingBridge, setIsProcessingBridge] = useState(false);

  // State for Flashcards
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);
  const [showFlashcardModal, setShowFlashcardModal] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState("");

  const handleAISearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!searchQuery.trim() || isSearching) return;
    setIsSearching(true);
    setSearchResult("");
    try {
      const res = await fetch('/api/notes/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery })
      });
      const data = await res.json();
      if (res.ok && data.answer) {
        setSearchResult(data.answer);
      } else {
        setSearchResult("Error: " + (data.error || "Failed to search notes."));
      }
    } catch (err) {
      setSearchResult("Error: Could not connect to search API.");
    } finally {
      setIsSearching(false);
    }
  };

  // Handle cross-page note injection
  useEffect(() => {
    const pendingNote = sessionStorage.getItem('pending_note_context');
    if (pendingNote) {
      const handleBridgeNote = async () => {
        setIsProcessingBridge(true);
        try {
          const { summary, title } = JSON.parse(pendingNote);
          
          // Call API to create the note
          const res = await fetch('/api/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ summaryData: [{ title: title || "AI Note", description: summary }] })
          });
          const data = await res.json();
          
          if (data && !data.error) {
            // Success! 
            await mutate();
            
            if (data.id) {
               setSelectedNote(data);
               setEditedTitle(data.title);
               setEditedContent(data.content);
            }
          }
          
          // Clear the context
          sessionStorage.removeItem('pending_note_context');
        } catch (e) {
          console.error("Failed to process bridge note", e);
        } finally {
          setIsProcessingBridge(false);
        }
      };
      
      handleBridgeNote();
    }
  }, [mutate]);

  const handleMakeNote = async () => {
    setIsMakingNote(true);
    try {
      const payload = { 
        title: "Untitled Note", 
        content: "" 
      };
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if(data) {
        setSelectedNote(data);
        setEditedTitle(data.title);
        setEditedContent("");
        setIsEditing(true);
      }
      await mutate();
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsMakingNote(false);
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

  const flipStyles = `
    .perspective-1000 {
      perspective: 1000px;
    }
    .backface-hidden {
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
    }
  `;

  const handleSaveChanges = async () => {
    if (!selectedNote) return; 
    setIsSaving(true);
    
    // Auto-generate title if missing
    let finalTitle = editedTitle.trim();
    if (!finalTitle && editedContent) { 
      finalTitle = editedContent.split('\n')[0].substring(0, 30) || "Untitled Note";
    }

    try {
      const res = await fetch('/api/notes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
           id: selectedNote.id, 
           title: finalTitle || "Untitled Note",
           content: editedContent, 
           tags: selectedNote.tags 
        })
      });
      if (res.ok) {
        const updated = await res.json(); 
        setSelectedNote(updated); 
        await mutate();
        setIsEditing(false);
      }
    } catch (err) {
      console.error("Save failed:", err); 
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
    <style>{flipStyles}</style>
    <DashboardShell
      header={
         <div>
            <h1 className="text-xl font-bold text-zinc-50 flex items-center gap-2">Notes Saver</h1>
            <p className="text-sm text-zinc-400 font-medium">Capture and organize your AI-generated technical notes seamlessly.</p>
         </div>
      }
       sidebar={
         <div className="flex flex-col h-full bg-black/40 border-r border-white/[0.04]">
            <div className="h-16 px-6 border-b border-white/[0.04] flex justify-between items-center shrink-0">
               <div className="flex items-center gap-2 font-black tracking-widest text-[10px] uppercase text-zinc-500">
                 <Clock className="w-4 h-4" /> Saved Notes
               </div>
               <button 
                 onClick={handleMakeNote}
                 disabled={isMakingNote}
                 className="bg-zinc-50 hover:bg-zinc-200 text-zinc-950 rounded-lg p-2 transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] active:scale-95 disabled:opacity-50"
               >
                 {isMakingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
               </button>
             </div>
            <div className="px-5 py-4 border-b border-white/[0.04] shrink-0">
               <form onSubmit={handleAISearch} className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-hover:text-indigo-400 transition-colors" />
                  <input
                     type="text"
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     placeholder="AI Semantic Search..."
                     className="w-full bg-white/[0.02] border border-white/[0.04] rounded-xl py-2.5 pl-10 pr-3 text-sm text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-all shadow-inner"
                  />
                  {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 animate-spin" />}
               </form>
               <AnimatePresence>
                 {searchResult && (
                    <motion.div 
                       initial={{ opacity: 0, height: 0 }}
                       animate={{ opacity: 1, height: 'auto' }}
                       exit={{ opacity: 0, height: 0 }}
                       className="mt-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3 text-xs text-indigo-100 leading-relaxed overflow-hidden relative"
                    >
                       <button onClick={() => setSearchResult('')} className="absolute top-1 right-1 p-1 text-indigo-400/50 hover:text-indigo-400"><X className="w-3 h-3" /></button>
                       <strong className="text-indigo-400 block mb-1">AI Answer:</strong>
                       {searchResult}
                    </motion.div>
                 )}
               </AnimatePresence>
             </div>
             <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
               {!notes && <div className="p-4 text-center text-zinc-400 text-xs flex justify-center"><Loader2 className="w-4 h-4 animate-spin" /></div>}
               {notes && notes.length === 0 && <div className="p-4 text-center text-zinc-500 font-medium text-xs">No notes generated yet.</div>}
               {notes && Array.isArray(notes) && notes.map((note: any, idx: number) => (
                  <motion.button 
                     initial={{ opacity: 0, x: -10 }}
                     animate={{ opacity: 1, x: 0 }}
                     transition={{ delay: idx * 0.05 }}
                     key={note.id}
                     onClick={() => {
                        setSelectedNote(note);
                        setEditedTitle(note.title);
                        setEditedContent(note.content);
                        setIsEditing(false);
                     }}
                     className={`w-full text-left px-4 py-3.5 rounded-2xl transition-all border ${selectedNote?.id === note.id ? 'bg-white/[0.06] border-white/[0.04] shadow-sm text-zinc-50 font-bold' : 'bg-transparent border-transparent hover:bg-white/[0.02] text-zinc-500 hover:text-zinc-300'}`}
                  >
                     <div className="text-sm tracking-tight truncate">{note.title}</div>
                     <div className="text-[10px] tracking-wide mt-1 flex justify-between items-center opacity-70">
                        <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                     </div>
                  </motion.button>
               ))}
             </div>
         </div>
      }
    >
        <div className="flex-1 flex flex-col overflow-hidden p-6 relative">
            {isProcessingBridge && (
               <div className="absolute inset-0 z-50 bg-zinc-950/60 backdrop-blur-sm flex flex-col items-center justify-center text-center p-8">
                  <div className="relative">
                    <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
                    <div className="absolute inset-0 blur-xl bg-emerald-500/20 animate-pulse"></div>
                  </div>
                  <h3 className="text-xl font-bold text-emerald-400">Processing Knowledge...</h3>
                  <p className="text-sm text-zinc-500 mt-2 max-w-xs">Generating your technical note from the transferred video context.</p>
               </div>
            )}
            {selectedNote ? (
               <div className="flex-1 flex flex-col overflow-hidden">
                 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                   {isEditing ? (
                     <input 
                       value={editedTitle}
                       onChange={(e) => setEditedTitle(e.target.value)}
                       className="bg-white/[0.02] border border-white/[0.04] rounded-xl px-4 py-2 sm:py-2.5 text-xl font-black tracking-tight text-zinc-50 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.04] transition-all flex-1 w-full sm:mr-4 shadow-inner"
                       placeholder="Note Title..."
                     />
                   ) : (
                     <h2 className="text-3xl font-black tracking-tight text-zinc-50 break-words flex-1">{selectedNote.title}</h2>
                   )}
                   <div className="flex flex-row gap-3 shrink-0 items-center w-full sm:w-auto justify-start sm:justify-end">
                     {!isEditing && (
                       <button
                         onClick={handleGenerateFlashcards}
                         disabled={isGeneratingFlashcards}
                         className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all shadow-sm ${
                           selectedNote
                             ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 active:scale-95'
                             : 'bg-zinc-800 text-zinc-600 border border-zinc-700/50 opacity-50 cursor-not-allowed'
                         }`}
                       >
                         {isGeneratingFlashcards ? <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" /> : <Sparkles className="w-3.5 h-3.5" />}
                         {isGeneratingFlashcards ? 'Generating...' : 'Flashcards'}
                       </button>
                     )}
                     {isEditing ? (
                       <button 
                         onClick={handleSaveChanges}
                         disabled={isSaving}
                         className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-xs font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-95 disabled:opacity-50"
                       >
                         {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                         Save Profile
                       </button>
                     ) : (
                       <button 
                         onClick={() => setIsEditing(true)}
                         className="px-4 py-1.5 bg-zinc-900 hover:bg-indigo-500/10 text-zinc-400 hover:text-zinc-50 text-xs font-bold rounded-lg transition-all border border-zinc-800"
                       >
                         Edit Note
                       </button>
                     )}
                   </div>
                 </div>

                 <div className="flex-1 overflow-y-auto">
                    {isEditing ? (
                       <RichTextEditor 
                         content={editedContent}
                         onChange={setEditedContent}
                       />
                    ) : (
                        <div 
                          className="prose prose-invert prose-indigo max-w-none text-sm text-zinc-300 leading-relaxed font-sans space-y-4 bg-white/[0.01] p-6 sm:p-10 rounded-[2rem] border border-white/[0.04] shadow-inner min-h-[400px]"
                          dangerouslySetInnerHTML={{ 
                            __html: selectedNote.content?.includes('<') && selectedNote.content?.includes('>') 
                              ? selectedNote.content 
                              : selectedNote.content?.replace(/\n/g, '<br/>') || ''
                          }}
                        />
                     )}
                    
                    {selectedNote.tags && (
                       <div className="mt-8 flex flex-wrap gap-2">
                         {selectedNote.tags.split(',').map((tag: string, i: number) => (
                            <span key={i} className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg flex items-center gap-1 border border-emerald-500/20">
                              <Tag className="w-3 h-3" /> {tag.trim()}
                            </span>
                         ))}
                       </div>
                    )}
                 </div>
               </div>
            ) : (
               <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-sm">
                  <StickyNote className="w-16 h-16 text-white/[0.05] mb-6 inline-block shrink-0 drop-shadow-lg" />
                  <p className="font-extrabold tracking-tight text-lg text-zinc-400">Your knowledge hub is empty.</p>
                  <p className="text-zinc-600 mt-2 max-w-[250px] text-center font-medium leading-relaxed">Select a note from the sidebar or manually create a new unlinked note.</p>
               </div>
            )}
          </div>
    </DashboardShell>

      {/* Flashcard Modal */}
      <AnimatePresence>
        {showFlashcardModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-zinc-950/90 backdrop-blur-md"
          >
            <div className="w-full relative">
              <button 
                onClick={() => setShowFlashcardModal(false)}
                className="absolute -top-12 right-0 p-2 text-zinc-400 hover:text-zinc-100 bg-zinc-900/50 rounded-xl border border-zinc-800 transition-all hover:scale-110"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-white focus:outline-none">Study Flashcards</h2>
                  <p className="text-xs font-semibold text-zinc-500 mt-1">Master your notes with AI-generated drills.</p>
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
                  <div className={`absolute inset-0 w-full h-full bg-zinc-950/80 border-2 ${!isFlipped ? 'border-transparent' : 'border-indigo-500/40'} rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center backdrop-blur-3xl shadow-2xl backface-hidden transition-all duration-500`} style={{ transform: 'rotateY(180deg)' }}>
                     <div className="absolute top-6 left-6 p-2 bg-indigo-500/10 rounded-xl">
                        <BookOpen className="w-4 h-4 text-indigo-400" />
                     </div>
                     <p className="text-lg text-zinc-200 leading-relaxed max-w-[90%]">
                        {flashcards[currentCardIndex]?.back}
                     </p>
                     <div className="absolute bottom-10 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">
                        Knowledge Mastery
                     </div>
                  </div>
                </motion.div>
              </div>

              <div className="mt-8 flex items-center justify-center gap-6">
                 <button 
                   disabled={currentCardIndex === 0}
                   onClick={(e) => {
                     e.stopPropagation();
                     setCurrentCardIndex(prev => prev - 1);
                     setIsFlipped(false);
                   }}
                   className="w-14 h-14 rounded-full bg-zinc-900/50 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-600 transition-all disabled:opacity-20 disabled:cursor-not-allowed group"
                 >
                   <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
                 </button>
                 
                 <div className="h-1.5 w-32 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div 
                       initial={{ width: 0 }}
                       animate={{ width: `${((currentCardIndex + 1) / flashcards.length) * 100}%` }}
                       className="h-full bg-gradient-to-r from-emerald-500 to-indigo-500"
                    />
                 </div>

                 <button 
                   disabled={currentCardIndex === flashcards.length - 1}
                   onClick={(e) => {
                     e.stopPropagation();
                     setCurrentCardIndex(prev => prev + 1);
                     setIsFlipped(false);
                   }}
                   className="w-14 h-14 rounded-full bg-zinc-900/50 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-600 transition-all disabled:opacity-20 disabled:cursor-not-allowed group"
                 >
                   <ChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
                 </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
