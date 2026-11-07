"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bell,
  Activity,
  AlertOctagon,
  History,
  BarChart3,
  Globe,
  Settings,
  Users,
  Sliders,
  ExternalLink,
} from "lucide-react";

interface NavGroup {
  label: string;
  items: {
    title: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    external?: boolean;
    badge?: string;
  }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "WORKSPACE",
    items: [
      {
        title: "Overview",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "Notifications",
        href: "/notifications",
        icon: Bell,
      },
    ],
  },
  {
    label: "MONITORING",
    items: [
      {
        title: "Monitors",
        href: "/monitors",
        icon: Activity,
      },
      {
        title: "Incidents",
        href: "/incidents",
        icon: AlertOctagon,
      },
      {
        title: "Check History",
        href: "/checks",
        icon: History,
      },
    ],
  },
  {
    label: "INSIGHTS",
    items: [
      {
        title: "Analytics",
        href: "/analytics",
        icon: BarChart3,
      },
    ],
  },
  {
    label: "PUBLIC",
    items: [
      {
        title: "Status Page",
        href: "/settings/status-page",
        icon: Globe,
      },
    ],
  },
  {
    label: "SETTINGS",
    items: [
      {
        title: "Workspace Settings",
        href: "/settings",
        icon: Settings,
      },
      {
        title: "Team Members",
        href: "/settings/members",
        icon: Users,
      },
      {
        title: "Alert Preferences",
        href: "/settings/notifications",
        icon: Sliders,
      },
    ],
  },
];

export function Sidebar({
  statusPageSlug,
}: {
  statusPageSlug?: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-950/60 flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="flex-1 py-6 px-4 space-y-6 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="space-y-1.5">
            <h3 className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {group.label}
            </h3>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? "bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 transition-colors ${
                          isActive
                            ? "text-emerald-400"
                            : "text-slate-500 group-hover:text-slate-300"
                        }`}
                      />
                      <span>{item.title}</span>
                    </div>
                    {item.badge && (
                      <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-slate-800 text-slate-400">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Public Status Page Quick View */}
      {statusPageSlug && (
        <div className="p-4 border-t border-slate-800/80">
          <Link
            href={`/status/${statusPageSlug}`}
            target="_blank"
            className="flex items-center justify-between p-2.5 rounded-lg border border-slate-800 bg-slate-900/40 hover:bg-slate-900 hover:border-slate-700 text-slate-400 hover:text-emerald-400 transition-all text-xs"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium text-slate-300">Live Status Page</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </aside>
  );
}
