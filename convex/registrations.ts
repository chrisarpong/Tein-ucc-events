import { query, mutation, internalMutation, type MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { normalizePhone } from "./lib/normalizePhone";
import { generateTicketCode } from "./lib/ticketCode";
import { requireStaff } from "./lib/auth";

const MINUTE = 60_000;
const SITE_URL = (process.env.SITE_URL || "https://teinucc.vercel.app").replace(/\/$/, "");

async function queueSms(
  ctx: MutationCtx,
  input: {
    registrationId: Id<"registrations">;
    kind: "confirmation" | "ticket_resend";
    toPhone: string;
    body: string;
  }
) {
  const messageId = await ctx.db.insert("messages", {
    registrationId: input.registrationId,
    kind: input.kind,
    toPhone: input.toPhone,
    body: input.body,
    status: "queued",
  });
  await ctx.scheduler.runAfter(0, internal.sms.sendQueuedMessage, { messageId });
}

async function rateLimitKey(phone: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(phone)
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

async function consumeRateLimit(
  ctx: MutationCtx,
  key: string,
  maxAttempts: number,
  windowMs: number
) {
  const now = Date.now();
  const current = await ctx.db
    .query("rateLimits")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();

  if (!current || current.expiresAt <= now) {
    if (current) {
      await ctx.db.patch(current._id, { count: 1, expiresAt: now + windowMs });
    } else {
      await ctx.db.insert("rateLimits", {
        key,
        count: 1,
        expiresAt: now + windowMs,
      });
    }
    return;
  }

  if (current.count >= maxAttempts) {
    throw new Error("Too many registration attempts. Please try again later.");
  }

  await ctx.db.patch(current._id, { count: current.count + 1 });
}

export const register = mutation({
  args: {
    slug: v.string(),
    fullName: v.string(),
    phone: v.string(),
    gender: v.optional(v.string()),
    attendeeType: v.union(
      v.literal("student"),
      v.literal("staff"),
      v.literal("alumni"),
      v.literal("guest")
    ),
    studentId: v.optional(v.string()),
    level: v.optional(v.string()),
    programme: v.optional(v.string()),
    hall: v.optional(v.string()),
    howHeard: v.optional(v.string()),
    specialNeeds: v.optional(v.string()),
    consentComms: v.boolean(),
    honeypot: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Honeypot check for bots
    if (args.honeypot && args.honeypot.trim().length > 0) {
      throw new Error("Invalid submission");
    }

    // 2. Validate event
    const event = await ctx.db
      .query("events")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (!event) {
      throw new Error("Event not found");
    }

    if (!event.registrationOpen) {
      throw new Error("Registration is currently closed for this event");
    }

    await consumeRateLimit(ctx, "registration-global", 60, MINUTE);

    // 4. Validate and normalize name
    const trimmedName = args.fullName.trim();
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      throw new Error("Full name must be between 2 and 100 characters");
    }

    // 5. Normalize phone number
    const phoneNorm = normalizePhone(args.phone);
    if (!phoneNorm.ok) {
      throw new Error(phoneNorm.error);
    }
    const e164 = phoneNorm.e164;
    await consumeRateLimit(
      ctx,
      `registration-phone:${await rateLimitKey(e164)}`,
      3,
      10 * MINUTE
    );

    // 6. Check for duplicate registration on this event (D9)
    const existing = await ctx.db
      .query("registrations")
      .withIndex("by_event_phone", (q) =>
        q.eq("eventId", event._id).eq("phone", e164)
      )
      .unique();

    if (existing) {
      if (existing.status === "cancelled") {
        // Re-activate previously cancelled registration
        await ctx.db.patch(existing._id, {
          fullName: trimmedName,
          status: "registered",
          optedOut: false,
          consentComms: args.consentComms,
        });
        return {
          status: "registered" as const,
          ticketCode: existing.ticketCode,
          isDuplicate: false,
          reActivated: true,
        };
      }

      if (args.consentComms && !existing.optedOut) {
        await queueSms(ctx, {
          registrationId: existing._id,
          kind: "ticket_resend",
          toPhone: existing.phone,
          body: `Hi ${existing.fullName}, your ticket for ${event.name}: ${SITE_URL}/ticket/${existing.ticketCode}`,
        });
      }

      // Return friendly duplicate message without exposing the ticket on screen (D9)
      return {
        status: "already_registered" as const,
        ticketCode: null,
        isDuplicate: true,
        message:
          "This phone number is already registered for this event. Use the ticket support page if you need help.",
      };
    }

    // 7. No attendee cap by default. Count only if an owner configured one.
    let isCapacityReached = false;
    if (event.capacity !== undefined) {
      const registeredAttendees = await ctx.db
        .query("registrations")
        .withIndex("by_event_status", (q) =>
          q.eq("eventId", event._id).eq("status", "registered")
        )
        .collect();
      isCapacityReached = registeredAttendees.length >= event.capacity;
    }
    const status: "registered" | "waitlisted" = isCapacityReached
      ? "waitlisted"
      : "registered";

    // 8. Generate unique ticket code
    let ticketCode = generateTicketCode();
    for (let attempts = 0; attempts < 5; attempts++) {
      const codeCheck = await ctx.db
        .query("registrations")
        .withIndex("by_ticket", (q) => q.eq("ticketCode", ticketCode))
        .unique();
      if (!codeCheck) break;
      ticketCode = generateTicketCode();
    }

    // 9. Insert registration
    const regId = await ctx.db.insert("registrations", {
      eventId: event._id,
      ticketCode,
      fullName: trimmedName,
      phone: e164,
      gender: args.gender?.trim(),
      attendeeType: args.attendeeType,
      studentId: args.studentId?.trim(),
      level: args.level?.trim(),
      programme: args.programme?.trim(),
      hall: args.hall?.trim(),
      howHeard: args.howHeard?.trim(),
      specialNeeds: args.specialNeeds?.trim(),
      consentComms: args.consentComms,
      optedOut: false,
      status,
      source: "online",
    });

    if (args.consentComms && event.confirmationSmsEnabled) {
      await queueSms(ctx, {
        registrationId: regId,
        kind: "confirmation",
        toPhone: e164,
        body: `Hi ${trimmedName}, you are registered for ${event.name}. Your ticket: ${SITE_URL}/ticket/${ticketCode}`,
      });
    }

    return {
      status,
      ticketCode,
      registrationId: regId,
      isDuplicate: false,
    };
  },
});

export const getTicket = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const reg = await ctx.db
      .query("registrations")
      .withIndex("by_ticket", (q) => q.eq("ticketCode", args.code.trim().toUpperCase()))
      .unique();

    if (!reg) {
      return null;
    }

    const event = await ctx.db.get(reg.eventId);
    if (!event) {
      return null;
    }

    // Golden privacy rule: never return phone number or private PII
    return {
      ticketCode: reg.ticketCode,
      fullName: reg.fullName,
      status: reg.status,
      checkedInAt: reg.checkedInAt,
      event: {
        name: event.name,
        theme: event.theme,
        venue: event.venue,
        startsAt: event.startsAt,
      },
    };
  },
});

