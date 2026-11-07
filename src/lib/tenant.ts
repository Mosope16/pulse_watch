import prisma from "./prisma";
import { Role } from "@prisma/client";

export class TenantAccessError extends Error {
  statusCode: number;
  constructor(message: string = "Access denied for this workspace", statusCode = 403) {
    super(message);
    this.name = "TenantAccessError";
    this.statusCode = statusCode;
  }
}

/**
 * Validates that a user has membership in a workspace and meets the required role hierarchy.
 * Returns the membership record if valid, throws TenantAccessError if invalid.
 */
export async function assertWorkspaceAccess(
  userId: string,
  workspaceId: string,
  requiredRole: Role = Role.MEMBER
) {
  if (!userId || !workspaceId) {
    throw new TenantAccessError("Authentication and workspace context required", 401);
  }

  const membership = await prisma.membership.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
    include: {
      workspace: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  if (!membership) {
    throw new TenantAccessError("User is not a member of this workspace", 403);
  }

  const roleHierarchy: Record<Role, number> = {
    [Role.MEMBER]: 1,
    [Role.ADMIN]: 2,
    [Role.OWNER]: 3,
  };

  if (roleHierarchy[membership.role] < roleHierarchy[requiredRole]) {
    throw new TenantAccessError(
      `Insufficient permissions. Requires ${requiredRole} role or higher.`,
      403
    );
  }

  return membership;
}

/**
 * Enforces tenant scope when querying or mutating a monitor.
 * Ensures the monitor belongs to the specified workspace.
 */
export async function assertMonitorBelongsToWorkspace(
  monitorId: string,
  workspaceId: string
) {
  const monitor = await prisma.monitor.findFirst({
    where: {
      id: monitorId,
      workspaceId,
    },
  });

  if (!monitor) {
    throw new TenantAccessError(
      "Monitor not found or does not belong to this workspace",
      404
    );
  }

  return monitor;
}

/**
 * Enforces tenant scope when querying an incident.
 */
export async function assertIncidentBelongsToWorkspace(
  incidentId: string,
  workspaceId: string
) {
  const incident = await prisma.incident.findFirst({
    where: {
      id: incidentId,
      workspaceId,
    },
    include: {
      monitor: true,
      updates: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!incident) {
    throw new TenantAccessError(
      "Incident not found or does not belong to this workspace",
      404
    );
  }

  return incident;
}
