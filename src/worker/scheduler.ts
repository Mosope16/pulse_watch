import prisma from "../lib/prisma";
import { enqueueMonitorCheck } from "../lib/queue";

let isSchedulerRunning = false;
let schedulerIntervalId: NodeJS.Timeout | null = null;

/**
 * Single scheduler iteration: scans database for active monitors due for a check
 */
export async function runSchedulerTick() {
  if (isSchedulerRunning) return;
  isSchedulerRunning = true;

  try {
    const now = new Date();

    // Find enabled monitors
    const monitors = await prisma.monitor.findMany({
      where: {
        enabled: true,
      },
      select: {
        id: true,
        workspaceId: true,
        name: true,
        interval: true,
        lastCheckAt: true,
      },
    });

    let scheduledCount = 0;

    for (const monitor of monitors) {
      const isDue =
        !monitor.lastCheckAt ||
        now.getTime() - monitor.lastCheckAt.getTime() >= monitor.interval * 1000;

      if (isDue) {
        await enqueueMonitorCheck(monitor.id, monitor.workspaceId, false);
        scheduledCount++;
      }
    }

    if (scheduledCount > 0) {
      // console.log(`[Scheduler] Queued ${scheduledCount} monitor checks.`);
    }
  } catch (err: any) {
    console.error("[Scheduler Error]", err.message);
  } finally {
    isSchedulerRunning = false;
  }
}

/**
 * Starts the scheduler loop running at high resolution (every 5 seconds)
 */
export function startScheduler(pollIntervalMs = 5000) {
  console.log(`[Scheduler] Started monitoring scheduler loop (tick every ${pollIntervalMs}ms).`);
  // Immediate initial tick
  runSchedulerTick();
  schedulerIntervalId = setInterval(runSchedulerTick, pollIntervalMs);
  return schedulerIntervalId;
}

export function stopScheduler() {
  if (schedulerIntervalId) {
    clearInterval(schedulerIntervalId);
    schedulerIntervalId = null;
    console.log("[Scheduler] Stopped.");
  }
}
