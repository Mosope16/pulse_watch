"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  CheckCircle,
  Clock,
  ExternalLink,
  Pause,
  Play,
  RefreshCw,
  Server,
  Zap,
  AlertTriangle,
  AlertOctagon,
  Edit2,
  Trash2,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { MetricCard } from "@/components/ui/MetricCard";
import { CreateMonitorModal } from "@/components/monitors/CreateMonitorModal";
import { formatDuration, formatInterval } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function MonitorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const monitorId = params.id as string;

  const [monitor, setMonitor] = useState<any>(null);
  const [recentChecks, setRecentChecks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingNow, setIsCheckingNow] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [lastCheckOutcome, setLastCheckOutcome] = useState<any>(null);

  const fetchMonitor = async () => {
    try {
      const res = await fetch(`/api/monitors/${monitorId}`);
      if (res.ok) {
        const data = await res.json();
        setMonitor(data.monitor);
        setRecentChecks(data.recentChecks || []);
      } else if (res.status === 404) {
        router.push("/monitors");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitor();
    const interval = setInterval(fetchMonitor, 10000);
    return () => clearInterval(interval);
  }, [monitorId]);

  const handleManualCheck = async () => {
    setIsCheckingNow(true);
    setLastCheckOutcome(null);
    try {
      const res = await fetch(`/api/monitors/${monitorId}/check`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setLastCheckOutcome(data.result);
        await fetchMonitor();
      }
    } finally {
      setIsCheckingNow(false);
    }
  };

  const handleTogglePause = async () => {
    try {
      await fetch(`/api/monitors/${monitorId}/toggle`, { method: "POST" });
      await fetchMonitor();
    } catch (err) {
      console.error("Toggle error:", err);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${monitor?.name}?`)) return;
    try {
      await fetch(`/api/monitors/${monitorId}`, { method: "DELETE" });
      router.push("/monitors");
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  if (isLoading || !monitor) {
    return (
      <DashboardLayout>
        <div className="py-24 text-center text-slate-500 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
          Loading monitor telemetry...
        </div>
      </DashboardLayout>
    );
  }

  const chartData = recentChecks.map((c) => ({
    time: new Date(c.createdAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    responseTime: c.responseTime,
    isSuccess: c.isSuccess,
  }));

  return (
    <DashboardLayout activeWorkspaceId={monitor.workspaceId}>
      <div className="space-y-6">
        {/* Navigation Breadcrumb & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <Link
              href="/monitors"
              className="p-2 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors shrink-0 mt-0.5 sm:mt-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold text-slate-100 truncate">{monitor.name}</h1>
                <StatusBadge status={monitor.status} size="sm" />
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
                <span className="shrink-0">{monitor.method}</span>
                <span className="truncate max-w-[170px] xs:max-w-[240px] sm:max-w-md">{monitor.url}</span>
                <a
                  href={monitor.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-500 hover:text-slate-300 shrink-0"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleManualCheck}
              disabled={isCheckingNow}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <Zap className={`w-3.5 h-3.5 ${isCheckingNow ? "animate-spin" : ""}`} />
              <span>{isCheckingNow ? "Testing..." : "Check Now"}</span>
            </button>

            <button
              onClick={handleTogglePause}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-colors"
            >
              {monitor.enabled ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-slate-400" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Resume</span>
                </>
              )}
            </button>

            <button
              onClick={() => setIsEditModalOpen(true)}
              className="p-2 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Edit Monitor"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleDelete}
              className="p-2 rounded-lg border border-slate-800 bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
              title="Delete Monitor"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Immediate Check Outcome Banner (if just triggered) */}
        {lastCheckOutcome && (
          <div
            className={`p-4 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
              lastCheckOutcome.isSuccess
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                : "bg-rose-500/10 border-rose-500/30 text-rose-200"
            }`}
          >
            <div className="flex items-start sm:items-center gap-2.5">
              {lastCheckOutcome.isSuccess ? (
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
              ) : (
                <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5 sm:mt-0" />
              )}
              <span>
                Manual check completed: <strong>{lastCheckOutcome.isSuccess ? "Success" : "Failed"}</strong> · HTTP{" "}
                {lastCheckOutcome.statusCode || "N/A"} · {lastCheckOutcome.responseTime}ms
                {lastCheckOutcome.errorMessage && ` (${lastCheckOutcome.errorMessage})`}
              </span>
            </div>
            <button
              onClick={() => setLastCheckOutcome(null)}
              className="text-xs opacity-75 hover:opacity-100 self-end sm:self-auto"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Key Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <MetricCard
            title="24-Hour Uptime"
            value={`${monitor.uptime24h}%`}
            subtitle="Calculated over 24h"
            icon={CheckCircle}
          />
          <MetricCard
            title="30-Day Uptime"
            value={`${monitor.uptime30d}%`}
            subtitle="Monthly availability SLA"
            icon={Activity}
          />
          <MetricCard
            title="Average Latency"
            value={monitor.avgResponseTime ? `${monitor.avgResponseTime}ms` : "—"}
            subtitle="24h response time"
            icon={Clock}
          />
          <MetricCard
            title="Check Interval"
            value={formatInterval(monitor.interval)}
            subtitle={`Timeout: ${monitor.timeout / 1000}s`}
            icon={Server}
          />
        </div>

        {/* Response Time Chart */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 space-y-4 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                Response Time History (Recent Checks)
              </h3>
              <p className="text-xs text-slate-400">
                Latency measurements across recent automated check ticks.
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Degraded threshold: {monitor.degradedThresholdMs}ms
            </span>
          </div>

          <div className="h-64 w-full min-w-0">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="monitorLatency" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="time"
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    unit="ms"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#334155",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="responseTime"
                    name="Latency (ms)"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#monitorLatency)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                No check history recorded yet. Click "Check Now" or wait for worker interval.
              </div>
            )}
          </div>
        </div>

        {/* Monitor Configuration Summary Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Health & Assertion Configuration</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-1">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-500 uppercase text-[10px] font-semibold block">Expected Status</span>
              <span className="text-slate-200 font-bold font-mono text-sm mt-0.5 block">HTTP {monitor.expectedStatus}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-500 uppercase text-[10px] font-semibold block">Consecutive Failures</span>
              <span className="text-slate-200 font-bold text-sm mt-0.5 block">{monitor.failureThreshold} checks</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-500 uppercase text-[10px] font-semibold block">Body Assertion</span>
              <span className="text-slate-200 font-mono text-xs mt-0.5 block truncate">
                {monitor.expectedText ? `"${monitor.expectedText}"` : "None configured"}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-500 uppercase text-[10px] font-semibold block">Last Checked</span>
              <span className="text-slate-200 text-xs mt-0.5 block">
                {monitor.lastCheckAt ? new Date(monitor.lastCheckAt).toLocaleTimeString() : "Pending"}
              </span>
            </div>
          </div>
        </div>

        {/* Recent Checks Table & Incident History Tabs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Checks History Table */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100">Recent Health Checks</h3>
              <span className="text-xs text-slate-400 font-mono">Showing last {recentChecks.length} checks</span>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs min-w-[520px]">
                <thead className="bg-slate-950/60 border-b border-slate-800 text-[10px] uppercase text-slate-400 tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">HTTP</th>
                    <th className="py-2.5 px-4">Latency</th>
                    <th className="py-2.5 px-4">Message / Reason</th>
                    <th className="py-2.5 px-4 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {recentChecks.map((check) => (
                    <tr key={check.id} className="hover:bg-slate-800/20">
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold ${
                            check.isSuccess
                              ? check.isDegraded
                                ? "bg-amber-500/10 text-amber-400"
                                : "bg-emerald-500/10 text-emerald-400"
                              : "bg-rose-500/10 text-rose-400"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              check.isSuccess
                                ? check.isDegraded
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                                : "bg-rose-500"
                            }`}
                          />
                          {check.isSuccess
                            ? check.isDegraded
                              ? "Degraded"
                              : "Pass"
                            : "Fail"}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-300">
                        {check.statusCode || "—"}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-300">
                        {check.responseTime}ms
                      </td>
                      <td className="py-2.5 px-4 text-slate-400 truncate max-w-xs">
                        {check.errorMessage || "Check verified successfully"}
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-500 font-mono text-[11px]">
                        {new Date(check.createdAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Incident History List */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center justify-between">
              <span>Incident History</span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                {monitor.incidents?.length || 0}
              </span>
            </h3>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {!monitor.incidents || monitor.incidents.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  <CheckCircle className="w-6 h-6 mx-auto mb-2 text-emerald-500/60" />
                  No incidents recorded for this monitor.
                </div>
              ) : (
                monitor.incidents.map((inc: any) => (
                  <div
                    key={inc.id}
                    className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          inc.status === "RESOLVED"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-rose-500/10 text-rose-400"
                        }`}
                      >
                        {inc.status}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(inc.startedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-200">{inc.title}</p>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      {inc.cause || "Health check failed"}
                    </p>
                    {inc.durationSeconds && (
                      <p className="text-[11px] text-slate-500 font-mono pt-1">
                        Downtime: {formatDuration(inc.durationSeconds)}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <CreateMonitorModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={fetchMonitor}
        workspaceId={monitor.workspaceId}
        initialData={monitor}
      />
    </DashboardLayout>
  );
}
