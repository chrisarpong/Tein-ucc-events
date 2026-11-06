import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import { retrieveAccount } from "@convex-dev/auth/server";
import type { MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { normalizePhone } from "./lib/normalizePhone";
import { keyedHash } from "./lib/recoveryCrypto";

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
    ConvexCredentials({
      id: "phone-password",
      async authorize(credentials, ctx) {
        const phoneInput = typeof credentials.phone === "string" ? credentials.phone : "";
        const password = typeof credentials.password === "string" ? credentials.password : "";
        const normalized = normalizePhone(phoneInput);
        if (!normalized.ok || !password) return null;
        const target = await ctx.runQuery(internal.recovery.getPhoneLoginTarget, { phone: normalized.e164 });
        if (!target) return null;
        try {
          const result = await retrieveAccount(ctx, {
            provider: "password",
            account: { id: target.email, secret: password },
          });
          return result.user._id === target.userId ? { userId: target.userId } : null;
        } catch {
          return null;
        }
      },
    }),
    Password({
      profile(params) {
        const email = String(params.email ?? "").trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          throw new Error(EMAIL_OR_PASSWORD);
        }

        if (params.flow !== "signUp") return { email };

        const name = String(params.name ?? "").trim();
        const phoneInput = String(params.recoveryPhone ?? "");
        const phone = normalizePhone(phoneInput);
        const phoneVerificationToken = String(params.phoneVerificationToken ?? "");
        const inviteCode = String(params.inviteCode ?? "")
          .trim()
          .toUpperCase();
        if (name.length < 2 || name.length > 80 || inviteCode.length !== 8 || !phone.ok || phoneVerificationToken.length < 32) {
          throw new Error(INVALID_INVITE);
        }

        // inviteCode is passed only to the transactional callback below. That
        // callback constructs the users row explicitly without this property.
        return { email, name, inviteCode, recoveryPhone: phone.e164, phoneVerificationToken } as never;
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
      const recoveryPhone = String(profile.recoveryPhone ?? "");
      const phoneVerificationToken = String(profile.phoneVerificationToken ?? "");
      if (!email || name.length < 2 || name.length > 80 || inviteCode.length !== 8) {
        throw new Error(INVALID_INVITE);
      }

      const db = (ctx as unknown as MutationCtx).db;
      const codeHash = await hashInviteCode(inviteCode);
      const invite = await db
        .query("invites")
        .withIndex("by_codeHash", (q) => q.eq("codeHash", codeHash))
        .unique();
      const ownerBootstrap = profile.ownerBootstrap === true;
      const ownerBootstrapStaff = profile.ownerBootstrapStaff === true;
      if (
        !invite ||
        invite.email !== email ||
        invite.usedAt !== undefined ||
        invite.revokedAt !== undefined ||
        invite.expiresAt <= Date.now()
      ) {
        throw new Error(INVALID_INVITE);
      }

      if (
        ownerBootstrap !== (invite.createdBy === "owner-bootstrap") ||
        ownerBootstrapStaff !== (invite.createdBy === "owner-bootstrap-staff") ||
        (ownerBootstrap && invite.role !== "admin") ||
        (ownerBootstrapStaff && invite.role !== "admin") ||
        (ownerBootstrap && ownerBootstrapStaff)
      ) {
        throw new Error(INVALID_INVITE);
      }

      const existingStaff = await db
        .query("staff")
        .withIndex("by_email", (q) => q.eq("email", email))
        .unique();
      if (existingStaff) throw new Error(INVALID_INVITE);

      let verifiedPhone: string | undefined;
      if (ownerBootstrap) {
        if ((await db.query("staff").take(1)).length > 0) throw new Error(INVALID_INVITE);
      } else if (!ownerBootstrapStaff) {
        const phone = normalizePhone(recoveryPhone);
        if (!phone.ok || phone.e164 !== recoveryPhone || phoneVerificationToken.length < 32) {
          throw new Error(INVALID_INVITE);
        }
        const phoneOwner = await db.query("staff").withIndex("by_recoveryPhone", (q) => q.eq("recoveryPhone", recoveryPhone)).unique();
        if (phoneOwner) throw new Error(INVALID_INVITE);
        const proofHash = await keyedHash(`signup:${email}:${recoveryPhone}:${phoneVerificationToken}`);
        const proofRows = await db.query("authChallenges")
          .withIndex("by_email_purpose", (q) => q.eq("email", email).eq("purpose", "signup_phone"))
          .order("desc").take(10);
        const proof = proofRows.find((row) => row.phone === recoveryPhone && row.status === "verified" && row.verificationExpiresAt !== undefined && row.verificationExpiresAt > Date.now() && row.verificationTokenHash === proofHash);
        if (!proof) throw new Error(INVALID_INVITE);
        await db.patch(proof._id, { status: "consumed", verificationTokenHash: undefined });
        verifiedPhone = recoveryPhone;
      }

      const userId = await db.insert("users", { email, name });
      await db.insert("staff", {
        userId,
        email,
        name,
        ...(verifiedPhone ? { recoveryPhone: verifiedPhone, recoveryPhoneVerifiedAt: Date.now() } : {}),
        role: invite.role,
        active: true,
      });
      await db.patch(invite._id, { usedAt: Date.now() });
      await db.insert("auditLog", {
        actor: email,
        action: ownerBootstrap
          ? "staff.bootstrap.create"
          : ownerBootstrapStaff
            ? "staff.owner_add_temporary_password"
            : "staff.signup",
        target: String(userId),
        meta: ownerBootstrap || ownerBootstrapStaff
          ? "deployment-owner temporary password; recovery phone pending"
          : invite.role,
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
