import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import prisma from "../src/lib/prisma";
import { MonitorStatus, IncidentStatus, Role } from "@prisma/client";

// Mock executeHttpCheck so lifecycle tests run in milliseconds without external HTTP latency
let mockCheckOutcome = {
  isSuccess: false,
  isDegraded: false,
  statusCode: 500,
  responseTime: 50,
  duration: 50,
  errorMessage: "Expected HTTP 200, received HTTP 500",
  errorType: "STATUS_MISMATCH",
};

vi.mock("../src/lib/http-checker", () => ({
  executeHttpCheck: vi.fn(async () => mockCheckOutcome),
}));

// Also mock queue to avoid network dependency in unit tests
vi.mock("../src/lib/queue", () => ({
  MONITOR_CHECK_QUEUE_NAME: "monitor-checks",
  ALERT_QUEUE_NAME: "alerts",
  enqueueMonitorCheck: vi.fn(async () => null),
  enqueueAlert: vi.fn(async () => null),
}));

import { runSingleMonitorCheck } from "../src/worker/monitoring-worker";

describe("Incident Lifecycle & Consecutive Failure State Machine", () => {
  let testWorkspace: any;
  let testUser: any;
  let testMonitor: any;

  beforeAll(async () => {
    testUser = await prisma.user.create({
      data: {
        name: "Incident Tester",
        email: `incident-tester-${Date.now()}@test.dev`,
      },
    });

    testWorkspace = await prisma.workspace.create({
      data: {
        name: "Lifecycle Test Workspace",
        slug: `lifecycle-${Date.now()}`,
        memberships: {
          create: { userId: testUser.id, role: Role.OWNER },
        },
      },
    });

    testMonitor = await prisma.monitor.create({
      data: {
        workspaceId: testWorkspace.id,
        name: "Failing Test Endpoint",
        url: "https://api.example.com/health",
        method: "GET",
        expectedStatus: 200,
        failureThreshold: 3,
        status: MonitorStatus.UP,
        consecutiveFailures: 0,
      },
    });
  });

  afterAll(async () => {
    if (testWorkspace) {
      await prisma.workspace.delete({ where: { id: testWorkspace.id } }).catch(() => {});
    }
    if (testUser) {
      await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
    }
  });

  it("handles consecutive check failures and triggers incident only when threshold is reached", async () => {
    mockCheckOutcome = {
      isSuccess: false,
      isDegraded: false,
      statusCode: 500,
      responseTime: 45,
      duration: 50,
      errorMessage: "HTTP 500 Internal Server Error",
      errorType: "STATUS_MISMATCH",
    };

    // Check 1: failure 1
    const check1 = await runSingleMonitorCheck(testMonitor.id, true);
    expect(check1.isSuccess).toBe(false);
    expect(check1.monitor.consecutiveFailures).toBe(1);
    expect(check1.monitor.status).toBe(MonitorStatus.UP); // Still UP

    // Check 2: failure 2
    const check2 = await runSingleMonitorCheck(testMonitor.id, true);
    expect(check2.isSuccess).toBe(false);
    expect(check2.monitor.consecutiveFailures).toBe(2);
    expect(check2.monitor.status).toBe(MonitorStatus.UP); // Still UP

    // Check 3: failure 3 -> Threshold reached!
    const check3 = await runSingleMonitorCheck(testMonitor.id, true);
    expect(check3.isSuccess).toBe(false);
    expect(check3.monitor.consecutiveFailures).toBe(3);
    expect(check3.monitor.status).toBe(MonitorStatus.DOWN); // TRANSITIONS TO DOWN!

    // Verify incident record created in DB
    const incident = await prisma.incident.findFirst({
      where: {
        monitorId: testMonitor.id,
        status: IncidentStatus.INVESTIGATING,
      },
      include: { updates: true },
    });

    expect(incident).toBeDefined();
    expect(incident?.title).toContain("is DOWN");
    expect(incident?.updates.length).toBeGreaterThan(0);
  });

  it("automatically resolves incident and marks monitor UP upon recovery", async () => {
    // Simulate endpoint recovering to healthy 200 OK
    mockCheckOutcome = {
      isSuccess: true,
      isDegraded: false,
      statusCode: 200,
      responseTime: 35,
      duration: 40,
      errorMessage: undefined,
      errorType: undefined,
    };

    const recoveryCheck = await runSingleMonitorCheck(testMonitor.id, true);
    expect(recoveryCheck.isSuccess).toBe(true);
    expect(recoveryCheck.monitor.status).toBe(MonitorStatus.UP);
    expect(recoveryCheck.monitor.consecutiveFailures).toBe(0); // Reset to 0

    // Verify incident record resolved
    const resolvedIncident = await prisma.incident.findFirst({
      where: {
        monitorId: testMonitor.id,
        status: IncidentStatus.RESOLVED,
      },
      include: { updates: true },
    });

    expect(resolvedIncident).toBeDefined();
    expect(resolvedIncident?.resolvedAt).toBeDefined();
    expect(resolvedIncident?.durationSeconds).toBeGreaterThanOrEqual(1);

    const latestUpdate = resolvedIncident?.updates[resolvedIncident.updates.length - 1];
    expect(latestUpdate?.status).toBe(IncidentStatus.RESOLVED);
    expect(latestUpdate?.message).toContain("Service has recovered");
  });
});
