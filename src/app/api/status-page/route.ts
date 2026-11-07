import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireWorkspaceContext } from "@/lib/session";
import { Role } from "@prisma/client";

const updateStatusPageSchema = z.object({
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase letters, numbers, and hyphens"),
  title: z.string().min(1).max(100),
  description: z.string().max(500).nullable().optional(),
  isPublic: z.boolean().default(true),
  logoUrl: z.string().url().nullable().optional(),
  supportUrl: z.string().url().nullable().optional(),
  monitorIds: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceIdParam = searchParams.get("workspaceId");

    const { workspace } = await requireWorkspaceContext(workspaceIdParam, Role.MEMBER);

    let statusPage = await prisma.statusPage.findUnique({
      where: { workspaceId: workspace.id },
      include: {
        monitors: {
          include: {
            monitor: {
              select: {
                id: true,
                name: true,
                url: true,
                status: true,
                uptime30d: true,
              },
            },
          },
          orderBy: { displayOrder: "asc" },
        },
      },
    });

    if (!statusPage) {
      statusPage = await prisma.statusPage.create({
        data: {
          workspaceId: workspace.id,
          slug: `${workspace.slug}-status`,
          title: `${workspace.name} Status`,
          description: "Live operational metrics and service availability status.",
          isPublic: true,
        },
        include: {
          monitors: {
            include: {
              monitor: true,
            },
          },
        },
      });
    }

    // Also get all monitors in workspace so user can toggle visibility
    const allWorkspaceMonitors = await prisma.monitor.findMany({
      where: { workspaceId: workspace.id },
      select: { id: true, name: true, url: true, status: true },
    });

    return NextResponse.json({ statusPage, allMonitors: allWorkspaceMonitors });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch status page configuration" },
      { status: err.statusCode || 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceIdParam = searchParams.get("workspaceId");

    const { workspace } = await requireWorkspaceContext(workspaceIdParam, Role.ADMIN);

    const body = await req.json();
    const parsed = updateStatusPageSchema.parse(body);

    // Ensure slug uniqueness (except current statusPage)
    const existingSlug = await prisma.statusPage.findFirst({
      where: {
        slug: parsed.slug,
        NOT: { workspaceId: workspace.id },
      },
    });

    if (existingSlug) {
      return NextResponse.json(
        { error: "Status page slug is already taken. Please choose another." },
        { status: 400 }
      );
    }

    const statusPage = await prisma.statusPage.upsert({
      where: { workspaceId: workspace.id },
      update: {
        slug: parsed.slug,
        title: parsed.title,
        description: parsed.description,
        isPublic: parsed.isPublic,
        logoUrl: parsed.logoUrl,
        supportUrl: parsed.supportUrl,
      },
      create: {
        workspaceId: workspace.id,
        slug: parsed.slug,
        title: parsed.title,
        description: parsed.description,
        isPublic: parsed.isPublic,
        logoUrl: parsed.logoUrl,
        supportUrl: parsed.supportUrl,
      },
    });

    // Update monitored services inclusions if provided
    if (parsed.monitorIds) {
      await prisma.statusPageMonitor.deleteMany({
        where: { statusPageId: statusPage.id },
      });

      if (parsed.monitorIds.length > 0) {
        await prisma.statusPageMonitor.createMany({
          data: parsed.monitorIds.map((monitorId, index) => ({
            statusPageId: statusPage.id,
            monitorId,
            displayOrder: index,
            isVisible: true,
          })),
        });
      }
    }

    return NextResponse.json({ statusPage });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update status page" },
      { status: err.statusCode || 400 }
    );
  }
}
