"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { StickyNote, Plus, Search, Trash2, Tag, Loader2, CheckCircle2, Edit3, Save, Clock, BookOpen, AlertCircle, Sparkles, X, RotateCw, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { RichTextEditor } from "@/components/RichTextEditor";
import { motion, AnimatePresence } from 'framer-motion';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function NotesSaverView() {
  const { data: notes, mutate } = useSWR('/api/notes', fetcher, { revalidateOnFocus: false, dedupingInterval: 60000 });
  
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
         <div className="flex flex-col h-full md:border-r border-white/5">
            <div className="h-16 px-6 border-b border-white/10 flex justify-between items-center shrink-0">
               <div className="flex items-center gap-2 font-bold tracking-wide text-xs uppercase text-zinc-400">
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
            <div className="px-5 py-4 border-b border-white/10 shrink-0">
               <form onSubmit={handleAISearch} className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />
                  <input
                     type="text"
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     placeholder="AI Semantic Search..."
                     className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all shadow-inner"
                  />
                  {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white animate-spin" />}
               </form>
               <AnimatePresence>
                 {searchResult && (
                    <motion.div 
                       initial={{ opacity: 0, height: 0 }}
                       animate={{ opacity: 1, height: 'auto' }}
                       exit={{ opacity: 0, height: 0 }}
                       className="mt-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3 text-xs text-indigo-100 leading-relaxed overflow-hidden relative backdrop-blur-md"
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
                     className={`w-full text-left px-4 py-3.5 rounded-xl transition-all border ${selectedNote?.id === note.id ? 'bg-white/10 border-white/10 shadow-sm text-white font-semibold' : 'bg-transparent border-transparent hover:bg-white/5 text-zinc-400 hover:text-white'}`}
                  >
                     <div className="text-sm tracking-tight truncate font-sans">{note.title}</div>
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
               <div className="absolute inset-0 z-50 bg-white/5 backdrop-blur-[20px] backdrop-saturate-150 flex flex-col items-center justify-center text-center p-8">
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
                 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-white/10">
                   {isEditing ? (
                     <input 
                       value={editedTitle}
                       onChange={(e) => setEditedTitle(e.target.value)}
                       className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 sm:py-2.5 text-2xl font-bold tracking-tight text-white focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all flex-1 w-full sm:mr-4 shadow-inner"
                       placeholder="Note Title..."
                     />
                   ) : (
                     <h2 className="text-3xl font-bold tracking-tight text-white break-words flex-1">{selectedNote.title}</h2>
                   )}
                   <div className="flex flex-row gap-3 shrink-0 items-center w-full sm:w-auto justify-start sm:justify-end">
                     {!isEditing && (
                       <button
                         onClick={handleGenerateFlashcards}
                         disabled={isGeneratingFlashcards}
                         className={`text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-sm ${
                           selectedNote
                             ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 active:scale-95'
                             : 'bg-white/5 text-zinc-500 border border-white/10 opacity-50 cursor-not-allowed'
                         }`}
                       >
                         {isGeneratingFlashcards ? <Loader2 className="w-4 h-4 animate-spin text-amber-500" /> : <Sparkles className="w-4 h-4" />}
                         {isGeneratingFlashcards ? 'Generating...' : 'Flashcards'}
                       </button>
                     )}
                     {isEditing ? (
                       <button 
                         onClick={handleSaveChanges}
                         disabled={isSaving}
                         className="flex items-center gap-2 px-6 py-2.5 bg-white text-black hover:bg-zinc-200 rounded-xl text-sm font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50"
                       >
                         {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                         Save Note
                       </button>
                     ) : (
                       <button 
                         onClick={() => setIsEditing(true)}
                         className="px-4 py-2 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-sm font-semibold rounded-xl transition-all border border-white/10 shadow-sm"
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
                           className="prose prose-invert prose-indigo max-w-none text-sm text-zinc-300 leading-relaxed font-sans space-y-4 bg-white/5 backdrop-blur-3xl p-6 sm:p-10 rounded-[2.5rem] border border-white/10 shadow-2xl min-h-[400px]"
                           dangerouslySetInnerHTML={{ 
                             __html: selectedNote.content?.includes('<') && selectedNote.content?.includes('>') 
                               ? selectedNote.content 
                               : selectedNote.content?.replace(/\n/g, '<br/>') || ''
                           }}
                         />
                      )}
                    
                    {selectedNote.tags && (
                       <div className="mt-8 flex flex-wrap gap-2 pb-10">
                         {selectedNote.tags.split(',').map((tag: string, i: number) => (
                            <span key={i} className="text-xs font-semibold text-zinc-300 bg-white/10 px-3 py-1.5 rounded-xl flex items-center gap-1 border border-white/10 shadow-sm">
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
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-white/5 backdrop-blur-[40px] backdrop-saturate-150"
          >
            <div className="w-full max-w-4xl relative">
              <button 
                onClick={() => setShowFlashcardModal(false)}
                className="absolute -top-16 right-0 p-3 text-zinc-300 hover:text-white bg-white/10 backdrop-blur-3xl rounded-2xl border border-white/20 transition-all active:scale-95 shadow-xl"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-white focus:outline-none">Study Flashcards</h2>
                  <p className="text-sm font-medium text-zinc-400 mt-2">Master your notes with AI-generated drills.</p>
                </div>
                <div className="px-4 py-1.5 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full text-xs font-bold text-white shadow-inner">
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
                  <div className={`absolute inset-0 w-full h-full bg-white/5 border ${isFlipped ? 'border-transparent' : 'border-white/20'} rounded-[3rem] p-12 flex flex-col items-center justify-center text-center backdrop-blur-3xl shadow-[0_0_80px_rgba(255,255,255,0.05)] backface-hidden transition-all duration-500`}>
                     <div className="absolute top-8 left-8 p-3 bg-white/10 border border-white/20 rounded-2xl shadow-inner">
                        <Star className="w-5 h-5 text-white" />
                     </div>
                     <h3 className="text-3xl font-bold text-white leading-tight max-w-[90%]">
                        {flashcards[currentCardIndex]?.front}
                     </h3>
                     <div className="absolute bottom-10 flex items-center gap-2 text-xs font-bold tracking-wide text-zinc-400 group-hover:text-white transition-colors">
                        <RotateCw className="w-4 h-4" /> Tap to flip
                     </div>
                  </div>

                  {/* Back */}
                  <div className={`absolute inset-0 w-full h-full bg-white/10 backdrop-blur-3xl border ${!isFlipped ? 'border-transparent' : 'border-white/30'} rounded-[3rem] p-12 flex flex-col items-center justify-center text-center shadow-[0_0_100px_rgba(255,255,255,0.1)] backface-hidden transition-all duration-500`} style={{ transform: 'rotateY(180deg)' }}>
                     <div className="absolute top-8 left-8 p-3 bg-white/20 border border-white/30 rounded-2xl shadow-inner">
                        <BookOpen className="w-5 h-5 text-white" />
                     </div>
                     <p className="text-xl text-white leading-relaxed max-w-[90%] font-medium">
                        {flashcards[currentCardIndex]?.back}
                     </p>
                     <div className="absolute bottom-10 flex items-center gap-2 text-xs font-bold tracking-wide text-zinc-300">
                        Knowledge Mastery
                     </div>
                  </div>
                </motion.div>
              </div>

              <div className="mt-10 flex items-center justify-center gap-8">
                 <button 
                   disabled={currentCardIndex === 0}
                   onClick={(e) => {
                     e.stopPropagation();
                     setCurrentCardIndex(prev => prev - 1);
                     setIsFlipped(false);
                   }}
                   className="w-16 h-16 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/20 transition-all shadow-lg active:scale-95 disabled:opacity-30 disabled:pointer-events-none group"
                 >
                   <ChevronLeft className="w-8 h-8 group-hover:-translate-x-1 transition-transform" />
                 </button>
                 
                 <div className="h-2 w-48 bg-white/10 rounded-full overflow-hidden shadow-inner border border-white/5">
                    <motion.div 
                       initial={{ width: 0 }}
                       animate={{ width: `${((currentCardIndex + 1) / flashcards.length) * 100}%` }}
                       className="h-full bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.8)]"
                    />
                 </div>

                 <button 
                   disabled={currentCardIndex === flashcards.length - 1}
                   onClick={(e) => {
                     e.stopPropagation();
                     setCurrentCardIndex(prev => prev + 1);
                     setIsFlipped(false);
                   }}
                   className="w-16 h-16 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/20 transition-all shadow-lg active:scale-95 disabled:opacity-30 disabled:pointer-events-none group"
                 >
                   <ChevronRight className="w-8 h-8 group-hover:translate-x-1 transition-transform" />
                 </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
