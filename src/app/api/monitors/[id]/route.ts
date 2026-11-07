import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAuthUser } from "@/lib/session";
import { assertWorkspaceAccess, assertMonitorBelongsToWorkspace } from "@/lib/tenant";
import { validateUrlForSSRF } from "@/lib/ssrf";
import { Role, MonitorMethod } from "@prisma/client";

const updateMonitorSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  url: z.string().url().optional(),
  method: z.enum(["GET", "POST", "HEAD"]).optional(),
  interval: z.number().int().refine((val) => [60, 300, 600, 1800].includes(val)).optional(),
  timeout: z.number().int().min(500).max(60000).optional(),
  expectedStatus: z.number().int().min(100).max(599).optional(),
  expectedText: z.string().nullable().optional(),
  headers: z.string().nullable().optional(),
  body: z.string().nullable().optional(),
  degradedThresholdMs: z.number().int().min(100).max(30000).optional(),
  failureThreshold: z.number().int().min(1).max(10).optional(),
  enabled: z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuthUser();

    const monitor = await prisma.monitor.findUnique({
      where: { id: params.id },
      include: {
        workspace: true,
        incidents: {
          take: 10,
          orderBy: { startedAt: "desc" },
          include: {
            updates: {
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    });

    if (!monitor) {
      return NextResponse.json({ error: "Monitor not found" }, { status: 404 });
    }

    // Verify tenant access
    const membership = await assertWorkspaceAccess(user.id, monitor.workspaceId, Role.MEMBER);

    // Fetch last 50 checks for detailed latency history
    const recentChecks = await prisma.monitorCheck.findMany({
      where: { monitorId: monitor.id },
      take: 50,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      monitor,
      recentChecks: [...recentChecks].reverse(),
      userRole: membership.role,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch monitor" },
      { status: err.statusCode || 500 }
    );
  }
}

export async function PATCH(
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

    const body = await req.json();
    const parsed = updateMonitorSchema.parse(body);

    // If URL is being changed, re-validate SSRF
    if (parsed.url && parsed.url !== monitor.url) {
      const ssrfCheck = await validateUrlForSSRF(parsed.url);
      if (!ssrfCheck.isValid) {
        return NextResponse.json(
          {
            error: `Security Validation Failed: ${ssrfCheck.error}`,
            code: "SSRF_VIOLATION",
          },
          { status: 400 }
        );
      }
    }

    if (parsed.headers && parsed.headers.trim() !== "") {
      try {
        JSON.parse(parsed.headers);
      } catch {
        return NextResponse.json(
          { error: "Invalid JSON format for custom headers" },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.monitor.update({
      where: { id: params.id },
      data: {
        ...(parsed.name && { name: parsed.name }),
        ...(parsed.url && { url: parsed.url }),
        ...(parsed.method && { method: parsed.method as MonitorMethod }),
        ...(parsed.interval && { interval: parsed.interval }),
        ...(parsed.timeout && { timeout: parsed.timeout }),
        ...(parsed.expectedStatus && { expectedStatus: parsed.expectedStatus }),
        ...(parsed.expectedText !== undefined && { expectedText: parsed.expectedText }),
        ...(parsed.headers !== undefined && { headers: parsed.headers }),
        ...(parsed.body !== undefined && { body: parsed.body }),
        ...(parsed.degradedThresholdMs && { degradedThresholdMs: parsed.degradedThresholdMs }),
        ...(parsed.failureThreshold && { failureThreshold: parsed.failureThreshold }),
        ...(parsed.enabled !== undefined && {
          enabled: parsed.enabled,
          status: !parsed.enabled ? "PAUSED" : monitor.status === "PAUSED" ? "UP" : monitor.status,
        }),
      },
    });

    return NextResponse.json({ monitor: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update monitor" },
      { status: err.statusCode || 400 }
    );
  }
}

export async function DELETE(
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

    await prisma.monitor.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to delete monitor" },
      { status: err.statusCode || 400 }
    );
  }
}
