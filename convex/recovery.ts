import { createAccount, invalidateSessions, modifyAccountCredentials, retrieveAccount } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery, type ActionCtx, type MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { normalizePhone } from "./lib/normalizePhone";
import { keyedHash, randomDigits, randomSalt, randomToken } from "./lib/recoveryCrypto";
import type { Doc, Id } from "./_generated/dataModel";

const SEND_URL = "https://clientlogin.bulksmsgh.com/smsapi";
const CODE_TTL = 60_000;
const RESEND_WAIT = 4 * 60_000;
const GRANT_TTL = 10 * 60_000;
const MAX_CODE_ATTEMPTS = 5;
const GENERIC_RESPONSE = "If the details match an eligible staff account, a code will be sent to its verified phone.";
const purposeValidator = v.union(v.literal("signup_phone"), v.literal("password_reset"), v.literal("phone_change"));

type Purpose = "signup_phone" | "password_reset" | "phone_change";

function normalizedEmail(raw: string) {
  return raw.trim().toLowerCase();
}

async function inviteCodeHash(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value.trim().toUpperCase()));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function secureInviteCode(length = 8) {
  const alphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  const limit = Math.floor(256 / alphabet.length) * alphabet.length;
  let code = "";
  while (code.length < length) {
    for (const byte of crypto.getRandomValues(new Uint8Array(length * 2))) {
      if (byte >= limit) continue;
      code += alphabet[byte % alphabet.length];
      if (code.length === length) break;
    }
  }
  return code;
}

async function consumeSmsLimits(ctx: MutationCtx, email: string, phone: string, now: number) {
  const scopes = [
    { name: `cooldown:email:${email}`, max: 1, duration: RESEND_WAIT },
    { name: `cooldown:phone:${phone}`, max: 1, duration: RESEND_WAIT },
    { name: `daily:email:${email}`, max: 5, duration: 24 * 60 * 60_000 },
    { name: `daily:phone:${phone}`, max: 5, duration: 24 * 60 * 60_000 },
    { name: `global:${Math.floor(now / (60 * 60_000))}`, max: 25, duration: (Math.floor(now / (60 * 60_000)) + 1) * 60 * 60_000 - now },
  ];
  const rows = await Promise.all(scopes.map(async (scope) => {
    const key = await keyedHash(`sms-limit:${scope.name}`);
    const row = await ctx.db.query("rateLimits").withIndex("by_key", (q) => q.eq("key", key)).unique();
    return { ...scope, key, row, count: !row || row.expiresAt <= now ? 0 : row.count };
  }));
  if (rows.some((row) => row.count >= row.max)) return false;
  for (const row of rows) {
    if (row.row && row.row.expiresAt > now) {
      await ctx.db.patch(row.row._id, { count: row.count + 1 });
    } else if (row.row) {
      await ctx.db.patch(row.row._id, { count: 1, expiresAt: now + row.duration });
    } else {
      await ctx.db.insert("rateLimits", { key: row.key, count: 1, expiresAt: now + row.duration });
    }
  }
  return true;
}

