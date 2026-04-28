import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const getByWhatsappPhoneNumberId = internalQuery({
  args: { phoneNumberId: v.string() },
  handler: async (ctx, { phoneNumberId }) => {
    return await ctx.db
      .query("schools")
      .withIndex("by_whatsapp_phone", (q) => q.eq("whatsappPhoneNumberId", phoneNumberId))
      .first();
  },
});

export const getById = internalQuery({
  args: { schoolId: v.id("schools") },
  handler: async (ctx, { schoolId }) => {
    return await ctx.db.get(schoolId);
  },
});
