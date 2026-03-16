'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  GraduationCap, 
  Youtube, 
  StickyNote, 
  Search, 
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
  User
} from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';

const navItems = [
  { name: 'Dashboard Layout', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Workspace', href: '/workspace', icon: Layers },
  { name: 'AI Tutor', href: '/tutor', icon: GraduationCap },
  { name: 'YouTube Summarizer', href: '/summarizer', icon: Youtube },
  { name: 'Note Saver', href: '/notes', icon: StickyNote },
  { name: 'AI Job Search', href: '/job-search', icon: Briefcase },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { data: session } = useSession();

  return (
    <aside 
      className={`relative bg-zinc-900 flex flex-col justify-between h-full border-r border-zinc-800 z-20 shrink-0 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}
    >
      <div className="overflow-x-hidden flex-1 flex flex-col">
        {/* Brand Header with Toggle */}
        <div className={`p-6 flex items-center justify-between ${isCollapsed ? 'flex-col gap-4' : ''}`}>
          <div className="flex items-center gap-3">
            <Hexagon className="h-8 w-8 text-indigo-400 fill-indigo-500/10 shrink-0" />
            {!isCollapsed && <span className="font-bold text-xl text-zinc-50 whitespace-nowrap">Career Suite</span>}
          </div>
          
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-zinc-400 hover:text-indigo-400 p-1.5 rounded-lg hover:bg-zinc-950 transition-all"
          >
            <ChevronLeft className={`h-5 w-5 transition-transform duration-300 ease-in-out ${isCollapsed ? 'rotate-180' : 'rotate-0'}`} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-4 px-3 space-y-1.5 font-sans flex-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                title={isCollapsed ? item.name : ""}
                className={`flex items-center rounded-lg transition-all duration-200 group ${isCollapsed ? 'justify-center p-3' : 'px-4 py-3 gap-3'} ${
                  isActive 
                    ? 'bg-indigo-500/10 text-indigo-400 font-medium border border-indigo-500/20 shadow-sm' 
                    : 'text-zinc-400 border border-transparent hover:bg-zinc-950 hover:text-zinc-50 hover:border-zinc-800'
                }`}
              >
                <item.icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-indigo-400' : 'text-zinc-400 group-hover:text-zinc-50'}`} />
                {!isCollapsed && <span className="whitespace-nowrap">{item.name}</span>}
              </Link>
            );
          })}

          <div className={`mt-8 ${isCollapsed ? 'px-2' : 'px-4'}`}>
            {!isCollapsed && <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4 px-1">Resume Tools</h3>}
            <div className="space-y-1">
               <Link 
                 href="/resume"
                 title={isCollapsed ? "View Documents" : ""}
                 className={`flex items-center rounded-lg transition-all text-zinc-400 hover:text-zinc-50 hover:bg-zinc-950 group ${isCollapsed ? 'justify-center p-3' : 'px-3 py-2.5 gap-3'}`}
               >
                  <Eye className="h-5 w-5 shrink-0" />
                  {!isCollapsed && <span className="text-sm font-medium whitespace-nowrap">View Documents</span>}
               </Link>

                <Link 
                  href="https://ai-resume-maker-peach.vercel.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  title={isCollapsed ? "Create New" : ""}
                  className={`flex items-center rounded-lg transition-all text-zinc-400 hover:text-zinc-50 hover:bg-zinc-950 group ${isCollapsed ? 'justify-center p-3' : 'px-3 py-2.5 gap-3'}`}
                >
                   <FilePlus className="h-5 w-5 shrink-0" />
                   {!isCollapsed && <span className="text-sm font-medium whitespace-nowrap">Create New</span>}
                </Link>
             </div>
          </div>
        </nav>
        
        <div className={`mt-auto mb-6 ${isCollapsed ? 'px-2' : 'px-4'}`}>
          {!isCollapsed && <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4 px-1">Account</h3>}
          <div className="space-y-1">
            {/* User Profile Section */}
            <div className={`flex items-center rounded-lg transition-all text-zinc-400 bg-zinc-950/50 border border-zinc-800/50 mb-2 ${isCollapsed ? 'justify-center p-2' : 'px-3 py-2.5 gap-3'}`}>
               <div className="w-8 h-8 rounded-full border border-zinc-700 overflow-hidden shrink-0 bg-zinc-800 flex items-center justify-center">
                  {session?.user?.image ? (
                    <img src={session.user.image} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-4 h-4 text-zinc-500" />
                  )}
               </div>
               {!isCollapsed && (
                 <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-zinc-200 truncate">{session?.user?.name || 'User'}</span>
                    <span className="text-[10px] text-zinc-500 truncate font-medium">Standard Account</span>
                 </div>
               )}
            </div>

            <Link
              href="/settings"
              title={isCollapsed ? "Settings" : ""}
              className={`flex items-center rounded-lg transition-all text-zinc-400 hover:text-zinc-50 hover:bg-zinc-950 group ${isCollapsed ? 'justify-center p-3' : 'px-3 py-2.5 gap-3'}`}
            >
              <Settings className="h-5 w-5 shrink-0" />
              {!isCollapsed && <span className="text-sm font-medium whitespace-nowrap">Settings</span>}
            </Link>
            
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              title={isCollapsed ? "Sign Out" : ""}
              className={`w-full flex items-center rounded-lg transition-all text-red-400 hover:text-red-300 hover:bg-red-500/10 group ${isCollapsed ? 'justify-center p-3' : 'px-3 py-2.5 gap-3'}`}
            >
              <LogOut className="h-5 w-5 shrink-0" />
              {!isCollapsed && <span className="text-sm font-medium whitespace-nowrap">Sign Out</span>}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
