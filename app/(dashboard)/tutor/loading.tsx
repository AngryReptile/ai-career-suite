import { Clock, Plus } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] animate-in fade-in duration-500 font-sans p-6 lg:p-8">
      <div className="w-full flex flex-col h-full">
        {/* Header Skeleton */}
        <header className="flex items-center justify-between shrink-0 mb-6 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 shadow-sm backdrop-blur-md">
           <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-zinc-800 animate-pulse" />
                <div className="h-6 w-32 bg-zinc-800 rounded animate-pulse" />
              </div>
              <div className="h-4 w-64 bg-zinc-800 rounded mt-2 animate-pulse" />
           </div>
        </header>

        <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
           {/* Sidebar Skeleton */}
           <aside className="lg:w-[320px] shrink-0 border border-zinc-800/50 bg-zinc-950/50 flex flex-col overflow-hidden shadow-lg rounded-2xl">
              <div className="p-4 border-b border-zinc-800/80 bg-zinc-900 flex justify-between items-center shrink-0">
                 <div className="flex items-center gap-2 text-zinc-600">
                   <Clock className="w-4 h-4" /> <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
                 </div>
                 <div className="w-7 h-7 bg-zinc-800 rounded animate-pulse" />
              </div>
              <div className="flex-1 p-4 space-y-3">
                 {[1, 2, 3].map((i) => (
                   <div key={i} className="w-full h-16 bg-zinc-900/50 rounded-xl animate-pulse" />
                 ))}
              </div>
           </aside>

           {/* Main Content Skeleton */}
           <div className="flex-1 bg-zinc-900/60 border border-zinc-800/50 rounded-2xl flex flex-col overflow-hidden shadow-lg">
             {/* Toggle Banner Skeleton */}
            <div className="bg-zinc-950/80 border-b border-zinc-800 p-2 flex justify-center shrink-0">
               <div className="w-64 h-8 bg-zinc-900 rounded-lg animate-pulse" />
            </div>

            <div className="flex-1 p-6 space-y-6">
                {/* Chat Bubbles Skeletons */}
                <div className="flex justify-start">
                  <div className="flex gap-4 max-w-[80%]">
                     <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse shrink-0 mt-1" />
                     <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl rounded-tl-sm w-64 h-24 animate-pulse" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="bg-zinc-800 p-4 rounded-2xl rounded-tr-sm w-48 h-12 animate-pulse" />
                </div>
                <div className="flex justify-start">
                  <div className="flex gap-4 max-w-[80%]">
                     <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse shrink-0 mt-1" />
                     <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl rounded-tl-sm w-80 h-32 animate-pulse" />
                  </div>
                </div>
            </div>

            {/* Input Form Skeleton */}
            <div className="p-4 bg-zinc-950 border-t border-zinc-800 shrink-0">
               <div className="w-full h-14 bg-zinc-900 rounded-xl animate-pulse" />
            </div>
         </div>
        </div>
      </div>
    </div>
  );
}
