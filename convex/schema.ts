import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  events: defineTable({
    slug: v.string(),
    name: v.string(),
    theme: v.optional(v.string()),
    venue: v.string(),
    startsAt: v.number(),               // ms since epoch (UTC)
    capacity: v.optional(v.number()),
    registrationOpen: v.boolean(),
    confirmationSmsEnabled: v.boolean(),
  }).index("by_slug", ["slug"]),

  registrations: defineTable({
    eventId: v.id("events"),
    ticketCode: v.string(),             // e.g. WES-7K3M9Q, unique
    fullName: v.string(),
    phone: v.string(),                  // E.164 e.g. +233248831639
    gender: v.optional(v.string()),
    attendeeType: v.union(v.literal("student"), v.literal("staff"), v.literal("alumni"), v.literal("guest"), v.literal("executive")),
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
    optedOut: v.boolean(),
    status: v.union(v.literal("registered"), v.literal("waitlisted"), v.literal("cancelled")),
    source: v.union(v.literal("online"), v.literal("walk_in"), v.literal("admin")),
    checkedInAt: v.optional(v.number()),
    checkedInBy: v.optional(v.string()),   // staff email
  })
    .index("by_event", ["eventId"])
    .index("by_event_phone", ["eventId", "phone"])
    .index("by_ticket", ["ticketCode"])
    .index("by_event_status", ["eventId", "status"])
    .index("by_event_checkedIn", ["eventId", "checkedInAt"])
    .index("by_event_status_checkedIn", ["eventId", "status", "checkedInAt"])
    .searchIndex("search_by_name", {
      searchField: "fullName",
      filterFields: ["eventId"],
    }),

  staff: defineTable({
    userId: v.id("users"),              // the Convex Auth user, created at sign-up
    email: v.string(),                  // lowercase
    name: v.optional(v.string()),
    recoveryPhone: v.optional(v.string()), // verified E.164 phone used for login/recovery
    recoveryPhoneVerifiedAt: v.optional(v.number()),
    role: v.union(v.literal("admin"), v.literal("checkin")),
    active: v.boolean(),
    lastLoginAt: v.optional(v.number()),
  }).index("by_userId", ["userId"]).index("by_email", ["email"]).index("by_recoveryPhone", ["recoveryPhone"]),

  invites: defineTable({
    email: v.string(),                  // lowercase; the code only works for this email
    role: v.union(v.literal("admin"), v.literal("checkin")),
    codeHash: v.string(),               // SHA-256 of the code. The plain code is shown once and NEVER stored
    expiresAt: v.number(),              // now + 7 days
    usedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
    createdBy: v.string(),              // admin email, or "bootstrap"
  }).index("by_email", ["email"]).index("by_codeHash", ["codeHash"]),

  authChallenges: defineTable({
    purpose: v.union(v.literal("signup_phone"), v.literal("password_reset"), v.literal("phone_change")),
    email: v.string(),
    phone: v.string(),
    staffId: v.optional(v.id("staff")),
    salt: v.string(),
    codeHash: v.string(),
    status: v.union(v.literal("pending"), v.literal("sent"), v.literal("failed"), v.literal("verified"), v.literal("consumed")),
    attempts: v.number(),
    createdAt: v.number(),
    expiresAt: v.number(),
    verifiedAt: v.optional(v.number()),
    verificationTokenHash: v.optional(v.string()),
    verificationExpiresAt: v.optional(v.number()),
    resetReservedAt: v.optional(v.number()),
  })
    .index("by_email_purpose", ["email", "purpose"])
    .index("by_phone_purpose", ["phone", "purpose"])
    .index("by_staff_purpose", ["staffId", "purpose"]),

  campaigns: defineTable({
    eventId: v.id("events"),
    name: v.string(),
    body: v.string(),
    audience: v.union(v.literal("all_registered"), v.literal("checked_in"), v.literal("no_show"), v.literal("waitlisted")),
    total: v.number(),
    sent: v.number(),
    failed: v.number(),
    state: v.union(v.literal("queued"), v.literal("sending"), v.literal("done")),
    createdBy: v.string(),
    paginationCursor: v.optional(v.string()),
    completedAt: v.optional(v.number()),
  }).index("by_event", ["eventId"]),

  messages: defineTable({
    campaignId: v.optional(v.id("campaigns")),     // null for confirmation / ticket-resend / test SMS
    registrationId: v.optional(v.id("registrations")),
    kind: v.union(v.literal("campaign"), v.literal("confirmation"), v.literal("ticket_resend"), v.literal("test")),
    toPhone: v.string(),
    body: v.string(),
    status: v.union(v.literal("queued"), v.literal("sent"), v.literal("failed")),
    error: v.optional(v.string()),
    providerResponse: v.optional(v.string()),
  }).index("by_campaign", ["campaignId"]).index("by_status", ["status"]),

  rateLimits: defineTable({
    key: v.string(),
    count: v.number(),
    expiresAt: v.number(),
  })
    .index("by_key", ["key"])
    .index("by_expiresAt", ["expiresAt"]),

  auditLog: defineTable({
    actor: v.string(),
    action: v.string(),
    target: v.optional(v.string()),
    meta: v.optional(v.string()),
  }),
});