async function sendOtp(phone: string, code: string, purpose: Purpose) {
  const apiKey = process.env.BULKSMSGH_API_KEY?.trim();
  const senderId = process.env.SMS_SENDER_ID?.trim() || "TEIN UCC";
  if (!apiKey || process.env.SMS_DRY_RUN !== "false" || senderId !== "TEIN UCC") return false;
  const purposeText = purpose === "signup_phone" ? "verify your staff phone" : purpose === "phone_change" ? "verify your new staff phone" : "reset your Summit CRM password";
  const form = new URLSearchParams({
    key: apiKey,
    to: phone.replace(/^\+233/, "0"),
    msg: `TEIN UCC Summit CRM: ${code} is your code to ${purposeText}. It expires in 1 minute. If you did not request this, ignore this SMS.`,
    sender_id: senderId,
  });
  try {
    const response = await fetch(SEND_URL, {
      method: "POST",
      headers: { Accept: "text/plain", "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
      signal: AbortSignal.timeout(15_000),
    });
    const responseCode = (await response.text()).trim().slice(0, 4);
    return response.ok && ["1000", "1007"].includes(responseCode);
  } catch {
    return false;
  }
}

export const prepareChallenge = internalMutation({
  args: {
    purpose: purposeValidator,
    email: v.string(),
    phone: v.string(),
    salt: v.string(),
    codeHash: v.string(),
    inviteCode: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const email = normalizedEmail(args.email);
    let staffId: Id<"staff"> | undefined;
    let phone = args.phone;
    if (args.purpose === "signup_phone") {
      if (!args.inviteCode) return null;
      const expectedHash = await inviteCodeHash(args.inviteCode);
      const invite = await ctx.db.query("invites").withIndex("by_email", (q) => q.eq("email", email)).collect();
      const valid = invite.find((row) => row.codeHash === expectedHash && row.usedAt === undefined && row.revokedAt === undefined && row.expiresAt > Date.now());
      const existing = await ctx.db.query("staff").withIndex("by_email", (q) => q.eq("email", email)).unique();
      if (!valid || existing) return null;
      const phoneOwner = await ctx.db.query("staff").withIndex("by_recoveryPhone", (q) => q.eq("recoveryPhone", phone)).unique();
      if (phoneOwner) return null;
    } else if (args.purpose === "password_reset") {
      const staff = await ctx.db.query("staff").withIndex("by_email", (q) => q.eq("email", email)).unique();
      if (!staff?.active || !staff.recoveryPhone || !staff.recoveryPhoneVerifiedAt) return null;
      staffId = staff._id;
      phone = staff.recoveryPhone;
    } else {
      if (!args.userId) return null;
      const staff = await ctx.db.query("staff").withIndex("by_userId", (q) => q.eq("userId", args.userId!)).unique();
      if (!staff?.active) return null;
      const phoneOwner = await ctx.db.query("staff").withIndex("by_recoveryPhone", (q) => q.eq("recoveryPhone", phone)).unique();
      if (phoneOwner && phoneOwner._id !== staff._id) return null;
      staffId = staff._id;
      return await createChallenge(ctx, args, staffId, staff.email, phone);
    }
    return await createChallenge(ctx, args, staffId, email, phone);
  },
});

async function createChallenge(ctx: MutationCtx, args: { purpose: Purpose; salt: string; codeHash: string }, staffId: Id<"staff"> | undefined, email: string, phone: string) {
  const now = Date.now();
  if (!(await consumeSmsLimits(ctx, email, phone, now))) return null;
  const challengeId = await ctx.db.insert("authChallenges", {
    purpose: args.purpose,
    email,
    phone,
    staffId,
    salt: args.salt,
    codeHash: args.codeHash,
    status: "pending",
    attempts: 0,
    createdAt: now,
    expiresAt: 0,
  });
  return { challengeId, email, phone };
}

export const setDeliveryResult = internalMutation({
  args: { challengeId: v.id("authChallenges"), accepted: v.boolean() },
  handler: async (ctx, args) => {
    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge || challenge.status !== "pending") return;
    await ctx.db.patch(args.challengeId, {
      status: args.accepted ? "sent" : "failed",
      expiresAt: args.accepted ? Date.now() + CODE_TTL : Date.now(),
    });
  },
});

export const getLatestChallenge = internalQuery({
  args: { email: v.string(), purpose: purposeValidator },
  handler: async (ctx, args) => await ctx.db.query("authChallenges")
    .withIndex("by_email_purpose", (q) => q.eq("email", normalizedEmail(args.email)).eq("purpose", args.purpose))
    .order("desc").first(),
});

