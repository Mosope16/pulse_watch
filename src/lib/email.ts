import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "PulseWatch <notifications@resend.dev>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

let resendClient: Resend | null = null;
if (RESEND_API_KEY && !RESEND_API_KEY.includes("your_api_key")) {
  resendClient = new Resend(RESEND_API_KEY);
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
  const { to, subject, html, text } = options;

  if (!resendClient) {
    console.log(`[Email Mock Delivery]
To: ${Array.isArray(to) ? to.join(", ") : to}
Subject: ${subject}
Content: ${text || html.slice(0, 150)}...
`);
    return { success: true, id: "mock-email-id" };
  }

  try {
    const data = await resendClient.emails.send({
      from: RESEND_FROM_EMAIL,
      to,
      subject,
      html,
      text: text || subject,
    });

    if (data.error) {
      console.error("[Resend Error]", data.error);
      return { success: false, error: data.error.message };
    }

    return { success: true, id: data.data?.id };
  } catch (err: any) {
    console.error("[Email Dispatch Exception]", err);
    return { success: false, error: err.message || "Failed to send email" };
  }
}

// -------------------------------------------------------------
// Email Templates
// -------------------------------------------------------------

export function buildMonitorDownEmail(params: {
  monitorName: string;
  monitorUrl: string;
  errorMessage?: string;
  statusCode?: number;
  workspaceName: string;
  monitorId: string;
}) {
  const { monitorName, monitorUrl, errorMessage, statusCode, workspaceName, monitorId } = params;
  const monitorLink = `${APP_URL}/monitors/${monitorId}`;

  return {
    subject: `🚨 [CRITICAL] Monitor DOWN: ${monitorName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f3f4f6; padding: 24px; margin: 0; }
          .container { max-width: 600px; margin: 0 auto; background: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 32px; }
          .header { display: flex; align-items: center; margin-bottom: 24px; }
          .badge-down { background-color: #ef4444; color: white; padding: 4px 10px; border-radius: 9999px; font-weight: 700; font-size: 12px; letter-spacing: 0.05em; display: inline-block; }
          h1 { font-size: 20px; font-weight: 700; color: #ffffff; margin-top: 12px; margin-bottom: 8px; }
          .metric-box { background-color: #1f2937; border: 1px solid #374151; border-radius: 8px; padding: 16px; margin: 20px 0; }
          .metric-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
          .metric-label { color: #9ca3af; }
          .metric-value { color: #f9fafb; font-weight: 600; font-family: monospace; }
          .btn { display: inline-block; background-color: #3b82f6; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px; margin-top: 20px; }
          .footer { font-size: 12px; color: #6b7280; margin-top: 32px; border-top: 1px solid #1f2937; padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div><span class="badge-down">SERVICE DOWN</span></div>
          <h1>${monitorName} is currently unavailable</h1>
          <p style="color: #9ca3af; font-size: 14px;">PulseWatch detected consecutive check failures on workspace <strong>${workspaceName}</strong>.</p>
          
          <div class="metric-box">
            <div class="metric-row"><span class="metric-label">Target URL:</span> <span class="metric-value">${monitorUrl}</span></div>
            ${statusCode ? `<div class="metric-row"><span class="metric-label">HTTP Status:</span> <span class="metric-value">${statusCode}</span></div>` : ""}
            <div class="metric-row"><span class="metric-label">Error Reason:</span> <span class="metric-value" style="color: #f87171;">${errorMessage || "Check failed / Timeout"}</span></div>
            <div class="metric-row"><span class="metric-label">Detected At:</span> <span class="metric-value">${new Date().toUTCString()}</span></div>
          </div>

          <a href="${monitorLink}" class="btn">View Monitor Dashboard &rarr;</a>

          <div class="footer">
            PulseWatch Automated Incident Management · You received this alert according to your workspace notification rules.
          </div>
        </div>
      </body>
      </html>
    `,
  };
}

