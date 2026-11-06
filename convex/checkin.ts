import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { normalizePhone } from "./lib/normalizePhone";
import { generateTicketCode } from "./lib/ticketCode";
import { requireStaff } from "./lib/auth";
import type { Doc } from "./_generated/dataModel";

const EVENT_SLUG = "women-empowerment-summit";

function checkinResult(registration: Doc<"registrations">) {
  return {
    _id: registration._id,
    ticketCode: registration.ticketCode,
    fullName: registration.fullName,
    phoneLast4: registration.phone.slice(-4),
    attendeeType: registration.attendeeType,
    status: registration.status,
    checkedInAt: registration.checkedInAt,
    checkedInBy: registration.checkedInBy,
  };
}

export const search = query({
  args: { term: v.string() },
  handler: async (ctx, { term }) => {
    await requireStaff(ctx, ["admin", "checkin"]);
    const event = await ctx.db
      .query("events")
      .withIndex("by_slug", (q) => q.eq("slug", EVENT_SLUG))
      .unique();
    if (!event) return [];

    const value = term.trim();
    if (value.length < 2) return [];

    const phone = normalizePhone(value);
    if (phone.ok) {
      const registration = await ctx.db
        .query("registrations")
        .withIndex("by_event_phone", (q) =>
          q.eq("eventId", event._id).eq("phone", phone.e164)
        )
        .unique();
      return registration ? [checkinResult(registration)] : [];
    }

    if (/^WES-[A-Z0-9]{1,10}$/i.test(value)) {
      const registration = await ctx.db
        .query("registrations")
        .withIndex("by_ticket", (q) => q.eq("ticketCode", value.toUpperCase()))
        .unique();
      return registration?.eventId === event._id ? [checkinResult(registration)] : [];
    }

    const registrations = await ctx.db
      .query("registrations")
      .withSearchIndex("search_by_name", (q) =>
        q.search("fullName", value).eq("eventId", event._id)
      )
      .take(20);
    return registrations.map(checkinResult);
  },
});

export const byCode = mutation({
  args: { ticketCode: v.string() },
  handler: async (ctx, { ticketCode }) => {
    const staff = await requireStaff(ctx, ["admin", "checkin"]);
    const registration = await ctx.db
      .query("registrations")
      .withIndex("by_ticket", (q) => q.eq("ticketCode", ticketCode.trim().toUpperCase()))
      .unique();
    if (!registration) return { state: "not_found" as const };
    if (registration.status !== "registered") {
      return {
        state: "not_eligible" as const,
        attendee: checkinResult(registration),
      };
    }
    if (registration.checkedInAt !== undefined) {
      return {
        state: "already_checked_in" as const,
        attendee: checkinResult(registration),
      };
    }

    const checkedInAt = Date.now();
    await ctx.db.patch(registration._id, {
      checkedInAt,
      checkedInBy: staff.email,
    });
    await ctx.db.insert("auditLog", {
      actor: staff.email,
      action: "registration.checkin",
      target: String(registration._id),
    });
    return {
      state: "checked_in" as const,
      attendee: { ...checkinResult(registration), checkedInAt, checkedInBy: staff.email },
    };
  },
});

