import { query, mutation, internalMutation, type MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { DataModel, Doc, Id } from "./_generated/dataModel";
import type { NamedTableInfo, Query } from "convex/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { normalizePhone } from "./lib/normalizePhone";
import { generateTicketCode } from "./lib/ticketCode";
import { requireStaff } from "./lib/auth";

const MINUTE = 60_000;
const SITE_URL = (process.env.SITE_URL || "https://teinucc.vercel.app").replace(/\/$/, "");

function optionalProfileField(value: string | undefined, label: string, maxLength: number) {
  const normalized = value?.trim();
  if (normalized && normalized.length > maxLength) {
    throw new Error(`${label} cannot exceed ${maxLength} characters.`);
  }
  return normalized || undefined;
}

async function generateUnusedTicketCode(ctx: MutationCtx) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const ticketCode = generateTicketCode();
    const existing = await ctx.db
      .query("registrations")
      .withIndex("by_ticket", (q) => q.eq("ticketCode", ticketCode))
      .unique();
    if (!existing) return ticketCode;
  }
  throw new Error("Could not issue a ticket code. Please try again.");
}

const adminAttendeeFields = (registration: Doc<"registrations">) => ({
  _id: registration._id,
  _creationTime: registration._creationTime,
  ticketCode: registration.ticketCode,
  fullName: registration.fullName,
  phone: registration.phone,
  attendeeType: registration.attendeeType,
  position: registration.position,
  organization: registration.organization,
  city: registration.city,
  country: registration.country,
  studentId: registration.studentId,
  level: registration.level,
  programme: registration.programme,
  hall: registration.hall,
  status: registration.status,
  source: registration.source,
  checkedInAt: registration.checkedInAt,
  checkedInBy: registration.checkedInBy,
  consentComms: registration.consentComms,
  optedOut: registration.optedOut,
});

