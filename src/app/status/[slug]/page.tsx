"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Activity,
  CheckCircle,
  AlertTriangle,
  AlertOctagon,
  Clock,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDuration } from "@/lib/utils";

export default function PublicStatusPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`/api/public/status/${slug}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setError("Status page not found or is currently private.");
      }
    } catch {
      setError("Failed to load status information.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 20000);
    return () => clearInterval(interval);
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-400 mb-4" />
        <p className="text-sm text-slate-400">Loading system status...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-400 mb-4 stroke-1" />
        <h1 className="text-xl font-bold text-slate-200">Status Page Unavailable</h1>
        <p className="text-xs text-slate-400 mt-2 max-w-sm">
          {error || "The requested status page could not be found."}
        </p>
      </div>
    );
  }

  const { statusPage, systemStatus, systemStatusMessage, monitors, activeIncidents, pastIncidents } = data;

  const getStatusBannerClass = () => {
    switch (systemStatus) {
      case "OPERATIONAL":
        return "bg-emerald-500/10 border-emerald-500/30 text-emerald-300";
      case "DEGRADED":
        return "bg-amber-500/10 border-amber-500/30 text-amber-300";
      case "PARTIAL_OUTAGE":
        return "bg-rose-500/10 border-rose-500/30 text-rose-300";
      case "MAJOR_OUTAGE":
        return "bg-rose-600/20 border-rose-500/40 text-rose-200";
      default:
        return "bg-emerald-500/10 border-emerald-500/30 text-emerald-300";
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Public Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-sm text-slate-100 tracking-tight truncate">
                {statusPage.title}
              </h1>
              <p className="text-[11px] text-slate-400 truncate">by {statusPage.workspaceName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Telemetry
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-10">
        {/* Overall System Status Hero */}
        <div className={`p-5 sm:p-8 rounded-3xl border shadow-2xl flex flex-col sm:flex-row items-start sm:items-center gap-4 ${getStatusBannerClass()}`}>
          {systemStatus === "OPERATIONAL" ? (
            <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 shrink-0">
              <CheckCircle className="w-8 h-8" />
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 shrink-0">
              <AlertOctagon className="w-8 h-8 animate-pulse" />
            </div>
          )}
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              {systemStatusMessage}
            </h2>
            <p className="text-xs opacity-80 mt-1">
              {statusPage.description || "Real-time service health, uptime, and incident reports."}
            </p>
          </div>
        </div>

        {/* Active Incidents Banner (if any) */}
        {activeIncidents && activeIncidents.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
              <AlertOctagon className="w-4 h-4" />
              <span>Active Incidents ({activeIncidents.length})</span>
            </h3>

            <div className="space-y-4">
              {activeIncidents.map((incident: any) => (
                <div
                  key={incident.id}
                  className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 sm:p-5 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500 text-white">
                      {incident.status}
                    </span>
                    <span className="text-xs text-rose-300 font-mono">
                      Started: {new Date(incident.startedAt).toLocaleString()}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-slate-100">
                    {incident.title}
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {incident.cause}
                  </p>

                  {/* Updates */}
                  {incident.updates && incident.updates.length > 0 && (
                    <div className="border-t border-rose-500/20 pt-3 space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-rose-300">
                        Updates:
                      </span>
                      {incident.updates.map((update: any) => (
                        <div key={update.id} className="text-xs text-slate-300 bg-slate-950/40 p-2.5 rounded-lg">
                          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                            <span className="font-semibold text-rose-300">{update.status}</span>
                            <span>{new Date(update.createdAt).toLocaleTimeString()}</span>
                          </div>
                          <p>{update.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Monitored Services Component List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Services & Components
            </h3>
            <span className="text-xs text-slate-500">90-Day Availability SLA</span>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 divide-y divide-slate-800/80 overflow-hidden shadow-sm">
            {monitors.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No public components registered yet.
              </div>
            ) : (
              monitors.map((m: any) => (
                <div key={m.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-100">{m.name}</h4>
                      <StatusBadge status={m.status} size="sm" />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 font-mono">
                      <span>30d Uptime: <strong className="text-slate-300">{m.uptime30d}%</strong></span>
                      {m.avgResponseTime > 0 && (
                        <span>Avg Latency: <strong className="text-slate-300">{m.avgResponseTime}ms</strong></span>
                      )}
                    </div>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <span className="text-xs font-semibold text-emerald-400 font-mono">
                      {m.status === "UP" ? "100% Operational" : m.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Past Resolved Incidents */}
        <div className="space-y-4 pt-4 border-t border-slate-800/80">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Past Incidents (Last 14 Days)
          </h3>

          {!pastIncidents || pastIncidents.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs bg-slate-900/30 rounded-2xl border border-slate-800">
              No incidents reported in the last 14 days.
            </div>
          ) : (
            <div className="space-y-3">
              {pastIncidents.map((incident: any) => (
                <div
                  key={incident.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      RESOLVED
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(incident.resolvedAt || incident.startedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-200">{incident.title}</h4>
                  <p className="text-slate-400 text-xs">{incident.cause}</p>
                  {incident.durationSeconds && (
                    <p className="text-[11px] text-slate-500 font-mono">
                      Total Downtime Duration: {formatDuration(incident.durationSeconds)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="pt-10 border-t border-slate-800/80 text-center text-xs text-slate-500 space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Powered by <strong>PulseWatch</strong> Monitoring Platform</span>
          </div>
          <p className="text-[11px]">
            Automated health checks executed across background distributed workers.
          </p>
        </footer>
      </main>
    </div>
  );
}
