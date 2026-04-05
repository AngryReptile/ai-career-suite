"use client";

import { useState } from "react";
import useSWR from "swr";
import { FileText, Upload, Trash2, Eye, Loader2, CheckCircle2, AlertCircle, Sparkles, Clock, MoreVertical, X } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ResumeManagementView() {
  const { data: resumes = [], mutate, error, isLoading: resumesLoading } = useSWR('/api/resume', fetcher, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60000
  });
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
      const readFileAsDataURL = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      };

      const fileData = await readFileAsDataURL(file);
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
    <DashboardShell
      header={
        <>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-3">
              Resume Management
            </h1>
            <p className="text-sm text-zinc-400 font-medium mt-1">Pick your active focus for AI matching or search normally.</p>
          </div>
          
          <label className="cursor-pointer group">
            <div className="flex items-center justify-center gap-2 px-6 h-[44px] bg-indigo-500 hover:bg-indigo-500/80 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-500/20 active:scale-95">
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {isUploading ? "Syncing..." : "Upload New Resume"}
            </div>
            <input type="file" className="hidden" accept=".pdf,.docx" onChange={handleUpload} disabled={isUploading} />
          </label>
        </>
      }
    >
      <div className="flex-1 overflow-y-auto w-full p-4 sm:p-6 lg:p-8 custom-scrollbar">
        {uploadStatus && (
          <div className={`mb-8 p-4 rounded-2xl border flex items-center gap-3 text-sm font-medium animate-in slide-in-from-top-4 ${uploadStatus.includes('Error') ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
             {uploadStatus.includes('Error') ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
             {uploadStatus}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {resumesLoading ? (
            [0,1,2].map(i => (
              <div key={i} className="relative backdrop-blur-3xl border border-white/10 rounded-[2rem] p-6 shadow-2xl bg-white/5">
                <div className="flex flex-col h-full">
                  <div className="flex items-start justify-between mb-6">
                    <div className="skeleton w-16 h-16 rounded-2xl" style={{ animationDelay: `${i*0.15}s` }} />
                    <div className="skeleton-circle w-9 h-9" style={{ animationDelay: `${i*0.15+0.1}s` }} />
                  </div>
                  <div className="skeleton-line h-6 w-3/4 mb-2" style={{ animationDelay: `${i*0.15+0.15}s` }} />
                  <div className="skeleton-line h-4 w-1/3 mb-8" style={{ animationDelay: `${i*0.15+0.2}s` }} />
                  <div className="mt-auto flex gap-3">
                    <div className="skeleton h-12 flex-1 rounded-xl" style={{ animationDelay: `${i*0.15+0.25}s` }} />
                    <div className="skeleton h-12 flex-1 rounded-xl" style={{ animationDelay: `${i*0.15+0.3}s` }} />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <>
              {resumes.map((res: any) => (
                <div 
                  key={res.id}
                  className={`relative group backdrop-blur-3xl border rounded-[2rem] p-6 transition-all duration-500 shadow-2xl ${
                    res.isSelected 
                      ? 'border-indigo-500/50 hover:border-indigo-400 bg-indigo-500/10' 
                      : 'border-white/10 hover:border-white/30 bg-white/5'
                  }`}
                >
                  {res.isSelected && (
                    <div className="absolute -top-3 -right-3 bg-indigo-500 text-white p-2 rounded-full shadow-lg z-10">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                  )}

                  <div className="flex flex-col h-full">
                    <div className="flex items-start justify-between mb-6">
                      <div className={`p-4 rounded-2xl border ${res.isSelected ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-white/5 text-zinc-300 border-white/10'}`}>
                        <FileText className="h-8 w-8" />
                      </div>
                      <button 
                        onClick={() => setConfirmDeleteId(res.id)}
                        className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>

                    <h3 className="text-xl font-semibold text-white mb-1 truncate" title={res.filename}>{res.filename}</h3>
                    <div className="flex items-center gap-2 text-zinc-400 text-xs mb-8">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(res.createdAt).toLocaleDateString()}
                    </div>

                    <div className="mt-auto flex flex-col sm:flex-row gap-3">
                      <button 
                        onClick={() => setPreviewResume(res)}
                        className="w-full sm:flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-semibold transition-all border border-white/10 flex items-center justify-center gap-2 shadow-sm"
                      >
                        <Eye className="h-4 w-4" /> <span className="whitespace-nowrap">Preview</span>
                      </button>
                      
                      {res.isSelected ? (
                        <button 
                          onClick={(e) => handleUnselect(e)}
                          className="w-full sm:flex-1 py-3 px-4 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-xl text-sm font-bold transition-all border border-amber-500/20 flex items-center justify-center text-center shadow-sm"
                        >
                          Unselect
                        </button>
                      ) : (
                        <button 
                          onClick={(e) => handleSelect(res.id, e)}
                          className="w-full sm:flex-1 py-3 px-4 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center text-center"
                        >
                          Make Active
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {resumes.length === 0 && !isUploading && (
                <div className="col-span-full h-80 flex flex-col items-center justify-center bg-white/5 backdrop-blur-3xl border border-dashed border-white/20 rounded-[2.5rem] shadow-inner">
                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-white/5">
                    <FileText className="h-8 w-8 text-white/50" />
                  </div>
                  <p className="text-zinc-300 font-medium text-sm">No resumes uploaded yet.</p>
                </div>
              )}
            </>
          )}
        </div>

      {previewResume && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 lg:p-10 bg-black/60 backdrop-blur-2xl animate-in fade-in">
          <div className="bg-white/10 backdrop-blur-3xl border border-white/20 w-full h-full rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl relative">
            <div className="p-6 border-b border-white/10 flex items-center justify-between shrink-0 bg-white/5">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-2xl border border-white/10 shadow-inner">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-white truncate max-w-md text-lg">{previewResume.filename}</h2>
                  <p className="text-xs text-zinc-400 font-medium mt-0.5">Original Document View</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <a 
                  href={previewResume.fileData} 
                  download={previewResume.filename}
                  className="px-5 py-2.5 bg-white text-black hover:bg-zinc-200 text-sm font-semibold rounded-xl transition-all flex items-center gap-2 shadow-lg active:scale-95"
                >
                  Download Original
                </a>
                <button 
                  onClick={() => setPreviewResume(null)}
                  className="p-2 bg-white/5 hover:bg-red-500 text-zinc-300 hover:text-white border border-white/10 hover:border-red-500 rounded-xl transition-all active:scale-95"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 bg-black/20 relative overflow-hidden backdrop-blur-md">
               {previewResume.fileData ? (
                 <embed 
                   src={previewResume.fileData} 
                   type="application/pdf"
                   className="w-full h-full"
                 />
               ) : (
                 <div className="w-full h-full p-12 overflow-y-auto flex flex-col items-center">
                    <div className="w-full max-w-4xl bg-white/5 border border-white/10 rounded-[2rem] p-10 text-sm text-zinc-300 leading-relaxed shadow-2xl">
                        <div className="flex items-center gap-2 text-amber-400 mb-6 bg-amber-500/10 px-4 py-2 rounded-xl border border-amber-400/20 w-fit font-medium">
                           <AlertCircle className="w-4 h-4" />
                           <span className="text-xs">Legacy Extraction (No Document Display Available)</span>
                        </div>
                        <div className="whitespace-pre-wrap font-mono relative z-10">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xl animate-in zoom-in-95">
          <div className="bg-white/10 border border-white/20 backdrop-blur-3xl max-w-sm w-full rounded-[2.5rem] p-8 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-red-500/50"></div>
            <div className="w-16 h-16 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Trash2 className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Delete Resume?</h3>
            <p className="text-zinc-400 text-sm mb-8 font-medium">This will remove it from AI matching systems. This action cannot be undone.</p>
            <div className="flex gap-4">
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 font-semibold transition-all">Cancel</button>
              <button onClick={() => handleDelete(confirmDeleteId)} className="flex-1 py-3 bg-red-500 hover:bg-red-400 text-white rounded-2xl font-bold shadow-lg transition-all active:scale-95">Delete</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </DashboardShell>
  );
}
