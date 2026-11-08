"use client";

import { useState, useEffect } from "react";
import {
  BarChart3,
  CheckCircle,
  Clock,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MetricCard } from "@/components/ui/MetricCard";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/analytics");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const summary = data?.summary || {
    totalMonitors: 0,
    overallUptime24h: 100,
    overallUptime30d: 100,
    overallAvgResponseTime: 0,
    activeIncidents: 0,
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
              Telemetry Analytics & SLAs
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Historical latency profiles, uptime availability calculations, and incident frequencies.
            </p>
          </div>
          <button
            onClick={fetchAnalytics}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-colors w-full sm:w-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* High Level Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="24h Availability"
            value={`${summary.overallUptime24h}%`}
            subtitle="Overall 24-hour SLA"
            icon={CheckCircle}
          />
          <MetricCard
            title="30d Availability"
            value={`${summary.overallUptime30d}%`}
            subtitle="Overall 30-day SLA"
            icon={TrendingUp}
          />
          <MetricCard
            title="Average Latency"
            value={`${summary.overallAvgResponseTime}ms`}
            subtitle="Cross-service average"
            icon={Zap}
          />
          <MetricCard
            title="Incident Volume"
            value={summary.activeIncidents}
            subtitle="Active unresolved outages"
            icon={AlertTriangle}
          />
        </div>

        {/* Charts Row 1: Response Time & Uptime Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 space-y-4 min-w-0">
            <h3 className="text-sm font-bold text-slate-100">
              Response Time Over Time (24h)
            </h3>
            <div className="h-64 w-full min-w-0">
              {data?.charts?.latency && data.charts.latency.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.charts.latency}>
                    <defs>
                      <linearGradient id="latencyArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit="ms" />
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
                      name="Average Latency"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fill="url(#latencyArea)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                  Telemetry data populates as background worker checks execute.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 space-y-4 min-w-0">
            <h3 className="text-sm font-bold text-slate-100">
              Uptime Percentage Trend (24h)
            </h3>
            <div className="h-64 w-full min-w-0">
              {data?.charts?.latency && data.charts.latency.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.charts.latency}>
                    <defs>
                      <linearGradient id="uptimeArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} domain={[90, 100]} tickLine={false} unit="%" />
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
                      dataKey="uptimePct"
                      name="Uptime %"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#uptimeArea)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                  Uptime telemetry will display here.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Charts Row 2: Incident Frequency & Status Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 space-y-4 min-w-0">
            <h3 className="text-sm font-bold text-slate-100">
              Incident Frequency (Last 7 Days)
            </h3>
            <div className="h-64 w-full min-w-0">
              {data?.charts?.incidentFrequency ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.charts.incidentFrequency}>
                    <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#334155",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="count" name="Incidents" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                  No incidents logged in the past 7 days.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 space-y-4 min-w-0">
            <h3 className="text-sm font-bold text-slate-100">
              Infrastructure Status Distribution
            </h3>
            <div className="h-64 w-full min-w-0 flex items-center justify-center">
              {data?.charts?.statusDistribution && data.charts.statusDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.charts.statusDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={5}
                    >
                      {data.charts.statusDistribution.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
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
                <div className="text-slate-500 text-xs">No status data available.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
