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

    const registeredCount = await ctx.db
      .query("registrations")
      .withIndex("by_event_status", (q) =>
        q.eq("eventId", event._id).eq("status", "registered")
      )
      .collect();

    const spotsLeft = registeredCount.length < event.capacity;

    return {
      _id: event._id,
      slug: event.slug,
      name: event.name,
      theme: event.theme,
      venue: event.venue,
      startsAt: event.startsAt,
      capacity: event.capacity,
      registrationOpen: event.registrationOpen,
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
    capacity: v.optional(v.number()),
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

    // Filter out undefined values
    const patch: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(updates)) {
      if (val !== undefined) {
        patch[key] = val;
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
