import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CheckCircle,
  Clock,
  Globe,
  Lock,
  Mail,
  Server,
  Shield,
  Zap,
  Bell,
  Cpu,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-6 lg:px-12 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <span className="font-extrabold text-lg tracking-tight text-slate-100">
            PulseWatch
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-emerald-500/20"
          >
            Start Free
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-6 lg:px-12 pt-20 pb-24 max-w-6xl mx-auto text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>v1.0 Production Release · Distributed Monitoring SaaS</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-slate-100 max-w-4xl mx-auto leading-[1.1]">
          Know when your services go down.{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
            Before your users complain.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Full-stack API and website monitoring with scheduled background workers,
          consecutive failure incident mitigation, SSRF defense, reliable Resend alerting, and public status pages.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/register"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm transition-all shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2"
          >
            <span>Start Monitoring Free</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-200 font-bold text-sm transition-colors"
          >
            Open Live Demo Dashboard
          </Link>
        </div>

        {/* Live Telemetry Preview Card */}
        <div className="mt-12 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-left max-w-4xl mx-auto">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-mono font-bold text-slate-200">
                system.pulsewatch.telemetry
              </span>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              ALL SYSTEMS OPERATIONAL
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-500 font-semibold uppercase">API Gateway</span>
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-slate-200 font-bold">28ms</span>
                <span className="text-xs text-emerald-400 font-bold">99.99%</span>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-500 font-semibold uppercase">Database Replica</span>
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-slate-200 font-bold">42ms</span>
                <span className="text-xs text-emerald-400 font-bold">100.0%</span>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-500 font-semibold uppercase">Auth Worker</span>
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-slate-200 font-bold">35ms</span>
                <span className="text-xs text-emerald-400 font-bold">99.98%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="px-6 lg:px-12 py-20 border-t border-slate-800/80 bg-slate-950/40">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-100 tracking-tight">
              Engineered for Production Reliability
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
              Real backend infrastructure designed to avoid false alarms and protect sensitive internal networks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-100">
                Scheduled BullMQ Workers
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Background Redis queues schedule checks across 1m, 5m, 10m, and 30m intervals with concurrency control and deduplication.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-100">
                Defense-in-Depth SSRF Protection
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pre-flight DNS inspection blocks private RFC1918, loopback, link-local metadata (169.254), and prevents DNS rebinding / redirect escapes.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-100">
                Automated Incident Lifecycle
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Requires consecutive check failures before declaring downtime. Detects recoveries and automatically resolves incidents with downtime logs.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-100">
                Reliable Alert Delivery
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Instant transactional emails powered by Resend and live in-app notifications with customizable alert trigger rules.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-100">
                Public Status Pages
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Provide transparency to customers with customizable public status pages, 90-day SLA records, and historical incident logs.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
                <Server className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-100">
                Multi-Tenant Isolation
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Role-based workspace control (Owner, Admin, Member) with server-side authorization checks on every query and mutation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 px-6 lg:px-12 py-10 max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span>PulseWatch © 2026 · All Rights Reserved</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="hover:text-slate-300">Login</Link>
          <Link href="/register" className="hover:text-slate-300">Register</Link>
          <Link href="/dashboard" className="hover:text-slate-300">Dashboard</Link>
        </div>
      </footer>
    </div>
  );
}
