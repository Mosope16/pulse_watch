"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Activity, CheckCircle, AlertTriangle, ArrowRight, Building } from "lucide-react";

function AcceptInvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [invitation, setInvitation] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("No invitation token provided.");
      setIsLoading(false);
      return;
    }

    const fetchInvitation = async () => {
      try {
        const res = await fetch(`/api/invitations/${token}`);
        if (res.ok) {
          const data = await res.json();
          setInvitation(data.invitation);
        } else {
          const data = await res.json();
          setError(data.error || "Invalid or expired invitation token.");
        }
      } catch {
        setError("Failed to load invitation.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvitation();
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setIsAccepting(true);
    setError(null);

    try {
      const res = await fetch(`/api/invitations/${token}`, { method: "POST" });
      const data = await res.json();

      if (res.ok) {
        router.push(`/dashboard?workspaceId=${data.workspace.id}`);
      } else {
        setError(data.error || "Failed to accept invitation");
      }
    } catch {
      setError("An unexpected error occurred while accepting invitation.");
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-6 font-sans">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-md text-center space-y-6">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
          <Activity className="w-6 h-6 animate-pulse" />
        </div>

        {isLoading ? (
          <p className="text-xs text-slate-400">Verifying invitation...</p>
        ) : error ? (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
            <Link
              href="/login"
              className="inline-block text-xs font-semibold text-emerald-400 hover:underline"
            >
              Return to Login &rarr;
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <h1 className="text-xl font-bold text-slate-100">
              Join {invitation.workspace.name}
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              You've been invited to join <strong>{invitation.workspace.name}</strong> as an{" "}
              <strong className="text-emerald-400 uppercase font-mono">{invitation.role}</strong>.
            </p>

            <button
              onClick={handleAccept}
              disabled={isAccepting}
              className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{isAccepting ? "Joining..." : "Accept Invitation & Continue"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 font-sans">
          <div className="flex items-center gap-3 text-slate-400 text-xs">
            <Activity className="w-4 h-4 animate-spin text-emerald-400" />
            <span>Loading invitation...</span>
          </div>
        </div>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  );
}
