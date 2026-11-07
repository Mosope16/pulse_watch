import { Worker, Job } from "bullmq";
import { getRedisConnection } from "../lib/redis";
import prisma from "../lib/prisma";
import {
  ALERT_QUEUE_NAME,
  AlertJobData,
} from "../lib/queue";
import {
  sendEmail,
  buildMonitorDownEmail,
  buildMonitorRecoveredEmail,
  buildInvitationEmail,
} from "../lib/email";

export async function processAlertJob(job: Job<AlertJobData>) {
  const { type, workspaceId, monitorId, recipientEmail, invitationToken, inviterName, details } = job.data;

  // 1. Handle Invitation alerts directly
  if (type === "INVITATION" && recipientEmail && invitationToken) {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    const emailPayload = buildInvitationEmail({
      workspaceName: workspace?.name || "PulseWatch Workspace",
      inviterName: inviterName || "A team member",
      role: "MEMBER",
      invitationToken,
    });

    return await sendEmail({
      to: recipientEmail,
      subject: emailPayload.subject,
      html: emailPayload.html,
    });
  }

  // 2. Load workspace and its members with their alert preferences
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      memberships: {
        include: {
          user: true,
        },
      },
      alertPrefs: true,
    },
  });

  if (!workspace) {
    console.warn(`[Alert Worker] Workspace ${workspaceId} not found.`);
    return;
  }

  // Map preferences by userId
  const prefsByUser = new Map<string, (typeof workspace.alertPrefs)[0]>();
  workspace.alertPrefs.forEach((p) => prefsByUser.set(p.userId, p));

  // Determine recipients
  const emailRecipients: string[] = [];

  for (const membership of workspace.memberships) {
    const pref = prefsByUser.get(membership.userId);

    // If preferences exist, check them. Default to true if not explicitly disabled.
    const emailAlertsEnabled = pref ? pref.emailAlerts : true;

    if (!emailAlertsEnabled) continue;

    if (type === "MONITOR_DOWN") {
      const notifyOnDown = pref ? pref.notifyOnDown : true;
      if (notifyOnDown && membership.user.email) {
        emailRecipients.push(membership.user.email);
      }
    } else if (type === "MONITOR_RECOVERED") {
      const notifyOnRecover = pref ? pref.notifyOnRecover : true;
      if (notifyOnRecover && membership.user.email) {
        emailRecipients.push(membership.user.email);
      }
    } else if (type === "INCIDENT_CREATED" || type === "INCIDENT_RESOLVED") {
      const notifyOnIncident = pref ? pref.notifyOnIncident : true;
      if (notifyOnIncident && membership.user.email) {
        emailRecipients.push(membership.user.email);
      }
    }
  }

  if (emailRecipients.length === 0) {
    console.log(`[Alert Worker] No subscribed email recipients for alert ${type} in workspace ${workspace.name}.`);
    return;
  }

  // Build appropriate email template
  let emailPayload: { subject: string; html: string } | null = null;

  if (type === "MONITOR_DOWN") {
    emailPayload = buildMonitorDownEmail({
      monitorName: details.monitorName || "Unknown Service",
      monitorUrl: details.monitorUrl || "",
      errorMessage: details.errorMessage,
      statusCode: details.statusCode,
      workspaceName: workspace.name,
      monitorId: monitorId || "",
    });
  } else if (type === "MONITOR_RECOVERED") {
    emailPayload = buildMonitorRecoveredEmail({
      monitorName: details.monitorName || "Unknown Service",
      monitorUrl: details.monitorUrl || "",
      downtimeDuration: details.downtimeDuration || "N/A",
      workspaceName: workspace.name,
      monitorId: monitorId || "",
    });
  }

  if (emailPayload) {
    console.log(
      `[Alert Worker] Sending ${type} email to ${emailRecipients.length} recipients: ${emailRecipients.join(", ")}`
    );

    return await sendEmail({
      to: emailRecipients,
      subject: emailPayload.subject,
      html: emailPayload.html,
    });
  }
}

export function createAlertWorker() {
  const connection = getRedisConnection();

  const worker = new Worker<AlertJobData>(
    ALERT_QUEUE_NAME,
    async (job) => {
      return await processAlertJob(job);
    },
    {
      connection,
      concurrency: 5,
    }
  );

  worker.on("failed", (job, err) => {
    console.error(`[Alert Worker Failed] Job ${job?.id}:`, err.message);
  });

  return worker;
}
