"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Globe, ExternalLink, Save, Check, RefreshCw, Eye } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function StatusPageSettings() {
  const [statusPage, setStatusPage] = useState<any>(null);
  const [allMonitors, setAllMonitors] = useState<any[]>([]);
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [selectedMonitorIds, setSelectedMonitorIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchStatusPage = async () => {
    try {
      const res = await fetch("/api/status-page");
      if (res.ok) {
        const data = await res.json();
        const sp = data.statusPage;
        setStatusPage(sp);
        setAllMonitors(data.allMonitors || []);
        if (sp) {
          setSlug(sp.slug);
          setTitle(sp.title);
          setDescription(sp.description || "");
          setIsPublic(sp.isPublic);
          const currentMonitorIds = sp.monitors?.map((m: any) => m.monitorId) || [];
          setSelectedMonitorIds(currentMonitorIds);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatusPage();
  }, []);

  const handleToggleMonitor = (monitorId: string) => {
    if (selectedMonitorIds.includes(monitorId)) {
      setSelectedMonitorIds(selectedMonitorIds.filter((id) => id !== monitorId));
    } else {
      setSelectedMonitorIds([...selectedMonitorIds, monitorId]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedMessage(false);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/status-page", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: slug.trim(),
          title: title.trim(),
          description: description.trim() ? description.trim() : null,
          isPublic,
          monitorIds: selectedMonitorIds,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSavedMessage(true);
        setTimeout(() => setSavedMessage(false), 3000);
        await fetchStatusPage();
      } else {
        setErrorMessage(data.error || "Failed to update status page");
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout statusPageSlug={statusPage?.slug}>
      <div className="max-w-3xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
              Public Status Page
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Publish transparent service uptime, latency, and incident reports to your customers and users.
            </p>
          </div>

          {statusPage?.slug && (
            <Link
              href={`/status/${statusPage.slug}`}
              target="_blank"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-xs font-semibold text-emerald-400 transition-colors"
            >
              <span>View Live Status Page</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {savedMessage && (
          <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>Status page updated successfully.</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs font-semibold">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6 text-xs">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-100">Page Details</h3>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Status Page Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                URL Slug
              </label>
              <div className="flex items-center rounded-lg border border-slate-800 bg-slate-950 overflow-hidden">
                <span className="px-3 text-slate-500 font-mono text-xs border-r border-slate-800">
                  /status/
                </span>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  className="w-full bg-transparent px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Description / Subtitle
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Live operational status of our monitored services."
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/60 cursor-pointer">
              <div>
                <span className="font-semibold text-slate-200 block">
                  Publicly Accessible
                </span>
                <span className="text-[11px] text-slate-400">
                  When enabled, anyone with the link can view your status page without logging in.
                </span>
              </div>
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500"
              />
            </label>
          </div>

          {/* Included Components Selection */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-100">
              Services Displayed on Status Page
            </h3>
            <p className="text-slate-400 text-xs">
              Select which monitored endpoints should be publicly visible to visitors.
            </p>

            <div className="divide-y divide-slate-800/60 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
              {allMonitors.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-xs">
                  No monitors in workspace yet. Create monitors first to display them publicly.
                </div>
              ) : (
                allMonitors.map((m) => {
                  const isChecked = selectedMonitorIds.includes(m.id);
                  return (
                    <label
                      key={m.id}
                      className="p-3.5 flex items-center justify-between hover:bg-slate-800/30 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleMonitor(m.id)}
                          className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500"
                        />
                        <div>
                          <span className="font-semibold text-slate-200 block">
                            {m.name}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {m.url}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                          m.status === "UP"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-rose-500/10 text-rose-400"
                        }`}
                      >
                        {m.status}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? "Saving..." : "Save Status Page Settings"}</span>
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
