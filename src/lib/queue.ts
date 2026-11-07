import { Queue } from "bullmq";
import { getRedisConnection } from "./redis";

export interface MonitorCheckJobData {
  monitorId: string;
  workspaceId: string;
  isManual?: boolean;
  scheduledTime?: number;
}

export interface AlertJobData {
  type:
    | "MONITOR_DOWN"
    | "MONITOR_RECOVERED"
    | "INCIDENT_CREATED"
    | "INCIDENT_RESOLVED"
    | "INVITATION";
  workspaceId: string;
  monitorId?: string;
  incidentId?: string;
  recipientEmail?: string;
  invitationToken?: string;
  inviterName?: string;
  details: {
    title: string;
    message: string;
    monitorName?: string;
    monitorUrl?: string;
    statusCode?: number;
    responseTime?: number;
    errorMessage?: string;
    downtimeDuration?: string;
    incidentId?: string;
  };
}

const connection = getRedisConnection();

export const MONITOR_CHECK_QUEUE_NAME = "monitor-checks";
export const ALERT_QUEUE_NAME = "alerts";

export const monitorCheckQueue = new Queue<MonitorCheckJobData>(
  MONITOR_CHECK_QUEUE_NAME,
  {
    connection,
    defaultJobOptions: {
      attempts: 2,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    },
  }
);

export const alertQueue = new Queue<AlertJobData>(ALERT_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});

/**
 * Enqueue a monitor check job with duplicate prevention.
 * Uses a deterministic job ID for the current execution window to prevent duplicate queueing.
 */
export async function enqueueMonitorCheck(
  monitorId: string,
  workspaceId: string,
  isManual = false
) {
  try {
    const windowSlot = Math.floor(Date.now() / 30000);
    const jobId = isManual
      ? `manual:${monitorId}:${Date.now()}`
      : `check:${monitorId}:${windowSlot}`;

    return await Promise.race([
      monitorCheckQueue.add(
        "execute-check",
        {
          monitorId,
          workspaceId,
          isManual,
          scheduledTime: Date.now(),
        },
        {
          jobId,
          priority: isManual ? 1 : 10,
        }
      ),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error("Redis enqueue timeout")), 3000)
      ),
    ]);
  } catch (err: any) {
    console.warn(`[Queue Warning] Could not enqueue check for monitor ${monitorId}:`, err.message);
    return null;
  }
}

/**
 * Enqueue an alert notification to be processed reliably.
 */
export async function enqueueAlert(alertData: AlertJobData) {
  try {
    const jobId = `alert:${alertData.type}:${alertData.workspaceId}:${alertData.monitorId || ""}:${Date.now()}`;
    return await Promise.race([
      alertQueue.add("send-alert", alertData, { jobId }),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error("Redis alert enqueue timeout")), 3000)
      ),
    ]);
  } catch (err: any) {
    console.warn(`[Queue Warning] Could not enqueue alert ${alertData.type}:`, err.message);
    return null;
  }
}
