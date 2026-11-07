import { headers } from "next/headers";
import { auth } from "./auth";
import prisma from "./prisma";
import { Role } from "@prisma/client";
import { assertWorkspaceAccess, TenantAccessError } from "./tenant";

export async function getCurrentSession() {
  const reqHeaders = await headers();
  return await auth.api.getSession({
    headers: reqHeaders,
  });
}

export async function requireAuthUser() {
  const session = await getCurrentSession();
  if (!session || !session.user) {
    throw new TenantAccessError("Authentication required. Please sign in.", 401);
  }
  return session.user;
}

/**
 * Resolves current user and validates access to the requested workspace.
 * If workspaceId is not supplied, resolves the user's primary/first workspace.
 */
export async function requireWorkspaceContext(
  workspaceId?: string | null,
  requiredRole: Role = Role.MEMBER
) {
  const user = await requireAuthUser();

  let targetWorkspaceId = workspaceId;

  // If no workspaceId provided, find the user's first workspace
  if (!targetWorkspaceId) {
    const firstMembership = await prisma.membership.findFirst({
      where: { userId: user.id },
      include: { workspace: true },
      orderBy: { createdAt: "asc" },
    });

    if (!firstMembership) {
      // Auto-create a default workspace for new users if none exists
      const userWorkspace = await prisma.workspace.create({
        data: {
          name: `${user.name.split(" ")[0]}'s Workspace`,
          slug: `workspace-${user.id.slice(0, 8)}-${Date.now().toString(36)}`,
          memberships: {
            create: {
              userId: user.id,
              role: Role.OWNER,
            },
          },
          statusPage: {
            create: {
              slug: `status-${user.id.slice(0, 6)}-${Date.now().toString(36)}`,
              title: `${user.name.split(" ")[0]}'s Services Status`,
              description: "Live operational status of our monitored services.",
              isPublic: true,
            },
          },
          alertPrefs: {
            create: {
              userId: user.id,
              emailAlerts: true,
              inAppAlerts: true,
              notifyOnDown: true,
              notifyOnRecover: true,
              notifyOnIncident: true,
            },
          },
        },
      });

      return {
        user,
        workspace: userWorkspace,
        role: Role.OWNER,
      };
    }

    targetWorkspaceId = firstMembership.workspaceId;
  }

  const membership = await assertWorkspaceAccess(
    user.id,
    targetWorkspaceId,
    requiredRole
  );

  return {
    user,
    workspace: membership.workspace,
    role: membership.role,
  };
}
