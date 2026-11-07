"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  Bell,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ChevronDown,
  Plus,
  LogOut,
  Building,
  User as UserIcon,
} from "lucide-react";
import { signOut, useSession } from "@/lib/auth-client";

interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  role: string;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export function Navbar({ activeWorkspaceId }: { activeWorkspaceId?: string }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNewWorkspaceModalOpen, setIsNewWorkspaceModalOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);

  useEffect(() => {
    fetchWorkspaces();
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [activeWorkspaceId]);

  const fetchWorkspaces = async () => {
    try {
      const res = await fetch("/api/workspaces");
      if (res.ok) {
        const data = await res.json();
        setWorkspaces(data.workspaces || []);
      }
    } catch {
      // Ignore background network error
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // Ignore background network error
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    setIsCreatingWorkspace(true);
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newWorkspaceName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewWorkspaceName("");
        setIsNewWorkspaceModalOpen(false);
        await fetchWorkspaces();
        router.push(`/dashboard?workspaceId=${data.workspace.id}`);
      }
    } finally {
      setIsCreatingWorkspace(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {}
  };

  const currentWorkspace =
    workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];

  return (
    <>
      <header className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 flex items-center justify-between">
        {/* Left: Brand & Workspace Switcher */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
              <Activity className="w-4 h-4 animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-slate-100 tracking-tight text-base flex items-center gap-1.5">
                PulseWatch
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  v1.0
                </span>
              </span>
            </div>
          </Link>

          {/* Workspace Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800/60 text-sm font-medium text-slate-200 transition-colors"
            >
              <Building className="w-4 h-4 text-slate-400" />
              <span className="max-w-[140px] truncate">
                {currentWorkspace?.name || "Select Workspace"}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
            </button>

            {isWorkspaceMenuOpen && (
              <div
                className="absolute left-0 mt-2 w-56 rounded-xl border border-slate-800 bg-slate-900 shadow-2xl py-1 z-50 text-sm"
                onClick={() => setIsWorkspaceMenuOpen(false)}
              >
                <div className="px-3 py-2 text-xs font-semibold text-slate-400 border-b border-slate-800 uppercase tracking-wider">
                  Workspaces
                </div>
                <div className="max-h-60 overflow-y-auto py-1">
                  {workspaces.map((ws) => (
                    <Link
                      key={ws.id}
                      href={`/dashboard?workspaceId=${ws.id}`}
                      className={`flex items-center justify-between px-3 py-2 hover:bg-slate-800/80 transition-colors ${
                        ws.id === currentWorkspace?.id
                          ? "text-emerald-400 font-semibold bg-emerald-500/10"
                          : "text-slate-300"
                      }`}
                    >
                      <span className="truncate">{ws.name}</span>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        {ws.role}
                      </span>
                    </Link>
                  ))}
                </div>
                <div className="border-t border-slate-800 pt-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsWorkspaceMenuOpen(false);
                      setIsNewWorkspaceModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
                  >
                    <Plus className="w-4 h-4 text-emerald-400" />
                    <span>Create Workspace</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Notifications & Profile */}
        <div className="flex items-center gap-3">
          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="relative p-2 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800/60 text-slate-300 hover:text-white transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {isNotificationsOpen && (
              <div
                className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-slate-800 bg-slate-900 shadow-2xl py-2 z-50 text-sm"
              >
                <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between">
                  <span className="font-semibold text-slate-200">
                    Notifications
                  </span>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 text-xs">
                      No notifications yet.
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3.5 hover:bg-slate-800/40 transition-colors ${
                          !item.isRead ? "bg-slate-800/20" : ""
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          {item.type === "MONITOR_DOWN" && (
                            <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                          )}
                          {item.type === "MONITOR_RECOVERED" && (
                            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          )}
                          {item.type !== "MONITOR_DOWN" &&
                            item.type !== "MONITOR_RECOVERED" && (
                              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                            )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-200 leading-tight">
                              {item.title}
                            </p>
                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                              {item.message}
                            </p>
                            <span className="text-[10px] text-slate-500 mt-1.5 block">
                              {new Date(item.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="border-t border-slate-800 px-3 py-2 text-center">
                  <Link
                    href="/notifications"
                    onClick={() => setIsNotificationsOpen(false)}
                    className="text-xs text-slate-400 hover:text-emerald-400 transition-colors"
                  >
                    View all notifications &rarr;
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 p-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800/60 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs uppercase">
                {session?.user?.name ? session.user.name.charAt(0) : <UserIcon className="w-3.5 h-3.5" />}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isUserMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-800 bg-slate-900 shadow-2xl py-1 z-50 text-sm"
                onClick={() => setIsUserMenuOpen(false)}
              >
                <div className="px-3 py-2 border-b border-slate-800">
                  <p className="text-xs font-semibold text-slate-200 truncate">
                    {session?.user?.name || "User"}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {session?.user?.email}
                  </p>
                </div>
                <Link
                  href="/settings"
                  className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
                >
                  Workspace Settings
                </Link>
                <Link
                  href="/settings/members"
                  className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
                >
                  Team Members
                </Link>
                <div className="border-t border-slate-800 my-1" />
                <button
                  onClick={async () => {
                    await signOut();
                    router.push("/login");
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* New Workspace Modal */}
      {isNewWorkspaceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-100">Create New Workspace</h2>
            <p className="text-xs text-slate-400 mt-1">
              Workspaces isolate your team, monitors, and public status pages.
            </p>
            <form onSubmit={handleCreateWorkspace} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Workspace Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Production"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewWorkspaceModalOpen(false)}
                  className="rounded-lg border border-slate-800 px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800/60 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingWorkspace}
                  className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400 transition-colors disabled:opacity-50"
                >
                  {isCreatingWorkspace ? "Creating..." : "Create Workspace"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
