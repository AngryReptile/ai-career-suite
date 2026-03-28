"use client";

import React from "react";

export interface DashboardShellProps {
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  children: React.ReactNode;
  unconstrainedHeight?: boolean;
  className?: string;
}

export function DashboardShell({ header, sidebar, children, unconstrainedHeight, className }: DashboardShellProps) {
  return (
    <div className={`flex flex-col w-full animate-in fade-in duration-700 ${unconstrainedHeight ? 'min-h-full' : 'h-full'} ${className || ''}`}>
      <div className={`w-full flex-1 flex flex-col gap-4 sm:gap-6 ${unconstrainedHeight ? '' : 'min-h-0'}`}>
        {/* Slot 1: The Header (Floating) */}
        <header className="flex w-full flex-col md:flex-row items-start md:items-center justify-between shrink-0 tracking-tight gap-4">
          {header}
        </header>

        {/* Slot 2 & 3: The Content Split (Floating Panels) */}
        <div className={`flex-1 flex flex-col lg:flex-row gap-4 sm:gap-6 w-full mb-2 ${unconstrainedHeight ? '' : 'min-h-0'}`}>
          {/* Left Slot (Sidebar) */}
          {sidebar && (
            <aside className={`w-full md:w-[260px] lg:w-[280px] xl:w-[320px] shrink-0 flex flex-col custom-scrollbar bg-white/[0.04] backdrop-blur-[20px] backdrop-saturate-150 animate-in fade-in zoom-in-95 duration-700 md:rounded-[2rem] rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/20 ${unconstrainedHeight ? 'lg:h-fit sticky top-4' : 'h-[350px] lg:h-full overflow-hidden'}`}>
              {sidebar}
            </aside>
          )}

          {/* Right Slot (Main Workspace) */}
          <main className={`flex-1 flex flex-col relative bg-white/[0.04] backdrop-blur-[20px] backdrop-saturate-150 animate-in fade-in zoom-in-95 duration-1000 md:rounded-[2rem] rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/20 ${unconstrainedHeight ? 'overflow-visible h-fit' : 'overflow-hidden min-h-[500px] lg:min-h-0'}`}>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
