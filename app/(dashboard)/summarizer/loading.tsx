import { Youtube, Search, Clock } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] animate-in fade-in duration-500 font-sans p-6 lg:p-8">
      <div className="w-full flex flex-col h-full">
        {/* Header Skeleton */}
        <header className="flex items-center justify-between shrink-0 mb-6 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 shadow-sm backdrop-blur-md">
           <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-zinc-800 animate-pulse" />
                <div className="h-6 w-48 bg-zinc-800 rounded animate-pulse" />
              </div>
              <div className="h-4 w-64 bg-zinc-800 rounded mt-2 animate-pulse" />
           </div>
        </header>

        <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
           {/* Sidebar Skeleton */}
           <aside className="lg:w-[320px] shrink-0 border border-zinc-800/50 bg-zinc-950/50 flex flex-col overflow-hidden shadow-lg rounded-2xl">
              <div className="h-16 px-4 border-b border-zinc-800/80 bg-zinc-900 flex justify-between items-center shrink-0">
                 <div className="flex items-center gap-2 text-zinc-600">
                   <Clock className="w-4 h-4" /> <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
                 </div>
              </div>
              <div className="flex-1 p-4 space-y-3">
                 {[1, 2, 3, 4, 5].map((i) => (
                   <div key={i} className="w-full h-16 bg-zinc-900/50 rounded-xl animate-pulse" />
                 ))}
              </div>
           </aside>

           {/* Main Content Skeleton */}
           <div className="flex-1 bg-zinc-900/60 border border-zinc-800/50 rounded-2xl flex flex-col overflow-hidden shadow-lg">
              <div className="h-16 px-6 border-b border-zinc-800/80 bg-zinc-900 flex items-center shrink-0">
                  <div className="w-full flex items-center gap-3">
                     <div className="flex-1 h-10 bg-zinc-950 rounded-xl animate-pulse flex items-center px-4">
                        <Search className="w-4 h-4 text-zinc-800" />
                     </div>
                     <div className="w-[200px] h-10 bg-zinc-950 rounded-xl animate-pulse" />
                     <div className="w-[110px] h-10 bg-zinc-800 rounded-xl animate-pulse" />
                  </div>
              </div>

             <div className="flex-1 p-6 flex flex-col items-center justify-center">
                 <Youtube className="w-16 h-16 text-zinc-800/50 mb-4 animate-pulse" />
                 <div className="h-4 w-48 bg-zinc-800 rounded animate-pulse" />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