export const verifyCode = internalMutation({
  args: {
    email: v.string(),
    purpose: purposeValidator,
    codeHash: v.string(),
    grantHash: v.string(),
  },
  handler: async (ctx, args) => {
    const email = normalizedEmail(args.email);
    const challenge = await ctx.db.query("authChallenges")
      .withIndex("by_email_purpose", (q) => q.eq("email", email).eq("purpose", args.purpose))
      .order("desc").first();
    if (!challenge || challenge.status !== "sent" || challenge.expiresAt <= Date.now()) return { ok: false as const };
    if (challenge.codeHash !== args.codeHash) {
      const attempts = challenge.attempts + 1;
      await ctx.db.patch(challenge._id, { attempts, status: attempts >= MAX_CODE_ATTEMPTS ? "failed" : "sent" });
      return { ok: false as const };
    }
    if (args.purpose === "phone_change") {
      if (!challenge.staffId) return { ok: false as const };
      const oldStaff = await ctx.db.get(challenge.staffId);
      if (!oldStaff?.active) return { ok: false as const };
      const phoneOwner = await ctx.db.query("staff").withIndex("by_recoveryPhone", (q) => q.eq("recoveryPhone", challenge.phone)).unique();
      if (phoneOwner && phoneOwner._id !== oldStaff._id) return { ok: false as const };
      await ctx.db.patch(challenge.staffId, { recoveryPhone: challenge.phone, recoveryPhoneVerifiedAt: Date.now() });
      await ctx.db.insert("auditLog", { actor: email, action: "staff.recovery_phone.update", target: String(challenge.staffId) });
      await ctx.db.patch(challenge._id, { status: "consumed", attempts: challenge.attempts + 1, salt: "", codeHash: "" });
      return { ok: true as const, phoneChanged: true as const, oldPhone: oldStaff.recoveryPhone };
    }
    await ctx.db.patch(challenge._id, {
      status: "verified",
      verifiedAt: Date.now(),
      verificationTokenHash: args.grantHash,
      verificationExpiresAt: Date.now() + GRANT_TTL,
      expiresAt: Date.now(),
      attempts: challenge.attempts + 1,
      salt: "",
      codeHash: "",
    });
    return { ok: true as const, phoneChanged: false as const, oldPhone: undefined };
  },
});

export const reservePasswordReset = internalMutation({
  args: { email: v.string(), tokenHash: v.string() },
  handler: async (ctx, args) => {
    const email = normalizedEmail(args.email);
    const challenge = await ctx.db.query("authChallenges")
      .withIndex("by_email_purpose", (q) => q.eq("email", email).eq("purpose", "password_reset"))
      .order("desc").first();
    if (!challenge || challenge.status !== "verified" || challenge.verificationExpiresAt === undefined || challenge.verificationExpiresAt <= Date.now() || challenge.verificationTokenHash !== args.tokenHash || !challenge.staffId) return null;
    if (challenge.resetReservedAt !== undefined) return null;
    const staff = await ctx.db.get(challenge.staffId);
    if (!staff?.active || staff.email !== email) return null;
    await ctx.db.patch(challenge._id, { resetReservedAt: Date.now() });
    return { challengeId: challenge._id, staffId: staff._id, userId: staff.userId, email: staff.email, phone: challenge.phone };
  },
});

export const getOwnerResetTarget = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const staff = await ctx.db.query("staff").withIndex("by_email", (q) => q.eq("email", normalizedEmail(email))).unique();
    return staff?.active ? { _id: staff._id, email: staff.email, userId: staff.userId } : null;
  },
});

export const getOwnerBootstrapState = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const normalized = normalizedEmail(email);
    const staffExists = (await ctx.db.query("staff").take(1)).length > 0;
    const account = await ctx.db.query("authAccounts")
      .withIndex("providerAndAccountId", (q) => q.eq("provider", "password").eq("providerAccountId", normalized))
      .unique();
    return { email: normalized, staffExists, passwordAccountExists: Boolean(account) };
  },
});

