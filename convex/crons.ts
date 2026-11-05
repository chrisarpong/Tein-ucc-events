import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily("cleanup expired registration rate limits", { hourUTC: 3 }, internal.registrations.cleanupRateLimits, {});

export default crons;
