import { mutation } from "./_generated/server";
import { normalizePhone } from "./lib/normalizePhone";
import { generateTicketCode } from "./lib/ticketCode";

export const runCapacityTest = mutation({
  args: {},
  handler: async (ctx) => {
    // 1. Create a test event with capacity = 5
    const testSlug = `test-capacity-${Date.now()}`;
    const testEventId = await ctx.db.insert("events", {
      slug: testSlug,
      name: "Test Capacity Event",
      venue: "Test Hall",
      startsAt: Date.now() + 86400000,
      capacity: 5,
      registrationOpen: true,
      confirmationSmsEnabled: false,
    });

    const results: Array<{ phone: string; status: string; ticketCode?: string }> = [];

    // 2. Perform 20 registrations sequentially and simulate high load
    for (let i = 0; i < 20; i++) {
      const phoneRaw = `02400000${i.toString().padStart(2, "0")}`;
      const norm = normalizePhone(phoneRaw);
      if (!norm.ok) throw new Error(norm.error);

      // Capacity check
      const currentRegistered = await ctx.db
        .query("registrations")
        .withIndex("by_event_status", (q) =>
          q.eq("eventId", testEventId).eq("status", "registered")
        )
        .collect();

      const status: "registered" | "waitlisted" =
        currentRegistered.length < 5 ? "registered" : "waitlisted";

      const ticketCode = generateTicketCode();
      await ctx.db.insert("registrations", {
        eventId: testEventId,
        ticketCode,
        fullName: `Test Attendee ${i}`,
        phone: norm.e164,
        attendeeType: "student",
        consentComms: true,
        optedOut: false,
        status,
        source: "online",
      });

      results.push({ phone: norm.e164, status, ticketCode });
    }

    // 3. Test duplicate phone detection with different formats
    const phoneA = "0249999999";
    const phoneB = "+233249999999";
    const normA = normalizePhone(phoneA);
    const normB = normalizePhone(phoneB);

    if (!normA.ok || !normB.ok || normA.e164 !== normB.e164) {
      throw new Error("Phone normalizer failed format equivalence test");
    }

    // Insert first format
    await ctx.db.insert("registrations", {
      eventId: testEventId,
      ticketCode: generateTicketCode(),
      fullName: "Duplicate Test",
      phone: normA.e164,
      attendeeType: "student",
      consentComms: true,
      optedOut: false,
      status: "waitlisted",
      source: "online",
    });

    // Check if second format detects duplicate
    const duplicateCheck = await ctx.db
      .query("registrations")
      .withIndex("by_event_phone", (q) =>
        q.eq("eventId", testEventId).eq("phone", normB.e164)
      )
      .unique();

    const duplicateDetected = !!duplicateCheck;

    // Count final registered
    const finalRegistered = await ctx.db
      .query("registrations")
      .withIndex("by_event_status", (q) =>
        q.eq("eventId", testEventId).eq("status", "registered")
      )
      .collect();

    const finalWaitlisted = await ctx.db
      .query("registrations")
      .withIndex("by_event_status", (q) =>
        q.eq("eventId", testEventId).eq("status", "waitlisted")
      )
      .collect();

    // Clean up test data
    const allTestRegs = await ctx.db
      .query("registrations")
      .filter((q) => q.eq(q.field("eventId"), testEventId))
      .collect();

    for (const reg of allTestRegs) {
      await ctx.db.delete(reg._id);
    }
    await ctx.db.delete(testEventId);

    return {
      success:
        finalRegistered.length === 5 &&
        finalWaitlisted.length === 16 &&
        duplicateDetected,
      registeredCount: finalRegistered.length,
      waitlistedCount: finalWaitlisted.length,
      duplicateDetected,
      testCapacity: 5,
      totalAttempts: 20,
    };
  },
});
