import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// 4:00 AM Mérida (10:00 UTC): borrar links de acceso y sesiones vencidos
crons.daily("purgar accesos vencidos", { hourUTC: 10, minuteUTC: 0 }, internal.auth.purgeExpired, {});

export default crons;
