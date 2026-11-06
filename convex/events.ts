import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireStaff } from "./lib/auth";

export const getPublic = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const event = await ctx.db
      .query("events")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (!event) {
      return null;
    }

    let spotsLeft = true;
    if (event.capacity !== undefined) {
      const registeredCount = await ctx.db
        .query("registrations")
        .withIndex("by_event_status", (q) =>
          q.eq("eventId", event._id).eq("status", "registered")
        )
        .collect();
      spotsLeft = registeredCount.length < event.capacity;
    }

    return {
      _id: event._id,
      slug: event.slug,
      name: event.name,
      theme: event.theme,
      venue: event.venue,
      startsAt: event.startsAt,
      capacity: event.capacity,
      registrationOpen: event.registrationOpen,
      confirmationSmsEnabled: event.confirmationSmsEnabled,
      spotsLeft,
    };
  },
});

export const update = mutation({
  args: {
    eventId: v.id("events"),
    name: v.optional(v.string()),
    theme: v.optional(v.string()),
    venue: v.optional(v.string()),
    startsAt: v.optional(v.number()),
    capacity: v.optional(v.union(v.number(), v.null())),
    registrationOpen: v.optional(v.boolean()),
    confirmationSmsEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, ["admin"]);

    const { eventId, ...updates } = args;
    const existing = await ctx.db.get(eventId);
    if (!existing) {
      throw new Error("Event not found");
    }

    if (args.capacity !== undefined && args.capacity !== null && (!Number.isInteger(args.capacity) || args.capacity < 1)) {
      throw new Error("Capacity must be a whole number greater than zero, or left blank for no limit.");
    }
    if (args.name !== undefined && (args.name.trim().length < 2 || args.name.trim().length > 120)) {
      throw new Error("Event name must be between 2 and 120 characters.");
    }

    // Filter out undefined values
    const patch: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(updates)) {
      if (val !== undefined) {
        patch[key] = key === "capacity" && val === null ? undefined : val;
      }
    }

    await ctx.db.patch(eventId, patch);

    await ctx.db.insert("auditLog", {
      actor: staff.email,
      action: "event.update",
      target: existing.name,
      meta: JSON.stringify(patch),
    });

    return { success: true };
  },
});

