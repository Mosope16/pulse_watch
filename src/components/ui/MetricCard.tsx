import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  trend?: {
    value: string;
    positive?: boolean;
  };
  className?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm hover:border-slate-700/80 transition-all",
        className
      )}
    >
      <div className="flex items-center justify-between text-slate-400">
        <span className="text-xs font-semibold uppercase tracking-wider">
          {title}
        </span>
        {Icon && (
          <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-100">
          {value}
        </span>
        {trend && (
          <span
            className={cn(
              "text-xs font-medium px-1.5 py-0.5 rounded",
              trend.positive
                ? "text-emerald-400 bg-emerald-500/10"
                : "text-rose-400 bg-rose-500/10"
            )}
          >
            {trend.value}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-1 text-xs text-slate-500 font-medium">{subtitle}</p>
      )}
    </div>
  );
}
