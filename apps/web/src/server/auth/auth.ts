import { createModuleLogger } from "@/lib/logger";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { getDb } from "@/db";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "@/db/schema";
import { verifyEmailOtp } from "@/server/auth/otp";
import { env, getAuthSecret, shouldTrustAuthHost } from "@/lib/env";

const log = createModuleLogger("server.auth.auth");

function buildAdapter() {
  const db = getDb();
  if (!db) return undefined;
  return DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  });
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: getAuthSecret(),
  trustHost: shouldTrustAuthHost(),
  logger: {
    error(error) {
      // Stale session cookie after AUTH_SECRET rotation — treat as logged out in dev.
      if (
        !env.isProduction &&
        error instanceof Error &&
        error.name === "JWTSessionError"
      ) {
        return;
      }
      log.error({ err: error }, "error");
    },
  },
  session: { strategy: "jwt" },
  adapter: buildAdapter(),
  providers: [
    Credentials({
      id: "email-otp",
      name: "Email OTP",
      credentials: {
        email: { label: "Email", type: "email" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "");
        const code = String(credentials?.code ?? "");
        if (!email || !code) return null;
        try {
          const user = await verifyEmailOtp(email, code);
          return {
            id: user.userId,
            email: user.email,
            name: user.name,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        if (typeof token.email === "string") session.user.email = token.email;
        if (typeof token.name === "string") session.user.name = token.name;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
