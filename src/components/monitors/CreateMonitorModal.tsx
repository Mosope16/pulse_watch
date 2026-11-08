"use client";

import { useState } from "react";
import { X, ShieldAlert, Globe, Server, Clock, AlertCircle } from "lucide-react";

interface CreateMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  workspaceId?: string;
  initialData?: any;
}

export function CreateMonitorModal({
  isOpen,
  onClose,
  onSuccess,
  workspaceId,
  initialData,
}: CreateMonitorModalProps) {
  const isEditing = !!initialData;

  const [name, setName] = useState(initialData?.name || "");
  const [url, setUrl] = useState(initialData?.url || "https://");
  const [method, setMethod] = useState<"GET" | "POST" | "HEAD">(initialData?.method || "GET");
  const [interval, setInterval] = useState<number>(initialData?.interval || 60);
  const [timeout, setTimeout] = useState<number>(initialData?.timeout || 10000);
  const [expectedStatus, setExpectedStatus] = useState<number>(initialData?.expectedStatus || 200);
  const [expectedText, setExpectedText] = useState(initialData?.expectedText || "");
  const [headers, setHeaders] = useState(initialData?.headers || "");
  const [body, setBody] = useState(initialData?.body || "");
  const [failureThreshold, setFailureThreshold] = useState<number>(initialData?.failureThreshold || 3);
  const [degradedThresholdMs, setDegradedThresholdMs] = useState<number>(initialData?.degradedThresholdMs || 2000);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const endpoint = isEditing ? `/api/monitors/${initialData.id}` : "/api/monitors";
      const httpMethod = isEditing ? "PATCH" : "POST";

      const payload = {
        workspaceId,
        name: name.trim(),
        url: url.trim(),
        method,
        interval: Number(interval),
        timeout: Number(timeout),
        expectedStatus: Number(expectedStatus),
        expectedText: expectedText.trim() ? expectedText.trim() : null,
        headers: headers.trim() ? headers.trim() : null,
        body: method === "POST" && body.trim() ? body.trim() : null,
        failureThreshold: Number(failureThreshold),
        degradedThresholdMs: Number(degradedThresholdMs),
      };

      const res = await fetch(endpoint, {
        method: httpMethod,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save monitor");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl my-auto overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-4 sm:px-6 py-3.5 sm:py-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                {isEditing ? "Edit Monitor Configuration" : "Create New Monitor"}
              </h2>
              <p className="text-xs text-slate-400">
                Configure HTTP endpoint, intervals, thresholds, and assertions.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="mx-4 sm:mx-6 mt-3 sm:mt-4 p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex items-start gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <div className="flex-1">
              <p className="font-semibold">Validation Error</p>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5 text-sm overflow-y-auto flex-1">
          {/* Monitor Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Friendly Monitor Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Production API Health"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2 text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Method & URL */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                HTTP Method
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as any)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-xs"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="HEAD">HEAD</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Target Endpoint URL</span>
                <span className="text-[10px] text-slate-500 font-normal lowercase">
                  ssrf-protected
                </span>
              </label>
              <input
                type="url"
                required
                placeholder="https://api.yourdomain.com/health"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2 text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-xs"
              />
            </div>
          </div>

          {/* Interval & Timeout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Monitoring Interval
              </label>
              <select
                value={interval}
                onChange={(e) => setInterval(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
              >
                <option value={60}>Every 1 minute (Recommended)</option>
                <option value={300}>Every 5 minutes</option>
                <option value={600}>Every 10 minutes</option>
                <option value={1800}>Every 30 minutes</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Request Timeout (ms)
              </label>
              <select
                value={timeout}
                onChange={(e) => setTimeout(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
              >
                <option value={5000}>5 seconds (5000ms)</option>
                <option value={10000}>10 seconds (10000ms)</option>
                <option value={15000}>15 seconds (15000ms)</option>
                <option value={30000}>30 seconds (30000ms)</option>
              </select>
            </div>
          </div>

          {/* Expected Status & Expected Text */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Expected HTTP Status
              </label>
              <input
                type="number"
                required
                min={100}
                max={599}
                value={expectedStatus}
                onChange={(e) => setExpectedStatus(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2 text-slate-200 font-mono text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Expected Body Keyword (Optional)
              </label>
              <input
                type="text"
                placeholder='e.g. {"status":"ok"}'
                value={expectedText}
                onChange={(e) => setExpectedText(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2 text-slate-200 placeholder-slate-500 font-mono text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Reliability Thresholds: Consecutive Failures & Degraded Latency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-800/80 pt-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Consecutive Failures for Incident
              </label>
              <select
                value={failureThreshold}
                onChange={(e) => setFailureThreshold(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
              >
                <option value={1}>1 failure (Immediate alert)</option>
                <option value={2}>2 consecutive failures</option>
                <option value={3}>3 consecutive failures (Recommended)</option>
                <option value={5}>5 consecutive failures</option>
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Prevents false positive alert noise during brief network blips.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Degraded Latency Threshold (ms)
              </label>
              <input
                type="number"
                min={100}
                max={30000}
                step={100}
                value={degradedThresholdMs}
                onChange={(e) => setDegradedThresholdMs(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2 text-slate-200 font-mono text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Marks endpoint as DEGRADED when response time exceeds this value.
              </p>
            </div>
          </div>

          {/* Custom Headers (Optional JSON) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Custom HTTP Headers (Optional JSON)
            </label>
            <textarea
              rows={2}
              placeholder='{ "Authorization": "Bearer secret-token", "X-Custom": "header" }'
              value={headers}
              onChange={(e) => setHeaders(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2 text-slate-200 placeholder-slate-600 font-mono text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* POST Request Body (if POST method) */}
          {method === "POST" && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Request Payload Body
              </label>
              <textarea
                rows={3}
                placeholder='{ "ping": true }'
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2 text-slate-200 placeholder-slate-600 font-mono text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 sm:gap-3 pt-4 border-t border-slate-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 rounded-lg border border-slate-800 text-xs font-semibold text-slate-400 hover:bg-slate-800/80 transition-colors text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto px-5 py-2.5 sm:py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50 text-center"
            >
              {isLoading
                ? "Validating & Saving..."
                : isEditing
                ? "Update Monitor"
                : "Create Monitor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
