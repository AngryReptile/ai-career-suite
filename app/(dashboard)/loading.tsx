import { DashboardShell } from "@/components/DashboardShell";

export default function Loading() {
  return (
    <DashboardShell
      header={
        <div className="space-y-3">
          <div className="h-7 w-64 bg-zinc-800 rounded-md animate-pulse"></div>
          <div className="h-4 w-96 bg-zinc-800/60 rounded animate-pulse mt-2"></div>
        </div>
      }
      sidebar={
        <div className="w-full flex-1 flex flex-col">
           <div className="h-16 px-4 border-b border-zinc-800/80 bg-zinc-900 flex items-center shrink-0">
             <div className="h-5 w-32 bg-zinc-800 rounded animate-pulse"></div>
           </div>
           <div className="flex-1 p-4 space-y-2">
              <div className="h-14 w-full bg-zinc-800/50 rounded-xl animate-pulse"></div>
              <div className="h-14 w-full bg-zinc-800/30 rounded-xl animate-pulse delay-75"></div>
              <div className="h-14 w-full bg-zinc-800/20 rounded-xl animate-pulse delay-150"></div>
           </div>
        </div>
      }
    >
        <div className="w-full h-full flex flex-col p-6 gap-6 relative overflow-hidden backdrop-blur-sm">
           {/* Main Content Area Skeleton */}
           <div className="w-full flex flex-col md:flex-row gap-6 h-full">
              <div className="flex-1 flex flex-col gap-6 h-full">
                 <div className="h-20 w-full bg-zinc-800/30 rounded-2xl animate-pulse"></div>
                 <div className="flex-1 w-full bg-zinc-800/20 rounded-2xl animate-pulse"></div>
              </div>
              <div className="hidden lg:flex w-1/3 flex-col gap-6 h-full">
                 <div className="flex-1 w-full bg-zinc-800/20 rounded-2xl animate-pulse"></div>
              </div>
           </div>
        </div>
    </DashboardShell>
  );
}
