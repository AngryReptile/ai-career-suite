"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { StickyNote, Plus, Search, Trash2, Tag, Loader2, CheckCircle2, Edit3, Save, Clock, BookOpen, AlertCircle, Sparkles, X, RotateCw, ChevronLeft, ChevronRight, Star } from "lucide-react";
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
    <div className="flex flex-col h-[calc(100vh-6rem)] animate-in fade-in duration-500 font-sans p-6 lg:p-8 text-zinc-50">
      <style>{flipStyles}</style>
      <div className="max-w-[1400px] mx-auto w-full flex flex-col h-full">
        <header className="flex items-center justify-between shrink-0 mb-6 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 shadow-sm backdrop-blur-md">
           <div>
              <h1 className="text-xl font-bold text-zinc-50 flex items-center gap-2">Notes Saver</h1>
              <p className="text-sm text-zinc-400 font-medium">Capture and organize your AI-generated technical notes seamlessly.</p>
           </div>
        </header>

        <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
           {/* Sidebar: Note List */}
          <aside className="lg:w-[320px] shrink-0 border border-zinc-800/50 bg-zinc-950/50 flex flex-col overflow-hidden shadow-lg transition-all duration-300 rounded-2xl">
            <div className="p-4 border-b border-zinc-800/80 bg-zinc-900 flex justify-between items-center shrink-0">
               <div className="flex items-center gap-2 font-semibold text-zinc-50/80">
                 <Clock className="w-4 h-4 text-zinc-400" /> Saved Notes
               </div>
               <button 
                 onClick={handleMakeNote}
                 disabled={isMakingNote}
                 className="bg-indigo-500 hover:bg-indigo-500/80 text-white rounded p-1.5 transition-colors disabled:opacity-50"
               >
                 {isMakingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
               </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
               {!notes && <div className="p-4 text-center text-zinc-400 text-xs flex justify-center"><Loader2 className="w-4 h-4 animate-spin" /></div>}
               {notes && notes.length === 0 && <div className="p-4 text-center text-zinc-400 text-xs">No notes generated yet.</div>}
               {notes && Array.isArray(notes) && notes.map((note: any) => (
                  <button 
                     key={note.id}
                     onClick={() => {
                        setSelectedNote(note);
                        setEditedTitle(note.title);
                        setEditedContent(note.content);
                        setIsEditing(false);
                     }}
                     className={`w-full text-left px-3 py-3 rounded-xl transition-all border ${selectedNote?.id === note.id ? 'bg-zinc-900 border-indigo-500/30 shadow-md text-indigo-400' : 'bg-transparent border-transparent hover:bg-zinc-900/40 text-zinc-50/80'}`}
                  >
                     <div className="text-sm font-semibold truncate">{note.title}</div>
                     <div className="text-[10px] text-zinc-400 mt-1 flex justify-between items-center">
                        <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                     </div>
                  </button>
               ))}
            </div>
         </aside>

         {/* Main Content */}
         <div className="flex-1 bg-zinc-900/60 border border-zinc-800/50 rounded-2xl flex flex-col overflow-hidden shadow-lg relative p-6">
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
                 <div className="flex items-center justify-between mb-6">
                   {isEditing ? (
                     <input 
                       value={editedTitle}
                       onChange={(e) => setEditedTitle(e.target.value)}
                       className="bg-zinc-950/50 border border-indigo-500/20 rounded-lg px-3 py-1.5 text-xl font-bold text-zinc-50 focus:outline-none focus:border-indigo-500/50 transition-all flex-1 mr-4"
                       placeholder="Note Title..."
                     />
                   ) : (
                     <h2 className="text-2xl font-bold text-zinc-50">{selectedNote.title}</h2>
                   )}
                   <div className="flex gap-4 shrink-0 items-center">
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
                         className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50"
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
                       <textarea 
                         value={editedContent}
                         onChange={(e) => setEditedContent(e.target.value)}
                         className="w-full h-full min-h-[400px] bg-zinc-950/30 p-6 rounded-xl border border-indigo-500/20 text-zinc-50/90 font-mono text-sm leading-relaxed focus:outline-none focus:border-indigo-500/40 transition-all resize-none shadow-inner"
                         placeholder="Write your note content here..."
                       />
                    ) : (
                       <div className="text-sm text-zinc-50/80 leading-relaxed font-mono space-y-4 whitespace-pre-wrap bg-zinc-950/20 p-6 rounded-xl border border-zinc-800 shadow-inner min-h-[400px]">
                         {selectedNote.content}
                       </div>
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
                  <StickyNote className="w-16 h-16 text-zinc-800 mb-4 inline-block" />
                  <p className="font-medium text-zinc-400">Your knowledge hub is empty.</p>
                  <p className="text-zinc-600 mt-1 max-w-xs text-center">Select a note from the sidebar or manually create a new unlinked note.</p>
               </div>
            )}
         </div>
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
    </div>
  );
}
