# PulseWatch - Task Plan & Implementation Roadmap

## Goal
Build PulseWatch: a production-grade, multi-tenant API and website monitoring platform (Full-Stack SaaS MVP v1.0) with scheduled monitoring, background BullMQ workers, retry handling, consecutive failure incident management, reliable alert delivery (Resend & in-app), uptime/latency analytics, SSRF-safe request engine, and public status pages.

## Status: COMPLETE (v1.0 Ready)

---

## Phase Breakdown

### Phase 1: Project Initialization & Foundation
- [x] Initialize Next.js 14+ (App Router) with TypeScript, Tailwind CSS, Lucide icons.
- [x] Install core dependencies: Prisma, Better Auth, BullMQ, ioredis, Zod, Recharts, Resend, date-fns.
- [x] Configure environment variables (`.env.example` and `.env`) supporting Neon Postgres, Redis/Valkey, Resend, and Better Auth.
- [x] Set up project structure following SaaS best practices.

### Phase 2: Database Schema & Tenant Architecture (Prisma)
- [x] Implement Prisma schema covering:
  - User, Session, Account, Verification
  - Workspace, Membership (Roles: OWNER, ADMIN, MEMBER)
  - Invitation
  - Monitor (HTTP methods: GET, POST, HEAD; intervals: 1m, 5m, 10m, 30m; timeouts; expectedStatus; expectedText; enabled; status; etc.)
  - MonitorCheck (statusCode, responseTime, isSuccess, errorMessage, duration, headers, timestamp)
  - Incident (status: INVESTIGATING, IDENTIFIED, MONITORING, RESOLVED; failureStreak; resolvedAt; duration)
  - IncidentUpdate (message, status, createdAt)
  - Notification (userId, workspaceId, title, message, type, isRead)
  - AlertPreference (workspaceId, userId, emailAlerts, inAppAlerts, notifyOnDown, notifyOnRecover, notifyOnIncident)
  - StatusPage & StatusPageMonitor (slug, title, description, isPublic, logoUrl)
- [x] Generate Prisma Client (`npx prisma generate`) and push schema to Neon (`schema: pulsewatch`).
- [x] Implement database client singleton and tenant isolation helper functions (`src/lib/tenant.ts`).

### Phase 3: Authentication & Multi-Tenant Workspace System
- [x] Configure Better Auth (with session cookies, credentials provider, workspace context).
- [x] Build Auth UI: Sign Up, Sign In, Session provider.
- [x] Build Workspace Management:
  - Create workspace, switch workspace, workspace settings.
  - Role-Based Access Control (RBAC): OWNER, ADMIN, MEMBER.
  - Team Invitations: Invite members via email with role selection and token validation.
  - Member management table: view members, update roles, revoke invitations.