export const createOwnerBootstrapInvite = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const normalized = normalizedEmail(email);
    if (normalized.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw new Error("Enter a valid staff email address.");
    }
    if ((await ctx.db.query("staff").take(1)).length > 0) {
      throw new Error("The first administrator already exists.");
    }
    const existingAccount = await ctx.db.query("authAccounts")
      .withIndex("providerAndAccountId", (q) => q.eq("provider", "password").eq("providerAccountId", normalized))
      .unique();
    if (existingAccount) throw new Error("A password account already exists for that email.");

    const now = Date.now();
    const invites = await ctx.db.query("invites").collect();
    for (const invite of invites) {
      if (["bootstrap", "owner-bootstrap"].includes(invite.createdBy) && invite.usedAt === undefined && invite.revokedAt === undefined) {
        await ctx.db.patch(invite._id, { revokedAt: now });
      }
    }
    const code = secureInviteCode();
    await ctx.db.insert("invites", {
      email: normalized,
      role: "admin",
      codeHash: await inviteCodeHash(code),
      expiresAt: now + 7 * 24 * 60 * 60_000,
      createdBy: "owner-bootstrap",
    });
    return { email: normalized, code };
  },
});

export const revokeOwnerBootstrapInvite = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const normalized = normalizedEmail(email);
    const invites = await ctx.db.query("invites").withIndex("by_email", (q) => q.eq("email", normalized)).collect();
    for (const invite of invites) {
      if (invite.createdBy === "owner-bootstrap" && invite.usedAt === undefined && invite.revokedAt === undefined) {
        await ctx.db.patch(invite._id, { revokedAt: Date.now() });
      }
    }
  },
});

export const createOwnerAdminInvite = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const normalized = normalizedEmail(email);
    if (normalized.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw new Error("Enter a valid staff email address.");
    }
    const existingStaff = await ctx.db.query("staff")
      .withIndex("by_email", (q) => q.eq("email", normalized))
      .unique();
    if (existingStaff) throw new Error("A staff account already exists for that email.");
    const existingAccount = await ctx.db.query("authAccounts")
      .withIndex("providerAndAccountId", (q) => q.eq("provider", "password").eq("providerAccountId", normalized))
      .unique();
    if (existingAccount) throw new Error("A password account already exists for that email.");

    const now = Date.now();
    const previousInvites = await ctx.db.query("invites")
      .withIndex("by_email", (q) => q.eq("email", normalized))
      .collect();
    for (const invite of previousInvites) {
      if (invite.createdBy === "owner-bootstrap-staff" && invite.usedAt === undefined && invite.revokedAt === undefined) {
        await ctx.db.patch(invite._id, { revokedAt: now });
      }
    }
    const code = secureInviteCode();
    await ctx.db.insert("invites", {
      email: normalized,
      role: "admin",
      codeHash: await inviteCodeHash(code),
      expiresAt: now + 7 * 24 * 60 * 60_000,
      createdBy: "owner-bootstrap-staff",
    });
    return { email: normalized, code };
  },
});

export const revokeOwnerAdminInvite = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const invites = await ctx.db.query("invites")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail(email)))
      .collect();
    for (const invite of invites) {
      if (invite.createdBy === "owner-bootstrap-staff" && invite.usedAt === undefined && invite.revokedAt === undefined) {
        await ctx.db.patch(invite._id, { revokedAt: Date.now() });
      }
    }
  },
});

export const recordOwnerPasswordReset = internalMutation({
  args: { staffId: v.id("staff") },
  handler: async (ctx, { staffId }) => {
    const staff = await ctx.db.get(staffId);
    if (!staff) return;
    await ctx.db.insert("auditLog", {
      actor: "deployment-owner-reset",
      action: "staff.password.reset_owner",
      target: String(staffId),
      meta: "temporary_password_issued",
    });
  },
});

function randomTemporaryPassword(length = 20) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const limit = Math.floor(256 / alphabet.length) * alphabet.length;
  let password = "";
  while (password.length < length) {
    const bytes = crypto.getRandomValues(new Uint8Array(length * 2));
    for (const byte of bytes) {
      if (byte >= limit) continue;
      password += alphabet[byte % alphabet.length];
      if (password.length === length) break;
    }
  }
  return password;
}

