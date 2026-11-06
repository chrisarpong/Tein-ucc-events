import { query } from "./_generated/server";
import { requireStaff } from "./lib/auth";

export const recent = query({
  args: {},
  handler: async ctx => {
    await requireStaff(ctx, ["admin"]);
    const entries = await ctx.db.query("auditLog").order("desc").take(150);
    return entries.map(({ _id, _creationTime, actor, action, target, meta }) => ({
      _id,
      _creationTime,
      actor,
      action,
      target,
      meta,
    }));
  },
});
