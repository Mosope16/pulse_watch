import { describe, it, expect, beforeAll, afterAll } from "vitest";
import prisma from "../src/lib/prisma";
import { assertWorkspaceAccess, assertMonitorBelongsToWorkspace, TenantAccessError } from "../src/lib/tenant";
import { Role } from "@prisma/client";

describe("Multi-Tenant Isolation & RBAC Enforcement", () => {
  let testWorkspace: any;
  let ownerUser: any;
  let memberUser: any;
  let strangerUser: any;
  let testMonitor: any;

  beforeAll(async () => {
    // Create test workspace and users
    ownerUser = await prisma.user.create({
      data: {
        name: "Test Owner",
        email: `owner-${Date.now()}@test.dev`,
      },
    });

    memberUser = await prisma.user.create({
      data: {
        name: "Test Member",
        email: `member-${Date.now()}@test.dev`,
      },
    });

    strangerUser = await prisma.user.create({
      data: {
        name: "Test Stranger",
        email: `stranger-${Date.now()}@test.dev`,
      },
    });

    testWorkspace = await prisma.workspace.create({
      data: {
        name: "Test Tenant Workspace",
        slug: `test-ws-${Date.now()}`,
        memberships: {
          create: [
            { userId: ownerUser.id, role: Role.OWNER },
            { userId: memberUser.id, role: Role.MEMBER },
          ],
        },
      },
    });

    testMonitor = await prisma.monitor.create({
      data: {
        workspaceId: testWorkspace.id,
        name: "Test Tenant Monitor",
        url: "https://example.com",
      },
    });
  });

  afterAll(async () => {
    if (testWorkspace) {
      await prisma.workspace.delete({ where: { id: testWorkspace.id } }).catch(() => {});
    }
    if (ownerUser) await prisma.user.delete({ where: { id: ownerUser.id } }).catch(() => {});
    if (memberUser) await prisma.user.delete({ where: { id: memberUser.id } }).catch(() => {});
    if (strangerUser) await prisma.user.delete({ where: { id: strangerUser.id } }).catch(() => {});
  });

  it("permits owner to access workspace with OWNER, ADMIN, and MEMBER requirements", async () => {
    const accessAsMember = await assertWorkspaceAccess(ownerUser.id, testWorkspace.id, Role.MEMBER);
    expect(accessAsMember.role).toBe(Role.OWNER);

    const accessAsAdmin = await assertWorkspaceAccess(ownerUser.id, testWorkspace.id, Role.ADMIN);
    expect(accessAsAdmin.role).toBe(Role.OWNER);

    const accessAsOwner = await assertWorkspaceAccess(ownerUser.id, testWorkspace.id, Role.OWNER);
    expect(accessAsOwner.role).toBe(Role.OWNER);
  });

  it("allows MEMBER for read actions, but denies MEMBER for ADMIN and OWNER actions", async () => {
    const memberAccess = await assertWorkspaceAccess(memberUser.id, testWorkspace.id, Role.MEMBER);
    expect(memberAccess.role).toBe(Role.MEMBER);

    await expect(
      assertWorkspaceAccess(memberUser.id, testWorkspace.id, Role.ADMIN)
    ).rejects.toThrow(TenantAccessError);

    await expect(
      assertWorkspaceAccess(memberUser.id, testWorkspace.id, Role.OWNER)
    ).rejects.toThrow(TenantAccessError);
  });

  it("rejects unauthorized users with no workspace membership", async () => {
    await expect(
      assertWorkspaceAccess(strangerUser.id, testWorkspace.id, Role.MEMBER)
    ).rejects.toThrow("User is not a member of this workspace");
  });

  it("prevents cross-tenant access to monitors belonging to other workspaces", async () => {
    // Valid check
    const monitor = await assertMonitorBelongsToWorkspace(testMonitor.id, testWorkspace.id);
    expect(monitor.id).toBe(testMonitor.id);

    // Cross-tenant check (fake workspace ID)
    await expect(
      assertMonitorBelongsToWorkspace(testMonitor.id, "fake-other-workspace-id")
    ).rejects.toThrow("Monitor not found or does not belong to this workspace");
  });
});
