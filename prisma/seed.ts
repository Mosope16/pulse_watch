import { PrismaClient, Role, MonitorStatus, MonitorMethod, IncidentStatus, IncidentSeverity, NotificationType } from "@prisma/client";
import { auth } from "../src/lib/auth";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding PulseWatch database...");

  // 1. Create or find demo user
  const email = "admin@pulsewatch.dev";
  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    console.log("Creating default admin user...");
    const result = await auth.api.signUpEmail({
      body: {
        email,
        password: "Password123!",
        name: "Alex Mercer",
      },
    });
    user = (result as any)?.user;
    if (!user) {
      user = await prisma.user.findUnique({ where: { email } });
    }
  }

  if (!user) {
    throw new Error("Could not initialize demo user");
  }

  console.log(`Demo user ready: ${user.email} (${user.id})`);

  // 2. Create or find Acme Production workspace
  let workspace = await prisma.workspace.findUnique({
    where: { slug: "acme-production" },
  });

  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: "Acme Production Systems",
        slug: "acme-production",
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
            slug: "acme-status",
            title: "Acme Production Status",
            description: "Live operational metrics and service availability status for Acme services.",
            isPublic: true,
          },
        },
      },
    });
    console.log(`Workspace created: ${workspace.name}`);
  }

  // 3. Seed monitors
  const monitorsData = [
    {
      name: "Primary API Gateway",
      url: "https://httpbin.org/status/200",
      method: MonitorMethod.GET,
      interval: 60,
      timeout: 10000,
      expectedStatus: 200,
      status: MonitorStatus.UP,
      uptime24h: 99.98,
      uptime30d: 99.95,
      avgResponseTime: 48,
      degradedThresholdMs: 2000,
      failureThreshold: 3,
      enabled: true,
    },
    {
      name: "Authentication & Identity Service",
      url: "https://httpbin.org/status/200",
      method: MonitorMethod.HEAD,
      interval: 60,
      timeout: 5000,
      expectedStatus: 200,
      status: MonitorStatus.UP,
      uptime24h: 100.0,
      uptime30d: 99.99,
      avgResponseTime: 34,
      degradedThresholdMs: 1500,
      failureThreshold: 3,
      enabled: true,
    },
    {
      name: "Payment Processing Webhook",
      url: "https://httpbin.org/delay/2",
      method: MonitorMethod.POST,
      interval: 300,
      timeout: 15000,
      expectedStatus: 200,
      status: MonitorStatus.DEGRADED,
      uptime24h: 98.4,
      uptime30d: 99.1,
      avgResponseTime: 2150,
      degradedThresholdMs: 2000,
      failureThreshold: 3,
      body: JSON.stringify({ ping: true }),
      enabled: true,
    },
    {
      name: "Notification Dispatcher Service",
      url: "https://httpbin.org/status/503",
      method: MonitorMethod.GET,
      interval: 60,
      timeout: 10000,
      expectedStatus: 200,
      status: MonitorStatus.DOWN,
      consecutiveFailures: 3,
      uptime24h: 94.2,
      uptime30d: 97.5,
      avgResponseTime: 180,
      degradedThresholdMs: 2000,
      failureThreshold: 3,
      enabled: true,
    },
  ];

  const now = new Date();
  const statusPage = await prisma.statusPage.findUnique({
    where: { workspaceId: workspace.id },
  });

  for (const mData of monitorsData) {
    let monitor = await prisma.monitor.findFirst({
      where: { workspaceId: workspace.id, name: mData.name },
    });

    if (!monitor) {
      monitor = await prisma.monitor.create({
        data: {
          ...mData,
          workspaceId: workspace.id,
          lastCheckAt: now,
          lastStatusChangeAt: now,
        },
      });

      // Link to public status page
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

      // Generate check history (last 20 checks)
      const checksToCreate = [];
      for (let i = 20; i >= 1; i--) {
        const checkTime = new Date(now.getTime() - i * mData.interval * 1000);
        const isFailing = mData.status === MonitorStatus.DOWN && i <= 3;
        const isDegraded = mData.status === MonitorStatus.DEGRADED;

        checksToCreate.push({
          monitorId: monitor.id,
          statusCode: isFailing ? 503 : 200,
          responseTime: isDegraded ? 2200 + Math.floor(Math.random() * 300) : Math.floor(mData.avgResponseTime + (Math.random() * 20 - 10)),
          isSuccess: !isFailing,
          isDegraded,
          errorMessage: isFailing ? "Expected HTTP 200, received HTTP 503" : isDegraded ? "Slow response latency > 2000ms" : null,
          duration: isDegraded ? 2250 : mData.avgResponseTime + 10,
          createdAt: checkTime,
        });
      }

      await prisma.monitorCheck.createMany({
        data: checksToCreate,
      });

      console.log(`Created monitor: ${monitor.name} with ${checksToCreate.length} telemetry checks.`);
    }

    // If monitor is DOWN, seed active incident
    if (mData.status === MonitorStatus.DOWN) {
      const existingIncident = await prisma.incident.findFirst({
        where: { monitorId: monitor.id, status: { in: [IncidentStatus.INVESTIGATING, IncidentStatus.IDENTIFIED] } },
      });

      if (!existingIncident) {
        const inc = await prisma.incident.create({
          data: {
            workspaceId: workspace.id,
            monitorId: monitor.id,
            title: `Service Outage: ${monitor.name} is DOWN`,
            status: IncidentStatus.INVESTIGATING,
            severity: IncidentSeverity.CRITICAL,
            cause: "3 consecutive health checks failed returning HTTP 503 Service Unavailable.",
            startedAt: new Date(now.getTime() - 15 * 60 * 1000), // 15 mins ago
            updates: {
              create: [
                {
                  status: IncidentStatus.INVESTIGATING,
                  message: "Automated alert: Consecutive failure threshold reached. Investigating origin upstream error.",
                  createdBy: "PulseWatch Engine",
                  createdAt: new Date(now.getTime() - 15 * 60 * 1000),
                },
                {
                  status: IncidentStatus.IDENTIFIED,
                  message: "Upstream gateway connection timeout identified. Traffic rerouting initiated.",
                  createdBy: "Alex Mercer",
                  createdAt: new Date(now.getTime() - 5 * 60 * 1000),
                },
              ],
            },
          },
        });

        await prisma.notification.create({
          data: {
            workspaceId: workspace.id,
            title: `Monitor DOWN: ${monitor.name}`,
            message: "Endpoint failed consecutive health checks. Critical incident opened.",
            type: NotificationType.MONITOR_DOWN,
            link: `/monitors/${monitor.id}`,
            createdAt: new Date(now.getTime() - 15 * 60 * 1000),
          },
        });
      }
    }
  }

  console.log("Seeding completed successfully! 🚀");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
