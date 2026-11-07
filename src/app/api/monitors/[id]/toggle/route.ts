import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuthUser } from "@/lib/session";
import { assertWorkspaceAccess } from "@/lib/tenant";
import { Role } from "@prisma/client";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuthUser();

    const monitor = await prisma.monitor.findUnique({
      where: { id: params.id },
    });

    if (!monitor) {
      return NextResponse.json({ error: "Monitor not found" }, { status: 404 });
    }

    await assertWorkspaceAccess(user.id, monitor.workspaceId, Role.ADMIN);

    const newEnabled = !monitor.enabled;
    const newStatus = newEnabled ? "UP" : "PAUSED";

    const updated = await prisma.monitor.update({
      where: { id: params.id },
      data: {
        enabled: newEnabled,
        status: newStatus,
        lastStatusChangeAt: new Date(),
      },
    });

    return NextResponse.json({
      monitor: updated,
      message: newEnabled ? "Monitoring resumed" : "Monitoring paused",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to toggle monitor status" },
      { status: err.statusCode || 400 }
    );
  }
}
