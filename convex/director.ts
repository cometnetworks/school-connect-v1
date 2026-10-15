import { action, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError, v } from "convex/values";
import { getDirectorSession } from "./lib/session";

type CalBookingRaw = {
  uid: string;
  title?: string;
  start: string;
  end: string;
  status: string;
  eventTypeId: number;
  attendees?: Array<{ name: string; phoneNumber?: string; email?: string }>;
};

type CalBookingFormatted = {
  id: string;
  title: string;
  start: string;
  end: string;
  status: string;
  attendeeName: string;
  attendeePhone: string;
  eventTypeId: string;
  type: "prospect" | "parent";
};

type CalendarResult = {
  bookings: CalBookingFormatted[];
  weekStart: string;
};

/** Medianoche de la fecha YYYY-MM-DD en la zona horaria indicada, como instante UTC */
function localMidnight(ymd: string, timeZone: string): Date {
  const offsetName =
    new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" })
      .formatToParts(new Date(`${ymd}T12:00:00Z`))
      .find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const m = offsetName.match(/GMT([+-]\d{2}):?(\d{2})?/);
  const offset = m ? `${m[1]}:${m[2] ?? "00"}` : "+00:00";
  return new Date(`${ymd}T00:00:00${offset}`);
}

/**
 * Obtiene los bookings de Cal.com para la semana indicada.
 * weekOffset: 0 = semana actual, -1 = anterior, +1 = siguiente.
 */
export const fetchCalendarBookings = action({
  args: {
    schoolSlug: v.string(),
    sessionToken: v.string(),
    weekOffset: v.optional(v.number()),
  },
  handler: async (ctx, { schoolSlug, sessionToken, weekOffset = 0 }): Promise<CalendarResult> => {
    const auth = await ctx.runQuery(internal.auth.validateSession, { schoolSlug, sessionToken });
    if (auth?.role !== "director") throw new ConvexError("No autorizado");

    const school = await ctx.runQuery(internal.schools.getBySlug, { slug: schoolSlug });
    if (!school) return { bookings: [], weekStart: new Date().toISOString() };

    const eventTypeIds = (
      [school.calComEventTypeId, school.calComParentEventTypeId] as Array<string | undefined>
    ).filter((id): id is string => Boolean(id));

    if (eventTypeIds.length === 0) {
      return { bookings: [], weekStart: new Date().toISOString() };
    }

    // Lunes de la semana objetivo en la zona horaria de la escuela
    // (Convex corre en UTC; sin esto la semana se recorre un día en México)
    const timeZone = school.timezone || "America/Merida";
    const todayLocal = new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date()); // YYYY-MM-DD
    const todayNoon = new Date(`${todayLocal}T12:00:00Z`);
    const dayOfWeek = todayNoon.getUTCDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    todayNoon.setUTCDate(todayNoon.getUTCDate() + diffToMonday + weekOffset * 7);
    const monday = localMidnight(todayNoon.toISOString().slice(0, 10), timeZone);
    const sunday = new Date(monday.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);

    try {
      const raw = (await ctx.runAction(internal.external.calcom.getBookings, {
        eventTypeIds,
        afterStart: monday.toISOString(),
        beforeEnd: sunday.toISOString(),
      })) as CalBookingRaw[];

      const bookings: CalBookingFormatted[] = raw
        .filter((b) => b.status !== "cancelled")
        .map((b) => ({
          id: b.uid,
          title: b.title ?? "",
          start: b.start,
          end: b.end,
          status: b.status,
          attendeeName: b.attendees?.[0]?.name ?? "Sin nombre",
          attendeePhone: b.attendees?.[0]?.phoneNumber ?? "",
          eventTypeId: String(b.eventTypeId),
          type: (String(b.eventTypeId) === school.calComEventTypeId
            ? "prospect"
            : "parent") as "prospect" | "parent",
        }));

      return { bookings, weekStart: monday.toISOString() };
    } catch (err) {
      console.error("[calendar] fetchCalendarBookings error:", err);
      return { bookings: [], weekStart: monday.toISOString() };
    }
  },
});

/** Resumen ejecutivo para el panel del director */
export const summary = query({
  args: { schoolSlug: v.string(), sessionToken: v.string() },
  handler: async (ctx, { schoolSlug, sessionToken }) => {
    const auth = await getDirectorSession(ctx, sessionToken, schoolSlug);
    if (!auth) return null;
    const { school } = auth;

    const sid = school._id;

    const convs = await ctx.db
      .query("conversations")
      .withIndex("by_school", (q) => q.eq("schoolId", sid))
      .collect();

    // Excluir conversaciones de la directora de los KPIs
    const admissionConvs = convs.filter((c) => c.type !== "director" && c.type !== "parent");

    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    const newLeads = admissionConvs.filter((c) => c.status === "new").length;
    const qualified = admissionConvs.filter((c) => c.status === "qualified").length;
    const visitScheduled = admissionConvs.filter(
      (c) => c.status === "visit_scheduled",
    ).length;
    const enrolled = admissionConvs.filter((c) => c.status === "enrolled").length;
    const thisWeek = convs.filter((c) => c.lastMessageAt >= weekAgo && c.type !== "director").length;

    const visits = await ctx.db
      .query("visits")
      .withIndex("by_school_date", (q) =>
        q.eq("schoolId", sid).gte("scheduledAt", now),
      )
      .order("asc")
      .take(5);

    const recent = await ctx.db
      .query("conversations")
      .withIndex("by_school", (q) => q.eq("schoolId", sid))
      .order("desc")
      .take(8);

    const recentAnnouncements = await ctx.db
      .query("announcements")
      .withIndex("by_school", (q) => q.eq("schoolId", sid))
      .order("desc")
      .take(3);

    return {
      school,
      kpis: { newLeads, qualified, visitScheduled, enrolled, thisWeek, total: convs.length },
      upcomingVisits: visits,
      recentConversations: recent,
      recentAnnouncements,
    };
  },
});

/** Pipeline de admisiones (prospectos únicamente) */
export const pipeline = query({
  args: { schoolSlug: v.string(), sessionToken: v.string() },
  handler: async (ctx, { schoolSlug, sessionToken }) => {
    const auth = await getDirectorSession(ctx, sessionToken, schoolSlug);
    if (!auth) return null;
    const { school } = auth;

    const convs = await ctx.db
      .query("conversations")
      .withIndex("by_school", (q) => q.eq("schoolId", school._id))
      .order("desc")
      .collect();

    // Solo prospectos de admisiones (excluir padres y directora)
    return convs.filter((c) => c.type !== "parent" && c.type !== "director");
  },
});

/** Mensajes de padres de familia */
export const parentMessages = query({
  args: { schoolSlug: v.string(), sessionToken: v.string() },
  handler: async (ctx, { schoolSlug, sessionToken }) => {
    const auth = await getDirectorSession(ctx, sessionToken, schoolSlug);
    if (!auth) return null;
    const { school } = auth;

    const convs = await ctx.db
      .query("conversations")
      .withIndex("by_school", (q) => q.eq("schoolId", school._id))
      .order("desc")
      .collect();

    return convs.filter((c) => c.type === "parent");
  },
});
