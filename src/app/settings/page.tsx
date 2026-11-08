"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Settings, Save, Trash2, Building, AlertTriangle } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function WorkspaceSettingsPage() {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<any>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState("MEMBER");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchWorkspace = async () => {
    try {
      const res = await fetch("/api/workspaces");
      if (res.ok) {
        const data = await res.json();
        const current = data.workspaces?.[0];
        if (current) {
          setWorkspace(current);
          setName(current.name);
          setRole(current.role);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspace();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace) return;
    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/workspaces/${workspace.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        setMessage("Workspace settings saved successfully.");
        await fetchWorkspace();
      } else {
        const err = await res.json();
        setMessage(`Error: ${err.error}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!workspace) return;
    if (!confirm(`Are you sure you want to permanently delete workspace "${workspace.name}"? All monitors, checks, and incidents will be erased.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/workspaces/${workspace.id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/dashboard");
      } else {
        const data = await res.json().catch(() => ({}));
        setMessage(data.error || "Failed to delete workspace");
      }
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Failed to delete workspace");
    }
  };

  return (
    <DashboardLayout activeWorkspaceId={workspace?.id}>
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
            Workspace Settings
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage workspace profile, identity, and organization attributes.
          </p>
        </div>

        {message && (
          <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-semibold">
            {message}
          </div>
        )}

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-6 space-y-5">
          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold uppercase tracking-wider mb-1.5">
                Workspace Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={role === "MEMBER"}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:outline-none disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold uppercase tracking-wider mb-1.5">
                Workspace Slug (ID)
              </label>
              <input
                type="text"
                readOnly
                disabled
                value={workspace?.slug || ""}
                className="w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3.5 py-2 font-mono text-xs text-slate-400"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold uppercase tracking-wider mb-1.5">
                Your Role
              </label>
              <span className="inline-block px-2.5 py-1 rounded bg-slate-800 text-slate-200 font-mono text-xs uppercase font-bold">
                {role}
              </span>
            </div>

            {role !== "MEMBER" && (
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 sm:py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Danger Zone */}
        {role === "OWNER" && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4 sm:p-6 space-y-3">
            <h3 className="text-sm font-bold text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Danger Zone</span>
            </h3>
            <p className="text-xs text-slate-400">
              Permanently delete this workspace and all associated monitoring infrastructure, data checks, and incident logs.
            </p>
            <button
              onClick={handleDelete}
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Workspace</span>
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
