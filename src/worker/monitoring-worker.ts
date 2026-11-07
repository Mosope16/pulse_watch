import { Worker, Job } from "bullmq";
import { getRedisConnection } from "../lib/redis";
import prisma from "../lib/prisma";
import { executeHttpCheck } from "../lib/http-checker";
import {
  MONITOR_CHECK_QUEUE_NAME,
  MonitorCheckJobData,
  enqueueAlert,
} from "../lib/queue";
import { formatDuration } from "../lib/utils";
import { MonitorStatus, IncidentStatus, IncidentSeverity, NotificationType } from "@prisma/client";

/**
 * Calculates uptime percentage and average response time from historical checks
 */
export async function calculateMonitorMetrics(monitorId: string) {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Checks in last 24h
  const checks24h = await prisma.monitorCheck.findMany({
    where: {
      monitorId,
      createdAt: { gte: dayAgo },
    },
    select: { isSuccess: true, responseTime: true },
  });

  // Total checks in last 30d
  const totalChecks30d = await prisma.monitorCheck.count({
    where: {
      monitorId,
      createdAt: { gte: monthAgo },
    },
  });

  const successfulChecks30d = await prisma.monitorCheck.count({
    where: {
      monitorId,
      createdAt: { gte: monthAgo },
      isSuccess: true,
    },
  });

  const uptime24h =
    checks24h.length > 0
      ? Number(
          (
            (checks24h.filter((c) => c.isSuccess).length / checks24h.length) *
            100
          ).toFixed(2)
        )
      : 100.0;

  const uptime30d =
    totalChecks30d > 0
      ? Number(((successfulChecks30d / totalChecks30d) * 100).toFixed(2))
      : 100.0;

  const avgResponseTime =
    checks24h.length > 0
      ? Math.round(
          checks24h.reduce((acc, c) => acc + c.responseTime, 0) / checks24h.length
        )
      : 0;

  return { uptime24h, uptime30d, avgResponseTime };
}

/**
 * Direct execution helper for a monitor check (used by manual checks and tests)
 */
