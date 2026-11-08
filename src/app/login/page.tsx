"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, Lock, Mail, ArrowRight, AlertCircle, Eye, EyeOff } from "lucide-react";
import { signIn } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await signIn.email({
        email: email.trim(),
        password,
      });

      if (res.error) {
        setError(res.error.message || "Invalid credentials. Please try again.");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-slate-100">
              PulseWatch
            </span>
          </Link>
          <h2 className="text-xl font-bold text-slate-200 mt-2">
            Welcome back
          </h2>
          <p className="text-xs text-slate-400">
            Sign in to access your monitored infrastructure and incident telemetry.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          <form onSubmit={handleSignIn} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5 uppercase tracking-wider text-[11px]">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-9 pr-3.5 py-2.5 text-slate-200 text-sm placeholder-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5 uppercase tracking-wider text-[11px]">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder={showPassword ? "Enter your password" : "••••••••••••"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-9 pr-10 py-2.5 text-slate-200 text-sm placeholder-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 focus:outline-none transition-colors p-0.5"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              <span>{isLoading ? "Signing in..." : "Sign In to Dashboard"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center text-xs text-slate-400">
            Don't have an account yet?{" "}
            <Link
              href="/register"
              className="font-semibold text-emerald-400 hover:text-emerald-300"
            >
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