export const requestTicketSms = mutation({
  args: {
    slug: v.string(),
    phone: v.string(),
  },
  handler: async (ctx, args) => {
    const normalized = normalizePhone(args.phone);
    if (!normalized.ok) {
      return {
        success: true,
        message: "If this number is registered and opted into SMS, a ticket link will be sent if delivery is available. If you do not receive one, contact the event team.",
      };
    }

    try {
      await consumeRateLimit(
        ctx,
        `ticket-sms:${await rateLimitKey(normalized.e164)}`,
        3,
        60 * MINUTE
      );
    } catch {
      // Keep the response identical to avoid revealing registration state.
      return {
        success: true,
        message: "If this number is registered and opted into SMS, a ticket link will be sent if delivery is available. If you do not receive one, contact the event team.",
      };
    }

    const event = await ctx.db
      .query("events")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (event) {
      const registration = await ctx.db
        .query("registrations")
        .withIndex("by_event_phone", (q) =>
          q.eq("eventId", event._id).eq("phone", normalized.e164)
        )
        .unique();

      if (
        registration &&
        registration.status !== "cancelled" &&
        registration.consentComms &&
        !registration.optedOut
      ) {
        await queueSms(ctx, {
          registrationId: registration._id,
          kind: "ticket_resend",
          toPhone: registration.phone,
          body: `Hi ${registration.fullName}, your ticket for ${event.name}: ${SITE_URL}/ticket/${registration.ticketCode}`,
        });
      }
    }

    return {
      success: true,
      message: "If this number is registered and opted into SMS, a ticket link will be sent if delivery is available. If you do not receive one, contact the event team.",
    };
  },
});

