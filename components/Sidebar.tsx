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
      <div className="md:hidden flex items-center justify-between w-full liquid-glass p-4 shrink-0 z-30 mb-4 overflow-hidden relative">
        <div className="liquid-glass-shine" />
        <div className="flex items-center gap-3 relative z-10">
          <Hexagon className="h-6 w-6 text-white" />
          <span className="font-semibold text-xl text-white tracking-wide">Career Suite</span>
        </div>
        <button 
          onClick={() => setIsMobileOpen(true)}
          className="text-white hover:text-blue-400 p-1.5 rounded-xl hover:bg-white/10 transition-colors"
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
        className={`fixed inset-y-4 md:inset-auto z-50 md:z-20 md:relative flex flex-col h-[calc(100dvh-2rem)] md:h-[calc(100dvh-3rem)] shrink-0 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] liquid-glass
          ${isMobileOpen ? 'left-4 inset-y-4 h-[calc(100dvh-2rem)] w-[80vw] max-w-sm rounded-[2rem] border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.5)]' : '-left-full w-[calc(100vw-5rem)] max-w-sm border-none'}
          md:left-0 md:transform-none ${isCollapsed ? 'md:w-20' : 'md:w-[260px] xl:w-[280px]'}`}
      >
        <div className="liquid-glass-shine" />
        <div className="overflow-x-hidden overflow-y-auto custom-scrollbar h-full flex flex-col w-full pb-6">
          {/* Brand Header with Toggle */}
          <div className={`p-6 flex items-center justify-between z-10 relative border-b border-white/10 mb-4 ${isCollapsed ? 'md:flex-col md:gap-4' : ''}`}>
            <div className="flex items-center gap-3 shrink-0">
              <div className="relative">
                <Hexagon className="h-8 w-8 text-white shrink-0 relative z-10" />
              </div>
              <span className={`font-semibold text-xl text-white tracking-wide leading-none ${isCollapsed ? 'md:hidden' : ''}`}>Career Suite</span>
            </div>
            
            {/* Desktop Collapse Toggle */}
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden md:flex text-zinc-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors"
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
              if (!isActive) return 'group-hover:text-white';
              return 'text-black';
            };

            const getActiveBgColor = (href: string) => {
              return 'bg-white shadow-[0_4px_12px_rgba(255,255,255,0.3)]';
            };

            return (
              <Link
                key={item.name}
                href={item.href}
                title={isCollapsed ? item.name : ""}
                className={`relative flex items-center rounded-[14px] transition-all duration-200 group px-4 py-3 gap-4 w-full ${isCollapsed ? 'justify-center !px-0' : ''} ${
                    isActive ? 'text-black font-bold' : 'text-zinc-300 hover:text-white hover:bg-white/10 font-semibold'
                }`}
              >
                {/* Sliding Active Background */}
                {isActive && (
                  <motion.div
                    layoutId="active-pill"
                    className={`absolute inset-0 rounded-[14px] ${getActiveBgColor(item.href)}`}
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
                
                <item.icon className={`h-5 w-5 shrink-0 relative z-10 transition-colors duration-300 ${getActiveIconColor(item.href)}`} />
                {!isCollapsed && <span className="whitespace-nowrap relative z-10 tracking-tight">{item.name}</span>}
              </Link>
            );
          })}

          <div className={`mt-8 ${isCollapsed ? 'px-2' : ''}`}>
            {!isCollapsed && <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4 px-5">Documents</h3>}
            <div className="space-y-1">
               <Link 
                 href="/resume"
                 title={isCollapsed ? "View Resumes" : ""}
                 className={`relative flex items-center rounded-[14px] transition-all hover:bg-white/10 text-zinc-300 font-semibold hover:text-white group px-4 py-3 gap-4 w-full ${isCollapsed ? 'justify-center !px-0' : ''}`}
               >
                  <Eye className="h-5 w-5 shrink-0 transition-transform group-hover:scale-110" />
                  {!isCollapsed && <span className="tracking-tight whitespace-nowrap">View Resumes</span>}
               </Link>

                <Link 
                  href="https://ai-resume-maker-peach.vercel.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  title={isCollapsed ? "Create New" : ""}
                  className={`relative flex items-center rounded-[14px] transition-all hover:bg-white/10 text-zinc-300 font-semibold hover:text-white group px-4 py-3 gap-4 w-full ${isCollapsed ? 'justify-center !px-0' : ''}`}
                >
                   <FilePlus className="h-5 w-5 shrink-0 transition-transform group-hover:scale-110" />
                   {!isCollapsed && <span className="tracking-tight whitespace-nowrap">Create AI Resume</span>}
                </Link>
             </div>
          </div>
        </nav>
        
        <div className={`mt-auto mb-6 ${isCollapsed ? 'px-2' : ''} relative z-10 w-full`}>
          {!isCollapsed && <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4 px-5">Account</h3>}
          <div className="space-y-1 w-full px-3">
            {/* User Profile Section */}
            <div className={`flex items-center rounded-2xl transition-all text-white bg-black/20 border border-white/5 shadow-inner mb-3 ${isCollapsed ? 'justify-center p-2' : 'px-3 py-3 gap-3'}`}>
               <div className="w-8 h-8 rounded-full border border-white/20 overflow-hidden shrink-0 bg-white/10 flex items-center justify-center relative shadow-sm">
                  {session?.user?.image ? (
                    <Image src={session.user.image} alt="Profile" fill sizes="32px" className="object-cover" />
                  ) : (
                    <User className="w-4 h-4 text-white" />
                  )}
               </div>
               {!isCollapsed && (
                 <div className="flex flex-col min-w-0">
                    <span className="font-bold text-sm text-white truncate tracking-tight">{session?.user?.name || 'USER'}</span>
                    <span className="text-[10px] text-zinc-400 truncate font-semibold uppercase tracking-wide">{(session?.user as any)?.role === 'ADMIN' ? 'Administrator' : 'Standard User'}</span>
                 </div>
               )}
            </div>

            <Link
              href="/settings"
              title={isCollapsed ? "Settings" : ""}
              className={`relative flex items-center font-semibold rounded-[14px] transition-all duration-200 group px-4 py-3 gap-4 w-full hover:bg-white/10 text-zinc-300 hover:text-white ${isCollapsed ? 'justify-center !px-0' : ''}`}
            >
              <Settings className="h-5 w-5 shrink-0 transition-transform group-hover:rotate-45 duration-300" />
              {!isCollapsed && <span className="whitespace-nowrap tracking-tight">Settings</span>}
            </Link>

            {(session?.user as any)?.role === 'ADMIN' && (
              <Link
                href="/admin"
                title={isCollapsed ? "Admin System" : ""}
                className={`relative flex items-center font-bold rounded-[14px] transition-all duration-200 group px-4 py-3 gap-4 w-full hover:bg-[#5E5CE6] text-[#5E5CE6] hover:text-white ${isCollapsed ? 'justify-center !px-0' : ''}`}
              >
                <div className="relative">
                  <Hexagon className="h-5 w-5 shrink-0 relative z-10" />
                </div>
                {!isCollapsed && <span className="whitespace-nowrap">Admin OS</span>}
              </Link>
            )}
            
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              title={isCollapsed ? "Sign Out" : ""}
              className={`relative flex justify-center md:justify-start font-semibold items-center rounded-[14px] transition-all duration-200 group px-4 py-3 gap-4 w-full hover:bg-[#FF3B30] hover:text-white text-zinc-300 ${isCollapsed ? 'justify-center !px-0' : ''}`}
            >
              <LogOut className="h-5 w-5 shrink-0 transition-transform group-hover:-translate-x-1" />
              {!isCollapsed && <span className="whitespace-nowrap tracking-tight">Disconnect</span>}
            </button>
          </div>
          </div>
        </div>
      </aside>
  </>
  );
}
