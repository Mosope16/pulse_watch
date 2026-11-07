import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuthUser } from "@/lib/session";

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const invitation = await prisma.invitation.findUnique({
      where: { token: params.token },
      include: {
        workspace: {
          select: { id: true, name: true, slug: true, logoUrl: true },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invalid invitation link" }, { status: 404 });
    }

    if (invitation.acceptedAt) {
      return NextResponse.json(
        { error: "This invitation has already been accepted" },
        { status: 400 }
      );
    }

    if (new Date() > invitation.expiresAt) {
      return NextResponse.json(
        { error: "This invitation has expired" },
        { status: 400 }
      );
    }

    return NextResponse.json({ invitation });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load invitation" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const user = await requireAuthUser();

    const invitation = await prisma.invitation.findUnique({
      where: { token: params.token },
      include: { workspace: true },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invalid invitation" }, { status: 404 });
    }

    if (invitation.acceptedAt) {
      return NextResponse.json(
        { error: "This invitation has already been used" },
        { status: 400 }
      );
    }

    if (new Date() > invitation.expiresAt) {
      return NextResponse.json(
        { error: "This invitation has expired" },
        { status: 400 }
      );
    }

    // Upsert membership for user
    const membership = await prisma.membership.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: invitation.workspaceId,
          userId: user.id,
        },
      },
      update: {
        role: invitation.role,
      },
      create: {
        workspaceId: invitation.workspaceId,
        userId: user.id,
        role: invitation.role,
      },
    });

    // Mark invitation accepted
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      workspace: invitation.workspace,
      membership,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to accept invitation" },
      { status: err.statusCode || 400 }
    );
  }
}
