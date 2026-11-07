"use client";

import { useState } from "react";

interface SparklineCheck {
  id?: string;
  statusCode?: number | null;
  responseTime: number;
  isSuccess: boolean;
  isDegraded?: boolean;
  createdAt: string | Date;
}

export function Sparkline({
  checks = [],
  maxTicks = 20,
}: {
  checks: SparklineCheck[];
  maxTicks?: number;
}) {
  const [hoveredCheck, setHoveredCheck] = useState<SparklineCheck | null>(null);

  // If fewer checks than maxTicks, pad with placeholder slots
  const displayChecks = checks.slice(-maxTicks);
  const paddedCount = Math.max(0, maxTicks - displayChecks.length);

  return (
    <div className="relative">
      <div className="flex items-center gap-1 h-7">
        {/* Empty placeholder ticks */}
        {Array.from({ length: paddedCount }).map((_, i) => (
          <div
            key={`pad-${i}`}
            className="flex-1 h-4 rounded-sm bg-slate-800/40"
            title="No check data"
          />
        ))}

        {/* Real check ticks */}
        {displayChecks.map((check, index) => {
          let colorClass = "bg-emerald-500 hover:bg-emerald-400";
          if (!check.isSuccess) {
            colorClass = "bg-rose-500 hover:bg-rose-400 animate-pulse";
          } else if (check.isDegraded) {
            colorClass = "bg-amber-500 hover:bg-amber-400";
          }

          return (
            <div
              key={check.id || index}
              onMouseEnter={() => setHoveredCheck(check)}
              onMouseLeave={() => setHoveredCheck(null)}
              className={`flex-1 h-4.5 rounded-sm transition-all cursor-pointer ${colorClass}`}
            />
          );
        })}
      </div>

      {hoveredCheck && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 pointer-events-none rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[11px] text-slate-200 shadow-xl whitespace-nowrap">
          <div className="font-semibold flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                !hoveredCheck.isSuccess
                  ? "bg-rose-500"
                  : hoveredCheck.isDegraded
                  ? "bg-amber-500"
                  : "bg-emerald-500"
              }`}
            />
            <span>
              {!hoveredCheck.isSuccess
                ? "Failed"
                : hoveredCheck.isDegraded
                ? "Degraded"
                : "Operational"}
            </span>
            <span className="text-slate-400 font-mono">
              ({hoveredCheck.responseTime}ms)
            </span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {hoveredCheck.statusCode ? `HTTP ${hoveredCheck.statusCode} · ` : ""}
            {new Date(hoveredCheck.createdAt).toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
}
