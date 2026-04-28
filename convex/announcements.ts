import { mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

/** Publica un aviso y notifica a los padres por WhatsApp si sendViaWhatsapp=true */
export const publish = mutation({
  args: {
    schoolId: v.id("schools"),
    groupId: v.optional(v.id("groups")),
    authorUserId: v.optional(v.id("users")),
    title: v.string(),
    body: v.string(),
    sendViaWhatsapp: v.boolean(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("announcements", {
      ...args,
      publishedAt: Date.now(),
    });

    if (args.sendViaWhatsapp) {
      await ctx.scheduler.runAfter(0, internal.agent.notifier.notifyParents, {
        schoolId: args.schoolId,
        groupId: args.groupId,
        title: args.title,
        body: args.body,
      });
    }

    return id;
  },
});
