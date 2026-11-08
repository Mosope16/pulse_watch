import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { Role } from "@prisma/client";
import prisma from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          try {
            const defaultSlug = `ws-${user.id.toLowerCase()}`;
            const defaultStatusSlug = `status-${user.id.toLowerCase()}`;
            await prisma.workspace.create({
              data: {
                name: `${user.name.split(" ")[0]}'s Workspace`,
                slug: defaultSlug,
                memberships: {
                  create: {
                    userId: user.id,
                    role: Role.OWNER,
                  },
                },
                statusPage: {
                  create: {
                    slug: defaultStatusSlug,
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
          } catch {
            // Workspace already created or handled
          }
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  secret: process.env.BETTER_AUTH_SECRET || "default_development_secret_key_32_characters_minimum",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  trustedOrigins: [
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    "https://pulsewatch-sope.vercel.app",
    "http://localhost:3000",
  ].filter(Boolean) as string[],
});

export type AuthSession = typeof auth.$Infer.Session;
