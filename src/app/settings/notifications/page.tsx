"use client";

import { useState, useEffect } from "react";
import { Bell, Mail, Shield, Check, Save } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function NotificationPreferencesPage() {
  const [workspace, setWorkspace] = useState<any>(null);
  const [prefs, setPrefs] = useState({
    emailAlerts: true,
    inAppAlerts: true,
    notifyOnDown: true,
    notifyOnRecover: true,
    notifyOnIncident: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);

  const fetchPrefs = async () => {
    try {
      const wsRes = await fetch("/api/workspaces");
      if (wsRes.ok) {
        const wsData = await wsRes.json();
        const currentWs = wsData.workspaces?.[0];
        if (currentWs) {
          setWorkspace(currentWs);
          const prefRes = await fetch(`/api/workspaces/${currentWs.id}/alert-preferences`);
          if (prefRes.ok) {
            const data = await prefRes.json();
            if (data.preference) {
              setPrefs({
                emailAlerts: data.preference.emailAlerts,
                inAppAlerts: data.preference.inAppAlerts,
                notifyOnDown: data.preference.notifyOnDown,
                notifyOnRecover: data.preference.notifyOnRecover,
                notifyOnIncident: data.preference.notifyOnIncident,
              });
            }
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrefs();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace) return;
    setIsSaving(true);
    setSavedMessage(false);

    try {
      const res = await fetch(`/api/workspaces/${workspace.id}/alert-preferences`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });

      if (res.ok) {
        setSavedMessage(true);
        setTimeout(() => setSavedMessage(false), 3000);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout activeWorkspaceId={workspace?.id}>
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
            Notification Preferences
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure how and when PulseWatch notifies you about outages, recoveries, and incidents.
          </p>
        </div>

        {savedMessage && (
          <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>Preferences saved successfully.</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Channel Toggles */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-100">Notification Channels</h3>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/60 cursor-pointer hover:border-slate-700">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">
                      Email Notifications
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Deliver real-time alerts to your verified user email via Resend.
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.emailAlerts}
                  onChange={(e) => setPrefs({ ...prefs, emailAlerts: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/60 cursor-pointer hover:border-slate-700">
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">
                      In-App Telemetry Feed
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Show badges and real-time dropdown entries in the dashboard navigation bar.
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.inAppAlerts}
                  onChange={(e) => setPrefs({ ...prefs, inAppAlerts: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500"
                />
              </label>
            </div>
          </div>

          {/* Event Triggers */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-100">Event Triggers</h3>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/60 cursor-pointer hover:border-slate-700">
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">
                    Monitor Goes DOWN (Outage)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Triggered when consecutive check failures reach threshold.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.notifyOnDown}
                  onChange={(e) => setPrefs({ ...prefs, notifyOnDown: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/60 cursor-pointer hover:border-slate-700">
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">
                    Monitor Recovers (Back Online)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Triggered when an unhealthy service passes subsequent checks.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.notifyOnRecover}
                  onChange={(e) => setPrefs({ ...prefs, notifyOnRecover: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/60 cursor-pointer hover:border-slate-700">
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">
                    Incidents Created & Resolved
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Receive updates on incident timelines, causes, and downtime durations.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.notifyOnIncident}
                  onChange={(e) => setPrefs({ ...prefs, notifyOnIncident: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500"
                />
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? "Saving..." : "Save Preferences"}</span>
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
