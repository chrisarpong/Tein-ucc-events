import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { requireStaff } from "./lib/auth";

const BULKSMSGH_SEND_URL = "https://clientlogin.bulksmsgh.com/smsapi";

const providerError = (code: string) => {
  const messages: Record<string, string> = {
    "1002": "The SMS provider could not submit the message.",
    "1003": "The SMS account has insufficient balance.",
    "1004": "The SMS provider rejected the API key.",
    "1005": "The SMS provider rejected the recipient number.",
    "1006": "The SMS provider rejected the sender ID.",
    "1008": "The SMS provider rejected an empty message.",
    "1009": "The sender ID is not approved for this account.",
    "1010": "The SMS provider rejected the message parameters.",
  };
  return messages[code] ?? "The SMS provider returned an unrecognised response.";
};

export const getQueuedMessage = internalQuery({
  args: { messageId: v.id("messages") },
  handler: async (ctx, { messageId }) => {
    const message = await ctx.db.get(messageId);
    if (!message || message.status !== "queued") return null;
    return {
      toPhone: message.toPhone,
      body: message.body,
    };
  },
});

export const setMessageResult = internalMutation({
  args: {
    messageId: v.id("messages"),
    status: v.union(v.literal("sent"), v.literal("failed")),
    responseCode: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message || message.status !== "queued") return;
    await ctx.db.patch(args.messageId, {
      status: args.status,
      providerResponse: args.responseCode,
      error: args.error,
    });
    if (message.campaignId) {
      const campaign = await ctx.db.get(message.campaignId);
      if (campaign) {
        await ctx.db.patch(campaign._id, {
          sent: campaign.sent + (args.status === "sent" ? 1 : 0),
          failed: campaign.failed + (args.status === "failed" ? 1 : 0),
        });
      }
    }
  },
});

const audienceValidator = v.union(
  v.literal("all_registered"),
  v.literal("checked_in"),
  v.literal("no_show"),
  v.literal("waitlisted")
);
const EVENT_SLUG = "women-empowerment-summit";

export const createCampaign = mutation({
  args: { name: v.string(), body: v.string(), audience: audienceValidator },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, ["admin"]);
    if (!process.env.BULKSMSGH_API_KEY?.trim()) {
      throw new Error("The SMS API key is not configured on this Convex deployment.");
    }
    if (process.env.SMS_DRY_RUN !== "false") {
      throw new Error("Live SMS delivery is disabled. Ask the deployment owner to enable it after a provider test.");
    }
    if ((process.env.SMS_SENDER_ID?.trim() || "TEIN UCC") !== "TEIN UCC") {
      throw new Error("The configured SMS sender ID must be TEIN UCC.");
    }
    const name = args.name.trim();
    const body = args.body.trim();
    if (name.length < 2 || name.length > 80) throw new Error("Campaign name must be 2 to 80 characters.");
    if (body.length < 1 || body.length > 320) throw new Error("SMS message must be 1 to 320 characters.");
    const event = await ctx.db.query("events").withIndex("by_slug", q => q.eq("slug", EVENT_SLUG)).unique();
    if (!event) throw new Error("Event not found.");
    if (args.audience === "no_show" && Date.now() < event.startsAt) {
      throw new Error("No-show messages can be sent only after the event has started.");
    }
    const campaignId = await ctx.db.insert("campaigns", {
      eventId: event._id,
      name,
      body,
      audience: args.audience,
      total: 0,
      sent: 0,
      failed: 0,
      state: "queued",
      createdBy: staff.email,
    });
    await ctx.db.insert("auditLog", {
      actor: staff.email,
      action: "sms.campaign.create",
      target: String(campaignId),
      meta: JSON.stringify({ audience: args.audience }),
    });
    await ctx.scheduler.runAfter(0, internal.sms.dispatchCampaignBatch, { campaignId });
    return { campaignId };
  },
});

/** Processes one bounded page per mutation; delivery remains server-side and consent gated. */
export const dispatchCampaignBatch = internalMutation({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, { campaignId }) => {
    const campaign = await ctx.db.get(campaignId);
    if (!campaign || campaign.state === "done") return;
    let base = campaign.audience === "waitlisted"
      ? ctx.db.query("registrations").withIndex("by_event_status", q => q.eq("eventId", campaign.eventId).eq("status", "waitlisted"))
      : ctx.db.query("registrations").withIndex("by_event_status", q => q.eq("eventId", campaign.eventId).eq("status", "registered"));
    if (campaign.audience === "checked_in") {
      base = ctx.db.query("registrations").withIndex("by_event_status_checkedIn", q => q.eq("eventId", campaign.eventId).eq("status", "registered").gte("checkedInAt", 0));
    } else if (campaign.audience === "no_show") {
      base = base.filter(q => q.eq(q.field("checkedInAt"), undefined));
    }
    const page = await base.order("asc").paginate({
      numItems: 100,
      cursor: campaign.paginationCursor ?? null,
    });
    let queued = 0;
    for (const attendee of page.page) {
      if (!attendee.consentComms || attendee.optedOut) continue;
      const body = campaign.body.replaceAll("{{name}}", attendee.fullName.slice(0, 80));
      const messageId = await ctx.db.insert("messages", {
        campaignId,
        registrationId: attendee._id,
        kind: "campaign",
        toPhone: attendee.phone,
        body,
        status: "queued",
      });
      await ctx.scheduler.runAfter(queued * 300, internal.sms.sendQueuedMessage, { messageId });
      queued++;
    }
    await ctx.db.patch(campaignId, {
      total: campaign.total + queued,
      state: page.isDone ? "done" : "sending",
      paginationCursor: page.continueCursor,
      completedAt: page.isDone ? Date.now() : undefined,
    });
    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.sms.dispatchCampaignBatch, { campaignId });
    }
  },
});