/** One-time operator recovery path; callable only by a deployment owner through Convex. */
export const ownerResetPassword = internalAction({
  args: { email: v.string() },
  handler: async (ctx, { email }): Promise<{ email: string; temporaryPassword: string }> => {
    const target: { _id: Id<"staff">; email: string; userId: Id<"users"> } | null = await ctx.runQuery(internal.recovery.getOwnerResetTarget, { email });
    if (!target) throw new Error("Active staff account not found for that email.");
    const temporaryPassword = randomTemporaryPassword();
    await modifyAccountCredentials(ctx, {
      provider: "password",
      account: { id: target.email, secret: temporaryPassword },
    });
    await invalidateSessions(ctx, { userId: target.userId });
    await ctx.runMutation(internal.recovery.recordOwnerPasswordReset, { staffId: target._id });
    return { email: target.email, temporaryPassword };
  },
});

/** One-time password bootstrap for the first production administrator when SMS setup is unavailable. */
export const ownerBootstrapFirstAdmin = internalAction({
  args: { email: v.string() },
  handler: async (ctx, { email }): Promise<{ email: string; temporaryPassword: string; name: string }> => {
    const state: { email: string; staffExists: boolean; passwordAccountExists: boolean } = await ctx.runQuery(internal.recovery.getOwnerBootstrapState, { email });
    if (state.staffExists) throw new Error("A staff account already exists. Use the normal invite or password reset flow.");
    if (state.passwordAccountExists) throw new Error("A password account already exists for that email.");
    const name = "TEIN UCC Administrator";
    const temporaryPassword = randomTemporaryPassword();
    const invite = await ctx.runMutation(internal.recovery.createOwnerBootstrapInvite, { email: state.email });
    try {
      await createAccount(ctx, {
        provider: "password",
        account: { id: state.email, secret: temporaryPassword },
        profile: { email: state.email, name, inviteCode: invite.code, ownerBootstrap: true } as never,
      });
    } catch (error) {
      await ctx.runMutation(internal.recovery.revokeOwnerBootstrapInvite, { email: state.email });
      throw error;
    }
    return { email: state.email, temporaryPassword, name };
  },
});

/** One-time owner-only setup for an additional administrator while SMS is unavailable. */
export const ownerAddAdminWithTemporaryPassword = internalAction({
  args: { email: v.string() },
  handler: async (ctx, { email }): Promise<{ email: string; temporaryPassword: string }> => {
    const normalized = normalizedEmail(email);
    const temporaryPassword = randomTemporaryPassword();
    const invite = await ctx.runMutation(internal.recovery.createOwnerAdminInvite, { email: normalized });
    try {
      await createAccount(ctx, {
        provider: "password",
        account: { id: normalized, secret: temporaryPassword },
        profile: {
          email: normalized,
          name: "TEIN UCC Admin",
          inviteCode: invite.code,
          ownerBootstrapStaff: true,
        } as never,
      });
    } catch (error) {
      await ctx.runMutation(internal.recovery.revokeOwnerAdminInvite, { email: normalized });
      throw error;
    }
    return { email: normalized, temporaryPassword };
  },
});

export const recordPasswordChange = internalMutation({
  args: { staffId: v.id("staff") },
  handler: async (ctx, { staffId }) => {
    const staff = await ctx.db.get(staffId);
    if (!staff) return;
    await ctx.db.insert("auditLog", { actor: staff.email, action: "staff.password.change_self", target: String(staffId) });
  },
});