export const walkIn = mutation({
  args: {
    fullName: v.string(),
    phone: v.string(),
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
  },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, ["admin", "checkin"]);
    const event = await ctx.db
      .query("events")
      .withIndex("by_slug", (q) => q.eq("slug", EVENT_SLUG))
      .unique();
    if (!event) throw new Error("Event not found.");

    const fullName = args.fullName.trim();
    if (fullName.length < 2 || fullName.length > 100) {
      throw new Error("Full name must be between 2 and 100 characters.");
    }
    const position = args.position?.trim() || undefined;
    const organization = args.organization?.trim() || undefined;
    const city = args.city?.trim() || undefined;
    const country = args.country?.trim() || undefined;
    if ((position?.length ?? 0) > 120 || (organization?.length ?? 0) > 160 || (city?.length ?? 0) > 100 || (country?.length ?? 0) > 100) {
      throw new Error("Executive profile details are too long.");
    }
    const phone = normalizePhone(args.phone);
    if (!phone.ok) throw new Error(phone.error);
    const existing = await ctx.db
      .query("registrations")
      .withIndex("by_event_phone", (q) =>
        q.eq("eventId", event._id).eq("phone", phone.e164)
      )
      .unique();
    if (existing && existing.status !== "cancelled") {
      return {
        state: "already_registered" as const,
        attendee: checkinResult(existing),
      };
    }

    const checkedInAt = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        fullName,
        phone: phone.e164,
        attendeeType: args.attendeeType,
        position,
        organization,
        city,
        country,
        studentId: args.studentId?.trim() || undefined,
        level: args.level?.trim() || undefined,
        programme: args.programme?.trim() || undefined,
        hall: args.hall?.trim() || undefined,
        consentComms: false,
        optedOut: existing.optedOut,
        status: "registered",
        source: "walk_in",
        checkedInAt,
        checkedInBy: staff.email,
      });
      await ctx.db.insert("auditLog", {
        actor: staff.email,
        action: "registration.walkin",
        target: String(existing._id),
        meta: "reactivated_cancelled_registration",
      });
      return {
        state: "created_and_checked_in" as const,
        attendee: {
          _id: existing._id,
          ticketCode: existing.ticketCode,
          fullName,
          phoneLast4: phone.e164.slice(-4),
          attendeeType: args.attendeeType,
          status: "registered" as const,
          checkedInAt,
          checkedInBy: staff.email,
        },
      };
    }

    let ticketCode = "";
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = generateTicketCode();
      const duplicateCode = await ctx.db
        .query("registrations")
        .withIndex("by_ticket", (q) => q.eq("ticketCode", candidate))
        .unique();
      if (!duplicateCode) { ticketCode = candidate; break; }
    }
    if (!ticketCode) throw new Error("Could not issue a ticket code. Please try again.");
    const registrationId = await ctx.db.insert("registrations", {
      eventId: event._id,
      ticketCode,
      fullName,
      phone: phone.e164,
      attendeeType: args.attendeeType,
      position,
      organization,
      city,
      country,
      studentId: args.studentId?.trim() || undefined,
      level: args.level?.trim() || undefined,
      programme: args.programme?.trim() || undefined,
      hall: args.hall?.trim() || undefined,
      consentComms: false,
      optedOut: false,
      status: "registered",
      source: "walk_in",
      checkedInAt,
      checkedInBy: staff.email,
    });
    await ctx.db.insert("auditLog", {
      actor: staff.email,
      action: "registration.walkin",
      target: String(registrationId),
    });
    return {
      state: "created_and_checked_in" as const,
      attendee: {
        _id: registrationId,
        ticketCode,
        fullName,
        phoneLast4: phone.e164.slice(-4),
        attendeeType: args.attendeeType,
        status: "registered" as const,
        checkedInAt,
        checkedInBy: staff.email,
      },
    };
  },
});

export const counts = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx, ["admin", "checkin"]);
    const event = await ctx.db
      .query("events")
      .withIndex("by_slug", (q) => q.eq("slug", EVENT_SLUG))
      .unique();
    if (!event) return { registered: 0, checkedIn: 0 };
    const [registered, checkedIn] = await Promise.all([
      ctx.db
        .query("registrations")
        .withIndex("by_event_status", (q) =>
          q.eq("eventId", event._id).eq("status", "registered")
        )
        .collect(),
      ctx.db
        .query("registrations")
        .withIndex("by_event_status_checkedIn", (q) =>
          q.eq("eventId", event._id).eq("status", "registered").gte("checkedInAt", 0)
        )
        .collect(),
    ]);
    return { registered: registered.length, checkedIn: checkedIn.length };
  },
});
