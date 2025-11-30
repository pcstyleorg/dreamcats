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

// Run AFK advancement check every 10 seconds to catch stalled peeking phases
crons.interval(
  "auto-advance AFK players during peeking",
  { seconds: 10 },
  internal.cleanup.autoAdvanceAFKPeeking,
);

export default crons;

