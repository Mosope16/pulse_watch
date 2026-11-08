"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Activity,
  AlertOctagon,
  CheckCircle,
  Clock,
  Plus,
  RefreshCw,
  Search,
  Server,
  Zap,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Sparkline } from "@/components/ui/Sparkline";
import { CreateMonitorModal } from "@/components/monitors/CreateMonitorModal";
import { formatInterval, formatDuration } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

function DashboardContent() {
  const searchParams = useSearchParams();
  const workspaceIdParam = searchParams.get("workspaceId");

  const [monitors, setMonitors] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [workspace, setWorkspace] = useState<any>(null);
  const [statusPageSlug, setStatusPageSlug] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const loadDashboardData = async (showLoadingState = false) => {
    if (showLoadingState) setIsLoading(true);
    setIsRefreshing(true);

    try {
      const qs = workspaceIdParam ? `?workspaceId=${workspaceIdParam}` : "";

      const [monitorsRes, analyticsRes, incidentsRes, statusPageRes] =
        await Promise.all([
          fetch(`/api/monitors${qs}`),
          fetch(`/api/analytics${qs}`),
          fetch(`/api/incidents?status=ACTIVE${workspaceIdParam ? `&workspaceId=${workspaceIdParam}` : ""}`),
          fetch(`/api/status-page${qs}`),
        ]);

      if (monitorsRes.ok) {
        const mData = await monitorsRes.json();
        setMonitors(mData.monitors || []);
        if (mData.workspace) setWorkspace(mData.workspace);
      }

      if (analyticsRes.ok) {
        const aData = await analyticsRes.json();
        setAnalytics(aData);
      }

      if (incidentsRes.ok) {
        const iData = await incidentsRes.json();
        setIncidents(iData.incidents || []);
      }

      if (statusPageRes.ok) {
        const spData = await statusPageRes.json();
        if (spData.statusPage) setStatusPageSlug(spData.statusPage.slug);
      }
    } catch (err) {
      console.error("Dashboard data load error:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData(true);
    // Auto-refresh every 15 seconds to reflect worker check updates
    const interval = setInterval(() => loadDashboardData(false), 15000);
    return () => clearInterval(interval);
  }, [workspaceIdParam]);

  const handleManualCheck = async (monitorId: string) => {
    try {
      await fetch(`/api/monitors/${monitorId}/check`, { method: "POST" });
      await loadDashboardData(false);
    } catch (err) {
      console.error("Manual check trigger error:", err);
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

  const summary = analytics?.summary || {
    totalMonitors: monitors.length,
    upMonitors: monitors.filter((m) => m.status === "UP").length,
    degradedMonitors: monitors.filter((m) => m.status === "DEGRADED").length,
    downMonitors: monitors.filter((m) => m.status === "DOWN").length,
    activeIncidents: incidents.length,
    overallUptime24h: 100.0,
    overallAvgResponseTime: 0,
  };

  return (
    <DashboardLayout
      activeWorkspaceId={workspace?.id}
      statusPageSlug={statusPageSlug}
    >
      <div className="space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-100 tracking-tight">
              {workspace?.name || "Workspace"} Overview
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Real-time health telemetry, scheduled monitoring, and active incident status.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => loadDashboardData(false)}
              disabled={isRefreshing}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
              />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-emerald-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Add Monitor</span>
            </button>
          </div>
        </div>

        {/* Active Outage Warning Alert Banner */}
        {incidents.length > 0 && (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 sm:p-5 text-rose-200 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 shrink-0">
                <AlertOctagon className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-rose-100">
                  {incidents.length} Active Incident{incidents.length > 1 ? "s" : ""} In Progress
                </h3>
                <p className="text-xs text-rose-300/80 mt-0.5">
                  {incidents[0].title} — {incidents[0].cause || "Consecutive check failures"}
                </p>
              </div>
            </div>
            <Link
              href="/incidents"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-500 text-white font-semibold text-xs hover:bg-rose-400 transition-colors shrink-0 w-full sm:w-auto"
            >
              <span>View Incident Timeline</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* High-level Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <MetricCard
            title="Total Monitors"
            value={summary.totalMonitors}
            subtitle={`${summary.upMonitors} operational, ${summary.downMonitors} down`}
            icon={Server}
          />
          <MetricCard
            title="24h Uptime"
            value={`${summary.overallUptime24h}%`}
            subtitle="Weighted availability"
            icon={CheckCircle}
            trend={{
              value: summary.overallUptime24h >= 99.9 ? "High SLA" : "Degraded",
              positive: summary.overallUptime24h >= 99.0,
            }}
          />
          <MetricCard
            title="Avg Latency"
            value={`${summary.overallAvgResponseTime}ms`}
            subtitle="Response time avg"
            icon={Zap}
          />
          <MetricCard
            title="Active Incidents"
            value={summary.activeIncidents}
            subtitle={summary.activeIncidents === 0 ? "Zero ongoing incidents" : "Requires attention"}
            icon={AlertTriangle}
            trend={{
              value: summary.activeIncidents === 0 ? "Clean" : "Alert",
              positive: summary.activeIncidents === 0,
            }}
          />
        </div>

        {/* Latency Trends Chart & Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 space-y-4 min-w-0">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  Response Time Trend (Last 24 Hours)
                </h3>
                <p className="text-xs text-slate-400">
                  Aggregated average latency across all monitored services.
                </p>
              </div>
            </div>

            <div className="h-64 w-full min-w-0">
              {analytics?.charts?.latency && analytics.charts.latency.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.charts.latency}>
                    <defs>
                      <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="time"
                      stroke="#64748b"
                      fontSize={11}
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
                      dataKey="avgLatency"
                      name="Avg Latency (ms)"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#latencyGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
                  <Activity className="w-6 h-6 stroke-1 text-slate-600" />
                  <span>Telemetry data populates as background worker checks execute.</span>
                </div>
              )}
            </div>
          </div>

          {/* Status Breakdown Donut */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 space-y-4 flex flex-col justify-between min-w-0">
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                Monitor Status Distribution
              </h3>
              <p className="text-xs text-slate-400">
                Service health breakdown
              </p>
            </div>

            <div className="h-44 w-full min-w-0 flex items-center justify-center">
              {analytics?.charts?.statusDistribution &&
              analytics.charts.statusDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.charts.statusDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={4}
                    >
                      {analytics.charts.statusDistribution.map(
                        (entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        )
                      )}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#334155",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-slate-500 text-xs">
                  No active monitors yet
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-slate-400">Operational: {summary.upMonitors}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-slate-400">Degraded: {summary.degradedMonitors}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-slate-400">Down: {summary.downMonitors}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-500" />
                <span className="text-slate-400">Paused: {summary.pausedMonitors || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Monitored Services Table */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
          {/* Table Controls */}
          <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-bold text-slate-100">
                Monitored Services
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold">
                {filteredMonitors.length}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter by name or URL..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:outline-none sm:w-64"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-300 focus:border-emerald-500 focus:outline-none"
              >
                <option value="ALL">All Status</option>
                <option value="UP">Operational</option>
                <option value="DEGRADED">Degraded</option>
                <option value="DOWN">Down</option>
                <option value="PAUSED">Paused</option>
              </select>
            </div>
          </div>

          {/* Monitors Table */}
          {isLoading ? (
            <div className="py-16 text-center text-slate-500 text-xs">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-400" />
              Loading monitored infrastructure...
            </div>
          ) : filteredMonitors.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs space-y-3">
              <Server className="w-8 h-8 mx-auto text-slate-600 stroke-1" />
              <p className="font-semibold text-slate-300">No monitors match your criteria.</p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-colors text-xs"
              >
                Create Your First Monitor
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="py-3 px-4">Service</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Recent Checks</th>
                    <th className="py-3 px-4">24h Uptime</th>
                    <th className="py-3 px-4">Latency</th>
                    <th className="py-3 px-4">Interval</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredMonitors.map((m) => (
                    <tr
                      key={m.id}
                      className="hover:bg-slate-800/30 transition-colors group"
                    >
                      {/* Name & URL */}
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/monitors/${m.id}`}
                          className="font-bold text-slate-100 hover:text-emerald-400 transition-colors flex items-center gap-2"
                        >
                          <span>{m.name}</span>
                          <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-slate-800 text-slate-400">
                            {m.method}
                          </span>
                        </Link>
                        <p className="text-[11px] text-slate-400 font-mono truncate max-w-xs mt-0.5">
                          {m.url}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={m.status} size="sm" />
                      </td>

                      {/* Sparkline Strip */}
                      <td className="py-3.5 px-4 min-w-[140px] max-w-[200px]">
                        <Sparkline checks={m.sparkline || []} maxTicks={15} />
                      </td>

                      {/* Uptime */}
                      <td className="py-3.5 px-4 font-semibold text-slate-200">
                        {m.uptime24h}%
                      </td>

                      {/* Latency */}
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {m.avgResponseTime ? `${m.avgResponseTime}ms` : "—"}
                      </td>

                      {/* Interval */}
                      <td className="py-3.5 px-4 text-slate-400">
                        {formatInterval(m.interval)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleManualCheck(m.id)}
                            title="Trigger immediate health check"
                            className="p-1.5 rounded-md border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                          >
                            <Zap className="w-3.5 h-3.5 text-amber-400" />
                          </button>
                          <Link
                            href={`/monitors/${m.id}`}
                            className="px-2.5 py-1 rounded-md border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 transition-colors font-medium text-[11px]"
                          >
                            Details
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Monitor Modal */}
      <CreateMonitorModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => loadDashboardData(false)}
        workspaceId={workspace?.id}
      />
    </DashboardLayout>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="flex items-center gap-3 text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin text-emerald-500" />
            <span>Loading dashboard...</span>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
