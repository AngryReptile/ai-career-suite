"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { 
  DndContext, closestCenter, KeyboardSensor, PointerSensor, 
  useSensor, useSensors, DragEndEvent 
} from '@dnd-kit/core';
import { 
  arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy 
} from '@dnd-kit/sortable';
import { SortableWidget } from "@/components/SortableWidget";
import { Marquee } from "@/components/ui/Marquee";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { 
  Briefcase, 
  FileText, 
  Sparkles, 
  Youtube,
  StickyNote,
  GraduationCap,
  Zap,
  Play,
  Rss,
  ArrowUpRight
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function DashboardOverview() {
  const { data: session } = useSession();
  const { data: activities } = useSWR('/api/activity', fetcher);
  const { data: stats, isLoading: statsLoading } = useSWR('/api/dashboard/stats', fetcher);
  
  const statsItems = [
    { label: 'Scanned Positions', value: stats?.jobCount || 0, icon: Briefcase, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { label: 'Summaries Built', value: stats?.summaryCount || 0, icon: Youtube, color: 'text-rose-400', bg: 'bg-rose-400/10' },
    { label: 'Smart Notes', value: stats?.noteCount || 0, icon: StickyNote, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'Tutor Sessions', value: stats?.tutorCount || 0, icon: GraduationCap, color: 'text-amber-400', bg: 'bg-amber-400/10' }
  ];

  // Heatmap Logic: Generate last 365 days
  const [heatData, setHeatData] = useState<any[]>([]);
  
  useEffect(() => {
    if (!activities) return;
    
    const today = new Date();
    const data = [];
    const activityMap: Record<string, number> = {};
    
    // Aggregate activities by date
    activities.forEach((a: any) => {
      const dateStr = new Date(a.createdAt).toISOString().split('T')[0];
      activityMap[dateStr] = (activityMap[dateStr] || 0) + 1;
    });

    for (let i = 364; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      data.push({
        date: dateStr,
        count: activityMap[dateStr] || 0
      });
    }
    setHeatData(data);
  }, [activities]);

  const getColor = (count: number) => {
    if (count === 0) return 'bg-zinc-800/50';
    if (count < 3) return 'bg-indigo-900/40';
    if (count < 6) return 'bg-indigo-700/60';
    if (count < 10) return 'bg-indigo-500/80';
    return 'bg-indigo-400';
  };

  const defaultOrder = ['resume', 'heatmap', 'jobs', 'learning', 'news'];
  const [widgetOrder, setWidgetOrder] = useState<string[]>(defaultOrder);

  useEffect(() => {
    const saved = localStorage.getItem('dashboard-layout');
    if (saved) {
      try {
        setWidgetOrder(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setWidgetOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newArray = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem('dashboard-layout', JSON.stringify(newArray));
        return newArray;
      });
    }
  };

  const widgetMap = {
    'resume': {
      className: "col-span-1 row-span-2 md:col-span-2 md:row-span-2 bg-zinc-900/40 backdrop-blur-md border border-zinc-800 rounded-3xl p-6 flex flex-col justify-between hover:border-indigo-500/50 hover:shadow-[0_0_40px_rgba(99,102,241,0.15)] transition-all duration-500 shadow-xl overflow-hidden group/widget",
      content: (
        <>
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl group-hover/widget:bg-indigo-500/20 transition-all duration-500 pointer-events-none"></div>
          <div className="flex justify-between items-start relative z-10 w-full pointer-events-none">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-indigo-400 font-medium mb-1 md:mb-2 text-xs md:text-sm">
                <FileText className="h-4 w-4" />
                <span>Resume Strength</span>
              </div>
              <h2 className="font-bold text-zinc-50 mt-1 md:mt-2 leading-tight text-[clamp(1.5rem,4vw,2rem)] shrink-0">
                {statsLoading ? "Calculating..." : stats?.status || "Analyzing"}
              </h2>
              <div className="flex flex-col gap-2 mt-4">
                 {stats?.tips?.map((tip: string) => (
                   <p key={tip} className="text-zinc-400 text-[11px] leading-relaxed flex items-start gap-2 max-w-sm">
                      <Sparkles className="h-3 w-3 text-indigo-400 shrink-0 mt-0.5" />
                      {tip}
                   </p>
                 ))}
                 {!stats?.filename && (
                   <p className="text-zinc-500 text-[11px] italic">No active resume selected for analysis.</p>
                 )}
              </div>
            </div>

            <div className="relative w-24 h-24 md:w-28 md:h-28 flex items-center justify-center shrink-0 ml-4">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-zinc-800" />
                <circle 
                  cx="50" cy="50" r="40" 
                  stroke="currentColor" 
                  strokeWidth="8" 
                  fill="transparent" 
                  strokeDasharray="251.2" 
                  strokeDashoffset={251.2 - (251.2 * (stats?.score || 0)) / 100}
                  className="text-indigo-500 drop-shadow-[0_0_12px_rgba(99,102,241,0.6)] transition-all duration-1000 ease-out" 
                  strokeLinecap="round" 
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <AnimatedNumber value={stats?.score || 0} className="text-2xl font-black text-white" />
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest -mt-1">Points</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-6 flex items-center justify-between">
            <Link href="/resume" className="inline-flex items-center gap-2 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] group/btn border border-indigo-500/20">
              {(stats?.score || 0) < 90 ? "Improve Score" : "Advanced Analysis"}
              <ArrowUpRight className="h-3.5 w-3.5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
            </Link>
            {stats?.filename && (
              <span className="text-[10px] text-zinc-500 font-medium max-w-[120px] truncate text-right pointer-events-none">
                 Source: {stats.filename}
              </span>
            )}
          </div>
        </>
      )
    },
    'heatmap': {
      className: "col-span-1 row-span-1 md:col-span-2 md:row-span-1 bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-3xl p-4 md:p-5 hover:border-indigo-500/40 hover:shadow-[0_0_30px_rgba(99,102,241,0.1)] transition-all duration-500 flex flex-col relative overflow-hidden group/widget",
      content: (
        <>
           <div className="flex items-center justify-between mb-4 relative z-10 pointer-events-none">
              <div className="flex items-center gap-2 text-indigo-400 font-medium">
                 <Zap className="h-4 w-4" />
                 <span>Career Activity Heat Map</span>
              </div>
              <div className="flex gap-1">
                 {[0, 1, 2, 3, 4].map(l => (
                    <div key={l} className={`w-2 h-2 rounded-sm ${getColor(l * 3)}`}></div>
                 ))}
              </div>
           </div>
           
           <div className="flex-1 flex items-center justify-center overflow-hidden pointer-events-none">
              <div className="grid grid-flow-col grid-rows-7 gap-1">
                 {heatData.slice(-140).map((day) => (
                    <div 
                      key={day.date} 
                      title={`${day.date}: ${day.count} activities`}
                      className={`w-2.5 h-2.5 rounded-sm ${getColor(day.count)} transition-all hover:scale-125`}
                    ></div>
                 ))}
              </div>
           </div>
        </>
      )
    },
    'jobs': {
      className: "col-span-1 row-span-1 md:col-span-1 md:row-span-1 bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-3xl p-4 md:p-5 hover:border-emerald-500/40 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] transition-all duration-500 flex flex-col relative overflow-hidden group/widget",
      content: (
        <>
           <div className="flex items-center justify-between mb-2 mt-1 relative z-10 pointer-events-none">
              <div className="flex items-center gap-2 text-emerald-400 font-medium text-sm">
                 <Briefcase className="h-4 w-4" />
                 <span>Jobs</span>
              </div>
              <span className="text-[10px] text-zinc-500 pointer-events-none">View <ArrowUpRight className="h-2 w-2 inline" /></span>
           </div>
           
           <div className="space-y-2 relative z-10 pointer-events-none">
              {stats?.jobCount > 0 ? (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                    <span className="text-zinc-200 truncate font-medium">Syncing live matches</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 italic ml-3.5">Verified applications: {stats.jobCount}</p>
                </div>
              ) : (
                <p className="text-[10px] text-zinc-600 italic mt-2">No job activity yet.</p>
              )}
           </div>
        </>
      )
    },
    'learning': {
      className: "col-span-1 row-span-1 md:col-span-1 md:row-span-1 bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-3xl p-4 md:p-5 hover:border-rose-500/40 hover:shadow-[0_0_30px_rgba(244,63,94,0.1)] transition-all duration-500 flex flex-col relative overflow-hidden group/widget",
      content: (
        <>
           <div className="flex items-center justify-between mb-2 mt-1 relative z-10 pointer-events-none">
              <div className="flex items-center gap-2 text-rose-400 font-medium text-sm">
                 <Play className="h-4 w-4" />
                 <span>Learning</span>
              </div>
              <span className="text-[10px] text-zinc-500 pointer-events-none">View <ArrowUpRight className="h-2 w-2 inline" /></span>
           </div>
           
           <div className="space-y-2 relative z-10 pointer-events-none">
              {stats?.summaryCount > 0 ? (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"></div>
                    <span className="text-zinc-200 truncate font-medium">Technical guides saved</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 italic ml-3.5">Summaries built: {stats.summaryCount}</p>
                </div>
              ) : (
                <p className="text-[10px] text-zinc-600 italic mt-2">No summaries built yet.</p>
              )}
           </div>
        </>
      )
    },
    'news': {
      className: "col-span-1 row-span-1 md:col-span-1 md:row-span-1 bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-3xl p-4 md:p-5 hover:border-white/20 hover:shadow-[0_0_30px_rgba(255,255,255,0.05)] transition-all duration-500 flex flex-col justify-between group/widget",
      content: (
        <>
           <div className="flex items-center gap-2 text-zinc-400 font-medium text-sm pointer-events-none">
              <Rss className="h-4 w-4" /> News
           </div>
           <p className="text-[11px] text-zinc-200 leading-snug font-medium line-clamp-3 pointer-events-none">
             Major tech companies announce 20% increase in remote entry-level hiring for Q3 2026.
           </p>
        </>
      )
    }
  };

  return (
    <div className="animate-in fade-in duration-700 w-full pb-12">
      
      {/* 1. Motion Header: Advanced Career Pulse */}
      <div className="mb-10 w-full overflow-hidden mask-edges py-2">
        <Marquee className="[--duration:30s] text-zinc-500 font-medium tracking-wide text-sm sm:text-base">
          <span className="mx-4 flex items-center gap-2">AI Resume Scoring <Zap className="h-3 w-3 text-emerald-500" /></span>
          <span className="mx-4 flex items-center gap-2">Global Job Sync <Zap className="h-3 w-3 text-emerald-500" /></span>
          <span className="mx-4 flex items-center gap-2">YouTube Learning summaries <Zap className="h-3 w-3 text-emerald-500" /></span>
          <span className="mx-4 flex items-center gap-2">Real-time Career Insights <Zap className="h-3 w-3 text-emerald-500" /></span>
        </Marquee>
        
        <Marquee reverse className="[--duration:35s] text-zinc-600 font-medium tracking-wide text-sm sm:text-base mt-2">
          <span className="mx-4">Global Pro Metrics •</span>
          <span className="mx-4">Career Heat Map Live •</span>
          <span className="mx-4">Professional Networking AI •</span>
          <span className="mx-4">Skill Gap Analysis •</span>
        </Marquee>
      </div>

      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400 pb-1" style={{ fontSize: 'clamp(1.5rem,4vw,2.25rem)' }}>Welcome back, {session?.user?.name || 'User'}</h1>
          <p className="text-zinc-400 font-medium mt-1" style={{ fontSize: 'clamp(0.875rem,2vw,1rem)' }}>Here is your career pulse for today.</p>
        </div>
        <div className="text-left md:text-right bg-indigo-500/5 md:bg-transparent rounded-2xl md:rounded-none border border-indigo-500/10 md:border-transparent p-4 md:p-0 w-full md:w-auto">
           <p className="text-[10px] sm:text-xs text-zinc-400 font-bold uppercase tracking-widest mb-1">Total Activities</p>
           <AnimatedNumber value={activities?.length || 0} className="text-2xl sm:text-3xl font-black text-indigo-400" />
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {statsItems.map((stat) => (
          <div key={stat.label} className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl group hover:shadow-2xl transition-all duration-300">
            <div className={`w-12 h-12 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <stat.icon className="h-6 w-6" />
            </div>
            <p className="text-zinc-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-1">{stat.label}</p>
            <AnimatedNumber value={stat.value} className="text-[clamp(1.5rem,3vw,2.25rem)] font-black text-zinc-50" />
          </div>
        ))}
      </div>

      {/* 2. Drag & Drop Bento Grid Layout */}
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-[160px]">
          <SortableContext items={widgetOrder} strategy={rectSortingStrategy}>
            {widgetOrder.map(id => (
              <SortableWidget key={id} id={id} className={widgetMap[id as keyof typeof widgetMap].className}>
                {widgetMap[id as keyof typeof widgetMap].content}
              </SortableWidget>
            ))}
          </SortableContext>
        </div>
      </DndContext>
    </div>
  );
}