### Phase 4: SSRF-Safe Monitoring Engine & Request Executor
- [x] Implement robust SSRF Defense Module (`src/lib/ssrf.ts`):
  - Block loopback (127.0.0.0/8, ::1)
  - Block private RFC1918 IPv4 (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
  - Block link-local (169.254.0.0/16, fe80::/10)
  - Block carrier-grade NAT, broadcast, multicast, documentation ranges
  - Resolve DNS synchronously before connection and validate all resolved IPs
  - Prevent DNS rebinding and intercept redirects (validate redirect location target before following)
- [x] Implement HTTP Check Executor (`src/lib/http-checker.ts`):
  - Supports GET, POST, HEAD
  - Custom timeouts, body assertions (`expectedText`), expected status codes
  - Latency calculation (DNS, TCP, TLS, TTFB, total response time)
  - Header inspection and safe snippet extraction

### Phase 5: Redis, BullMQ Queue & Resilient Monitoring Worker
- [x] Queue architecture (`src/lib/queue.ts`):
  - Monitor check scheduler queue
  - Monitor check execution worker (`src/worker/monitoring-worker.ts`)
  - Alert delivery queue & worker (`src/worker/alert-worker.ts`)
- [x] Scheduler system (`src/worker/scheduler.ts`): dynamically queries active monitors due for a check (1m, 5m, 10m, 30m).
- [x] Worker check loop:
  - Fetch monitor details (with tenant boundary)
  - Execute SSRF-safe HTTP request
  - Record `MonitorCheck` in DB
  - Consecutive failure logic:
    - If failed: increment `consecutiveFailures`. If `>= failureThreshold` (default 3) and not already DOWN -> mark DOWN, trigger incident, dispatch alerts.
    - If degraded: response time > threshold or partial condition -> mark DEGRADED.
    - If healthy: reset `consecutiveFailures`. If previously DOWN or DEGRADED -> mark UP, auto-resolve active incident, calculate downtime duration, dispatch recovery alert.
- [x] Standalone worker entry point (`src/worker/index.ts`) with graceful shutdown.

### Phase 6: Alerting & Notification Engine
- [x] In-App Notification System:
  - Create notifications on down/recovered/incident events
  - Notification center dropdown/page with unread count and mark-as-read
- [x] Email Notification Delivery:
  - Resend email integration with fallback mock for local/dev
  - Transactional email templates for DOWN alerts, Incident Created, Incident Resolved, and Workspace Invitations
  - Alert preferences configuration per workspace.

### Phase 7: Monitor Management & Manual Triggering UI
- [x] Monitors List View (`src/app/monitors/page.tsx`):
  - Status cards (Operational, Degraded, Down, Paused)
  - Monitor table with live status badges, last check time, interval, response time, sparklines
  - Actions: Pause/Resume toggle, "Check Now" manual trigger, Edit, Delete
- [x] Monitor Creation & Edit Modal (`src/components/monitors/CreateMonitorModal.tsx`):
  - Name, URL, Method, Interval, Timeout, Expected Status, Expected Text, Latency Threshold
- [x] Monitor Detail Page (`src/app/monitors/[id]/page.tsx`):
  - Configuration summary
  - Health status badge & metric cards
  - Latency line chart (Recharts)
  - Uptime percentage calculation (24h, 30d)
  - Recent check history table with expandable details
  - Incident history timeline

### Phase 8: Incident Management System
- [x] Incidents Page (`src/app/incidents/page.tsx`):
  - Filter by status: All, Active, Resolved
  - Incident detail view with timeline updates, root cause, downtime duration, affected monitor
- [x] Incident update API: post investigation updates to timeline.

### Phase 9: Analytics Dashboard & Global Check History
- [x] Analytics Page (`src/app/analytics/page.tsx`):
  - Aggregated metrics: Overall uptime SLA, avg latency, active incidents count
  - Latency trends over time (AreaChart)
  - Incident frequency distribution (BarChart)
  - Health status distribution (Donut chart)
- [x] Global Check History Page (`src/app/checks/page.tsx`):
  - Real-time tabular stream of checks across all workspace monitors with latency, status codes, and timestamps.

### Phase 10: Public Status Pages
- [x] Public Status Page (`src/app/status/[slug]/page.tsx`):
  - Overall system operational status banner
  - Monitored service components and current health
  - 14-day uptime history bars
  - Active and historical incident timelines
- [x] Status Page Customizer (`src/app/settings/status-page/page.tsx`):
  - Manage title, description, slug, public visibility, and included monitors.

### Phase 11: Production Verification & Docker Deployment
- [x] Next.js 14 production build verified (`npm run build` succeeds cleanly).
- [x] Automated test suite verified (`npx vitest run`: 20/20 tests passed across SSRF, HTTP Checker, Tenant Isolation, and Incident State Machine).
- [x] Dockerization (`Dockerfile`, `Dockerfile.worker`, `docker-compose.yml`).
- [x] Smoke-tested background worker scheduler and job execution.
- [x] Complete production documentation (`README.md`).
