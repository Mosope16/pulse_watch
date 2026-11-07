import { cn } from "@/lib/utils";

export type StatusType = "UP" | "DEGRADED" | "DOWN" | "PAUSED" | string;

export function StatusBadge({
  status,
  className,
  size = "md",
}: {
  status: StatusType;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const normalized = status.toUpperCase();

  const getStyle = () => {
    switch (normalized) {
      case "UP":
      case "OPERATIONAL":
        return {
          bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
          dot: "bg-emerald-500",
          pulse: true,
          label: "Operational",
        };
      case "DEGRADED":
        return {
          bg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
          dot: "bg-amber-500",
          pulse: true,
          label: "Degraded",
        };
      case "DOWN":
      case "UNAVAILABLE":
        return {
          bg: "bg-rose-500/10 text-rose-400 border-rose-500/20",
          dot: "bg-rose-500",
          pulse: true,
          label: "Down",
        };
      case "PAUSED":
        return {
          bg: "bg-slate-500/10 text-slate-400 border-slate-500/20",
          dot: "bg-slate-500",
          pulse: false,
          label: "Paused",
        };
      default:
        return {
          bg: "bg-slate-500/10 text-slate-400 border-slate-500/20",
          dot: "bg-slate-500",
          pulse: false,
          label: status,
        };
    }
  };

  const style = getStyle();

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[11px] gap-1.5",
    md: "px-2.5 py-1 text-xs gap-2",
    lg: "px-3 py-1.5 text-sm gap-2.5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full border transition-colors",
        style.bg,
        sizeClasses[size],
        className
      )}
    >
      <span className="relative flex h-2 w-2">
        {style.pulse && (
          <span
            className={cn(
              "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
              style.dot
            )}
          />
        )}
        <span
          className={cn("relative inline-flex rounded-full h-2 w-2", style.dot)}
        />
      </span>
      <span>{style.label}</span>
    </span>
  );
}