export function buildMonitorRecoveredEmail(params: {
  monitorName: string;
  monitorUrl: string;
  downtimeDuration: string;
  workspaceName: string;
  monitorId: string;
}) {
  const { monitorName, monitorUrl, downtimeDuration, workspaceName, monitorId } = params;
  const monitorLink = `${APP_URL}/monitors/${monitorId}`;

  return {
    subject: `✅ [RESOLVED] Monitor RECOVERED: ${monitorName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f3f4f6; padding: 24px; margin: 0; }
          .container { max-width: 600px; margin: 0 auto; background: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 32px; }
          .badge-up { background-color: #10b981; color: white; padding: 4px 10px; border-radius: 9999px; font-weight: 700; font-size: 12px; letter-spacing: 0.05em; display: inline-block; }
          h1 { font-size: 20px; font-weight: 700; color: #ffffff; margin-top: 12px; margin-bottom: 8px; }
          .metric-box { background-color: #1f2937; border: 1px solid #374151; border-radius: 8px; padding: 16px; margin: 20px 0; }
          .metric-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
          .metric-label { color: #9ca3af; }
          .metric-value { color: #f9fafb; font-weight: 600; font-family: monospace; }
          .btn { display: inline-block; background-color: #10b981; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px; margin-top: 20px; }
          .footer { font-size: 12px; color: #6b7280; margin-top: 32px; border-top: 1px solid #1f2937; padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div><span class="badge-up">RECOVERED</span></div>
          <h1>${monitorName} is back online</h1>
          <p style="color: #9ca3af; font-size: 14px;">The endpoint has recovered and successfully passed subsequent health checks in <strong>${workspaceName}</strong>.</p>
          
          <div class="metric-box">
            <div class="metric-row"><span class="metric-label">Target URL:</span> <span class="metric-value">${monitorUrl}</span></div>
            <div class="metric-row"><span class="metric-label">Downtime Duration:</span> <span class="metric-value" style="color: #34d399;">${downtimeDuration}</span></div>
            <div class="metric-row"><span class="metric-label">Resolved At:</span> <span class="metric-value">${new Date().toUTCString()}</span></div>
          </div>

          <a href="${monitorLink}" class="btn">View Live Status &rarr;</a>

          <div class="footer">
            PulseWatch Automated Incident Management · All active incidents have been resolved.
          </div>
        </div>
      </body>
      </html>
    `,
  };
}

export function buildInvitationEmail(params: {
  workspaceName: string;
  inviterName: string;
  role: string;
  invitationToken: string;
}) {
  const { workspaceName, inviterName, role, invitationToken } = params;
  const inviteLink = `${APP_URL}/invite/accept?token=${invitationToken}`;

  return {
    subject: `You've been invited to join ${workspaceName} on PulseWatch`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f3f4f6; padding: 24px; margin: 0; }
          .container { max-width: 600px; margin: 0 auto; background: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 32px; }
          h1 { font-size: 20px; font-weight: 700; color: #ffffff; margin-bottom: 12px; }
          p { color: #9ca3af; font-size: 15px; line-height: 1.6; }
          .btn { display: inline-block; background-color: #3b82f6; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px; margin-top: 20px; }
          .footer { font-size: 12px; color: #6b7280; margin-top: 32px; border-top: 1px solid #1f2937; padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Team Invitation</h1>
          <p><strong>${inviterName}</strong> has invited you to join the <strong>${workspaceName}</strong> workspace as an <strong>${role}</strong> on PulseWatch.</p>
          <p>Monitor uptime, get notified on outages, and manage production service availability together.</p>
          <a href="${inviteLink}" class="btn">Accept Invitation &rarr;</a>
          <div class="footer">
            PulseWatch Team Management · If you were not expecting this invitation, you can safely ignore this email.
          </div>
        </div>
      </body>
      </html>
    `,
  };
}
