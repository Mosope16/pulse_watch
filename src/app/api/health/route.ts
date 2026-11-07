import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();
  const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};

  // Check Database
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = {
      status: "healthy",
      latencyMs: Date.now() - dbStart,
    };
  } catch (err: any) {
    checks.database = {
      status: "unhealthy",
      error: err.message,
    };
  }

  // Check Redis
  const redisStart = Date.now();
  try {
    const pong = await Promise.race([
      redis.ping(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 1500)),
    ]);
    checks.redis = {
      status: pong === "PONG" ? "healthy" : "degraded",
      latencyMs: Date.now() - redisStart,
    };
  } catch (err: any) {
    checks.redis = {
      status: "unhealthy",
      error: err.message,
    };
  }

  const isHealthy = Object.values(checks).every((c) => c.status === "healthy");

  return NextResponse.json(
    {
      status: isHealthy ? "operational" : "degraded",
      version: "1.0.0",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      checks,
    },
    {
      status: isHealthy ? 200 : 503,
    }
  );
}
