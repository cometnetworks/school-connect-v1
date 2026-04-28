import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

/**
 * Envía un aviso por WhatsApp a todos los padres del grupo (o de la escuela completa).
 */
export const notifyParents = internalAction({
  args: {
    schoolId: v.id("schools"),
    groupId: v.optional(v.id("groups")),
    title: v.string(),
    body: v.string(),
    mediaUrl: v.optional(v.string()),
  },
  handler: async (ctx, { schoolId, groupId, title, body, mediaUrl }) => {
    const school = await ctx.runQuery(internal.schools.getById, { schoolId });
    if (!school?.whatsappPhoneNumberId) return;

    const phoneNumberId = school.whatsappPhoneNumberId;

    const parents = await ctx.runQuery(internal.agent.notifier.getParentsToNotify, {
      schoolId,
      groupId,
    });

    const caption = `📢 *${school.name}*\n\n*${title}*\n\n${body}`;

    let sent = 0;
    for (const phone of parents) {
      try {
        if (mediaUrl) {
          // Enviar imagen con caption
          await ctx.runAction(internal.external.kapso.sendImage, {
            phoneNumberId,
            to: phone,
            imageUrl: mediaUrl,
            caption,
          });
        } else {
          await ctx.runAction(internal.external.kapso.sendText, {
            phoneNumberId,
            to: phone,
            body: caption,
          });
        }
        sent++;
      } catch (err) {
        console.error(`Error enviando a ${phone}:`, err);
      }
    }

    return { sent };
  },
});

import { internalQuery } from "../_generated/server";

export const getParentsToNotify = internalQuery({
  args: {
    schoolId: v.id("schools"),
    groupId: v.optional(v.id("groups")),
  },
  handler: async (ctx, { schoolId, groupId }) => {
    const phones: string[] = [];

    if (groupId) {
      // Alumnos del grupo
      const sgLinks = await ctx.db
        .query("studentGroups")
        .withIndex("by_group", (q) => q.eq("groupId", groupId))
        .collect();

      for (const sg of sgLinks) {
        const student = await ctx.db.get(sg.studentId);
        if (!student || student.schoolId !== schoolId) continue;

        // Padres del alumno
        const parentLinks = await ctx.db
          .query("parentStudentLinks")
          .withIndex("by_student", (q) => q.eq("studentId", sg.studentId))
          .collect();

        for (const pl of parentLinks) {
          const user = await ctx.db.get(pl.parentUserId);
          if (user?.phone && !phones.includes(user.phone)) {
            phones.push(user.phone);
          }
        }
      }
    } else {
      // Todos los padres de la escuela
      const students = await ctx.db
        .query("students")
        .withIndex("by_school", (q) => q.eq("schoolId", schoolId))
        .collect();

      for (const student of students) {
        const parentLinks = await ctx.db
          .query("parentStudentLinks")
          .withIndex("by_student", (q) => q.eq("studentId", student._id))
          .collect();

        for (const pl of parentLinks) {
          const user = await ctx.db.get(pl.parentUserId);
          if (user?.phone && !phones.includes(user.phone)) {
            phones.push(user.phone);
          }
        }
      }
    }

    return phones;
  },
});
