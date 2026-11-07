import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuthUser } from "@/lib/session";
import { assertWorkspaceAccess } from "@/lib/tenant";
import { Role } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuthUser();

    const monitor = await prisma.monitor.findUnique({
      where: { id: params.id },
      select: { workspaceId: true },
    });

    if (!monitor) {
      return NextResponse.json({ error: "Monitor not found" }, { status: 404 });
    }

    await assertWorkspaceAccess(user.id, monitor.workspaceId, Role.MEMBER);

    const { searchParams } = new URL(req.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "30", 10)));
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const skip = (page - 1) * limit;

    const [checks, totalCount] = await Promise.all([
      prisma.monitorCheck.findMany({
        where: { monitorId: params.id },
        take: limit,
        skip,
        orderBy: { createdAt: "desc" },
      }),
      prisma.monitorCheck.count({
        where: { monitorId: params.id },
      }),
    ]);

    return NextResponse.json({
      checks,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch monitor checks" },
      { status: err.statusCode || 500 }
    );
  }
}
