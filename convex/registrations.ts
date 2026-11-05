import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { normalizePhone } from "./lib/normalizePhone";
import { generateTicketCode } from "./lib/ticketCode";
import { requireStaff } from "./lib/auth";

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

    // 3. Validate consent
    if (!args.consentComms) {
      throw new Error("Consent to receive event SMS communications is required");
    }

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
          consentComms: true,
        });
        return {
          status: "registered" as const,
          ticketCode: existing.ticketCode,
          isDuplicate: false,
          reActivated: true,
        };
      }

      // Return friendly duplicate message without exposing the ticket on screen (D9)
      return {
        status: "already_registered" as const,
        ticketCode: null,
        isDuplicate: true,
        message:
          "This phone number is already registered for this event. Your ticket details have been sent via SMS.",
      };
    }

    // 7. Capacity and race-safe count in transaction
    const registeredAttendees = await ctx.db
      .query("registrations")
      .withIndex("by_event_status", (q) =>
        q.eq("eventId", event._id).eq("status", "registered")
      )
      .collect();

    const isCapacityReached = registeredAttendees.length >= event.capacity;
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
      attendeeType: reg.attendeeType,
      level: reg.level,
      programme: reg.programme,
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
    // Normalise phone; always return identical message (R2)
    const normalized = normalizePhone(args.phone);
    if (normalized.ok) {
      const event = await ctx.db
        .query("events")
        .withIndex("by_slug", (q) => q.eq("slug", args.slug))
        .unique();

      if (event) {
        const reg = await ctx.db
          .query("registrations")
          .withIndex("by_event_phone", (q) =>
            q.eq("eventId", event._id).eq("phone", normalized.e164)
          )
          .unique();

        if (reg && reg.status !== "cancelled") {
          // Record message in queue if SMS enabled
          await ctx.db.insert("messages", {
            registrationId: reg._id,
            kind: "ticket_resend",
            toPhone: reg.phone,
            body: `Hi ${reg.fullName}, here is your ticket for ${event.name}: https://tein-ucc-events.vercel.app/ticket/${reg.ticketCode}`,
            status: "queued",
          });
        }
      }
    }

    return {
      success: true,
      message:
        "If this number is registered, we've sent your ticket link by SMS.",
    };
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
      consentComms: true,
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

