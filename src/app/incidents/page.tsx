"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  AlertOctagon,
  CheckCircle,
  Clock,
  Filter,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronRight,
  Send,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { formatDuration } from "@/lib/utils";

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [newUpdateMessage, setNewUpdateMessage] = useState("");
  const [newUpdateStatus, setNewUpdateStatus] = useState<string>("INVESTIGATING");
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);

  const fetchIncidents = async () => {
    try {
      let url = "/api/incidents";
      if (statusFilter !== "ALL") {
        url += `?status=${statusFilter}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setIncidents(data.incidents || []);
        if (selectedIncident) {
          const refreshed = data.incidents?.find((i: any) => i.id === selectedIncident.id);
          if (refreshed) setSelectedIncident(refreshed);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [statusFilter]);

  const handleAddUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident || !newUpdateMessage.trim()) return;

    setIsSubmittingUpdate(true);
    try {
      const res = await fetch(`/api/incidents/${selectedIncident.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newUpdateStatus,
          message: newUpdateMessage.trim(),
        }),
      });

      if (res.ok) {
        setNewUpdateMessage("");
        await fetchIncidents();
      }
    } finally {
      setIsSubmittingUpdate(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
              Incidents & Outages
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Automated outage detection, root cause timeline logs, and recovery tracking.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
            >
              <option value="ALL">All Incidents</option>
              <option value="ACTIVE">Active Incidents Only</option>
              <option value="RESOLVED">Resolved Incidents Only</option>
            </select>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Incidents List (Left 2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            {isLoading ? (
              <div className="py-20 text-center text-slate-500 text-xs">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-400" />
                Loading incident logs...
              </div>
            ) : incidents.length === 0 ? (
              <div className="py-20 text-center rounded-2xl border border-dashed border-slate-800 p-8 space-y-3">
                <CheckCircle className="w-10 h-10 mx-auto text-emerald-500/60 stroke-1" />
                <h3 className="text-sm font-bold text-slate-200">No Incidents Found</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  All services are currently healthy. If consecutive check failures occur, PulseWatch will record an incident here automatically.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {incidents.map((incident) => {
                  const isResolved = incident.status === "RESOLVED";
                  const isSelected = selectedIncident?.id === incident.id;

                  return (
                    <div
                      key={incident.id}
                      onClick={() => setSelectedIncident(incident)}
                      className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? "border-emerald-500/40 bg-slate-900 shadow-xl"
                          : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                isResolved
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : "bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse"
                              }`}
                            >
                              {incident.status}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              Monitor: <strong className="text-slate-300">{incident.monitor.name}</strong>
                            </span>
                          </div>

                          <h3 className="text-sm font-bold text-slate-100 truncate">
                            {incident.title}
                          </h3>

                          <p className="text-xs text-slate-400 line-clamp-2">
                            {incident.cause || "Consecutive check failures reached."}
                          </p>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 font-mono pt-2">
                            <span>Started: {new Date(incident.startedAt).toLocaleString()}</span>
                            {incident.durationSeconds && (
                              <span>Downtime: {formatDuration(incident.durationSeconds)}</span>
                            )}
                          </div>
                        </div>

                        <ChevronRight className="w-5 h-5 text-slate-600 shrink-0 mt-2" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Incident Timeline & Detail Panel (Right col) */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 space-y-5 h-fit lg:sticky lg:top-20">
            {selectedIncident ? (
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          selectedIncident.status === "RESOLVED"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-rose-500/10 text-rose-400"
                        }`}
                      >
                        {selectedIncident.status}
                      </span>
                      <button
                        onClick={() => setSelectedIncident(null)}
                        className="lg:hidden text-[10px] text-slate-500 hover:text-slate-300 font-medium px-2 py-0.5 rounded border border-slate-800"
                      >
                        Close
                      </button>
                    </div>
                    <Link
                      href={`/monitors/${selectedIncident.monitorId}`}
                      className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 font-medium"
                    >
                      <span>View Monitor</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                  <h2 className="text-base font-bold text-slate-100 mt-2">
                    {selectedIncident.title}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    {selectedIncident.cause}
                  </p>
                </div>

                {/* Timeline Entries */}
                <div className="space-y-3 border-t border-slate-800/80 pt-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Incident Timeline
                  </h4>

                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {selectedIncident.updates?.map((u: any, idx: number) => (
                      <div
                        key={u.id || idx}
                        className="p-3 rounded-xl border border-slate-800/80 bg-slate-950/60 space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-300">
                            {u.status}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(u.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-slate-400 text-xs leading-relaxed">
                          {u.message}
                        </p>
                        <span className="text-[10px] text-slate-500 block">
                          by {u.createdBy || "PulseWatch Engine"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add Timeline Update Form */}
                <form
                  onSubmit={handleAddUpdate}
                  className="space-y-3 border-t border-slate-800/80 pt-4"
                >
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">
                      Post Incident Update
                    </label>
                    <select
                      value={newUpdateStatus}
                      onChange={(e) => setNewUpdateStatus(e.target.value)}
                      className="rounded border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-slate-300"
                    >
                      <option value="INVESTIGATING">Investigating</option>
                      <option value="IDENTIFIED">Identified</option>
                      <option value="MONITORING">Monitoring</option>
                      <option value="RESOLVED">Resolved</option>
                    </select>
                  </div>

                  <textarea
                    rows={3}
                    required
                    placeholder="Describe investigation progress, mitigation steps, or resolution details..."
                    value={newUpdateMessage}
                    onChange={(e) => setNewUpdateMessage(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />

                  <button
                    type="submit"
                    disabled={isSubmittingUpdate}
                    className="w-full py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Post Update</span>
                  </button>
                </form>
              </div>
            ) : (
              <div className="py-24 text-center text-slate-500 text-xs">
                Select an incident from the list to view its updates and timeline details.
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
