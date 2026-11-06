import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import type { MutationCtx } from "./_generated/server";

const INVALID_INVITE = "This invite is invalid or has expired. Ask your admin for a new one.";
const EMAIL_OR_PASSWORD = "Email or password is incorrect";

async function hashInviteCode(code: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(code.trim().toUpperCase())
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        const email = String(params.email ?? "").trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          throw new Error(EMAIL_OR_PASSWORD);
        }

        if (params.flow !== "signUp") return { email };

        const name = String(params.name ?? "").trim();
        const inviteCode = String(params.inviteCode ?? "")
          .trim()
          .toUpperCase();
        if (name.length < 2 || name.length > 80 || inviteCode.length !== 8) {
          throw new Error(INVALID_INVITE);
        }

        // inviteCode is passed only to the transactional callback below. That
        // callback constructs the users row explicitly without this property.
        return { email, name, inviteCode } as never;
      },
      validatePasswordRequirements(password) {
        if (password.length < 10) {
          throw new Error("Password must be at least 10 characters long");
        }
      },
    }),
  ],
  signIn: { maxFailedAttempsPerHour: 10 },
  session: {
    totalDurationMs: 7 * 24 * 60 * 60 * 1000,
    inactiveDurationMs: 2 * 24 * 60 * 60 * 1000,
  },
  callbacks: {
    async createOrUpdateUser(ctx, { existingUserId, type, provider, profile }) {
      if (type !== "credentials" || provider.id !== "password" || existingUserId) {
        throw new Error(INVALID_INVITE);
      }

      const email = String(profile.email ?? "").trim().toLowerCase();
      const name = String(profile.name ?? "").trim();
      const inviteCode = String(profile.inviteCode ?? "").trim().toUpperCase();
      if (!email || name.length < 2 || name.length > 80 || inviteCode.length !== 8) {
        throw new Error(INVALID_INVITE);
      }

      const db = (ctx as unknown as MutationCtx).db;
      const codeHash = await hashInviteCode(inviteCode);
      const invite = await db
        .query("invites")
        .withIndex("by_codeHash", (q) => q.eq("codeHash", codeHash))
        .unique();
      if (
        !invite ||
        invite.email !== email ||
        invite.usedAt !== undefined ||
        invite.revokedAt !== undefined ||
        invite.expiresAt <= Date.now()
      ) {
        throw new Error(INVALID_INVITE);
      }

      const existingStaff = await db
        .query("staff")
        .withIndex("by_email", (q) => q.eq("email", email))
        .unique();
      if (existingStaff) throw new Error(INVALID_INVITE);

      const userId = await db.insert("users", { email, name });
      await db.insert("staff", {
        userId,
        email,
        name,
        role: invite.role,
        active: true,
      });
      await db.patch(invite._id, { usedAt: Date.now() });
      await db.insert("auditLog", {
        actor: email,
        action: "staff.signup",
        target: String(userId),
        meta: invite.role,
      });
      return userId;
    },
    async beforeSessionCreation(ctx, { userId }) {
      const db = (ctx as unknown as MutationCtx).db;
      const staff = await db
        .query("staff")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .unique();
      if (!staff?.active) throw new Error(EMAIL_OR_PASSWORD);
    },
  },
});
