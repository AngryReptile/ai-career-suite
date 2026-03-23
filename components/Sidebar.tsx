'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  GraduationCap, 
  Youtube, 
  StickyNote, 
  Search, 
  Globe,
  Layers,
  LogOut,
  Hexagon,
  FileUp,
  FilePlus,
  ExternalLink,
  Eye,
  ChevronLeft,
  ChevronRight,
  Settings,
  FileText,
  Briefcase,
  User,
  Menu,
  X
} from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';

const navItems = [
  { name: 'Dashboard Layout', href: '/dashboard', icon: LayoutDashboard },
  { name: 'AI Tutor', href: '/tutor', icon: GraduationCap },
  { name: 'YouTube Summarizer', href: '/summarizer', icon: Youtube },
  { name: 'Note Saver', href: '/notes', icon: StickyNote },
  { name: 'Omni-Scout', href: '/omni-scout', icon: Globe },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { data: session } = useSession();

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile Top Navigation Bar */}
      <div className="md:hidden flex items-center justify-between w-full bg-black/60 backdrop-blur-3xl rounded-2xl p-4 border border-white/[0.04] shadow-2xl shrink-0 mb-4 z-30">
        <div className="flex items-center gap-3">
          <Hexagon className="h-6 w-6 text-fuchsia-400 fill-fuchsia-500/20" />
          <span className="font-bold text-lg text-zinc-50 tracking-tight">Career Suite</span>
        </div>
        <button 
          onClick={() => setIsMobileOpen(true)}
          className="text-zinc-400 hover:text-fuchsia-400 p-1.5 rounded-lg hover:bg-zinc-950 transition-all"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-md" 
          onClick={() => setIsMobileOpen(false)} 
        />
      )}

      {/* Main Sidebar (Responsive) */}
      <aside 
        className={`fixed inset-y-4 md:inset-auto z-50 md:z-20 md:relative flex flex-col h-[calc(100dvh-2rem)] md:h-full shrink-0 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden
          ${isMobileOpen ? 'left-4 w-[calc(100vw-5rem)] max-w-sm rounded-[2rem] bg-black/80 border border-white/[0.04] backdrop-blur-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)]' : '-left-full w-[calc(100vw-5rem)] max-w-sm bg-transparent border-none'}
          md:left-0 md:transform-none ${isCollapsed ? 'md:w-20' : 'md:w-[260px] xl:w-[280px]'}`}
      >
        <div className="overflow-x-hidden overflow-y-auto custom-scrollbar h-full flex flex-col w-full pb-6">
          {/* Brand Header with Toggle */}
          <div className={`p-6 flex items-center justify-between z-10 relative ${isCollapsed ? 'md:flex-col md:gap-4' : ''}`}>
            <div className="flex items-center gap-3 shrink-0">
              <div className="relative">
                <div className="absolute inset-0 bg-fuchsia-500/30 blur-xl rounded-full" />
                <Hexagon className="h-8 w-8 text-fuchsia-400 fill-fuchsia-500/20 shrink-0 relative z-10" />
              </div>
              <span className={`font-black text-xl text-zinc-50 tracking-tighter whitespace-nowrap ${isCollapsed ? 'md:hidden' : ''}`}>Career Suite</span>
            </div>
            
            {/* Desktop Collapse Toggle */}
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden md:flex text-zinc-500 hover:text-zinc-50 p-1.5 rounded-lg hover:bg-white/[0.04] transition-all"
            >
              <ChevronLeft className={`h-5 w-5 transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${isCollapsed ? 'rotate-180' : 'rotate-0'}`} />
            </button>

            {/* Mobile Close Toggle */}
            <button 
              onClick={() => setIsMobileOpen(false)}
              className="md:hidden text-zinc-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-zinc-950 transition-all"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

        {/* Navigation */}
        <nav className="mt-4 px-3 space-y-1 font-sans flex-1 relative z-10 w-full">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            
            const getActiveIconColor = (href: string) => {
              if (!isActive) return 'group-hover:text-zinc-300';
              if (href.includes('/omni-scout')) return 'text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]';
              if (href.includes('/notes')) return 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]';
              if (href.includes('/summarizer')) return 'text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]';
              if (href.includes('/tutor')) return 'text-fuchsia-400 drop-shadow-[0_0_8px_rgba(217,70,239,0.5)]';
              if (href.includes('/dashboard')) return 'text-violet-400 drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]';
              return 'text-white';
            };

            const getActiveBgColor = (href: string) => {
              if (href.includes('/omni-scout')) return 'bg-indigo-500/10 border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.15)]';
              if (href.includes('/notes')) return 'bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]';
              if (href.includes('/summarizer')) return 'bg-rose-500/10 border-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.15)]';
              if (href.includes('/tutor')) return 'bg-fuchsia-500/10 border-fuchsia-500/20 shadow-[0_0_20px_rgba(217,70,239,0.15)]';
              if (href.includes('/dashboard')) return 'bg-violet-500/10 border-violet-500/20 shadow-[0_0_20px_rgba(139,92,246,0.15)]';
              return 'bg-white/[0.06] border-white/[0.04] shadow-[0_0_15px_rgba(255,255,255,0.03)]';
            };

            return (
              <Link
                key={item.name}
                href={item.href}
                title={isCollapsed ? item.name : ""}
                className={`relative flex items-center rounded-xl transition-all duration-200 group px-4 py-3 gap-4 w-full ${isCollapsed ? 'justify-center !px-0' : ''} ${
                    isActive ? 'text-zinc-50 font-bold' : 'text-zinc-400 hover:text-zinc-50 hover:bg-white/[0.02]'
                }`}
              >
                {/* Sliding Active Background */}
                {isActive && (
                  <motion.div
                    layoutId="active-pill"
                    className={`absolute inset-0 rounded-xl border ${getActiveBgColor(item.href)}`}
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
                
                <item.icon className={`h-5 w-5 shrink-0 relative z-10 transition-colors duration-300 ${getActiveIconColor(item.href)}`} />
                {!isCollapsed && <span className="whitespace-nowrap relative z-10 tracking-tight">{item.name}</span>}
              </Link>
            );
          })}

          <div className={`mt-8 ${isCollapsed ? 'px-2' : 'px-4'}`}>
            {!isCollapsed && <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4 px-1">Documents</h3>}
            <div className="space-y-1">
               <Link 
                 href="/resume"
                 title={isCollapsed ? "View Resumes" : ""}
                 className={`relative flex items-center rounded-xl transition-all hover:bg-white/[0.02] text-zinc-400 hover:text-zinc-50 group px-3 py-2.5 gap-3 w-full ${isCollapsed ? 'justify-center !px-0' : ''}`}
               >
                  <Eye className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
                  {!isCollapsed && <span className="text-sm font-medium whitespace-nowrap tracking-tight">View Resumes</span>}
               </Link>

                <Link 
                  href="https://ai-resume-maker-peach.vercel.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  title={isCollapsed ? "Create New" : ""}
                  className={`relative flex items-center rounded-xl transition-all hover:bg-white/[0.02] text-zinc-400 hover:text-zinc-50 group px-3 py-2.5 gap-3 w-full ${isCollapsed ? 'justify-center !px-0' : ''}`}
                >
                   <FilePlus className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
                   {!isCollapsed && <span className="text-sm font-medium whitespace-nowrap tracking-tight">Create AI Resume</span>}
                </Link>
             </div>
          </div>
        </nav>
        
        <div className={`mt-auto mb-6 ${isCollapsed ? 'px-2' : 'px-4'} relative z-10 w-full`}>
          {!isCollapsed && <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4 px-1">Account</h3>}
          <div className="space-y-1 w-full">
            {/* User Profile Section */}
            <div className={`flex items-center rounded-2xl transition-all text-zinc-400 bg-white/[0.02] border border-white/[0.04] mb-3 ${isCollapsed ? 'justify-center p-2' : 'px-3 py-3 gap-3'} shadow-inner`}>
               <div className="w-8 h-8 rounded-full border border-white/10 overflow-hidden shrink-0 bg-zinc-900 flex items-center justify-center relative shadow-[0_0_10px_rgba(255,255,255,0.05)]">
                  {session?.user?.image ? (
                    <Image src={session.user.image} alt="Profile" fill sizes="32px" className="object-cover" />
                  ) : (
                    <User className="w-4 h-4 text-zinc-600" />
                  )}
               </div>
               {!isCollapsed && (
                 <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-zinc-200 truncate tracking-tight">{session?.user?.name || 'User'}</span>
                    <span className="text-[10px] text-zinc-500 truncate font-semibold tracking-wide">Standard Account</span>
                 </div>
               )}
            </div>

            <Link
              href="/settings"
              title={isCollapsed ? "Settings" : ""}
              className={`relative flex items-center rounded-xl transition-all duration-200 group px-3 py-2.5 gap-3 w-full hover:bg-white/[0.04] text-zinc-400 hover:text-zinc-50 ${isCollapsed ? 'justify-center !px-0' : ''}`}
            >
              <Settings className="h-5 w-5 shrink-0 transition-transform group-hover:rotate-45 duration-300" />
              {!isCollapsed && <span className="text-sm font-medium whitespace-nowrap tracking-tight">Settings</span>}
            </Link>
            
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              title={isCollapsed ? "Sign Out" : ""}
              className={`relative flex justify-center md:justify-start items-center rounded-xl transition-all duration-200 group px-3 py-2.5 gap-3 w-full hover:bg-rose-500/10 hover:text-rose-400 text-zinc-500 ${isCollapsed ? 'justify-center !px-0' : ''}`}
            >
              <LogOut className="h-5 w-5 shrink-0 transition-transform group-hover:-translate-x-1" />
              {!isCollapsed && <span className="text-sm font-medium whitespace-nowrap tracking-tight">Sign Out</span>}
            </button>
          </div>
          </div>
        </div>
      </aside>
  </>
  );
}
