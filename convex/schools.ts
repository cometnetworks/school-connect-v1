import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const getByWhatsappPhoneNumberId = internalQuery({
  args: { phoneNumberId: v.string() },
  handler: async (ctx, { phoneNumberId }) => {
    return await ctx.db
      .query("schools")
      .filter((q) => q.eq(q.field("whatsappPhoneNumberId"), phoneNumberId))
      .first();
  },
});

export const getById = internalQuery({
  args: { schoolId: v.id("schools") },
  handler: async (ctx, { schoolId }) => {
    return await ctx.db.get(schoolId);
  },
});
