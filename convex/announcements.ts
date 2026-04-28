import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

/** Genera una URL firmada para subir un archivo a Convex Storage */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/** Devuelve la URL pública de un archivo en Convex Storage */
export const getFileUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    return await ctx.storage.getUrl(storageId);
  },
});

/** Publica un aviso y notifica a los padres por WhatsApp si sendViaWhatsapp=true */
export const publish = mutation({
  args: {
    schoolId: v.id("schools"),
    groupId: v.optional(v.id("groups")),
    authorUserId: v.optional(v.id("users")),
    title: v.string(),
    body: v.string(),
    sendViaWhatsapp: v.boolean(),
    mediaStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("announcements", {
      ...args,
      publishedAt: Date.now(),
    });

    if (args.sendViaWhatsapp) {
      // Obtener URL pública de la imagen si existe
      let mediaUrl: string | undefined;
      if (args.mediaStorageId) {
        mediaUrl = (await ctx.storage.getUrl(args.mediaStorageId)) ?? undefined;
      }

      await ctx.scheduler.runAfter(0, internal.agent.notifier.notifyParents, {
        schoolId: args.schoolId,
        groupId: args.groupId,
        title: args.title,
        body: args.body,
        mediaUrl,
      });
    }

    return id;
  },
});
