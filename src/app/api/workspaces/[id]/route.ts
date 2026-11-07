import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAuthUser } from "@/lib/session";
import { assertWorkspaceAccess } from "@/lib/tenant";
import { Role } from "@prisma/client";

const updateWorkspaceSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  logoUrl: z.string().url().nullable().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuthUser();
    const membership = await assertWorkspaceAccess(user.id, params.id, Role.MEMBER);

    const workspace = await prisma.workspace.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            memberships: true,
            monitors: true,
            incidents: true,
          },
        },
        statusPage: true,
      },
    });

    return NextResponse.json({
      workspace,
      role: membership.role,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch workspace" },
      { status: err.statusCode || 500 }
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
    const parsed = updateWorkspaceSchema.parse(body);

    const updated = await prisma.workspace.update({
      where: { id: params.id },
      data: parsed,
    });

    return NextResponse.json({ workspace: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update workspace" },
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
    await assertWorkspaceAccess(user.id, params.id, Role.OWNER);

    await prisma.workspace.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to delete workspace" },
      { status: err.statusCode || 400 }
    );
  }
}