export async function runSingleMonitorCheck(monitorId: string, isManual = true) {
  // 1. Load monitor configuration
  const monitor = await prisma.monitor.findUnique({
    where: { id: monitorId },
    include: { workspace: true },
  });

  if (!monitor) {
    throw new Error(`Monitor ${monitorId} not found.`);
  }

  if (!monitor.enabled && !isManual) {
    return { skipped: true, reason: "Monitor is paused" };
  }

  // Parse custom headers if any
  let parsedHeaders: Record<string, string> | undefined;
  if (monitor.headers) {
    try {
      parsedHeaders = JSON.parse(monitor.headers);
    } catch {
      // Ignore parse error
    }
  }

  // 2. Execute HTTP Check with SSRF protection and timing
  const checkResult = await executeHttpCheck({
    url: monitor.url,
    method: monitor.method,
    timeoutMs: monitor.timeout,
    expectedStatus: monitor.expectedStatus,
    expectedText: monitor.expectedText,
    headers: parsedHeaders,
    body: monitor.body,
    degradedThresholdMs: monitor.degradedThresholdMs,
  });

  const now = new Date();

  // 3. Persist individual check result
  const savedCheck = await prisma.monitorCheck.create({
    data: {
      monitorId: monitor.id,
      statusCode: checkResult.statusCode,
      responseTime: checkResult.responseTime,
      isSuccess: checkResult.isSuccess,
      isDegraded: checkResult.isDegraded,
      errorMessage: checkResult.errorMessage,
      errorType: checkResult.errorType,
      duration: checkResult.duration,
      createdAt: now,
    },
  });

  // 4. Incident & Health State Machine
  let nextStatus: MonitorStatus = monitor.status;
  let nextConsecutiveFailures = monitor.consecutiveFailures;
  const wasDown = monitor.status === MonitorStatus.DOWN;

  if (!checkResult.isSuccess) {
    nextConsecutiveFailures += 1;

    // Threshold reached: declare DOWN and trigger incident
    if (nextConsecutiveFailures >= monitor.failureThreshold) {
      if (!wasDown) {
        nextStatus = MonitorStatus.DOWN;

        console.log(
          `[Incident Detection] Monitor "${monitor.name}" is DOWN after ${nextConsecutiveFailures} consecutive failures.`
        );

        // Create incident
        const incident = await prisma.incident.create({
          data: {
            workspaceId: monitor.workspaceId,
            monitorId: monitor.id,
            title: `Service Outage: ${monitor.name} is DOWN`,
            status: IncidentStatus.INVESTIGATING,
            severity: IncidentSeverity.CRITICAL,
            cause: `Consecutive check failure threshold reached (${monitor.failureThreshold}). Error: ${
              checkResult.errorMessage || "Status code or check mismatch"
            }`,
            startedAt: now,
            updates: {
              create: {
                status: IncidentStatus.INVESTIGATING,
                message: `Automated detection: Health check failed with error "${
                  checkResult.errorMessage || "Unknown error"
                }". Investigating downtime.`,
                createdBy: "PulseWatch Engine",
              },
            },
          },
        });

        // Create workspace in-app notification
        await prisma.notification.create({
          data: {
            workspaceId: monitor.workspaceId,
            title: `Monitor DOWN: ${monitor.name}`,
            message: `Endpoint ${monitor.url} failed ${nextConsecutiveFailures} consecutive checks: ${
              checkResult.errorMessage || "Outage detected"
            }`,
            type: NotificationType.MONITOR_DOWN,
            link: `/monitors/${monitor.id}`,
          },
        });

        // Enqueue alert notifications
        await enqueueAlert({
          type: "MONITOR_DOWN",
          workspaceId: monitor.workspaceId,
          monitorId: monitor.id,
          incidentId: incident.id,
          details: {
            title: `Monitor DOWN: ${monitor.name}`,
            message: checkResult.errorMessage || "Endpoint unavailable",
            monitorName: monitor.name,
            monitorUrl: monitor.url,
            statusCode: checkResult.statusCode,
            responseTime: checkResult.responseTime,
            errorMessage: checkResult.errorMessage,
            incidentId: incident.id,
          },
        }).catch((e) => console.warn("[Alert Queue Warning]", e.message));
      }
    } else {
      if (!wasDown && checkResult.isDegraded) {
        nextStatus = MonitorStatus.DEGRADED;
      }
    }
  } else {
    // Health check succeeded!
    nextConsecutiveFailures = 0;

    if (wasDown) {
      // RECOVERY!
      nextStatus = checkResult.isDegraded
        ? MonitorStatus.DEGRADED
        : MonitorStatus.UP;

      console.log(
        `[Incident Recovery] Monitor "${monitor.name}" has RECOVERED and is back online.`
      );

      // Find any open active incident for this monitor
      const activeIncidents = await prisma.incident.findMany({
        where: {
          monitorId: monitor.id,
          status: {
            in: [
              IncidentStatus.INVESTIGATING,
              IncidentStatus.IDENTIFIED,
              IncidentStatus.MONITORING,
            ],
          },
        },
      });

      let formattedDowntime = "Unknown duration";

      for (const incident of activeIncidents) {
        const downtimeSeconds = Math.max(
          1,
          Math.round((now.getTime() - incident.startedAt.getTime()) / 1000)
        );
        formattedDowntime = formatDuration(downtimeSeconds);

        await prisma.incident.update({
          where: { id: incident.id },
          data: {
            status: IncidentStatus.RESOLVED,
            resolvedAt: now,
            durationSeconds: downtimeSeconds,
            updates: {
              create: {
                status: IncidentStatus.RESOLVED,
                message: `Service has recovered. Passed subsequent health check (HTTP ${
                  checkResult.statusCode || 200
                } in ${checkResult.responseTime}ms). Total downtime: ${formattedDowntime}.`,
                createdBy: "PulseWatch Engine",
              },
            },
          },
        });
      }

      // Create in-app recovery notification
      await prisma.notification.create({
        data: {
          workspaceId: monitor.workspaceId,
          title: `Monitor RECOVERED: ${monitor.name}`,
          message: `Endpoint ${monitor.url} is back online. Downtime lasted ${formattedDowntime}.`,
          type: NotificationType.MONITOR_RECOVERED,
          link: `/monitors/${monitor.id}`,
        },
      });

      // Enqueue recovery email alert
      await enqueueAlert({
        type: "MONITOR_RECOVERED",
        workspaceId: monitor.workspaceId,
        monitorId: monitor.id,
        details: {
          title: `Monitor RECOVERED: ${monitor.name}`,
          message: `Endpoint is healthy again. Downtime: ${formattedDowntime}`,
          monitorName: monitor.name,
          monitorUrl: monitor.url,
          statusCode: checkResult.statusCode,
          responseTime: checkResult.responseTime,
          downtimeDuration: formattedDowntime,
        },
      }).catch((e) => console.warn("[Alert Queue Warning]", e.message));
    } else {
      nextStatus = checkResult.isDegraded
        ? MonitorStatus.DEGRADED
        : MonitorStatus.UP;
    }
  }

  // 5. Calculate updated metrics
  const { uptime24h, uptime30d, avgResponseTime } =
    await calculateMonitorMetrics(monitor.id);

  // 6. Update monitor status
  const updatedMonitor = await prisma.monitor.update({
    where: { id: monitor.id },
    data: {
      status: nextStatus,
      consecutiveFailures: nextConsecutiveFailures,
      lastCheckAt: now,
      lastStatusChangeAt:
        nextStatus !== monitor.status ? now : monitor.lastStatusChangeAt,
      uptime24h,
      uptime30d,
      avgResponseTime,
    },
  });

  return {
    monitor: updatedMonitor,
    check: savedCheck,
    isSuccess: checkResult.isSuccess,
    isDegraded: checkResult.isDegraded,
    statusCode: checkResult.statusCode,
    responseTime: checkResult.responseTime,
    errorMessage: checkResult.errorMessage,
    responseHeaders: checkResult.responseHeaders,
    responsePreview: checkResult.responsePreview,
  };
}

/**
 * Core monitoring execution handler for a single monitor check job
 */
export async function processMonitorCheck(job: Job<MonitorCheckJobData>) {
  return await runSingleMonitorCheck(job.data.monitorId, job.data.isManual);
}

/**
 * Creates and starts the BullMQ Monitoring Worker
 */
export function createMonitoringWorker() {
  const connection = getRedisConnection();

  const worker = new Worker<MonitorCheckJobData>(
    MONITOR_CHECK_QUEUE_NAME,
    async (job) => {
      return await processMonitorCheck(job);
    },
    {
      connection,
      concurrency: 10,
    }
  );

  worker.on("completed", (job) => {
    // console.log(`[Worker Completed] Check for monitor ${job.data.monitorId}`);
  });

  worker.on("failed", (job, err) => {
    console.error(
      `[Worker Failed] Job ${job?.id} failed for monitor ${job?.data.monitorId}:`,
      err.message
    );
  });

  return worker;
}