function applyAdminFilters(
  query: Query<NamedTableInfo<DataModel, "registrations">>,
  filters: {
    attendeeType?: "student" | "staff" | "alumni" | "guest" | "executive";
    source?: "online" | "walk_in" | "admin";
    checkedIn?: boolean;
  }
) {
  let filtered: Query<NamedTableInfo<DataModel, "registrations">> = query;
  if (filters.attendeeType) {
    filtered = filtered.filter((q) =>
      q.eq(q.field("attendeeType"), filters.attendeeType)
    );
  }
  if (filters.source) {
    filtered = filtered.filter((q) => q.eq(q.field("source"), filters.source));
  }
  if (filters.checkedIn === true) {
    filtered = filtered.filter((q) =>
      q.neq(q.field("checkedInAt"), undefined)
    );
  } else if (filters.checkedIn === false) {
    filtered = filtered.filter((q) =>
      q.eq(q.field("checkedInAt"), undefined)
    );
  }
  return filtered;
}

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
      v.literal("guest"),
      v.literal("executive")
    ),
    position: v.optional(v.string()),
    organization: v.optional(v.string()),
    city: v.optional(v.string()),
    country: v.optional(v.string()),
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

    // 4. Validate and normalize name
    const trimmedName = args.fullName.trim();
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      throw new Error("Full name must be between 2 and 100 characters");
    }
    const position = optionalProfileField(args.position, "Position or title", 120);
    const organization = optionalProfileField(args.organization, "Organization or institution", 160);
    const city = optionalProfileField(args.city, "City or region", 100);
    const country = optionalProfileField(args.country, "Country", 100);

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
          gender: args.gender?.trim() || undefined,
          attendeeType: args.attendeeType,
          position,
          organization,
          city,
          country,
          studentId: args.studentId?.trim() || undefined,
          level: args.level?.trim() || undefined,
          programme: args.programme?.trim() || undefined,
          hall: args.hall?.trim() || undefined,
          howHeard: args.howHeard?.trim() || undefined,
          specialNeeds: args.specialNeeds?.trim() || undefined,
          status: "registered",
          optedOut: existing.optedOut && !args.consentComms,
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
    const ticketCode = await generateUnusedTicketCode(ctx);

    // 9. Insert registration
    const regId = await ctx.db.insert("registrations", {
      eventId: event._id,
      ticketCode,
      fullName: trimmedName,
      phone: e164,
      gender: args.gender?.trim(),
      attendeeType: args.attendeeType,
      position,
      organization,
      city,
      country,
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

export const listAdminPage = query({
  args: {
    eventId: v.id("events"),
    paginationOpts: paginationOptsValidator,
    status: v.optional(
      v.union(v.literal("registered"), v.literal("waitlisted"), v.literal("cancelled"))
    ),
    attendeeType: v.optional(
      v.union(v.literal("student"), v.literal("staff"), v.literal("alumni"), v.literal("guest"), v.literal("executive"))
    ),
    source: v.optional(v.union(v.literal("online"), v.literal("walk_in"), v.literal("admin"))),
    checkedIn: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx, ["admin"]);
    const baseQuery = args.status
      ? ctx.db
          .query("registrations")
          .withIndex("by_event_status", (q) =>
            q.eq("eventId", args.eventId).eq("status", args.status!)
          )
      : ctx.db
          .query("registrations")
          .withIndex("by_event", (q) => q.eq("eventId", args.eventId));
    const filtered = applyAdminFilters(baseQuery, args);
    const page = await filtered.order("desc").paginate(args.paginationOpts);
    return { ...page, page: page.page.map(adminAttendeeFields) };
  },
});

export const searchAdmin = query({
  args: {
    eventId: v.id("events"),
    term: v.string(),
    status: v.optional(
      v.union(v.literal("registered"), v.literal("waitlisted"), v.literal("cancelled"))
    ),
    attendeeType: v.optional(
      v.union(v.literal("student"), v.literal("staff"), v.literal("alumni"), v.literal("guest"), v.literal("executive"))
    ),
    source: v.optional(v.union(v.literal("online"), v.literal("walk_in"), v.literal("admin"))),
    checkedIn: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx, ["admin"]);
    const term = args.term.trim();
    if (term.length < 2) return [];

    let records;
    const normalizedPhone = normalizePhone(term);
    if (normalizedPhone.ok) {
      const registration = await ctx.db
        .query("registrations")
        .withIndex("by_event_phone", (q) =>
          q.eq("eventId", args.eventId).eq("phone", normalizedPhone.e164)
        )
        .unique();
      records = registration ? [registration] : [];
    } else if (/^WES-[A-Z0-9]{1,10}$/i.test(term)) {
      const registration = await ctx.db
        .query("registrations")
        .withIndex("by_ticket", (q) => q.eq("ticketCode", term.toUpperCase()))
        .unique();
      records = registration?.eventId === args.eventId ? [registration] : [];
    } else {
      records = await ctx.db
        .query("registrations")
        .withSearchIndex("search_by_name", (q) =>
          q.search("fullName", term).eq("eventId", args.eventId)
        )
        .take(250);
    }

    const filtered = records.filter((registration) => {
      if (args.status && registration.status !== args.status) return false;
      if (args.attendeeType && registration.attendeeType !== args.attendeeType) return false;
      if (args.source && registration.source !== args.source) return false;
      if (args.checkedIn !== undefined && Boolean(registration.checkedInAt) !== args.checkedIn) return false;
      return true;
    });
    return filtered.slice(0, 100).map(adminAttendeeFields);
  },
});

export const adminDetail = query({
  args: { registrationId: v.id("registrations") },
  handler: async (ctx, { registrationId }) => {
    await requireStaff(ctx, ["admin"]);
    return await ctx.db.get(registrationId);
  },
});

