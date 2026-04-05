import { DashboardShell } from "@/components/DashboardShell";

export default function Loading() {
  return (
    <DashboardShell
      header={
        <div className="flex items-center gap-4">
          <div className="skeleton-circle w-12 h-12" />
          <div className="flex flex-col gap-2.5">
            <div className="skeleton-line w-48 h-7" />
            <div className="skeleton-line w-72 h-4" style={{ animationDelay: '0.1s' }} />
          </div>
        </div>
      }
    >
        <div className="w-full h-full flex flex-col p-6 gap-6 relative overflow-hidden">
           {/* Stats Row Skeleton */}
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             {[0,1,2,3].map(i => (
               <div key={i} className="skeleton h-20 rounded-2xl" style={{ animationDelay: `${i * 0.1}s` }} />
             ))}
           </div>
           
           {/* Main Content Skeleton */}
           <div className="w-full flex flex-col md:flex-row gap-6 flex-1">
              <div className="flex-1 flex flex-col gap-6">
                 <div className="skeleton h-24 rounded-2xl" style={{ animationDelay: '0.3s' }} />
                 <div className="skeleton flex-1 min-h-[200px] rounded-2xl" style={{ animationDelay: '0.4s' }} />
              </div>
              <div className="hidden lg:flex w-1/3 flex-col gap-6">
                 <div className="skeleton flex-1 rounded-2xl" style={{ animationDelay: '0.5s' }} />
              </div>
           </div>
        </div>
    </DashboardShell>
  );
}