export const cleanupRateLimits = internalMutation({
  args: {},
  handler: async (ctx) => {
    const expired = await ctx.db
      .query("rateLimits")
      .withIndex("by_expiresAt", (q) => q.lt("expiresAt", Date.now()))
      .take(500);

    for (const row of expired) {
      await ctx.db.delete(row._id);
    }

    if (expired.length === 500) {
      await ctx.scheduler.runAfter(
        0,
        internal.registrations.cleanupRateLimits,
        {}
      );
    }
  },
});

export const listForEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    await requireStaff(ctx, ["admin"]);

    const rows = await ctx.db
      .query("registrations")
      .withIndex("by_event_status", (q) => q.eq("eventId", args.eventId))
      .take(2000);

    return rows;
  },
});

export const updateAttendee = mutation({
  args: {
    registrationId: v.id("registrations"),
    fullName: v.optional(v.string()),
    phone: v.optional(v.string()),
    attendeeType: v.optional(
      v.union(
        v.literal("student"),
        v.literal("staff"),
        v.literal("alumni"),
        v.literal("guest")
      )
    ),
    level: v.optional(v.string()),
    programme: v.optional(v.string()),
    hall: v.optional(v.string()),
    specialNeeds: v.optional(v.string()),
    optedOut: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, ["admin"]);

    const { registrationId, ...patchData } = args;
    const existing = await ctx.db.get(registrationId);
    if (!existing) {
      throw new Error("Registration not found");
    }

    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patchData)) {
      if (v !== undefined) {
        if (k === "phone") {
          const norm = normalizePhone(v as string);
          if (!norm.ok) throw new Error(norm.error);
          patch[k] = norm.e164;
        } else {
          patch[k] = v;
        }
      }
    }

    await ctx.db.patch(registrationId, patch);

    await ctx.db.insert("auditLog", {
      actor: staff.email,
      action: "registration.update",
      target: existing.ticketCode,
      meta: JSON.stringify(patch),
    });

    return { success: true };
  },
});

export const cancel = mutation({
  args: { registrationId: v.id("registrations") },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, ["admin"]);
    const existing = await ctx.db.get(args.registrationId);
    if (!existing) throw new Error("Registration not found");

    await ctx.db.patch(args.registrationId, { status: "cancelled" });

    await ctx.db.insert("auditLog", {
      actor: staff.email,
      action: "registration.cancel",
      target: existing.ticketCode,
      meta: existing.phone,
    });

    return { success: true };
  },
});

export const promote = mutation({
  args: { registrationId: v.id("registrations") },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, ["admin"]);
    const existing = await ctx.db.get(args.registrationId);
    if (!existing) throw new Error("Registration not found");

    await ctx.db.patch(args.registrationId, { status: "registered" });

    await ctx.db.insert("auditLog", {
      actor: staff.email,
      action: "registration.promote",
      target: existing.ticketCode,
    });

    return { success: true };
  },
});

export const setOptedOut = mutation({
  args: {
    registrationId: v.id("registrations"),
    optedOut: v.boolean(),
  },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, ["admin"]);
    const existing = await ctx.db.get(args.registrationId);
    if (!existing) throw new Error("Registration not found");

    await ctx.db.patch(args.registrationId, { optedOut: args.optedOut });

    await ctx.db.insert("auditLog", {
      actor: staff.email,
      action: "registration.optOut",
      target: existing.ticketCode,
      meta: String(args.optedOut),
    });

    return { success: true };
  },
});

export const adminCreate = mutation({
  args: {
    eventId: v.id("events"),
    fullName: v.string(),
    phone: v.string(),
    attendeeType: v.union(
      v.literal("student"),
      v.literal("staff"),
      v.literal("alumni"),
      v.literal("guest")
    ),
    gender: v.optional(v.string()),
    level: v.optional(v.string()),
    programme: v.optional(v.string()),
    hall: v.optional(v.string()),
    specialNeeds: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, ["admin"]);

    const norm = normalizePhone(args.phone);
    if (!norm.ok) throw new Error(norm.error);

    const ticketCode = generateTicketCode();
    const id = await ctx.db.insert("registrations", {
      eventId: args.eventId,
      ticketCode,
      fullName: args.fullName.trim(),
      phone: norm.e164,
      gender: args.gender,
      attendeeType: args.attendeeType,
      level: args.level,
      programme: args.programme,
      hall: args.hall,
      specialNeeds: args.specialNeeds,
      consentComms: false,
      optedOut: false,
      status: "registered",
      source: "admin",
    });

    await ctx.db.insert("auditLog", {
      actor: staff.email,
      action: "registration.adminCreate",
      target: ticketCode,
      meta: norm.e164,
    });

    return { registrationId: id, ticketCode };
  },
});

