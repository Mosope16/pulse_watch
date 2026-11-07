import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAuthUser, requireWorkspaceContext } from "@/lib/session";
import { Role } from "@prisma/client";

const createWorkspaceSchema = z.object({
  name: z.string().min(2, "Workspace name must be at least 2 characters").max(50),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthUser();

    const memberships = await prisma.membership.findMany({
      where: { userId: user.id },
      include: {
        workspace: {
          include: {
            _count: {
              select: {
                memberships: true,
                monitors: true,
                incidents: {
                  where: {
                    status: { in: ["INVESTIGATING", "IDENTIFIED", "MONITORING"] },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const workspaces = memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      logoUrl: m.workspace.logoUrl,
      role: m.role,
      memberCount: m.workspace._count.memberships,
      monitorCount: m.workspace._count.monitors,
      activeIncidentCount: m.workspace._count.incidents,
      createdAt: m.workspace.createdAt,
    }));

    return NextResponse.json({ workspaces });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch workspaces" },
      { status: err.statusCode || 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthUser();
    const body = await req.json();
    const parsed = createWorkspaceSchema.parse(body);

    const baseSlug = parsed.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`;

    const workspace = await prisma.workspace.create({
      data: {
        name: parsed.name,
        slug: uniqueSlug,
        memberships: {
          create: {
            userId: user.id,
            role: Role.OWNER,
          },
        },
        alertPrefs: {
          create: {
            userId: user.id,
            emailAlerts: true,
            inAppAlerts: true,
            notifyOnDown: true,
            notifyOnRecover: true,
            notifyOnIncident: true,
          },
        },
        statusPage: {
          create: {
            slug: `${baseSlug}-status-${Date.now().toString(36)}`,
            title: `${parsed.name} Status`,
            description: "Live operational status of our monitored services.",
            isPublic: true,
          },
        },
      },
    });

    return NextResponse.json({ workspace }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to create workspace" },
      { status: err.statusCode || 400 }
    );
  }
}
