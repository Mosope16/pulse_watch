import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import prisma from "@/lib/prisma";
import { requireAuthUser } from "@/lib/session";
import { assertWorkspaceAccess } from "@/lib/tenant";
import { Role } from "@prisma/client";
import { enqueueAlert } from "@/lib/queue";

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

const updateMemberSchema = z.object({
  userId: z.string(),
  role: z.enum(["ADMIN", "MEMBER"]),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuthUser();
    await assertWorkspaceAccess(user.id, params.id, Role.MEMBER);

    const members = await prisma.membership.findMany({
      where: { workspaceId: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const invitations = await prisma.invitation.findMany({
      where: {
        workspaceId: params.id,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ members, invitations });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch members" },
      { status: err.statusCode || 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuthUser();
    const callerMembership = await assertWorkspaceAccess(user.id, params.id, Role.ADMIN);

    const body = await req.json();
    const { email, role } = inviteMemberSchema.parse(body);

    // Check if user is already a member
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      const existingMember = await prisma.membership.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: params.id,
            userId: existingUser.id,
          },
        },
      });

      if (existingMember) {
        return NextResponse.json(
          { error: "User is already a member of this workspace" },
          { status: 400 }
        );
      }
    }

    // Generate secure invitation token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await prisma.invitation.create({
      data: {
        workspaceId: params.id,
        email,
        role: role as Role,
        token,
        invitedById: user.id,
        expiresAt,
      },
    });

    // Enqueue invitation email alert
    await enqueueAlert({
      type: "INVITATION",
      workspaceId: params.id,
      recipientEmail: email,
      invitationToken: token,
      inviterName: user.name,
      details: {
        title: `Invitation to ${callerMembership.workspace.name}`,
        message: `You've been invited by ${user.name} to join as ${role}.`,
      },
    });

    return NextResponse.json({ invitation }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to invite member" },
      { status: err.statusCode || 400 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuthUser();
    await assertWorkspaceAccess(user.id, params.id, Role.ADMIN);

    const body = await req.json();
    const { userId, role } = updateMemberSchema.parse(body);

    // Cannot modify OWNER
    const targetMember = await prisma.membership.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: params.id,
          userId,
        },
      },
    });

    if (!targetMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (targetMember.role === Role.OWNER) {
      return NextResponse.json(
        { error: "Owner role cannot be changed" },
        { status: 403 }
      );
    }

    const updated = await prisma.membership.update({
      where: {
        workspaceId_userId: {
          workspaceId: params.id,
          userId,
        },
      },
      data: { role: role as Role },
    });

    return NextResponse.json({ member: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update member" },
      { status: err.statusCode || 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuthUser();
    await assertWorkspaceAccess(user.id, params.id, Role.ADMIN);

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const targetMember = await prisma.membership.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: params.id,
          userId,
        },
      },
    });

    if (!targetMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (targetMember.role === Role.OWNER) {
      return NextResponse.json(
        { error: "Workspace owner cannot be removed" },
        { status: 403 }
      );
    }

    await prisma.membership.delete({
      where: {
        workspaceId_userId: {
          workspaceId: params.id,
          userId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to remove member" },
      { status: err.statusCode || 400 }
    );
  }
}
