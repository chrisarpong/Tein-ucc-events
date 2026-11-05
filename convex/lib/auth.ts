import { QueryCtx, MutationCtx } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc } from "../_generated/dataModel";

export type StaffRole = "admin" | "checkin";

export async function requireStaff(
  ctx: QueryCtx | MutationCtx,
  allowedRoles: StaffRole[] = ["admin", "checkin"]
): Promise<Doc<"staff">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Unauthorized: Authentication required");
  }

  const staff = await ctx.db
    .query("staff")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();

  if (!staff || !staff.active) {
    throw new Error("Forbidden: Active staff account required");
  }

  if (!allowedRoles.includes(staff.role)) {
    throw new Error(
      `Forbidden: Role ${staff.role} is not permitted for this action`
    );
  }

  return staff;
}

export async function getStaffMe(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"staff"> | null> {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;

  const staff = await ctx.db
    .query("staff")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();

  if (!staff || !staff.active) return null;

  return staff;
}
