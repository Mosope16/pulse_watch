import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAuthUser } from "@/lib/session";
import { assertWorkspaceAccess } from "@/lib/tenant";
import { Role, IncidentStatus } from "@prisma/client";
import { formatDuration } from "@/lib/utils";

const addUpdateSchema = z.object({
  status: z.enum(["INVESTIGATING", "IDENTIFIED", "MONITORING", "RESOLVED"]),
  message: z.string().min(1, "Update message cannot be empty"),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuthUser();

    const incident = await prisma.incident.findUnique({
      where: { id: params.id },
      include: {
        monitor: true,
        updates: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }

    const membership = await assertWorkspaceAccess(user.id, incident.workspaceId, Role.MEMBER);

    return NextResponse.json({
      incident,
      userRole: membership.role,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch incident" },
      { status: err.statusCode || 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuthUser();

    const incident = await prisma.incident.findUnique({
      where: { id: params.id },
    });

    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }

    await assertWorkspaceAccess(user.id, incident.workspaceId, Role.ADMIN);

    const body = await req.json();
    const { status, message } = addUpdateSchema.parse(body);

    const isResolving = status === "RESOLVED";
    const now = new Date();
    const durationSeconds = isResolving
      ? Math.max(1, Math.round((now.getTime() - incident.startedAt.getTime()) / 1000))
      : incident.durationSeconds;

    const [updatedIncident, newUpdate] = await prisma.$transaction([
      prisma.incident.update({
        where: { id: incident.id },
        data: {
          status: status as IncidentStatus,
          ...(isResolving && {
            resolvedAt: now,
            durationSeconds,
          }),
        },
      }),
      prisma.incidentUpdate.create({
        data: {
          incidentId: incident.id,
          status: status as IncidentStatus,
          message,
          createdBy: user.name,
        },
      }),
    ]);

    return NextResponse.json({
      incident: updatedIncident,
      update: newUpdate,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update incident" },
      { status: err.statusCode || 400 }
    );
  }
}
