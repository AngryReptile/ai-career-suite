import React from 'react';
import { Search, Loader2, ChevronDown } from 'lucide-react';

interface YouTubeUrlInputProps {
  url: string;
  setUrl: (url: string) => void;
  summaryLevel: 'short' | 'medium' | 'comprehensive';
  setSummaryLevel: (level: 'short' | 'medium' | 'comprehensive') => void;
  isSummarizing: boolean;
  isDeepScanning: boolean;
  handleSummarize: (e?: React.FormEvent) => void;
}

export function YouTubeSummarizerBox({
  url,
  setUrl,
  summaryLevel,
  setSummaryLevel,
  isSummarizing,
  isDeepScanning,
  handleSummarize
}: YouTubeUrlInputProps) {
  return (
    <form onSubmit={handleSummarize} className="w-full flex flex-col gap-4">
      <div className="relative group bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.1] rounded-2xl transition-all shadow-inner overflow-hidden flex items-center w-full min-h-[54px]">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 z-10 group-hover:text-rose-400 transition-colors" />
        <input 
            type="url" 
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste YouTube Link here..." 
            className="w-full bg-transparent border-none py-3 pl-12 pr-4 text-sm text-zinc-50 placeholder:text-zinc-600 focus:outline-none transition-all font-mono"
        />
      </div>

      <div className="flex flex-col md:flex-row w-full items-center justify-between gap-3">
        <div className="relative flex-1 w-full min-h-[54px] shadow-inner group">
          <select
            value={summaryLevel}
            onChange={(e) => setSummaryLevel(e.target.value as any)}
            className="w-full h-full min-h-[54px] appearance-none bg-white/[0.02] border border-white/[0.04] group-hover:border-white/[0.1] rounded-2xl pl-5 pr-10 text-[11px] uppercase tracking-[0.15em] text-zinc-300 font-bold focus:outline-none focus:border-rose-500/50 transition-all cursor-pointer"
          >
            <option value="short" className="bg-zinc-900 text-zinc-300">Level: Brief</option>
            <option value="medium" className="bg-zinc-900 text-zinc-300">Level: Moderate</option>
            <option value="comprehensive" className="bg-zinc-900 text-zinc-300">Level: Comprehensive</option>
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none group-hover:text-rose-400 transition-colors" />
        </div>

        <button 
          type="submit"
          disabled={isSummarizing || isDeepScanning || !url}
          className="bg-rose-600 hover:bg-rose-500 text-white font-black text-[11px] uppercase tracking-[0.1em] rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(225,29,72,0.2)] hover:shadow-[0_0_30px_rgba(225,29,72,0.4)] active:scale-[0.98] w-full md:w-[150px] min-h-[54px] shrink-0 px-4"
        >
          <span className="flex items-center gap-2">
            {(isSummarizing || isDeepScanning) ? <Loader2 className="w-4 h-4 animate-spin -ml-[0.1em]" /> : <span>Generate</span>}
          </span>
        </button>
      </div>
    </form>
  );
}
