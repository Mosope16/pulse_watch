"use client";

import { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Trash2,
  CheckCircle,
  Clock,
  RefreshCw,
  X,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function MembersPage() {
  const [workspace, setWorkspace] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);

  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      const wsRes = await fetch("/api/workspaces");
      if (wsRes.ok) {
        const wsData = await wsRes.json();
        const currentWs = wsData.workspaces?.[0];
        if (currentWs) {
          setWorkspace(currentWs);
          const memRes = await fetch(`/api/workspaces/${currentWs.id}/members`);
          if (memRes.ok) {
            const memData = await memRes.json();
            setMembers(memData.members || []);
            setInvitations(memData.invitations || []);
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace || !inviteEmail.trim()) return;

    setIsInviting(true);
    setInviteMessage(null);

    try {
      const res = await fetch(`/api/workspaces/${workspace.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });

      const data = await res.json();
      if (res.ok) {
        setInviteMessage("Invitation dispatched successfully!");
        setInviteEmail("");
        setIsInviteModalOpen(false);
        await fetchMembers();
      } else {
        setInviteMessage(`Error: ${data.error}`);
      }
    } finally {
      setIsInviting(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!workspace) return;
    try {
      await fetch(`/api/workspaces/${workspace.id}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });
      await fetchMembers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveMember = async (userId: string, name: string) => {
    if (!workspace) return;
    if (!confirm(`Are you sure you want to remove ${name} from this workspace?`)) return;

    try {
      await fetch(`/api/workspaces/${workspace.id}/members?userId=${userId}`, {
        method: "DELETE",
      });
      await fetchMembers();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <DashboardLayout activeWorkspaceId={workspace?.id}>
      <div className="space-y-6 max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
              Team Members
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Manage workspace access, assign roles, and invite engineering teammates.
            </p>
          </div>

          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-emerald-500/20"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Member</span>
          </button>
        </div>

        {inviteMessage && (
          <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-semibold">
            {inviteMessage}
          </div>
        )}

        {/* Members Table */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Active Members ({members.length})</span>
            </h3>
          </div>

          <div className="divide-y divide-slate-800/60">
            {members.map((m) => (
              <div
                key={m.id}
                className="p-4 flex items-center justify-between gap-4 hover:bg-slate-800/20 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300 uppercase">
                    {m.user.name?.charAt(0) || "U"}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-100">{m.user.name}</h4>
                    <p className="text-slate-400 text-[11px]">{m.user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {m.role === "OWNER" ? (
                    <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-mono text-[10px] font-bold uppercase">
                      Owner
                    </span>
                  ) : (
                    <select
                      value={m.role}
                      onChange={(e) => handleRoleChange(m.user.id, e.target.value)}
                      className="rounded border border-slate-800 bg-slate-950 px-2 py-1 text-slate-300 text-xs"
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="MEMBER">Member</option>
                    </select>
                  )}

                  {m.role !== "OWNER" && (
                    <button
                      onClick={() => handleRemoveMember(m.user.id, m.user.name)}
                      className="p-1.5 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Remove member"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Invitations */}
        {invitations.length > 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Pending Invitations ({invitations.length})</span>
              </h3>
            </div>

            <div className="divide-y divide-slate-800/60 text-xs">
              {invitations.map((inv) => (
                <div key={inv.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-slate-500" />
                    <div>
                      <p className="font-semibold text-slate-200">{inv.email}</p>
                      <p className="text-[11px] text-slate-500">
                        Invited as {inv.role} · Expires {new Date(inv.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Pending
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Invite Member Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-100">Invite Team Member</h2>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendInvite} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Teammate Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="developer@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Workspace Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="MEMBER">Member (View monitors, incidents, and reports)</option>
                  <option value="ADMIN">Admin (Manage monitors, incidents, and invite members)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-800 text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isInviting}
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
                >
                  {isInviting ? "Sending..." : "Send Invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
