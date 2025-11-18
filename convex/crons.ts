import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run cleanup every hour to remove old/abandoned rooms
crons.hourly(
  "cleanup old rooms",
  {
    minuteUTC: 0, // Run at the top of every hour
  },
  internal.cleanup.cleanupOldRooms,
);

export default crons;

