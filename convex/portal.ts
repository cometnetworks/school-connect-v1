import { query } from "./_generated/server";
import { v } from "convex/values";
import { canAccessStudent, getSchoolSession } from "./lib/session";
import { phoneVariants } from "./lib/phone";
import { agentNameOf } from "./lib/agent";

/** Vista principal del portal de padres — datos de un alumno */
export const parentHome = query({
  args: { schoolSlug: v.string(), studentId: v.id("students"), sessionToken: v.string() },
  handler: async (ctx, { schoolSlug, studentId, sessionToken }) => {
    const auth = await getSchoolSession(ctx, sessionToken, schoolSlug);
    if (!auth || !(await canAccessStudent(ctx, auth.session, studentId))) return null;
    const { school } = auth;

    const student = await ctx.db.get(studentId);
    if (!student) return null;

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
      school: { _id: school._id, name: school.name, slug: school.slug, agentName: agentNameOf(school) },
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
  args: { schoolSlug: v.string(), studentId: v.id("students"), sessionToken: v.string() },
  handler: async (ctx, { schoolSlug, studentId, sessionToken }) => {
    const auth = await getSchoolSession(ctx, sessionToken, schoolSlug);
    if (!auth || !(await canAccessStudent(ctx, auth.session, studentId))) return null;
    const { school, session } = auth;

    // Un padre ve su propia conversación; dirección ve la del primer padre vinculado
    let parentUser = session.userId ? await ctx.db.get(session.userId) : null;
    if (session.role === "director") {
      const link = await ctx.db
        .query("parentStudentLinks")
        .withIndex("by_student", (q) => q.eq("studentId", studentId))
        .first();
      parentUser = link ? await ctx.db.get(link.parentUserId) : null;
    }
    if (!parentUser?.phone) return { messages: [], parentName: parentUser?.fullName ?? "" };

    let conv = null;
    for (const phone of phoneVariants(parentUser.phone)) {
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

/** Alumnos visibles para la sesión: sus hijos (padre) o toda la escuela (dirección) */
export const studentsBySchool = query({
  args: { schoolSlug: v.string(), sessionToken: v.string() },
  handler: async (ctx, { schoolSlug, sessionToken }) => {
    const auth = await getSchoolSession(ctx, sessionToken, schoolSlug);
    if (!auth) return [];
    const { school, session } = auth;

    if (session.role === "director") {
      return await ctx.db
        .query("students")
        .withIndex("by_school", (q) => q.eq("schoolId", school._id))
        .take(200);
    }
    if (!session.userId) return [];
    const links = await ctx.db
      .query("parentStudentLinks")
      .withIndex("by_parent", (q) => q.eq("parentUserId", session.userId!))
      .collect();
    const students = await Promise.all(links.map((l) => ctx.db.get(l.studentId)));
    return students.filter(
      (st): st is NonNullable<typeof st> => st !== null && st.schoolId === school._id && st.isActive,
    );
  },
});
