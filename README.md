# PulseWatch (v1.0) — Production-Grade Multi-Tenant API & Website Monitoring SaaS

> **Know when your services go down, understand what happened, and get notified before your users start complaining.**

PulseWatch is a modern, full-stack multi-tenant monitoring platform engineered to monitor API endpoints and websites, detect degradation and outages, track incident lifecycles with consecutive failure thresholds, deliver reliable alert notifications via Resend, and host public status pages.

---

## Architecture Overview

```
                                  ┌────────────────────────┐
                                  │   Next.js 14 Web App   │
                                  │  (App Router Frontend  │
                                  │   & REST API Handlers) │
                                  └───────────┬────────────┘
                                              │
                      ┌───────────────────────┼────────────────────────┐
                      │                       │                        │
                      ▼                       ▼                        ▼
           ┌──────────────────────┐  ┌─────────────────┐   ┌──────────────────────┐
           │   Neon PostgreSQL    │  │  Valkey / Redis │   │     Resend API       │
           │  (Tenant Isolation,  │  │ (BullMQ Queues, │   │  (Branded Outage &   │
           │  Schema: pulsewatch) │  │  Deduplication) │   │   Recovery Emails)   │
           └──────────┬───────────┘  └────────┬────────┘   └──────────▲───────────┘
                      │                       │                       │
                      │                       ▼                       │
                      │          ┌─────────────────────────┐          │
                      └─────────►│  BullMQ Worker Service  │──────────┘
                                 │  (Scheduler, HTTP Exec, │
                                 │   Incident Engine)      │
                                 └────────────┬────────────┘
                                              │
                                              ▼
                                 ┌─────────────────────────┐
                                 │   SSRF-Protected HTTP   │
                                 │    Target Dispatcher    │
                                 └─────────────────────────┘
                                              │
                                              ▼
                                   [ Monitored Endpoints ]
```

### Core Architecture Components
1. **Next.js 14 App Router**: Responsive dark-mode dashboard, monitor management, interactive telemetry charts (Recharts), incident management, check history viewer, and public status pages (`/status/[slug]`).
2. **Neon Serverless Postgres (`DATABASE_URL` & `DATABASE_URL_UNPOOLED`)**: Multi-tenant database design with connection pooling for standard traffic and unpooled direct URL for migrations and schema pushes.
3. **Neon Object Storage (`AWS_ENDPOINT_URL_S3` & `assets` bucket)**: S3-compatible branch-aware asset storage for status page logos, incident attachments, and monitor snapshots.
4. **Neon Functions (`NEON_FUNCTION_HELLO_BASE_URL`)**: Serverless compute running next to the database in `us-east-2`.
5. **Neon Realtime (`NEON_REALTIME_URL` & `NEON_REALTIME_SECRET`)**: WebSocket live query subscription engine for instant telemetry and incident updates.
6. **Neon Auth (`NEON_AUTH_BASE_URL` & `NEON_AUTH_JWKS_URL`)**: Managed identity in Postgres with JWKS validation.
7. **Valkey / Redis 7.2+**: In-memory queuing backend powering check dispatching and notification delivery.
8. **BullMQ Worker & Scheduler**: Distributed task engine executing background checks, computing 24-hour and 30-day uptime SLAs, orchestrating consecutive failure state machines, and dispatching alerts.
9. **SSRF Defense Engine**: Enterprise-grade HTTP executor with pre-flight DNS inspection, private IP range blocking, cloud metadata protection, and manual redirect inspection.
10. **Resend Email Service**: Transactional email alerts with branded responsive HTML templates for downtime, recovery, and workspace invitations.
7. **Resend Email Service**: Transactional email alerts with branded responsive HTML templates for downtime, recovery, and workspace invitations.

---

## Key Features

### 1. Multi-Tenant Workspaces & RBAC
- **Tenant Isolation**: Every monitor, check, incident, and alert preference belongs strictly to a workspace.
- **Role Hierarchy**:
  - `OWNER`: Full workspace administration, member deletion, workspace deletion.
  - `ADMIN`: Monitor creation, editing, pausing, incident updates, team invitations.
  - `MEMBER`: Read-only access to telemetry, monitor performance, and check history.
- **Team Invitations**: Cryptographically secure token-based invitations with role assignment and one-click onboarding (`/invite/accept?token=...`).