export const changeOwnPassword = action({
  args: { currentPassword: v.string(), newPassword: v.string(), confirmPassword: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in again before changing your password.");
    if (args.newPassword.length < 10 || args.newPassword.length > 128) throw new Error("Password must be between 10 and 128 characters.");
    if (args.newPassword !== args.confirmPassword) throw new Error("The new passwords do not match.");
    const staff = await ctx.runQuery(internal.recovery.getStaffByUserId, { userId });
    if (!staff) throw new Error("Active staff account not found.");
    try {
      const account = await retrieveAccount(ctx, { provider: "password", account: { id: staff.email, secret: args.currentPassword } });
      if (account.user._id !== userId) throw new Error("Invalid credentials.");
    } catch {
      throw new Error("Current password is incorrect.");
    }
    await modifyAccountCredentials(ctx, { provider: "password", account: { id: staff.email, secret: args.newPassword } });
    await invalidateSessions(ctx, { userId });
    await ctx.runMutation(internal.recovery.recordPasswordChange, { staffId: staff._id });
    return { success: true };
  },
});

export const finishPasswordReset = internalMutation({
  args: { challengeId: v.id("authChallenges"), staffId: v.id("staff"), succeeded: v.boolean() },
  handler: async (ctx, args) => {
    const challenge = await ctx.db.get(args.challengeId);
    const staff = await ctx.db.get(args.staffId);
    if (!challenge || !staff) return;
    if (args.succeeded) {
      await ctx.db.patch(challenge._id, { status: "consumed", verificationTokenHash: undefined });
      await ctx.db.insert("auditLog", { actor: staff.email, action: "staff.password.reset_self", target: String(staff._id) });
    } else {
      await ctx.db.patch(challenge._id, { resetReservedAt: undefined });
    }
  },
});

async function requestCode(ctx: ActionCtx, args: { email: string; phone: string; purpose: Purpose; inviteCode?: string; userId?: Id<"users"> }) {
  const salt = randomSalt();
  const code = randomDigits(8);
  let prepared: { challengeId: Id<"authChallenges">; email: string; phone: string } | null = null;
  try {
    prepared = await ctx.runMutation(internal.recovery.prepareChallenge, {
      purpose: args.purpose,
      email: args.email,
      phone: args.phone,
      salt,
      codeHash: await keyedHash(`${salt}:${code}`),
      inviteCode: args.inviteCode,
      userId: args.userId,
    });
  } catch {
    return;
  }
  if (!prepared) return;
  const accepted = await sendOtp(prepared.phone, code, args.purpose);
  await ctx.runMutation(internal.recovery.setDeliveryResult, { challengeId: prepared.challengeId, accepted });
}

export const requestSignupPhoneCode = action({
  args: { email: v.string(), inviteCode: v.string(), phone: v.string() },
  handler: async (ctx, args) => {
    const normalized = normalizePhone(args.phone);
    if (normalized.ok && args.email.length <= 254 && args.inviteCode.length === 8) {
      await requestCode(ctx, { email: normalizedEmail(args.email), phone: normalized.e164, purpose: "signup_phone", inviteCode: args.inviteCode });
    }
    return { success: true, message: "If the invitation and phone are valid, a verification code will be sent." };
  },
});

export const verifySignupPhoneCode = action({
  args: { email: v.string(), phone: v.string(), code: v.string() },
  handler: async (ctx, args): Promise<{ success: false } | { success: true; verificationToken: string }> => {
    const normalized = normalizePhone(args.phone);
    if (!normalized.ok || !/^\d{8}$/.test(args.code)) return { success: false as const };
    const challenge: Doc<"authChallenges"> | null = await ctx.runQuery(internal.recovery.getLatestChallenge, { email: normalizedEmail(args.email), purpose: "signup_phone" });
    if (!challenge || challenge.phone !== normalized.e164) return { success: false as const };
    const grant = randomToken();
    const result: { ok: boolean } = await ctx.runMutation(internal.recovery.verifyCode, {
      email: normalizedEmail(args.email), purpose: "signup_phone",
      codeHash: await keyedHash(`${challenge.salt}:${args.code}`),
      grantHash: await keyedHash(`signup:${normalizedEmail(args.email)}:${normalized.e164}:${grant}`),
    });
    return result.ok ? { success: true as const, verificationToken: grant } : { success: false as const };
  },
});

