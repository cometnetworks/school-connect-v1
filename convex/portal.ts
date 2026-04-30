import { query } from "./_generated/server";
import { v } from "convex/values";

/** Vista principal del portal de padres — datos de un alumno */
export const parentHome = query({
  args: { schoolSlug: v.string(), studentId: v.id("students") },
  handler: async (ctx, { schoolSlug, studentId }) => {
    const school = await ctx.db
      .query("schools")
      .withIndex("by_slug", (q) => q.eq("slug", schoolSlug))
      .first();
    if (!school) return null;

    const student = await ctx.db.get(studentId);
    if (!student || student.schoolId !== school._id) return null;

    const sid = school._id;

    // Avisos recientes (escuela completa + grupo del alumno)
    const sgLinks = await ctx.db
      .query("studentGroups")
      .withIndex("by_student", (q) => q.eq("studentId", studentId))
      .collect();
    const groupId = sgLinks[0]?.groupId;

    const schoolAnnouncements = await ctx.db
      .query("announcements")
      .withIndex("by_school", (q) => q.eq("schoolId", sid))
      .order("desc")
      .take(5);

    const groupAnnouncements = groupId
      ? await ctx.db
          .query("announcements")
          .withIndex("by_group", (q) => q.eq("groupId", groupId))
          .order("desc")
          .take(5)
      : [];

    const announcements = [
      ...schoolAnnouncements,
      ...groupAnnouncements,
    ]
      .filter(
        (a, i, arr) => arr.findIndex((b) => b._id === a._id) === i,
      )
      .sort((a, b) => b.publishedAt - a.publishedAt)
      .slice(0, 6);

    // Tareas próximas
    const now = Date.now();
    const assignments = groupId
      ? await ctx.db
          .query("assignments")
          .withIndex("by_group_due", (q) =>
            q.eq("groupId", groupId).gte("dueDate", now),
          )
          .order("asc")
          .take(5)
      : [];

    // Calificaciones recientes
    const grades = await ctx.db
      .query("grades")
      .withIndex("by_student", (q) => q.eq("studentId", studentId))
      .order("desc")
      .take(8);

    // Próximos eventos
    const events = await ctx.db
      .query("events")
      .withIndex("by_school_starts", (q) =>
        q.eq("schoolId", sid).gte("startsAt", now),
      )
      .order("asc")
      .take(5);

    // Colegiatura
    const invoices = await ctx.db
      .query("tuitionInvoices")
      .withIndex("by_student", (q) => q.eq("studentId", studentId))
      .order("desc")
      .take(3);

    return {
      school,
      student,
      groupId,
      announcements,
      assignments,
      grades,
      events,
      invoices,
    };
  },
});

/**
 * Devuelve el historial de mensajes de la conversación WhatsApp del padre/madre
 * asociado al alumno seleccionado en el portal.
 */
export const parentConversation = query({
  args: { schoolSlug: v.string(), studentId: v.id("students") },
  handler: async (ctx, { schoolSlug, studentId }) => {
    const school = await ctx.db
      .query("schools")
      .withIndex("by_slug", (q) => q.eq("slug", schoolSlug))
      .first();
    if (!school) return null;

    const student = await ctx.db.get(studentId);
    if (!student || student.schoolId !== school._id) return null;

    // Primer padre/madre vinculado al alumno
    const link = await ctx.db
      .query("parentStudentLinks")
      .withIndex("by_student", (q) => q.eq("studentId", studentId))
      .first();
    if (!link) return { messages: [], parentName: "" };

    const parentUser = await ctx.db.get(link.parentUserId);
    if (!parentUser?.phone) return { messages: [], parentName: parentUser?.fullName ?? "" };

    // Variantes del teléfono para tolerar formatos distintos
    const digits = parentUser.phone.replace(/\D/g, "");
    const phoneVariants = [
      parentUser.phone,
      `+${digits}`,
      digits,
      ...(digits.startsWith("52") && digits.length === 12 ? [digits.slice(2)] : []),
    ];

    let conv = null;
    for (const phone of [...new Set(phoneVariants)]) {
      conv = await ctx.db
        .query("conversations")
        .withIndex("by_phone", (q) => q.eq("contactPhone", phone))
        .filter((q) => q.eq(q.field("schoolId"), school._id))
        .first();
      if (conv) break;
    }

    if (!conv) return { messages: [], parentName: parentUser.fullName };

    const allMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
      .order("asc")
      .collect();

    // Filtrar notas internas (relays, confirmaciones de dirección)
    const messages = allMessages.filter(
      (m) =>
        !m.body.startsWith("📋") &&
        !m.body.startsWith("✅ Mensaje enviado") &&
        !m.body.startsWith("✅ Mensaje recibido"),
    );

    return { messages, parentName: parentUser.fullName };
  },
});

/** Listado de alumnos de una escuela (para seleccionar en demo) */
export const studentsBySchool = query({
  args: { schoolSlug: v.string() },
  handler: async (ctx, { schoolSlug }) => {
    const school = await ctx.db
      .query("schools")
      .withIndex("by_slug", (q) => q.eq("slug", schoolSlug))
      .first();
    if (!school) return [];
    return await ctx.db
      .query("students")
      .withIndex("by_school", (q) => q.eq("schoolId", school._id))
      .take(20);
  },
});
