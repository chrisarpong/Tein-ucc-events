import { invalidateSessions, modifyAccountCredentials } from "@convex-dev/auth/server";
import { v } from "convex/values";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { requireStaff, getStaffMe } from "./lib/auth";

const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const INVITE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

function secureCode(length: number) {
  let result = "";
  while (result.length < length) {
    const bytes = crypto.getRandomValues(new Uint8Array(length * 2));
    for (const byte of bytes) {
      const unbiasedLimit = Math.floor(256 / CODE_ALPHABET.length) * CODE_ALPHABET.length;
      if (byte >= unbiasedLimit) continue;
      result += CODE_ALPHABET[byte % CODE_ALPHABET.length];
      if (result.length === length) break;
    }
  }
  return result;
}

async function hashCode(code: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(code.trim().toUpperCase())
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

function validateEmail(value: string) {
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid staff email address.");
  }
  return email;
}

async function createInviteRecord(
  ctx: MutationCtx,
  email: string,
  role: "admin" | "checkin",
  createdBy: string
) {
  const normalizedEmail = validateEmail(email);
  const existingStaff = await ctx.db
    .query("staff")
    .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
    .unique();
  if (existingStaff) {
    throw new Error("A staff account already exists for this email. Re-enable that account instead.");
  }

  const previousInvites = await ctx.db
    .query("invites")
    .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
    .collect();
  for (const invite of previousInvites) {
    if (invite.usedAt === undefined && invite.revokedAt === undefined) {
      await ctx.db.patch(invite._id, { revokedAt: Date.now() });
    }
  }

  const code = secureCode(8);
  const expiresAt = Date.now() + INVITE_LIFETIME_MS;
  await ctx.db.insert("invites", {
    email: normalizedEmail,
    role,
    codeHash: await hashCode(code),
    expiresAt,
    createdBy,
  });
  return { code, expiresAt, email: normalizedEmail, role };
}

export const me = query({
  args: {},
  handler: async (ctx) => {
    const staff = await getStaffMe(ctx);
    if (!staff) return null;
    return {
      _id: staff._id,
      email: staff.email,
      name: staff.name,
      role: staff.role,
      active: staff.active,
      recoveryPhoneMasked: staff.recoveryPhone ? `••••••${staff.recoveryPhone.slice(-4)}` : null,
      recoveryPhoneVerified: Boolean(staff.recoveryPhoneVerifiedAt),
    };
  },
});

export const createInvite = mutation({
  args: {
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("checkin")),
  },
  handler: async (ctx, args) => {
    const actor = await requireStaff(ctx, ["admin"]);
    const invite = await createInviteRecord(ctx, args.email, args.role, actor.email);
    await ctx.db.insert("auditLog", {
      actor: actor.email,
      action: "staff.invite.create",
      target: invite.email,
      meta: invite.role,
    });
    return invite;
  },
});

export const createFirstInvite = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const existingStaff = await ctx.db.query("staff").take(1);
    if (existingStaff.length > 0) {
      throw new Error("The initial admin invite is only available before the first staff account exists.");
    }
    const pendingBootstrapInvite = await ctx.db
      .query("invites")
      .collect();
    if (
      pendingBootstrapInvite.some(
        (invite) => invite.createdBy === "bootstrap" && invite.usedAt === undefined && invite.revokedAt === undefined && invite.expiresAt > Date.now()
      )
    ) {
      throw new Error("A valid initial invite already exists. Use that code or revoke it from the dashboard.");
    }
    return await createInviteRecord(ctx, email, "admin", "bootstrap");
  },
});

export const listInvites = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx, ["admin"]);
    const now = Date.now();
    const invites = await ctx.db.query("invites").collect();
    return invites
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(0, 200)
      .map((invite) => ({
        _id: invite._id,
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt,
        createdBy: invite.createdBy,
        status: invite.revokedAt
          ? "revoked"
          : invite.usedAt
            ? "used"
            : invite.expiresAt <= now
              ? "expired"
              : "pending",
      }));
  },
});

export const revokeInvite = mutation({
  args: { inviteId: v.id("invites") },
  handler: async (ctx, { inviteId }) => {
    const actor = await requireStaff(ctx, ["admin"]);
    const invite = await ctx.db.get(inviteId);
    if (!invite) throw new Error("Invite not found.");
    if (invite.usedAt !== undefined) throw new Error("A used invite cannot be revoked.");
    if (invite.revokedAt !== undefined) return { success: true };
    await ctx.db.patch(inviteId, { revokedAt: Date.now() });
    await ctx.db.insert("auditLog", {
      actor: actor.email,
      action: "staff.invite.revoke",
      target: invite.email,
      meta: invite.role,
    });
    return { success: true };
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx, ["admin"]);
    const staff = await ctx.db.query("staff").collect();
    return staff
      .sort((a, b) => a.email.localeCompare(b.email))
      .map(({ _id, email, name, role, active, lastLoginAt, recoveryPhone, recoveryPhoneVerifiedAt }) => ({
        _id,
        email,
        name,
        role,
        active,
        lastLoginAt,
        recoveryPhoneMasked: recoveryPhone ? `••••••${recoveryPhone.slice(-4)}` : null,
        recoveryPhoneVerified: Boolean(recoveryPhoneVerifiedAt),
      }));
  },
});

