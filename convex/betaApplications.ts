import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const submit = mutation({
  args: {
    schoolName: v.string(),
    contactName: v.string(),
    contactRole: v.optional(v.string()),
    email: v.string(),
    phone: v.string(),
    studentCount: v.optional(v.number()),
    city: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("betaApplications", {
      ...args,
      status: "new",
    });

    // Correo de bienvenida a la escuela
    await ctx.scheduler.runAfter(0, internal.external.agentmail.sendWelcome, {
      contactName: args.contactName,
      schoolName: args.schoolName,
      email: args.email,
    });

    // Notificación interna a Miguel
    await ctx.scheduler.runAfter(0, internal.external.agentmail.sendNotification, {
      schoolName: args.schoolName,
      contactName: args.contactName,
      contactRole: args.contactRole,
      email: args.email,
      phone: args.phone,
      studentCount: args.studentCount,
      city: args.city,
      notes: args.notes,
    });

    return id;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("betaApplications").order("desc").take(100);
  },
});
