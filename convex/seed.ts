import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const WES_SLUG = "women-empowerment-summit";

export const seedEvent = mutation({
  args: {
    capacity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Saturday, 7 November 2026, 9:00 AM UTC
    const startsAt = new Date("2026-11-07T09:00:00Z").getTime();
    const capacity = args.capacity ?? 500;

    const existing = await ctx.db
      .query("events")
      .withIndex("by_slug", (q) => q.eq("slug", WES_SLUG))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: "Women Empowerment Summit",
        theme:
          "Empowered Women, Transformed Futures: Building Women for Leadership, Economic Independence and National Development",
        venue: "SGS Auditorium, University of Cape Coast",
        startsAt,
        capacity,
        registrationOpen: true,
      });
      return { eventId: existing._id, action: "updated" };
    }

    const eventId = await ctx.db.insert("events", {
      slug: WES_SLUG,
      name: "Women Empowerment Summit",
      theme:
        "Empowered Women, Transformed Futures: Building Women for Leadership, Economic Independence and National Development",
      venue: "SGS Auditorium, University of Cape Coast",
      startsAt,
      capacity,
      registrationOpen: true,
      confirmationSmsEnabled: false,
    });

    return { eventId, action: "created" };
  },
});

