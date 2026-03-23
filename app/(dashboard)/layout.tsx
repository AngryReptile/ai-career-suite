import { Sidebar } from '@/components/Sidebar';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

import { PageTransition } from '@/components/PageTransition';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  
  // TEMPORARY BYPASS FOR VISUAL VERIFICATION
  // if (!session) {
  //   redirect('/login');
  // }

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] w-full bg-zinc-950 text-zinc-50 font-sans selection:bg-indigo-500/30 p-2 sm:p-4 md:p-6 gap-2 sm:gap-4 md:gap-6 overflow-hidden relative z-0">
      
      {/* 1. Global Ambient Mesh Background */}
      <div className="absolute inset-0 z-[-1] overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full mix-blend-screen animate-pulse duration-10000"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-fuchsia-600/10 blur-[130px] rounded-full mix-blend-screen animate-pulse duration-7000"></div>
        <div className="absolute top-[20%] right-[20%] w-[30%] h-[30%] bg-emerald-500/5 blur-[100px] rounded-full mix-blend-screen"></div>
      </div>

      {/* Persistent Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-0 overflow-y-auto p-2 sm:p-4 lg:p-4 relative bg-black/40 backdrop-blur-3xl md:rounded-[2rem] rounded-2xl border border-white/[0.04] shadow-2xl transition-all duration-300 ease-in-out">
        <PageTransition>
          {children}
        </PageTransition>
      </main>
    </div>
  );
}
