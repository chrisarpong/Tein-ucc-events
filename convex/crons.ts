import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily("cleanup expired registration rate limits", { hourUTC: 3 }, internal.registrations.cleanupRateLimits, {});
crons.daily("cleanup expired authentication recovery challenges", { hourUTC: 3 }, internal.recovery.cleanupChallenges, {});

export default crons;
