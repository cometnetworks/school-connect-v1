import { query } from "./_generated/server";
import { v } from "convex/values";

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
