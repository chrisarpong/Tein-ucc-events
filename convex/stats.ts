import { query } from "./_generated/server";
import { requireStaff } from "./lib/auth";

const EVENT_SLUG = "women-empowerment-summit";

export const dashboard = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx, ["admin"]);
    const event = await ctx.db
      .query("events")
      .withIndex("by_slug", (q) => q.eq("slug", EVENT_SLUG))
      .unique();
    if (!event) {
      return {
        registered: 0,
        waitlisted: 0,
        cancelled: 0,
        checkedIn: 0,
        noShows: 0,
        registrationOpen: false,
      };
    }

    const [registered, waitlisted, cancelled, checkedIn] = await Promise.all([
      ctx.db
        .query("registrations")
        .withIndex("by_event_status", (q) =>
          q.eq("eventId", event._id).eq("status", "registered")
        )
        .collect(),
      ctx.db
        .query("registrations")
        .withIndex("by_event_status", (q) =>
          q.eq("eventId", event._id).eq("status", "waitlisted")
        )
        .collect(),
      ctx.db
        .query("registrations")
        .withIndex("by_event_status", (q) =>
          q.eq("eventId", event._id).eq("status", "cancelled")
        )
        .collect(),
      ctx.db
        .query("registrations")
        .withIndex("by_event_status_checkedIn", (q) =>
          q.eq("eventId", event._id).eq("status", "registered").gte("checkedInAt", 0)
        )
        .collect(),
    ]);
    const registeredCount = registered.length;
    const waitlistedCount = waitlisted.length;
    const cancelledCount = cancelled.length;
    const checkedInCount = checkedIn.length;
    return {
      registered: registeredCount,
      waitlisted: waitlistedCount,
      cancelled: cancelledCount,
      checkedIn: checkedInCount,
      noShows: Date.now() >= event.startsAt ? Math.max(registeredCount - checkedInCount, 0) : 0,
      registrationOpen: event.registrationOpen,
    };
  },
});
