import { NextRequest, NextResponse } from "next/server";
import { sealMonitorsLiveQuery, sealIncidentsLiveQuery } from "@/lib/neon-realtime";
import { requireWorkspaceContext } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const workspaceIdParam = req.nextUrl.searchParams.get("workspaceId");
    const { workspace } = await requireWorkspaceContext(workspaceIdParam);
    const type = req.nextUrl.searchParams.get("type") || "monitors";

    let sealedQuery: any;
    if (type === "incidents") {
      sealedQuery = await sealIncidentsLiveQuery(workspace.id);
    } else {
      sealedQuery = await sealMonitorsLiveQuery(workspace.id);
    }

    return NextResponse.json({
      workspaceId: workspace.id,
      type,
      realtimeUrl: process.env.NEON_REALTIME_URL,
      sealedQuery,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