### 2. Comprehensive Monitor Management
- **HTTP Methods**: Full support for `GET`, `POST`, and `HEAD` requests.
- **Configurable Intervals**: 1-minute, 5-minute, 10-minute, and 30-minute monitoring cadences.
- **Request Customization**: Custom request headers, request bodies (for POST), and per-monitor request timeouts (1s to 60s).
- **Assertions**: Status code validation (e.g. `200`) and response body keyword verification.
- **Degraded Latency Thresholds**: Custom response time thresholds in milliseconds; endpoints responding slower than configured are flagged as `DEGRADED`.
- **Fast Actions**: Pause/resume monitoring toggles and on-demand "Check Now" triggers.

### 3. Monitoring Engine & Incident State Machine
- **Health States**:
  - `OPERATIONAL (UP)`: Endpoint responds successfully within the latency threshold and satisfies all assertion criteria.
  - `DEGRADED`: Endpoint responds with an acceptable HTTP status but exceeds the response time threshold or fails body assertion.
  - `DOWN`: Endpoint times out, returns HTTP errors (e.g. 500, 502, 503), fails connection, or fails consecutive health checks.
- **Consecutive Failure Thresholds (Anti-Flapping)**:
  - Prevents noisy false alarms caused by transient network blips.
  - Requires $N$ consecutive failures (default: 3) before transitioning to `DOWN` and triggering an incident.
  - Automatically resolves incidents when the endpoint passes consecutive recovery checks, calculating exact downtime duration.

### 4. Alerting & Notification Center
- **Notification Channels**:
  - **Email**: Delivered via Resend with dark-themed responsive email templates.
  - **In-App**: Real-time notification feed with read/unread tracking and direct incident navigation.
- **Event Triggers**:
  - Monitor Outage (`MONITOR_DOWN`)
  - Monitor Recovery (`MONITOR_RECOVERED`)
  - Incident Created (`INCIDENT_CREATED`)
  - Incident Resolved (`INCIDENT_RESOLVED`)
  - Workspace Team Invitation (`INVITATION`)
- **Per-Workspace Preferences**: Fine-grained toggles for individual event triggers and channels.

### 5. Analytics & Live Telemetry
- **Workspace Analytics**:
  - Overall Uptime Percentage (24h and 30-day calculation)
  - Average Latency across all monitors
  - Active Outages & Incidents count
  - Monitor Health Status Distribution (Donut Chart)
  - Latency Trends Time-Series (Area Chart)
  - Incident Frequency by Day (Bar Chart)
- **Monitor Detail View**:
  - Sparklines showing real-time status strips
  - Recent check history table with response codes, round-trip times, and error logs
  - Incident timeline log with root cause messages

### 6. Public Status Pages
- Hosted on clean vanity slugs: `/status/[slug]` (e.g. `/status/acme-status`).
- Visitors can view:
  - Overall system operational status banner
  - Monitored service components and current health
  - 14-day uptime history bars
  - Active and historical incident timelines
  - Configurable from Workspace Settings (custom page title, description, and monitored component selection).

---

## Security: Server-Side Request Forgery (SSRF) Protection

Because PulseWatch allows users to specify custom URLs for HTTP monitoring, protecting internal infrastructure from Server-Side Request Forgery (SSRF) is paramount.

The PulseWatch SSRF defense module (`src/lib/ssrf.ts`) enforces multi-layered validation:

### 1. Protocol & Format Validation
- Only `http:` and `https:` schemes are accepted. Protocols like `file:`, `gopher:`, `ftp:`, or `ldap:` are immediately rejected.
- Embedded user credentials (e.g., `http://admin:secret@host`) are strictly forbidden.

### 2. Pre-Flight DNS Resolution
- Hostnames are resolved to IPv4 and IPv6 addresses via `dns.promises.lookup` (with `all: true`) before any network connection is opened.
- Canonical names and CNAME chains are evaluated.

### 3. IP Address Range Blocklisting
Using `ipaddr.js`, all resolved addresses are parsed and checked against forbidden ranges:
- **Loopback**: `127.0.0.0/8`, `::1`
- **RFC1918 Private**: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`
- **Carrier-Grade NAT (CGNAT)**: `100.64.0.0/10`
- **Link-Local & Cloud Metadata**: `169.254.0.0/16`, `fe80::/10` (blocks AWS, GCP, and Azure instance metadata services: `http://169.254.169.254/latest/meta-data/`)
- **Internal Domains**: Direct blocks for `localhost`, `*.localhost`, `*.local`, `*.internal`, and `metadata.google.internal`.
- **Multicast / Broadcast / Unspecified**: `224.0.0.0/4`, `255.255.255.255/32`, `0.0.0.0/8`.

