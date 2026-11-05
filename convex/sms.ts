import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";

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
