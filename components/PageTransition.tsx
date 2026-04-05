"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";

  // Contextual Theming logic
  const getGlowColor = () => {
    if (pathname.includes('/omni-scout')) return 'bg-indigo-600/15';
    if (pathname.includes('/notes')) return 'bg-emerald-600/15';
    if (pathname.includes('/summarizer')) return 'bg-rose-600/15';
    if (pathname.includes('/tutor')) return 'bg-fuchsia-600/15';
    if (pathname.includes('/dashboard')) return 'bg-violet-600/15';
    return 'bg-zinc-600/10';
  };

  return (
    <>
      {/* Contextual Ambient Glow */}
      <div 
        className={`fixed inset-0 pointer-events-none transition-colors duration-[1.5s] ease-in-out bg-gradient-to-br from-transparent via-transparent ${getGlowColor()} to-black/20`}
        style={{ zIndex: -10 }}
      />
      
      {/* Simple fade-in on mount — no AnimatePresence/exit animations that can get stuck */}
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="w-full flex-1 flex flex-col min-h-0"
      >
        {children}
      </motion.div>
    </>
  );
}