### 4. Manual Redirect Inspection (No SSRF Bypass via 301/302)
- Automated `redirect: 'follow'` is **disabled**.
- The HTTP checker follows redirects manually step-by-step (up to a maximum of 5 hops).
- **Every redirect target URL from the `Location` header is passed through full SSRF validation** before the subsequent request is issued, preventing redirect-based internal network probing.

---

## Database Schema (Prisma)

The application uses an isolated PostgreSQL schema (`pulsewatch`) with complete multi-tenant relational modeling:

- `User`: Accounts with authentication credentials, email verification, and workspace memberships.
- `Workspace`: Multi-tenant organization boundaries.
- `Membership`: Role-based access control (`OWNER`, `ADMIN`, `MEMBER`).
- `Invitation`: Workspace team invitation tokens with expiry.
- `Monitor`: Endpoint configuration, HTTP method, headers, interval, timeout, threshold, and current status.
- `MonitorCheck`: Individual check results with HTTP status code, latency (ms), timestamp, and error details.
- `Incident`: Outages linked to monitors, tracking status (`INVESTIGATING`, `IDENTIFIED`, `MONITORING`, `RESOLVED`), start time, resolution time, and root cause.
- `IncidentUpdate`: Timeline entries for ongoing incident investigations.
- `AlertPreference`: Workspace-level notification toggles for email/in-app channels and event types.
- `Notification`: User in-app notifications with read status and event metadata.
- `StatusPage`: Public status page settings (title, description, slug).
- `StatusPageMonitor`: Pivot table associating monitors with a public status page.

---

## Local Development Quickstart

### Prerequisites
- Node.js 20+
- PostgreSQL database (or Neon Postgres)
- Redis 7.2+ or Valkey

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in credentials:
```bash
cp .env.example .env
```

Key variables:
```env
DATABASE_URL="postgresql://user:password@host/neondb?sslmode=require&schema=pulsewatch"
DATABASE_URL_UNPOOLED="postgresql://user:password@host/neondb?sslmode=require&schema=pulsewatch"
REDIS_URL="redis://127.0.0.1:6379"
BETTER_AUTH_SECRET="pulsewatch-super-secret-key-32-chars-minimum"
BETTER_AUTH_URL="http://localhost:3000"
RESEND_API_KEY="re_..."
EMAIL_FROM="alerts@pulsewatch.dev"
```

### 3. Initialize Database & Seed Demo Data
```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

### 4. Run Development Servers
In terminal 1 (Web Dashboard & API):
```bash
npm run dev
```

In terminal 2 (Background Monitoring Worker & Scheduler):
```bash
npm run worker:dev
```

### 5. Access the Platform
- **Dashboard**: [http://localhost:3000](http://localhost:3000)
- **Public Status Page**: [http://localhost:3000/status/acme-status](http://localhost:3000/status/acme-status)
- **Demo Login**:
  - **Email**: `admin@pulsewatch.dev`
  - **Password**: `Password123!`

---

## Automated Test Suite

PulseWatch includes a comprehensive Vitest test suite covering security, network execution, multi-tenancy, and state machines:

```bash
npm run test
```

### Test Coverage Highlights
- `tests/ssrf.test.ts`: 10 tests validating IP blocklisting (RFC1918, CGNAT, link-local, cloud metadata) and URL validation.
- `tests/http-checker.test.ts`: 4 tests validating HTTP assertions, status mismatches, degraded latency thresholds, and SSRF rejection.
- `tests/tenant-isolation.test.ts`: 4 tests enforcing workspace boundaries, role permission checks, and cross-tenant access rejection.
- `tests/incident-lifecycle.test.ts`: 2 tests verifying the consecutive failure state machine, automated incident creation, recovery detection, and incident resolution.

---

## Production Deployment with Docker

### Using Docker Compose
Run the entire stack (Web App, Monitoring Worker, and Valkey/Redis) with one command:

```bash
docker-compose up --build -d
```

### Services Orchestrated
| Service | Image / Build | Port | Description |
|---------|---------------|------|-------------|
| `web` | `Dockerfile` | `3000:3000` | Next.js App Router, Dashboard & API Handlers |
| `worker` | `Dockerfile.worker` | - | Persistent BullMQ background worker & scheduler |
| `redis` | `valkey/valkey:7.2-alpine` | `6379:6379` | In-memory queue store & cache |

---

## License
MIT License. Built with Next.js, Prisma, BullMQ, and Tailwind CSS.
