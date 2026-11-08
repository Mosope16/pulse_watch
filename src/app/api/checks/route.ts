import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireWorkspaceContext } from "@/lib/session";
import { Prisma, Role } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceIdParam = searchParams.get("workspaceId");
    const monitorId = searchParams.get("monitorId");
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const skip = (page - 1) * limit;

    const { workspace } = await requireWorkspaceContext(workspaceIdParam, Role.MEMBER);

    const whereClause: Prisma.MonitorCheckWhereInput = {
      monitor: { workspaceId: workspace.id },
    };

    if (monitorId) {
      whereClause.monitorId = monitorId;
    }

    const [checks, totalCount, monitors] = await Promise.all([
      prisma.monitorCheck.findMany({
        where: whereClause,
        take: limit,
        skip,
        orderBy: { createdAt: "desc" },
        include: {
          monitor: {
            select: { id: true, name: true, url: true, method: true },
          },
        },
      }),
      prisma.monitorCheck.count({ where: whereClause }),
      prisma.monitor.findMany({
        where: { workspaceId: workspace.id },
        select: { id: true, name: true },
      }),
    ]);

    return NextResponse.json({
      checks,
      monitors,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch checks" },
      { status: err.statusCode || 500 }
    );
  }
}
