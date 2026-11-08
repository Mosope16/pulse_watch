"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  History,
  RefreshCw,
  Search,
  Filter,
  CheckCircle,
  AlertOctagon,
  AlertTriangle,
  Server,
  Zap,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function CheckHistoryPage() {
  const [checks, setChecks] = useState<any[]>([]);
  const [monitors, setMonitors] = useState<any[]>([]);
  const [selectedMonitorId, setSelectedMonitorId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);

  const fetchChecks = async () => {
    setIsLoading(true);
    try {
      let url = `/api/checks?page=${page}&limit=40`;
      if (selectedMonitorId) url += `&monitorId=${selectedMonitorId}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setChecks(data.checks || []);
        setMonitors(data.monitors || []);
        setPagination(data.pagination);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChecks();
  }, [page, selectedMonitorId]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
              Check History
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Detailed chronological record of every automated health check executed by workers.
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <select
              value={selectedMonitorId}
              onChange={(e) => {
                setSelectedMonitorId(e.target.value);
                setPage(1);
              }}
              className="flex-1 sm:flex-initial rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
            >
              <option value="">All Monitored Endpoints</option>
              {monitors.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>

            <button
              onClick={fetchChecks}
              className="p-2 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors shrink-0"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Checks Table */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="py-20 text-center text-slate-500 text-xs">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-400" />
              Loading check telemetry...
            </div>
          ) : checks.length === 0 ? (
            <div className="py-20 text-center text-slate-500 text-xs">
              <History className="w-8 h-8 mx-auto mb-2 text-slate-600 stroke-1" />
              No check history found. Checks will appear as workers ping your endpoints.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[640px]">
                <thead className="bg-slate-950/60 border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="py-3 px-4">Evaluation</th>
                    <th className="py-3 px-4">Service</th>
                    <th className="py-3 px-4">HTTP Status</th>
                    <th className="py-3 px-4">Response Time</th>
                    <th className="py-3 px-4">Result / Message</th>
                    <th className="py-3 px-4 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {checks.map((check) => {
                    let badgeClass = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
                    let label = "PASS";
                    if (!check.isSuccess) {
                      badgeClass = "bg-rose-500/10 text-rose-400 border border-rose-500/20";
                      label = "FAIL";
                    } else if (check.isDegraded) {
                      badgeClass = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
                      label = "DEGRADED";
                    }

                    return (
                      <tr key={check.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${badgeClass}`}>
                            {label}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-sans font-medium text-slate-200">
                          <Link
                            href={`/monitors/${check.monitor.id}`}
                            className="hover:text-emerald-400 transition-colors"
                          >
                            {check.monitor.name}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {check.statusCode || "—"}
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {check.responseTime}ms
                        </td>
                        <td className="py-3 px-4 font-sans text-slate-400 max-w-sm truncate">
                          {check.errorMessage || "Healthy response"}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-500 text-[11px]">
                          {new Date(check.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="p-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 text-center sm:text-left">
              <span>
                Page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} total checks)
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-end">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 transition-colors"
                >
                  Previous
                </button>
                <button
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
