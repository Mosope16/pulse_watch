"use client";

import { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";

interface DashboardLayoutProps {
  children: ReactNode;
  activeWorkspaceId?: string;
  statusPageSlug?: string;
}

export function DashboardLayout({
  children,
  activeWorkspaceId,
  statusPageSlug,
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      <Navbar activeWorkspaceId={activeWorkspaceId} />
      <div className="flex-1 flex">
        <Sidebar statusPageSlug={statusPageSlug} />
        <main className="flex-1 min-w-0 p-6 lg:p-10 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
