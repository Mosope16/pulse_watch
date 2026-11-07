import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const statusPage = await prisma.statusPage.findUnique({
      where: { slug: params.slug },
      include: {
        workspace: {
          select: { id: true, name: true, logoUrl: true },
        },
        monitors: {
          where: { isVisible: true },
          include: {
            monitor: {
              select: {
                id: true,
                name: true,
                url: true,
                status: true,
                uptime24h: true,
                uptime30d: true,
                avgResponseTime: true,
                lastCheckAt: true,
              },
            },
          },
          orderBy: { displayOrder: "asc" },
        },
      },
    });

    if (!statusPage || !statusPage.isPublic) {
      return NextResponse.json(
        { error: "Status page not found or is currently private" },
        { status: 404 }
      );
    }

    const publicMonitors = statusPage.monitors.map((m) => m.monitor);
    const monitorIds = publicMonitors.map((m) => m.id);

    // Compute Overall System Health
    const downCount = publicMonitors.filter((m) => m.status === "DOWN").length;
    const degradedCount = publicMonitors.filter((m) => m.status === "DEGRADED").length;
    const totalCount = publicMonitors.length;

    let systemStatus: "OPERATIONAL" | "DEGRADED" | "PARTIAL_OUTAGE" | "MAJOR_OUTAGE" =
      "OPERATIONAL";
    let systemStatusMessage = "All Systems Operational";

    if (totalCount > 0) {
      if (downCount === totalCount) {
        systemStatus = "MAJOR_OUTAGE";
        systemStatusMessage = "Major System Outage";
      } else if (downCount > 0) {
        systemStatus = "PARTIAL_OUTAGE";
        systemStatusMessage = `Partial System Outage (${downCount} service${downCount > 1 ? "s" : ""} experiencing downtime)`;
      } else if (degradedCount > 0) {
        systemStatus = "DEGRADED";
        systemStatusMessage = "Degraded Performance Detected";
      }
    }

    // Active incidents on publicly visible monitors
    const activeIncidents = await prisma.incident.findMany({
      where: {
        monitorId: { in: monitorIds },
        status: { in: ["INVESTIGATING", "IDENTIFIED", "MONITORING"] },
      },
      include: {
        monitor: { select: { id: true, name: true } },
        updates: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { startedAt: "desc" },
    });

    // Resolved incidents in past 14 days
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const pastIncidents = await prisma.incident.findMany({
      where: {
        monitorId: { in: monitorIds },
        status: "RESOLVED",
        resolvedAt: { gte: fourteenDaysAgo },
      },
      include: {
        monitor: { select: { id: true, name: true } },
        updates: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { resolvedAt: "desc" },
      take: 15,
    });

    return NextResponse.json({
      statusPage: {
        id: statusPage.id,
        slug: statusPage.slug,
        title: statusPage.title,
        description: statusPage.description,
        logoUrl: statusPage.logoUrl || statusPage.workspace.logoUrl,
        supportUrl: statusPage.supportUrl,
        workspaceName: statusPage.workspace.name,
      },
      systemStatus,
      systemStatusMessage,
      monitors: publicMonitors,
      activeIncidents,
      pastIncidents,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load public status page" },
      { status: 500 }
    );
  }
}
