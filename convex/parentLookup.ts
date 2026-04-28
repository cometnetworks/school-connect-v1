import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * Busca si un número de teléfono es un padre/madre registrado
 * y devuelve el contexto completo de su(s) hijo(s).
 */
export const getParentContext = internalQuery({
  args: {
    schoolId: v.id("schools"),
    phone: v.string(),
  },
  handler: async (ctx, { schoolId, phone }) => {
    // Normalizar teléfono — Kapso envía sin "+", DB guarda con "+"
    // Intentamos todas las variantes para cubrir cualquier formato
    const digits = phone.replace(/\D/g, ""); // solo dígitos
    const phoneVariants: string[] = [
      phone,                          // tal como llega: "529998022013"
      `+${digits}`,                   // con +: "+529998022013"
      digits,                         // solo dígitos: "529998022013"
    ];
    // Si ya tiene prefijo país, también probar sin él
    if (digits.startsWith("52") && digits.length === 12) {
      phoneVariants.push(digits.slice(2));      // "9998022013"
      phoneVariants.push(`+52${digits.slice(2)}`); // "+529998022013" (ya está arriba pero explícito)
    }
    const uniqueVariants = [...new Set(phoneVariants)];

    let parentUser = null;
    for (const phoneVariant of uniqueVariants) {
      parentUser = await ctx.db
        .query("users")
        .withIndex("by_phone", (q) => q.eq("phone", phoneVariant))
        .first();
      if (parentUser) break;
    }

    if (!parentUser) return null;

    // Obtener hijos vinculados a este padre
    const links = await ctx.db
      .query("parentStudentLinks")
      .withIndex("by_parent", (q) => q.eq("parentUserId", parentUser!._id))
      .collect();

    if (links.length === 0) return null;

    const now = Date.now();
    const children = [];

    for (const link of links) {
      const student = await ctx.db.get(link.studentId);
      if (!student || student.schoolId !== schoolId) continue;

      // Grupo del alumno
      const sgLink = await ctx.db
        .query("studentGroups")
        .withIndex("by_student", (q) => q.eq("studentId", student._id))
        .first();
      const group = sgLink ? await ctx.db.get(sgLink.groupId) : null;

      // Tareas próximas
      const assignments = sgLink
        ? await ctx.db
            .query("assignments")
            .withIndex("by_group_due", (q) =>
              q.eq("groupId", sgLink.groupId).gte("dueDate", now),
            )
            .order("asc")
            .take(5)
        : [];

      // Calificaciones del último bimestre
      const grades = await ctx.db
        .query("grades")
        .withIndex("by_student", (q) => q.eq("studentId", student._id))
        .order("desc")
        .take(8);
      const bim2 = grades.filter((g) => g.period === "Bim 2");

      // Próximos eventos escolares
      const events = await ctx.db
        .query("events")
        .withIndex("by_school_starts", (q) =>
          q.eq("schoolId", schoolId).gte("startsAt", now),
        )
        .order("asc")
        .take(3);

      // Colegiatura
      const invoices = await ctx.db
        .query("tuitionInvoices")
        .withIndex("by_student", (q) => q.eq("studentId", student._id))
        .order("desc")
        .take(2);
      const pending = invoices.find((i) => i.status === "pending" || i.status === "overdue");

      // Avisos recientes
      const announcements = await ctx.db
        .query("announcements")
        .withIndex("by_school", (q) => q.eq("schoolId", schoolId))
        .order("desc")
        .take(3);

      children.push({
        student,
        relation: link.relation,
        group,
        assignments,
        grades: bim2,
        events,
        pendingInvoice: pending ?? null,
        announcements,
      });
    }

    if (children.length === 0) return null;

    return {
      parent: parentUser,
      children,
    };
  },
});
