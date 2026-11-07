import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAuthUser } from "@/lib/session";
import { assertWorkspaceAccess } from "@/lib/tenant";
import { Role } from "@prisma/client";

const updatePrefsSchema = z.object({
  emailAlerts: z.boolean().optional(),
  inAppAlerts: z.boolean().optional(),
  notifyOnDown: z.boolean().optional(),
  notifyOnRecover: z.boolean().optional(),
  notifyOnIncident: z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuthUser();
    await assertWorkspaceAccess(user.id, params.id, Role.MEMBER);

    let preference = await prisma.alertPreference.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: params.id,
          userId: user.id,
        },
      },
    });

    if (!preference) {
      preference = await prisma.alertPreference.create({
        data: {
          workspaceId: params.id,
          userId: user.id,
          emailAlerts: true,
          inAppAlerts: true,
          notifyOnDown: true,
          notifyOnRecover: true,
          notifyOnIncident: true,
        },
      });
    }

    return NextResponse.json({ preference });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch alert preferences" },
      { status: err.statusCode || 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuthUser();
    await assertWorkspaceAccess(user.id, params.id, Role.MEMBER);

    const body = await req.json();
    const data = updatePrefsSchema.parse(body);

    const preference = await prisma.alertPreference.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: params.id,
          userId: user.id,
        },
      },
      update: data,
      create: {
        workspaceId: params.id,
        userId: user.id,
        emailAlerts: data.emailAlerts ?? true,
        inAppAlerts: data.inAppAlerts ?? true,
        notifyOnDown: data.notifyOnDown ?? true,
        notifyOnRecover: data.notifyOnRecover ?? true,
        notifyOnIncident: data.notifyOnIncident ?? true,
      },
    });

    return NextResponse.json({ preference });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update alert preferences" },
      { status: err.statusCode || 400 }
    );
  }
}