export const listCampaigns = query({
  args: {},
  handler: async ctx => {
    await requireStaff(ctx, ["admin"]);
    const event = await ctx.db.query("events").withIndex("by_slug", q => q.eq("slug", EVENT_SLUG)).unique();
    if (!event) return [];
    return await ctx.db.query("campaigns").withIndex("by_event", q => q.eq("eventId", event._id)).order("desc").take(50);
  },
});

export const listRecentMessages = query({
  args: { campaignId: v.optional(v.id("campaigns")) },
  handler: async (ctx, { campaignId }) => {
    await requireStaff(ctx, ["admin"]);
    const messages = campaignId
      ? await ctx.db.query("messages").withIndex("by_campaign", q => q.eq("campaignId", campaignId)).order("desc").take(100)
      : await ctx.db.query("messages").order("desc").take(100);
    return messages.map(message => ({
      _id: message._id,
      kind: message.kind,
      status: message.status,
      phoneLast4: message.toPhone.slice(-4),
      body: message.body,
      error: message.error,
      createdAt: message._creationTime,
      campaignId: message.campaignId,
    }));
  },
});

export const providerStatus = query({
  args: {},
  handler: async ctx => {
    await requireStaff(ctx, ["admin"]);
    return {
      configured: Boolean(process.env.BULKSMSGH_API_KEY?.trim()),
      dryRun: process.env.SMS_DRY_RUN !== "false",
      senderId: process.env.SMS_SENDER_ID?.trim() || "TEIN UCC",
    };
  },
});

/** Sends through the BulkSMSGH dashboard endpoint. The API key stays server-side. */
export const sendQueuedMessage = internalAction({
  args: { messageId: v.id("messages") },
  handler: async (ctx, { messageId }) => {
    const message = await ctx.runQuery(internal.sms.getQueuedMessage, {
      messageId,
    });
    if (!message) return;

    const apiKey = process.env.BULKSMSGH_API_KEY?.trim();
    if (!apiKey) {
      await ctx.runMutation(internal.sms.setMessageResult, {
        messageId,
        status: "failed",
        error: "SMS provider is not configured.",
      });
      return;
    }

    if (process.env.SMS_DRY_RUN !== "false") {
      await ctx.runMutation(internal.sms.setMessageResult, {
        messageId,
        status: "failed",
        error: "SMS dry-run is enabled.",
      });
      return;
    }

    const senderId = process.env.SMS_SENDER_ID?.trim() || "TEIN UCC";
    if (senderId !== "TEIN UCC") {
      await ctx.runMutation(internal.sms.setMessageResult, {
        messageId,
        status: "failed",
        error: "SMS sender ID must be TEIN UCC.",
      });
      return;
    }

    const recipient = message.toPhone.replace(/^\+233/, "0");
    const form = new URLSearchParams({
      key: apiKey,
      to: recipient,
      msg: message.body,
      sender_id: senderId,
    });

    try {
      const response = await fetch(BULKSMSGH_SEND_URL, {
        method: "POST",
        headers: {
          Accept: "text/plain",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
        signal: AbortSignal.timeout(15_000),
      });
      const responseCode = (await response.text()).trim().slice(0, 4);

      // 1007 means the provider accepted the message for scheduled delivery.
      if (!response.ok || !["1000", "1007"].includes(responseCode)) {
        await ctx.runMutation(internal.sms.setMessageResult, {
          messageId,
          status: "failed",
          responseCode,
          error: response.ok
            ? providerError(responseCode)
            : `SMS provider HTTP error ${response.status}.`,
        });
        return;
      }

      await ctx.runMutation(internal.sms.setMessageResult, {
        messageId,
        status: "sent",
        responseCode,
      });
    } catch {
      await ctx.runMutation(internal.sms.setMessageResult, {
        messageId,
        status: "failed",
        error: "Could not connect to the SMS provider.",
      });
    }
  },
});
