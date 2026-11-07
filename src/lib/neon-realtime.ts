import { createRealtime, rawSql } from "@neon/realtime/server";

export function getNeonRealtime() {
  const secret = process.env.NEON_REALTIME_SECRET;

  if (!secret) {
    throw new Error("NEON_REALTIME_SECRET environment variable is not defined.");
  }

  return createRealtime({
    secret,
    db: "neondb",
  });
}

/**
 * Seals a live query for monitors within a workspace, allowing the client
 * to subscribe to realtime updates over Neon Realtime WebSocket.
 */
export async function sealMonitorsLiveQuery(workspaceId: string) {
  const rt = getNeonRealtime();
  const query = rawSql(
    'SELECT id, name, url, status, "lastCheckAt", "consecutiveFailures" FROM "Monitor" WHERE "workspaceId" = $1 ORDER BY "updatedAt" DESC',
    [workspaceId]
  );

  return await rt.seal({ query });
}

/**
 * Seals a live query for active incidents within a workspace.
 */
export async function sealIncidentsLiveQuery(workspaceId: string) {
  const rt = getNeonRealtime();
  const query = rawSql(
    'SELECT id, title, status, severity, "createdAt", "resolvedAt" FROM "Incident" WHERE "workspaceId" = $1 ORDER BY "createdAt" DESC',
    [workspaceId]
  );

  return await rt.seal({ query });
}
