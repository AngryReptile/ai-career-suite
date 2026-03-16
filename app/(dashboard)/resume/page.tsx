"use client";

import { useState } from "react";
import useSWR from "swr";
import { FileText, Upload, Trash2, Eye, Loader2, CheckCircle2, AlertCircle, Sparkles, Clock, MoreVertical, X } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ResumeManagementView() {
  const { data: resumes = [], mutate, error } = useSWR('/api/resume', fetcher);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [previewResume, setPreviewResume] = useState<any>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus("Syncing document...");

    try {
      // Read file as Data URL for preview
      const readFileAsDataURL = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      };

      const fileData = await readFileAsDataURL(file);
      
      // For content (matching), we'll use a placeholder or dummy text if we can't parse PDF easily in browser
      // Ideally, the backend would parse this, but for now we'll send the filename and a snippet
      const mockContent = `Resume: ${file.name}. This document has been uploaded for AI analysis.`;
      
      const res = await fetch('/api/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          content: mockContent,
          fileData: fileData
        })
      });

      if (!res.ok) throw new Error("Upload failed");
      
      await mutate();
      setUploadStatus("Resume added successfully!");
      setTimeout(() => setUploadStatus(null), 3000);
    } catch (err) {
      setUploadStatus("Error uploading resume.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const res = await fetch(`/api/resume?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Delete failed");
      await mutate();
      setConfirmDeleteId(null);
      if (previewResume?.id === id) setPreviewResume(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelect = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/resume`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) await mutate();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnselect = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/resume`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unselect' })
      });
      if (res.ok) await mutate();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 font-sans max-w-6xl mx-auto pb-20 p-6 lg:p-10">
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <FileText className="h-8 w-8 text-indigo-400" />
            Resume Management
          </h1>
          <p className="text-zinc-400 mt-2">Pick your active focus for AI matching or search normally.</p>
        </div>
        
        <label className="cursor-pointer group">
          <div className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-500/80 text-white rounded-2xl font-bold transition-all shadow-lg shadow-app-primary/20 active:scale-95">
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {isUploading ? "Syncing..." : "Upload New Resume"}
          </div>
          <input type="file" className="hidden" accept=".pdf,.docx" onChange={handleUpload} disabled={isUploading} />
        </label>
      </header>

      {uploadStatus && (
        <div className={`mb-8 p-4 rounded-2xl border flex items-center gap-3 text-sm font-medium animate-in slide-in-from-top-4 ${uploadStatus.includes('Error') ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
           {uploadStatus.includes('Error') ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
           {uploadStatus}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {resumes.map((res: any) => (
          <div 
            key={res.id}
            className={`relative group bg-zinc-900 border rounded-3xl p-6 transition-all duration-300 shadow-xl ${
              res.isSelected 
                ? 'border-indigo-500 ring-2 ring-app-primary/20 bg-indigo-500/5' 
                : 'border-zinc-800 hover:border-app-muted'
            }`}
          >
            {res.isSelected && (
              <div className="absolute -top-3 -right-3 bg-indigo-500 text-white p-2 rounded-full shadow-lg z-10">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            )}

            <div className="flex flex-col h-full">
              <div className="flex items-start justify-between mb-6">
                <div className={`p-4 rounded-2xl ${res.isSelected ? 'bg-indigo-500/20 text-indigo-400' : 'bg-zinc-950 text-zinc-400'}`}>
                  <FileText className="h-8 w-8" />
                </div>
                <button 
                  onClick={() => setConfirmDeleteId(res.id)}
                  className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>

              <h3 className="text-xl font-bold text-zinc-50 mb-1 truncate">{res.filename}</h3>
              <div className="flex items-center gap-2 text-zinc-400 text-xs mb-8">
                <Clock className="w-3.5 h-3.5" />
                {new Date(res.createdAt).toLocaleDateString()}
              </div>

              <div className="mt-auto flex flex-col gap-3">
                <button 
                  onClick={() => setPreviewResume(res)}
                  className="w-full py-3 bg-zinc-950 hover:bg-zinc-950/80 text-zinc-50 rounded-xl text-sm font-bold transition-all border border-zinc-800 flex items-center justify-center gap-2"
                >
                  <Eye className="h-4 w-4" /> Preview
                </button>
                
                {res.isSelected ? (
                  <button 
                    onClick={(e) => handleUnselect(e)}
                    className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-red-500/20"
                  >
                    Unselect Active
                  </button>
                ) : (
                  <button 
                    onClick={(e) => handleSelect(res.id, e)}
                    className="w-full py-3 bg-indigo-500 hover:bg-indigo-500/80 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg"
                  >
                    Make Active
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {resumes.length === 0 && !isUploading && (
          <div className="col-span-full h-80 flex flex-col items-center justify-center bg-zinc-900/30 border-2 border-dashed border-zinc-800 rounded-3xl">
            <FileText className="h-12 w-12 text-zinc-400 mb-4 opacity-50" />
            <p className="text-zinc-400 font-medium text-sm">No resumes uploaded yet.</p>
          </div>
        )}
      </div>

      {previewResume && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 lg:p-10 bg-zinc-950/95 backdrop-blur-xl animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-7xl h-full rounded-[2.5rem] overflow-hidden flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.8)] relative">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-900/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800">
                  <FileText className="h-6 w-6 text-indigo-400" />
                </div>
                <div>
                  <h2 className="font-bold text-zinc-50 truncate max-w-md">{previewResume.filename}</h2>
                  <p className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em] mt-0.5">Original Document Peek</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <a 
                  href={previewResume.fileData} 
                  download={previewResume.filename}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl border border-zinc-700 transition-all flex items-center gap-2"
                >
                  Download Original
                </a>
                <button 
                  onClick={() => setPreviewResume(null)}
                  className="p-3 hover:bg-red-500/10 text-zinc-400 hover:text-red-500 rounded-2xl transition-all active:scale-95"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 bg-black/40 relative overflow-hidden">
               {previewResume.fileData ? (
                 <embed 
                   src={previewResume.fileData} 
                   type="application/pdf"
                   className="w-full h-full"
                 />
               ) : (
                 <div className="w-full h-full p-12 overflow-y-auto flex flex-col items-center bg-zinc-950">
                    <div className="w-full max-w-4xl bg-zinc-900/50 border border-zinc-800 rounded-3xl p-10 font-mono text-[13px] text-zinc-400 leading-relaxed shadow-inner">
                        <div className="flex items-center gap-2 text-amber-500 mb-6 bg-amber-500/5 px-4 py-2 rounded-xl border border-amber-500/10 w-fit">
                           <AlertCircle className="w-4 h-4" />
                           <span className="font-sans font-bold uppercase tracking-wider text-[10px]">Legacy Extraction (No original file stored)</span>
                        </div>
                        <div className="whitespace-pre-wrap">
                          {previewResume.content}
                        </div>
                    </div>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md">
          <div className="bg-zinc-900 border border-zinc-800 max-w-sm rounded-[2.5rem] p-8 text-center">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-zinc-50 mb-4">Delete Resume?</h3>
            <p className="text-zinc-400 text-sm mb-8">This will affect AI matching and cannot be undone.</p>
            <div className="flex gap-4">
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-3 bg-zinc-950 text-zinc-50 rounded-2xl border border-zinc-800 font-bold">Cancel</button>
              <button onClick={() => handleDelete(confirmDeleteId)} className="flex-1 py-3 bg-red-600 text-white rounded-2xl font-bold shadow-lg shadow-red-600/20">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
