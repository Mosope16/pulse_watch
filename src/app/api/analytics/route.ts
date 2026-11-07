import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireWorkspaceContext } from "@/lib/session";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceIdParam = searchParams.get("workspaceId");

    const { workspace } = await requireWorkspaceContext(workspaceIdParam, Role.MEMBER);

    // 1. Monitor breakdown
    const monitors = await prisma.monitor.findMany({
      where: { workspaceId: workspace.id },
      select: {
        id: true,
        name: true,
        status: true,
        enabled: true,
        uptime24h: true,
        uptime30d: true,
        avgResponseTime: true,
      },
    });

    const totalMonitors = monitors.length;
    const upMonitors = monitors.filter((m) => m.enabled && m.status === "UP").length;
    const degradedMonitors = monitors.filter((m) => m.enabled && m.status === "DEGRADED").length;
    const downMonitors = monitors.filter((m) => m.enabled && m.status === "DOWN").length;
    const pausedMonitors = monitors.filter((m) => !m.enabled || m.status === "PAUSED").length;

    // Active incidents
    const activeIncidents = await prisma.incident.count({
      where: {
        workspaceId: workspace.id,
        status: { in: ["INVESTIGATING", "IDENTIFIED", "MONITORING"] },
      },
    });

    // Averages
    const activeMonitors = monitors.filter((m) => m.enabled);
    const overallUptime24h =
      activeMonitors.length > 0
        ? Number(
            (
              activeMonitors.reduce((acc, m) => acc + m.uptime24h, 0) /
              activeMonitors.length
            ).toFixed(2)
          )
        : 100.0;

    const overallUptime30d =
      activeMonitors.length > 0
        ? Number(
            (
              activeMonitors.reduce((acc, m) => acc + m.uptime30d, 0) /
              activeMonitors.length
            ).toFixed(2)
          )
        : 100.0;

    const overallAvgResponseTime =
      activeMonitors.length > 0
        ? Math.round(
            activeMonitors.reduce((acc, m) => acc + m.avgResponseTime, 0) /
              activeMonitors.length
          )
        : 0;

    // 2. Response time over time (last 24 hours of check data across monitors)
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentChecks = await prisma.monitorCheck.findMany({
      where: {
        monitor: { workspaceId: workspace.id },
        createdAt: { gte: dayAgo },
      },
      select: {
        responseTime: true,
        isSuccess: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
      take: 200,
    });

    // Group checks into 2-hour or 1-hour time buckets for smooth chart rendering
    const timeSeriesMap = new Map<string, { totalTime: number; count: number; successes: number }>();

    recentChecks.forEach((check) => {
      const date = new Date(check.createdAt);
      // Format to HH:00
      const timeKey = `${date.getHours().toString().padStart(2, "0")}:00`;
      const current = timeSeriesMap.get(timeKey) || { totalTime: 0, count: 0, successes: 0 };
      current.totalTime += check.responseTime;
      current.count += 1;
      if (check.isSuccess) current.successes += 1;
      timeSeriesMap.set(timeKey, current);
    });

    const latencyChartData = Array.from(timeSeriesMap.entries()).map(([time, data]) => ({
      time,
      avgLatency: Math.round(data.totalTime / data.count),
      uptimePct: Number(((data.successes / data.count) * 100).toFixed(1)),
      samples: data.count,
    }));

    // 3. Incident frequency by day (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentIncidents = await prisma.incident.findMany({
      where: {
        workspaceId: workspace.id,
        startedAt: { gte: sevenDaysAgo },
      },
      select: { startedAt: true },
    });

    const incidentDaysMap = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dayLabel = d.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" });
      incidentDaysMap.set(dayLabel, 0);
    }

    recentIncidents.forEach((inc) => {
      const d = new Date(inc.startedAt);
      const dayLabel = d.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" });
      if (incidentDaysMap.has(dayLabel)) {
        incidentDaysMap.set(dayLabel, (incidentDaysMap.get(dayLabel) || 0) + 1);
      }
    });

    const incidentFrequencyData = Array.from(incidentDaysMap.entries()).map(([day, count]) => ({
      day,
      count,
    }));

    // 4. Status distribution data for pie chart
    const statusDistribution = [
      { name: "Operational", value: upMonitors, color: "#10b981" },
      { name: "Degraded", value: degradedMonitors, color: "#f59e0b" },
      { name: "Down", value: downMonitors, color: "#ef4444" },
      { name: "Paused", value: pausedMonitors, color: "#6b7280" },
    ].filter((item) => item.value > 0);

    return NextResponse.json({
      summary: {
        totalMonitors,
        upMonitors,
        degradedMonitors,
        downMonitors,
        pausedMonitors,
        activeIncidents,
        overallUptime24h,
        overallUptime30d,
        overallAvgResponseTime,
      },
      charts: {
        latency: latencyChartData,
        incidentFrequency: incidentFrequencyData,
        statusDistribution,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch analytics" },
      { status: err.statusCode || 500 }
    );
  }
}
