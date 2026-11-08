"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Activity,
  Plus,
  Search,
  Zap,
  Play,
  Pause,
  Edit2,
  Trash2,
  ExternalLink,
  RefreshCw,
  Server,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Sparkline } from "@/components/ui/Sparkline";
import { CreateMonitorModal } from "@/components/monitors/CreateMonitorModal";
import { formatInterval } from "@/lib/utils";

export default function MonitorsPage() {
  const [monitors, setMonitors] = useState<any[]>([]);
  const [workspace, setWorkspace] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingMonitor, setEditingMonitor] = useState<any>(null);

  const fetchMonitors = async () => {
    try {
      const res = await fetch("/api/monitors");
      if (res.ok) {
        const data = await res.json();
        setMonitors(data.monitors || []);
        if (data.workspace) setWorkspace(data.workspace);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitors();
  }, []);

  const handleTogglePause = async (id: string) => {
    try {
      await fetch(`/api/monitors/${id}/toggle`, { method: "POST" });
      await fetchMonitors();
    } catch (err) {
      console.error("Toggle error:", err);
    }
  };

  const handleManualCheck = async (id: string) => {
    try {
      await fetch(`/api/monitors/${id}/check`, { method: "POST" });
      await fetchMonitors();
    } catch (err) {
      console.error("Check error:", err);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete monitor "${name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await fetch(`/api/monitors/${id}`, { method: "DELETE" });
      await fetchMonitors();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const filteredMonitors = monitors.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.url.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "ALL" || m.status.toUpperCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout activeWorkspaceId={workspace?.id}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-100 tracking-tight">
              Monitors
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Configure endpoints, health criteria, intervals, and inspection thresholds.
            </p>
          </div>

          <button
            onClick={() => {
              setEditingMonitor(null);
              setIsCreateModalOpen(true);
            }}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-emerald-500/20 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create Monitor</span>
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border border-slate-800 bg-slate-900/60">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search monitors by name or URL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium shrink-0">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-300 focus:border-emerald-500 focus:outline-none"
            >
              <option value="ALL">All Monitors</option>
              <option value="UP">Operational (UP)</option>
              <option value="DEGRADED">Degraded</option>
              <option value="DOWN">Down (Outage)</option>
              <option value="PAUSED">Paused</option>
            </select>
          </div>
        </div>

        {/* Monitors Cards / List */}
        {isLoading ? (
          <div className="py-20 text-center text-slate-500 text-xs">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-400" />
            Loading monitors...
          </div>
        ) : filteredMonitors.length === 0 ? (
          <div className="py-20 text-center rounded-2xl border border-dashed border-slate-800 p-8 space-y-3">
            <Server className="w-10 h-10 mx-auto text-slate-600 stroke-1" />
            <h3 className="text-sm font-bold text-slate-200">No monitors found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Get started by creating a monitor to track your API or web service availability.
            </p>
            <button
              onClick={() => {
                setEditingMonitor(null);
                setIsCreateModalOpen(true);
              }}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
            >
              Add Your First Monitor
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredMonitors.map((m) => (
              <div
                key={m.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 hover:border-slate-700 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-5"
              >
                {/* Left: Info */}
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <Link
                      href={`/monitors/${m.id}`}
                      className="text-base font-bold text-slate-100 hover:text-emerald-400 transition-colors"
                    >
                      {m.name}
                    </Link>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {m.method}
                    </span>
                    <StatusBadge status={m.status} size="sm" />
                    {m.activeIncidentsCount > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        {m.activeIncidentsCount} Active Incident
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                    <span className="truncate max-w-[180px] xs:max-w-[240px] sm:max-w-md">{m.url}</span>
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-500 hover:text-slate-300 transition-colors shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 pt-1">
                    <span>
                      Interval: <strong className="text-slate-300">{formatInterval(m.interval)}</strong>
                    </span>
                    <span>
                      Timeout: <strong className="text-slate-300">{m.timeout / 1000}s</strong>
                    </span>
                    <span>
                      Expected: <strong className="text-slate-300">HTTP {m.expectedStatus}</strong>
                    </span>
                  </div>
                </div>

                {/* Center: Sparkline & Metrics */}
                <div className="w-full lg:w-72 space-y-2 shrink-0">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Recent Telemetry</span>
                    <span className="font-semibold text-slate-200">
                      {m.uptime24h}% Uptime (24h)
                    </span>
                  </div>
                  <Sparkline checks={m.sparkline || []} maxTicks={20} />
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>Latency: {m.avgResponseTime ? `${m.avgResponseTime}ms` : "—"}</span>
                    <span>
                      {m.lastCheckAt
                        ? `Checked ${new Date(m.lastCheckAt).toLocaleTimeString()}`
                        : "Never checked"}
                    </span>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-800 flex-wrap">
                  <button
                    onClick={() => handleManualCheck(m.id)}
                    title="Run Check Now"
                    className="p-2 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    <Zap className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleTogglePause(m.id)}
                    title={m.enabled ? "Pause Monitoring" : "Resume Monitoring"}
                    className="p-2 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                  >
                    {m.enabled ? (
                      <Pause className="w-4 h-4 text-slate-400" />
                    ) : (
                      <Play className="w-4 h-4 text-emerald-400" />
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setEditingMonitor(m);
                      setIsCreateModalOpen(true);
                    }}
                    title="Edit Configuration"
                    className="p-2 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(m.id, m.name)}
                    title="Delete Monitor"
                    className="p-2 rounded-lg border border-slate-800 bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <Link
                    href={`/monitors/${m.id}`}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 hover:text-white transition-colors ml-1"
                  >
                    Details &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateMonitorModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingMonitor(null);
        }}
        onSuccess={fetchMonitors}
        workspaceId={workspace?.id}
        initialData={editingMonitor}
      />
    </DashboardLayout>
  );
}
