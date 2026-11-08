import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireWorkspaceContext } from "@/lib/session";
import { validateUrlForSSRF } from "@/lib/ssrf";
import { enqueueMonitorCheck } from "@/lib/queue";
import { Prisma, Role, MonitorMethod, MonitorStatus } from "@prisma/client";

const createMonitorSchema = z.object({
  workspaceId: z.string().optional(),
  name: z.string().min(1, "Monitor name is required").max(100),
  url: z.string().url("A valid HTTP/HTTPS URL is required"),
  method: z.enum(["GET", "POST", "HEAD"]).default("GET"),
  interval: z.number().int().refine((val) => [60, 300, 600, 1800].includes(val), {
    message: "Interval must be 1m (60s), 5m (300s), 10m (600s), or 30m (1800s)",
  }).default(60),
  timeout: z.number().int().min(500).max(60000).default(10000),
  expectedStatus: z.number().int().min(100).max(599).default(200),
  expectedText: z.string().nullable().optional(),
  headers: z.string().nullable().optional(), // JSON string
  body: z.string().nullable().optional(),
  degradedThresholdMs: z.number().int().min(100).max(30000).default(2000),
  failureThreshold: z.number().int().min(1).max(10).default(3),
  enabled: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceIdParam = searchParams.get("workspaceId");
    const statusParam = searchParams.get("status");
    const query = searchParams.get("query");

    const { workspace } = await requireWorkspaceContext(workspaceIdParam, Role.MEMBER);

    const whereClause: Prisma.MonitorWhereInput = {
      workspaceId: workspace.id,
    };

    if (statusParam && ["UP", "DEGRADED", "DOWN", "PAUSED"].includes(statusParam.toUpperCase())) {
      whereClause.status = statusParam.toUpperCase() as MonitorStatus;
    }

    if (query && query.trim() !== "") {
      whereClause.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { url: { contains: query, mode: "insensitive" } },
      ];
    }

    const monitors = await prisma.monitor.findMany({
      where: whereClause,
      include: {
        checks: {
          take: 15,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            statusCode: true,
            responseTime: true,
            isSuccess: true,
            isDegraded: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            incidents: {
              where: {
                status: { in: ["INVESTIGATING", "IDENTIFIED", "MONITORING"] },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      monitors: monitors.map((m) => ({
        ...m,
        activeIncidentsCount: m._count.incidents,
        // Reverse checks so sparkline renders chronologically left to right
        sparkline: [...m.checks].reverse(),
      })),
      workspace,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch monitors" },
      { status: err.statusCode || 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createMonitorSchema.parse(body);

    const { workspace } = await requireWorkspaceContext(
      parsed.workspaceId,
      Role.ADMIN
    );

    // SSRF Pre-flight Validation
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

    // Validate headers if JSON
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

    const monitor = await prisma.monitor.create({
      data: {
        workspaceId: workspace.id,
        name: parsed.name,
        url: parsed.url,
        method: parsed.method as MonitorMethod,
        interval: parsed.interval,
        timeout: parsed.timeout,
        expectedStatus: parsed.expectedStatus,
        expectedText: parsed.expectedText || null,
        headers: parsed.headers || null,
        body: parsed.body || null,
        degradedThresholdMs: parsed.degradedThresholdMs,
        failureThreshold: parsed.failureThreshold,
        enabled: parsed.enabled,
        status: parsed.enabled ? "UP" : "PAUSED",
      },
    });

    // Auto-link to public status page if exists
    const statusPage = await prisma.statusPage.findUnique({
      where: { workspaceId: workspace.id },
    });

    if (statusPage) {
      await prisma.statusPageMonitor.create({
        data: {
          statusPageId: statusPage.id,
          monitorId: monitor.id,
          displayName: monitor.name,
          isVisible: true,
        },
      }).catch(() => {});
    }

    // Trigger immediate first check if enabled
    if (monitor.enabled) {
      await enqueueMonitorCheck(monitor.id, workspace.id, true).catch((e) => {
        console.warn("[Queue Error] Could not enqueue initial check:", e.message);
      });
    }

    return NextResponse.json({ monitor }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to create monitor" },
      { status: err.statusCode || 400 }
    );
  }
}
