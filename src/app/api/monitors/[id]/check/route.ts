import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuthUser } from "@/lib/session";
import { assertWorkspaceAccess } from "@/lib/tenant";
import { runSingleMonitorCheck } from "@/worker/monitoring-worker";
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

    // Execute immediate check and return comprehensive result
    const checkOutcome = await runSingleMonitorCheck(monitor.id, true);

    return NextResponse.json({
      success: true,
      result: checkOutcome,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Manual check execution failed" },
      { status: err.statusCode || 500 }
    );
  }
}