export const requestPasswordResetCode = action({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = normalizedEmail(args.email);
    if (email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      await requestCode(ctx, { email, phone: "", purpose: "password_reset" });
    }
    return { success: true, message: GENERIC_RESPONSE };
  },
});

export const verifyPasswordResetCode = action({
  args: { email: v.string(), code: v.string() },
  handler: async (ctx, args): Promise<{ success: false } | { success: true; resetToken: string }> => {
    const email = normalizedEmail(args.email);
    if (!/^\d{8}$/.test(args.code)) return { success: false as const };
    const challenge: Doc<"authChallenges"> | null = await ctx.runQuery(internal.recovery.getLatestChallenge, { email, purpose: "password_reset" });
    if (!challenge) return { success: false as const };
    const grant = randomToken();
    const result: { ok: boolean } = await ctx.runMutation(internal.recovery.verifyCode, {
      email, purpose: "password_reset", codeHash: await keyedHash(`${challenge.salt}:${args.code}`),
      grantHash: await keyedHash(`reset:${email}:${grant}`),
    });
    return result.ok ? { success: true as const, resetToken: grant } : { success: false as const };
  },
});

export const setNewPassword = action({
  args: { email: v.string(), resetToken: v.string(), newPassword: v.string() },
  handler: async (ctx, args) => {
    const email = normalizedEmail(args.email);
    if (args.newPassword.length < 10 || args.newPassword.length > 128) throw new Error("Password must be between 10 and 128 characters.");
    const tokenHash = await keyedHash(`reset:${email}:${args.resetToken}`);
    const reservation = await ctx.runMutation(internal.recovery.reservePasswordReset, { email, tokenHash });
    if (!reservation) throw new Error("This password reset session has expired. Request a new code.");
    try {
      await modifyAccountCredentials(ctx, { provider: "password", account: { id: reservation.email, secret: args.newPassword } });
      await invalidateSessions(ctx, { userId: reservation.userId });
      await ctx.runMutation(internal.recovery.finishPasswordReset, { challengeId: reservation.challengeId, staffId: reservation.staffId, succeeded: true });
      const notice = `TEIN UCC Summit CRM: Your password was changed. If you did not do this, contact the Summit administrator immediately.`;
      // Send a password-free notification separately from the OTP template.
      await sendNotice(reservation.phone, notice);
      return { success: true };
    } catch {
      await ctx.runMutation(internal.recovery.finishPasswordReset, { challengeId: reservation.challengeId, staffId: reservation.staffId, succeeded: false });
      throw new Error("Could not complete the password reset. Please try again.");
    }
  },
});

async function sendNotice(phone: string, message: string) {
  const apiKey = process.env.BULKSMSGH_API_KEY?.trim();
  const senderId = process.env.SMS_SENDER_ID?.trim() || "TEIN UCC";
  if (!apiKey || process.env.SMS_DRY_RUN !== "false" || senderId !== "TEIN UCC") return;
  const form = new URLSearchParams({ key: apiKey, to: phone.replace(/^\+233/, "0"), msg: message, sender_id: senderId });
  try { await fetch(SEND_URL, { method: "POST", headers: { Accept: "text/plain", "Content-Type": "application/x-www-form-urlencoded" }, body: form.toString(), signal: AbortSignal.timeout(15_000) }); } catch { /* Best-effort alert; never undo a successful password reset. */ }
}

export const requestMyPhoneChangeCode = action({
  args: { phone: v.string(), currentPassword: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const phone = normalizePhone(args.phone);
    if (userId && phone.ok) {
      const staff = await ctx.runQuery(internal.recovery.getStaffByUserId, { userId });
      if (staff) {
        try {
          const account = await retrieveAccount(ctx, { provider: "password", account: { id: staff.email, secret: args.currentPassword } });
          if (account.user._id === userId) await requestCode(ctx, { email: "", phone: phone.e164, purpose: "phone_change", userId });
        } catch {
          // Keep account and password-check failures indistinguishable.
        }
      }
    }
    return { success: true, message: "If this number can be used for your staff account, a verification code will be sent." };
  },
});

