"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Check,
  ExternalLink,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      setUnreadCount(0);
      setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
      setNotifications(
        notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
              Notifications & Alerts
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Live alert feed of service downtime events, automatic recovery notifications, and incident logs.
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs text-emerald-400 font-semibold transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Mark all as read</span>
            </button>
          )}
        </div>

        {/* Notifications Feed */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden divide-y divide-slate-800/60">
          {isLoading ? (
            <div className="py-20 text-center text-slate-500 text-xs">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-400" />
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-20 text-center text-slate-500 text-xs">
              <Bell className="w-8 h-8 mx-auto mb-2 text-slate-600 stroke-1" />
              No notifications yet. You will receive alerts when services change state.
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                className={`p-4 sm:p-5 flex items-start justify-between gap-4 transition-colors ${
                  !item.isRead ? "bg-slate-800/30" : "hover:bg-slate-800/10"
                }`}
              >
                <div className="flex items-start gap-3.5">
                  {item.type === "MONITOR_DOWN" && (
                    <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0 mt-0.5">
                      <XCircle className="w-5 h-5" />
                    </div>
                  )}
                  {item.type === "MONITOR_RECOVERED" && (
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0 mt-0.5">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                  )}
                  {item.type !== "MONITOR_DOWN" && item.type !== "MONITOR_RECOVERED" && (
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0 mt-0.5">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-100">
                        {item.title}
                      </h3>
                      {!item.isRead && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      )}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {item.message}
                    </p>
                    <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-500 font-mono">
                      <span>{new Date(item.createdAt).toLocaleString()}</span>
                      {item.link && (
                        <Link
                          href={item.link}
                          className="text-emerald-400 hover:underline flex items-center gap-1 font-sans"
                        >
                          <span>View Details</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                {!item.isRead && (
                  <button
                    onClick={() => handleMarkAsRead(item.id)}
                    className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors text-xs shrink-0"
                    title="Mark as read"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
