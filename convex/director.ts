import { action, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

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

/**
 * Obtiene los bookings de Cal.com para la semana indicada.
 * weekOffset: 0 = semana actual, -1 = anterior, +1 = siguiente.
 */
export const fetchCalendarBookings = action({
  args: {
    schoolSlug: v.string(),
    weekOffset: v.optional(v.number()),
  },
  handler: async (ctx, { schoolSlug, weekOffset = 0 }): Promise<CalendarResult> => {
    const school = await ctx.runQuery(internal.schools.getBySlug, { slug: schoolSlug });
    if (!school) return { bookings: [], weekStart: new Date().toISOString() };

    const eventTypeIds = (
      [school.calComEventTypeId, school.calComParentEventTypeId] as Array<string | undefined>
    ).filter((id): id is string => Boolean(id));

    if (eventTypeIds.length === 0) {
      return { bookings: [], weekStart: new Date().toISOString() };
    }

    // Calcular lunes de la semana objetivo
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(monday.getDate() + diffToMonday + weekOffset * 7);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

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
  args: { schoolSlug: v.string() },
  handler: async (ctx, { schoolSlug }) => {
    const school = await ctx.db
      .query("schools")
      .withIndex("by_slug", (q) => q.eq("slug", schoolSlug))
      .first();
    if (!school) return null;

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
  args: { schoolSlug: v.string() },
  handler: async (ctx, { schoolSlug }) => {
    const school = await ctx.db
      .query("schools")
      .withIndex("by_slug", (q) => q.eq("slug", schoolSlug))
      .first();
    if (!school) return null;

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
  args: { schoolSlug: v.string() },
  handler: async (ctx, { schoolSlug }) => {
    const school = await ctx.db
      .query("schools")
      .withIndex("by_slug", (q) => q.eq("slug", schoolSlug))
      .first();
    if (!school) return null;

    const convs = await ctx.db
      .query("conversations")
      .withIndex("by_school", (q) => q.eq("schoolId", school._id))
      .order("desc")
      .collect();

    return convs.filter((c) => c.type === "parent");
  },
});
