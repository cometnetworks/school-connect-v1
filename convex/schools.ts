import { internalMutation, internalQuery } from "./_generated/server";
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

/** Actualiza campos de configuración de una escuela por slug */
export const patchBySlug = internalMutation({
  args: {
    slug: v.string(),
    calComEventTypeId: v.optional(v.string()),
    calComParentEventTypeId: v.optional(v.string()),
    directorPhone: v.optional(v.string()),
    whatsappPhoneNumberId: v.optional(v.string()),
  },
  handler: async (ctx, { slug, ...fields }) => {
    const school = await ctx.db
      .query("schools")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (!school) throw new Error(`School not found: ${slug}`);
    const patch: Record<string, string> = {};
    for (const [k, v] of Object.entries(fields)) {
      if (v !== undefined) patch[k] = v;
    }
    await ctx.db.patch(school._id, patch);
    return { patched: Object.keys(patch) };
  },
});

export const getById = internalQuery({
  args: { schoolId: v.id("schools") },
  handler: async (ctx, { schoolId }) => {
    return await ctx.db.get(schoolId);
  },
});
