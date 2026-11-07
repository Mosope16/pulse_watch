import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuthUser } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthUser();

    // Get workspaces the user belongs to
    const memberships = await prisma.membership.findMany({
      where: { userId: user.id },
      select: { workspaceId: true },
    });

    const workspaceIds = memberships.map((m) => m.workspaceId);

    const notifications = await prisma.notification.findMany({
      where: {
        workspaceId: { in: workspaceIds },
        OR: [{ userId: user.id }, { userId: null }],
      },
      orderBy: { createdAt: "desc" },
      take: 40,
    });

    const unreadCount = await prisma.notification.count({
      where: {
        workspaceId: { in: workspaceIds },
        OR: [{ userId: user.id }, { userId: null }],
        isRead: false,
      },
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch notifications" },
      { status: err.statusCode || 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuthUser();
    const body = await req.json().catch(() => ({}));
    const { notificationId, markAllRead } = body;

    const memberships = await prisma.membership.findMany({
      where: { userId: user.id },
      select: { workspaceId: true },
    });
    const workspaceIds = memberships.map((m) => m.workspaceId);

    if (markAllRead) {
      await prisma.notification.updateMany({
        where: {
          workspaceId: { in: workspaceIds },
          OR: [{ userId: user.id }, { userId: null }],
          isRead: false,
        },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true, markedAll: true });
    }

    if (notificationId) {
      await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true, notificationId });
    }

    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update notification" },
      { status: err.statusCode || 400 }
    );
  }
}