export const exportPage = query({
  args: {
    eventId: v.id("events"),
    paginationOpts: paginationOptsValidator,
    status: v.optional(
      v.union(v.literal("registered"), v.literal("waitlisted"), v.literal("cancelled"))
    ),
    attendeeType: v.optional(
      v.union(v.literal("student"), v.literal("staff"), v.literal("alumni"), v.literal("guest"), v.literal("executive"))
    ),
    source: v.optional(v.union(v.literal("online"), v.literal("walk_in"), v.literal("admin"))),
    checkedIn: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx, ["admin"]);
    const baseQuery = args.status
      ? ctx.db
          .query("registrations")
          .withIndex("by_event_status", (q) =>
            q.eq("eventId", args.eventId).eq("status", args.status!)
          )
      : ctx.db
          .query("registrations")
          .withIndex("by_event", (q) => q.eq("eventId", args.eventId));
    const filtered = applyAdminFilters(baseQuery, args);
    const page = await filtered.order("desc").paginate({
      ...args.paginationOpts,
      numItems: Math.min(args.paginationOpts.numItems, 250),
    });
    return {
      ...page,
      page: page.page.map((registration: Doc<"registrations">) => ({
        ticketCode: registration.ticketCode,
        fullName: registration.fullName,
        phone: registration.phone,
        attendeeType: registration.attendeeType,
        position: registration.position,
        organization: registration.organization,
        city: registration.city,
        country: registration.country,
        studentId: registration.studentId,
        level: registration.level,
        programme: registration.programme,
        hall: registration.hall,
        status: registration.status,
        source: registration.source,
        checkedInAt: registration.checkedInAt,
      })),
    };
  },
});

export const recordExport = mutation({
  args: {
    rowCount: v.number(),
    filters: v.string(),
  },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, ["admin"]);
    await ctx.db.insert("auditLog", {
      actor: staff.email,
      action: "registration.export",
      meta: JSON.stringify({ rowCount: args.rowCount, filters: args.filters.slice(0, 240) }),
    });
    return { success: true };
  },
});

