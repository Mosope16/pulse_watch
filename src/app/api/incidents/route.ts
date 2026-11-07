import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireWorkspaceContext } from "@/lib/session";
import { Role, IncidentStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceIdParam = searchParams.get("workspaceId");
    const statusFilter = searchParams.get("status"); // "ACTIVE", "RESOLVED", or specific status

    const { workspace } = await requireWorkspaceContext(workspaceIdParam, Role.MEMBER);

    const whereClause: any = {
      workspaceId: workspace.id,
    };

    if (statusFilter === "ACTIVE") {
      whereClause.status = {
        in: [IncidentStatus.INVESTIGATING, IncidentStatus.IDENTIFIED, IncidentStatus.MONITORING],
      };
    } else if (statusFilter === "RESOLVED") {
      whereClause.status = IncidentStatus.RESOLVED;
    } else if (
      statusFilter &&
      ["INVESTIGATING", "IDENTIFIED", "MONITORING", "RESOLVED"].includes(statusFilter.toUpperCase())
    ) {
      whereClause.status = statusFilter.toUpperCase() as IncidentStatus;
    }

    const incidents = await prisma.incident.findMany({
      where: whereClause,
      include: {
        monitor: {
          select: {
            id: true,
            name: true,
            url: true,
            status: true,
          },
        },
        updates: {
          take: 5,
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: { updates: true },
        },
      },
      orderBy: { startedAt: "desc" },
    });

    return NextResponse.json({ incidents });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch incidents" },
      { status: err.statusCode || 500 }
    );
  }
}
