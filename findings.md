# PulseWatch - Research & Architecture Findings

## Tech Stack & Environment Findings
- **Node.js**: v26.12.1, npm 12.2.1 installed.
- **Database**:
  - Direct & pooled Neon Postgres connection strings available in environment (`/home/sope/Projects/operant/.env`).
  - Supports PostgreSQL 15+ with SSL verify-full.
  - Prisma ORM works directly with this connection string.
- **Redis / Queue**:
  - Valkey 9.1.2 binary extracted to `/tmp/bin/valkey-server` and `/tmp/bin/redis-server`. Fully wire-compatible with Redis 7.2.4+ and BullMQ.
  - BullMQ with ioredis connects seamlessly to standard Redis / Valkey endpoints.
- **Authentication**:
  - Better Auth configured with email/password credentials and session management.
- **Email Delivery**:
  - Resend API key available (`RESEND_API_KEY`), with fallback console delivery when mock mode is enabled.
- **SSRF Defense Requirements**:
  - Need synchronous DNS resolution before HTTP request dispatch.
  - Need IP validation matching CIDR ranges: `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, `0.0.0.0/8`, `100.64.0.0/10`, `192.0.0.0/24`, `192.0.2.0/24`, `198.18.0.0/15`, `198.51.100.0/24`, `203.0.113.0/24`, `240.0.0.0/4`, `255.255.255.255/32`, `::1`, `fc00::/7`, `fe80::/10`.
  - HTTP client must disable automatic redirects and manually validate redirect target URLs to prevent open redirect -> internal SSRF pivots.