export const verifyMyPhoneChangeCode = action({
  args: { phone: v.string(), code: v.string() },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const userId = await getAuthUserId(ctx);
    const phone = normalizePhone(args.phone);
    if (!userId || !phone.ok || !/^\d{8}$/.test(args.code)) return { success: false as const };
    const staff: { _id: Id<"staff">; email: string; recoveryPhone?: string } | null = await ctx.runQuery(internal.recovery.getStaffByUserId, { userId });
    if (!staff) return { success: false as const };
    const challenge: Doc<"authChallenges"> | null = await ctx.runQuery(internal.recovery.getLatestChallenge, { email: staff.email, purpose: "phone_change" });
    if (!challenge || challenge.phone !== phone.e164) return { success: false as const };
    const result: { ok: boolean; oldPhone?: string } = await ctx.runMutation(internal.recovery.verifyCode, {
      email: staff.email, purpose: "phone_change", codeHash: await keyedHash(`${challenge.salt}:${args.code}`), grantHash: "unused",
    });
    if (result.ok && result.oldPhone && result.oldPhone !== phone.e164) {
      await sendNotice(result.oldPhone, "TEIN UCC Summit CRM: Your recovery phone was changed. If you did not do this, contact the Summit administrator immediately.");
    }
    return { success: result.ok };
  },
});

export const getStaffByUserId = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const staff = await ctx.db.query("staff").withIndex("by_userId", (q) => q.eq("userId", userId)).unique();
    return staff?.active ? { _id: staff._id, email: staff.email, recoveryPhone: staff.recoveryPhone } : null;
  },
});

export const getPhoneLoginTarget = internalQuery({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    const staff = await ctx.db.query("staff").withIndex("by_recoveryPhone", (q) => q.eq("recoveryPhone", phone)).unique();
    if (!staff?.active || !staff.recoveryPhoneVerifiedAt) return null;
    return { email: staff.email, userId: staff.userId };
  },
});

/** Offline enrollment fallback for the deployment owner after identity and phone ownership are checked out of band. */
export const ownerEnrollRecoveryPhone = internalMutation({
  args: { email: v.string(), phone: v.string() },
  handler: async (ctx, args) => {
    const email = normalizedEmail(args.email);
    const phone = normalizePhone(args.phone);
    if (!phone.ok) throw new Error("Enter a valid Ghana mobile number.");
    const staff = await ctx.db.query("staff").withIndex("by_email", (q) => q.eq("email", email)).unique();
    if (!staff?.active) throw new Error("Active staff account not found.");
    if (staff.recoveryPhoneVerifiedAt) throw new Error("This account already has a verified recovery phone. Change it from Account security.");
    const phoneOwner = await ctx.db.query("staff").withIndex("by_recoveryPhone", (q) => q.eq("recoveryPhone", phone.e164)).unique();
    if (phoneOwner && phoneOwner._id !== staff._id) throw new Error("That number is already assigned to another staff account.");
    await ctx.db.patch(staff._id, { recoveryPhone: phone.e164, recoveryPhoneVerifiedAt: Date.now() });
    await ctx.db.insert("auditLog", {
      actor: "deployment-owner-recovery",
      action: "staff.recovery_phone.owner_enroll",
      target: String(staff._id),
      meta: "identity_and_phone_verified_out_of_band",
    });
    return { success: true };
  },
});

export const cleanupChallenges = internalMutation({
  args: {},
  handler: async (ctx) => {
    const expired = await ctx.db.query("authChallenges").filter((q) => q.lt(q.field("createdAt"), Date.now() - 30 * 24 * 60 * 60_000)).take(500);
    for (const row of expired) await ctx.db.delete(row._id);
    if (expired.length === 500) await ctx.scheduler.runAfter(0, internal.recovery.cleanupChallenges, {});
  },
});