export const updateAttendee = mutation({
  args: {
    registrationId: v.id("registrations"),
    fullName: v.optional(v.string()),
    phone: v.optional(v.string()),
    gender: v.optional(v.string()),
    attendeeType: v.optional(
      v.union(
        v.literal("student"),
        v.literal("staff"),
        v.literal("alumni"),
        v.literal("guest"),
        v.literal("executive")
      )
    ),
    position: v.optional(v.string()),
    organization: v.optional(v.string()),
    city: v.optional(v.string()),
    country: v.optional(v.string()),
    studentId: v.optional(v.string()),
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

    if (patchData.fullName !== undefined) {
      const name = patchData.fullName.trim();
      if (name.length < 2 || name.length > 100) {
        throw new Error("Full name must be between 2 and 100 characters.");
      }
      patchData.fullName = name;
    }

    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patchData)) {
      if (v !== undefined) {
        if (k === "phone") {
          const norm = normalizePhone(v as string);
          if (!norm.ok) throw new Error(norm.error);
          const duplicate = await ctx.db
            .query("registrations")
            .withIndex("by_event_phone", (q) =>
              q.eq("eventId", existing.eventId).eq("phone", norm.e164)
            )
            .unique();
          if (duplicate && duplicate._id !== registrationId) {
            throw new Error("That phone number already has a registration for this event.");
          }
          patch[k] = norm.e164;
        } else if (["gender", "position", "organization", "city", "country", "studentId", "level", "programme", "hall", "specialNeeds"].includes(k)) {
          const value = typeof v === "string" ? v.trim() : v;
          const fieldMaxLengths: Record<string, number> = { position: 120, organization: 160, city: 100, country: 100 };
          const maxLength = fieldMaxLengths[k];
          if (typeof value === "string" && maxLength && value.length > maxLength) {
            throw new Error(`${k} cannot exceed ${maxLength} characters.`);
          }
          patch[k] = value === "" ? undefined : value;
        } else {
          patch[k] = v;
        }
      }
    }

    await ctx.db.patch(registrationId, patch);

    await ctx.db.insert("auditLog", {
      actor: staff.email,
      action: "registration.update",
      target: String(registrationId),
      meta: JSON.stringify({ changedFields: Object.keys(patch).sort() }),
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
    if (existing.status === "cancelled") return { success: true };

    await ctx.db.patch(args.registrationId, { status: "cancelled" });

    await ctx.db.insert("auditLog", {
      actor: staff.email,
      action: "registration.cancel",
      target: String(args.registrationId),
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
    if (existing.status !== "waitlisted") {
      throw new Error("Only a waitlisted registration can be promoted.");
    }
    const event = await ctx.db.get(existing.eventId);
    if (!event) throw new Error("Event not found.");
    if (event.capacity !== undefined) {
      const registered = await ctx.db
        .query("registrations")
        .withIndex("by_event_status", (q) =>
          q.eq("eventId", existing.eventId).eq("status", "registered")
        )
        .collect();
      if (registered.length >= event.capacity) {
        throw new Error("The event is still at capacity.");
      }
    }

    await ctx.db.patch(args.registrationId, { status: "registered" });

    await ctx.db.insert("auditLog", {
      actor: staff.email,
      action: "registration.promote",
      target: String(args.registrationId),
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
      target: String(args.registrationId),
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
      v.literal("guest"),
      v.literal("executive")
    ),
    gender: v.optional(v.string()),
    position: v.optional(v.string()),
    organization: v.optional(v.string()),
    city: v.optional(v.string()),
    country: v.optional(v.string()),
    studentId: v.optional(v.string()),
    level: v.optional(v.string()),
    programme: v.optional(v.string()),
    hall: v.optional(v.string()),
    specialNeeds: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, ["admin"]);

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found.");
    const fullName = args.fullName.trim();
    if (fullName.length < 2 || fullName.length > 100) {
      throw new Error("Full name must be between 2 and 100 characters.");
    }
    const position = optionalProfileField(args.position, "Position or title", 120);
    const organization = optionalProfileField(args.organization, "Organization or institution", 160);
    const city = optionalProfileField(args.city, "City or region", 100);
    const country = optionalProfileField(args.country, "Country", 100);

    const norm = normalizePhone(args.phone);
    if (!norm.ok) throw new Error(norm.error);

    const duplicate = await ctx.db
      .query("registrations")
      .withIndex("by_event_phone", (q) =>
        q.eq("eventId", args.eventId).eq("phone", norm.e164)
      )
      .unique();
    if (duplicate && duplicate.status !== "cancelled") {
      throw new Error("That phone number already has a registration for this event.");
    }

    let status: "registered" | "waitlisted" = "registered";
    if (event.capacity !== undefined) {
      const registered = await ctx.db
        .query("registrations")
        .withIndex("by_event_status", (q) => q.eq("eventId", args.eventId).eq("status", "registered"))
        .collect();
      if (registered.length >= event.capacity) status = "waitlisted";
    }

    if (duplicate) {
      await ctx.db.patch(duplicate._id, {
        fullName,
        phone: norm.e164,
        gender: args.gender?.trim() || undefined,
        attendeeType: args.attendeeType,
        position,
        organization,
        city,
        country,
        studentId: args.studentId?.trim() || undefined,
        level: args.level?.trim() || undefined,
        programme: args.programme?.trim() || undefined,
        hall: args.hall?.trim() || undefined,
        specialNeeds: args.specialNeeds?.trim() || undefined,
        consentComms: false,
        status,
        source: "admin",
        checkedInAt: undefined,
        checkedInBy: undefined,
      });
      await ctx.db.insert("auditLog", {
        actor: staff.email,
        action: "registration.adminReactivate",
        target: String(duplicate._id),
        meta: status,
      });
      return { registrationId: duplicate._id, ticketCode: duplicate.ticketCode, status };
    }

    const ticketCode = await generateUnusedTicketCode(ctx);
    const id = await ctx.db.insert("registrations", {
      eventId: args.eventId,
      ticketCode,
      fullName,
      phone: norm.e164,
      gender: args.gender?.trim() || undefined,
      attendeeType: args.attendeeType,
      position,
      organization,
      city,
      country,
      studentId: args.studentId?.trim() || undefined,
      level: args.level?.trim() || undefined,
      programme: args.programme?.trim() || undefined,
      hall: args.hall?.trim() || undefined,
      specialNeeds: args.specialNeeds?.trim() || undefined,
      consentComms: false,
      optedOut: false,
      status,
      source: "admin",
    });

    await ctx.db.insert("auditLog", {
      actor: staff.email,
      action: "registration.adminCreate",
      target: String(id),
      meta: status,
    });

    return { registrationId: id, ticketCode, status };
  },
});

