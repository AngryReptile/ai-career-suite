"use client";

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { DashboardShell } from "@/components/DashboardShell";
import { 
  Users, Activity, ShieldAlert, Cpu, 
  TerminalSquare, Shield, ShieldCheck, Search,
  Briefcase, FileText, Hexagon, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'users' | 'analytics'>('analytics');

  const { data: statsData, isLoading: statsLoading } = useSWR('/api/admin/stats', fetcher, { revalidateOnFocus: false, dedupingInterval: 60000 });
  const { data: usersData, mutate: mutateUsers, isLoading: usersLoading } = useSWR('/api/admin/users', fetcher, { revalidateOnFocus: false, dedupingInterval: 60000 });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && (session?.user as any)?.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  if (status === 'loading' || (session?.user as any)?.role !== 'ADMIN') {
    return (
      <DashboardShell className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Hexagon className="w-12 h-12 text-blue-400 animate-spin" style={{ animationDuration: '3s' }} />
          <p className="text-zinc-300 font-sans text-sm tracking-wide font-medium">Verifying Administrator Privileges...</p>
        </div>
      </DashboardShell>
    );
  }

  const handleRoleToggle = async (userId: string, currentRole: string) => {
    if (userId === (session?.user as any)?.id) return; // Cant demote self
    const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
    
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole })
      });
      if (res.ok) {
        mutateUsers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === (session?.user as any)?.id) return; // Cant delete self
    if (!confirm("Irreversible Action: Terminate user account explicitly?")) return;

    try {
      const res = await fetch(`/api/admin/users?userId=${userId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        mutateUsers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <DashboardShell 
      unconstrainedHeight={true}
      header={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl flex items-center justify-center shrink-0 shadow-lg">
               <ShieldAlert className="w-6 h-6 text-blue-400" />
            </div>
            <div>
               <h1 className="text-2xl font-bold text-white tracking-tight">Admin OS</h1>
               <p className="text-sm text-blue-400/80 font-medium">System Administrator Operations</p>
            </div>
          </div>
        </div>
      }
    >
      <div className="max-w-[1600px] mx-auto w-full pb-20">
        
        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-8 font-sans text-sm font-semibold border-b border-white/10 pb-4">
          <button 
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-xl transition-all ${activeTab === 'analytics' ? 'bg-white/10 text-white shadow-inner border border-white/10' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
          >
            Platform Analytics
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-xl transition-all ${activeTab === 'users' ? 'bg-white/10 text-white shadow-inner border border-white/10' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
          >
            User Management Matrix
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'analytics' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} key="analytics" className="space-y-8">
              
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Total Users", value: statsData?.stats?.totalUsers || 0, icon: Users, suffix: " USR" },
                  { label: "Total Resumes", value: statsData?.stats?.totalResumes || 0, icon: FileText, suffix: " DOC" },
                  { label: "Total Scouts", value: statsData?.stats?.totalScouts || 0, icon: Search, suffix: " QR" },
                  { label: "Total Notes", value: statsData?.stats?.totalNotes || 0, icon: TerminalSquare, suffix: " TXT" }
                ].map((stat, i) => (
                  <div key={i} className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-6 relative overflow-hidden group hover:bg-white/10 transition-colors shadow-2xl">
                     <stat.icon className="absolute -bottom-4 -right-4 w-24 h-24 text-white/5 group-hover:text-blue-500/10 transition-colors z-0" />
                     <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2 relative z-10">{stat.label}</h3>
                     <div className="flex items-end gap-2 relative z-10">
                       <span className="text-4xl font-bold text-white tracking-tight">{statsLoading ? '-' : stat.value}</span>
                     </div>
                  </div>
                ))}
              </div>

              {/* Activity Stream */}
              <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden mt-6">
                <div className="bg-white/5 p-5 border-b border-white/10 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-white tracking-wide">Live Global Stream</h2>
                  <Activity className="w-4 h-4 text-blue-400 animate-pulse" />
                </div>
                <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto custom-scrollbar">
                  {!statsData?.latestActivities?.length && !statsLoading && (
                    <div className="p-8 text-center text-zinc-500 font-mono text-sm">NO_DATA_STREAM</div>
                  )}
                  {statsData?.latestActivities?.map((act: any) => (
                    <div key={act.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-4 min-w-0">
                         <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] shrink-0"></div>
                         <div className="min-w-0">
                           <p className="text-sm font-semibold text-white truncate">{act.title}</p>
                           <p className="text-xs text-zinc-400 truncate mt-0.5">{act.user.email}</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-semibold text-zinc-500 shrink-0">
                        <span className="bg-white/10 text-zinc-300 border border-white/10 rounded-lg px-2.5 py-1 whitespace-nowrap">{act.type}</span>
                        <span>{new Date(act.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'users' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} key="users" className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden mt-6">
               <div className="bg-white/5 p-5 border-b border-white/10 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-white tracking-wide">Global Entities Management</h2>
                  <Users className="w-4 h-4 text-blue-400" />
               </div>
               
               <div className="overflow-x-auto">
                 <table className="w-full text-left font-sans text-sm">
                   <thead className="text-xs font-semibold text-zinc-500 uppercase tracking-wide border-b border-white/10 bg-white/5">
                     <tr>
                       <th className="py-5 px-6">User Account</th>
                       <th className="py-5 px-6">Role</th>
                       <th className="py-5 px-6 text-center">Activity Metrics</th>
                       <th className="py-5 px-6 text-right">Actions</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-white/5 border-b border-white/5">
                     {usersLoading ? (
                       <tr><td colSpan={4} className="p-10 text-center text-zinc-400 font-medium">Fetching secure records...</td></tr>
                     ) : (
                       usersData?.users?.map((u: any) => (
                         <tr key={u.id} className="hover:bg-white/5 transition-colors group">
                           <td className="py-4 px-6">
                             <div className="flex items-center gap-4">
                               <div className="w-10 h-10 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl flex items-center justify-center shrink-0 shadow-inner group-hover:bg-white/20 transition-all">
                                 {u.role === 'ADMIN' ? <ShieldCheck className="w-5 h-5 text-blue-400" /> : <Users className="w-5 h-5 text-zinc-400" />}
                               </div>
                               <div>
                                 <div className="text-white font-semibold">{u.name || 'Unnamed User'}</div>
                                 <div className="text-xs text-zinc-400 mt-0.5 truncate max-w-[200px]">{u.email}</div>
                               </div>
                             </div>
                           </td>
                           <td className="py-4 px-6">
                             <span className={`px-3 py-1 text-xs font-semibold rounded-lg border ${u.role === 'ADMIN' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-white/5 text-zinc-300 border-white/10'}`}>
                               {u.role === 'ADMIN' ? 'Administrator' : 'User'}
                             </span>
                           </td>
                           <td className="py-4 px-6 text-center">
                             <div className="flex items-center justify-center gap-5 text-zinc-400 text-xs font-medium">
                               <span title="Resumes" className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> {u._count.userResumes}</span>
                               <span title="Scouts" className="flex items-center gap-1.5"><Search className="w-3.5 h-3.5" /> {u._count.scoutHistory}</span>
                             </div>
                           </td>
                           <td className="py-4 px-6 text-right space-x-2">
                             {(session?.user as any)?.id !== u.id && (
                               <>
                                 <button 
                                   onClick={() => handleRoleToggle(u.id, u.role)}
                                   className="text-xs bg-white/5 hover:bg-blue-500 text-white border border-white/10 hover:border-blue-500 rounded-xl font-semibold px-4 py-2 transition-all shadow-sm active:scale-95"
                                 >
                                    Toggle Role
                                 </button>
                                 <button 
                                   onClick={() => handleDeleteUser(u.id)}
                                   className="text-xs bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 hover:border-red-500 rounded-xl font-semibold px-3 py-2 transition-all shadow-sm active:scale-95 inline-flex items-center justify-center"
                                 >
                                    <Trash2 className="w-4 h-4" />
                                 </button>
                               </>
                             )}
                           </td>
                         </tr>
                       ))
                     )}
                   </tbody>
                 </table>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardShell>
  );
}
