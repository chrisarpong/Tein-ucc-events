import { query } from "./_generated/server";
import { getStaffMe } from "./lib/auth";

export const me = query({
  args: {},
  handler: async (ctx) => {
    const staff = await getStaffMe(ctx);
    if (!staff) {
      return null;
    }
    return {
      _id: staff._id,
      email: staff.email,
      name: staff.name,
      role: staff.role,
      active: staff.active,
    };
  },
});