export const recordLogin = mutation({
  args: {},
  handler: async (ctx) => {
    const staff = await requireStaff(ctx);
    await ctx.db.patch(staff._id, { lastLoginAt: Date.now() });
    await ctx.db.insert("auditLog", {
      actor: staff.email,
      action: "staff.login",
      target: String(staff._id),
    });
    return { success: true, role: staff.role };
  },
});

export const setActive = mutation({
  args: {
    staffId: v.id("staff"),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    const actor = await requireStaff(ctx, ["admin"]);
    const target = await ctx.db.get(args.staffId);
    if (!target) throw new Error("Staff account not found.");
    if (target._id === actor._id && !args.active) {
      throw new Error("You cannot disable your own staff account.");
    }
    if (!args.active && target.active && target.role === "admin") {
      const staff = await ctx.db.query("staff").collect();
      const activeAdmins = staff.filter((person) => person.active && person.role === "admin");
      if (activeAdmins.length <= 1) throw new Error("At least one active admin account must remain.");
    }
    if (target.active === args.active) return { success: true };

    await ctx.db.patch(target._id, { active: args.active });
    await ctx.db.insert("auditLog", {
      actor: actor.email,
      action: args.active ? "staff.enable" : "staff.disable",
      target: String(target._id),
      meta: target.role,
    });
    if (!args.active) {
      await ctx.scheduler.runAfter(0, internal.staff.revokeSessions, {
        userId: target.userId,
      });
    }
    return { success: true };
  },
});

export const deleteStaff = mutation({
  args: { staffId: v.id("staff") },
  handler: async (ctx, { staffId }) => {
    const actor = await requireStaff(ctx, ["admin"]);
    const target = await ctx.db.get(staffId);
    if (!target) throw new Error("Staff account not found.");
    if (target._id === actor._id) {
      throw new Error("You cannot delete your own staff account.");
    }
    if (target.active && target.role === "admin") {
      const staff = await ctx.db.query("staff").collect();
      const activeAdmins = staff.filter((person) => person.active && person.role === "admin");
      if (activeAdmins.length <= 1) {
        throw new Error("At least one active admin account must remain.");
      }
    }

    // Remove all authentication material in this transaction so no session or
    // password account is left behind after the staff record is deleted.
    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", target.userId))
      .collect();
    for (const session of sessions) {
      const refreshTokens = await ctx.db
        .query("authRefreshTokens")
        .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
        .collect();
      for (const token of refreshTokens) await ctx.db.delete(token._id);
      const verifiers = await ctx.db
        .query("authVerifiers")
        .filter((q) => q.eq(q.field("sessionId"), session._id))
        .collect();
      for (const verifier of verifiers) await ctx.db.delete(verifier._id);
      await ctx.db.delete(session._id);
    }

    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", target.userId))
      .collect();
    for (const account of accounts) {
      const verificationCodes = await ctx.db
        .query("authVerificationCodes")
        .withIndex("accountId", (q) => q.eq("accountId", account._id))
        .collect();
      for (const verificationCode of verificationCodes) {
        await ctx.db.delete(verificationCode._id);
      }
      await ctx.db.delete(account._id);
    }

    await ctx.db.delete(target._id);
    await ctx.db.delete(target.userId);
    await ctx.db.insert("auditLog", {
      actor: actor.email,
      action: "staff.delete",
      target: String(target._id),
      meta: `${target.email}; role=${target.role}`,
    });
    return { success: true };
  },
});

export const revokeSessions = internalAction({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await invalidateSessions(ctx, { userId });
  },
});

export const getPasswordResetTarget = internalQuery({
  args: { staffId: v.id("staff") },
  handler: async (ctx, { staffId }) => {
    const actor = await requireStaff(ctx, ["admin"]);
    const target = await ctx.db.get(staffId);
    if (!target) throw new Error("Staff account not found.");
    if (target._id === actor._id) throw new Error("Use the staff password reset flow for your own account.");
    return {
      actorEmail: actor.email,
      targetEmail: target.email,
      targetId: target._id,
      userId: target.userId,
      role: target.role,
    };
  },
});

export const writePasswordResetAudit = internalMutation({
  args: {
    actorEmail: v.string(),
    targetId: v.id("staff"),
    role: v.union(v.literal("admin"), v.literal("checkin")),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("auditLog", {
      actor: args.actorEmail,
      action: "staff.password.reset",
      target: String(args.targetId),
      meta: args.role,
    });
  },
});

export const resetPassword = action({
  args: { staffId: v.id("staff") },
  handler: async (ctx, { staffId }) => {
    const target = await ctx.runQuery(internal.staff.getPasswordResetTarget, { staffId });
    const temporaryPassword = secureCode(16);
    await modifyAccountCredentials(ctx, {
      provider: "password",
      account: { id: target.targetEmail, secret: temporaryPassword },
    });
    await invalidateSessions(ctx, { userId: target.userId });
    await ctx.runMutation(internal.staff.writePasswordResetAudit, {
      actorEmail: target.actorEmail,
      targetId: target.targetId,
      role: target.role,
    });
    return { temporaryPassword };
  },
});
