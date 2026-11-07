import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadAsset, getAsset, listAssets } from "@/lib/neon-storage";
import { invokeHelloFunction } from "@/lib/neon-functions";
import { sealMonitorsLiveQuery } from "@/lib/neon-realtime";
import { verifyNeonAuthStatus } from "@/lib/neon-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const results: Record<string, any> = {};

  // 1. Neon Postgres
  const pgStart = Date.now();
  try {
    const monitorCount = await prisma.monitor.count();
    const userCount = await prisma.user.count();
    results.postgres = {
      status: "operational",
      latencyMs: Date.now() - pgStart,
      stats: { monitorCount, userCount },
      branch: process.env.NEON_BRANCH || "production",
    };
  } catch (err: any) {
    results.postgres = {
      status: "error",
      error: err.message,
    };
  }

  // 2. Neon Object Storage
  const storageStart = Date.now();
  try {
    const probeKey = `health/probe-${Date.now()}.txt`;
    await uploadAsset(probeKey, `PulseWatch health probe at ${new Date().toISOString()}`);
    const assets = await listAssets();
    results.objectStorage = {
      status: "operational",
      latencyMs: Date.now() - storageStart,
      bucket: process.env.NEON_STORAGE_BUCKET || "assets",
      objectsFound: assets.length,
    };
  } catch (err: any) {
    results.objectStorage = {
      status: "error",
      error: err.message,
    };
  }

  // 3. Neon Functions
  try {
    const funcRes = await invokeHelloFunction();
    results.functions = {
      status: funcRes.status === 200 ? "operational" : "degraded",
      statusCode: funcRes.status,
      responseBody: funcRes.body,
      latencyMs: funcRes.durationMs,
      endpoint: process.env.NEON_FUNCTION_HELLO_BASE_URL,
    };
  } catch (err: any) {
    results.functions = {
      status: "error",
      error: err.message,
    };
  }

  // 4. Neon Realtime
  const rtStart = Date.now();
  try {
    const sealed = await sealMonitorsLiveQuery("health-check-ws");
    results.realtime = {
      status: "operational",
      latencyMs: Date.now() - rtStart,
      queryFingerprint: sealed.queryFingerprint,
      expiresAt: sealed.expiresAt,
      websocketEndpoint: process.env.NEON_REALTIME_URL,
    };
  } catch (err: any) {
    results.realtime = {
      status: "error",
      error: err.message,
    };
  }

  // 5. Neon Auth
  try {
    const authStatus = await verifyNeonAuthStatus();
    results.auth = {
      ...authStatus,
    };
  } catch (err: any) {
    results.auth = {
      status: "error",
      error: err.message,
    };
  }

  const allOperational = Object.values(results).every(
    (s: any) => s.status === "operational" || s.status === "connected"
  );

  return NextResponse.json({
    status: allOperational ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    services: results,
  });
}
