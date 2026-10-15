import { internalQuery, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError, v } from "convex/values";
import { getSessionByToken } from "./lib/session";

/** Genera una URL firmada para subir un archivo a Convex Storage */
export const generateUploadUrl = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const session = await getSessionByToken(ctx, sessionToken);
    if (session?.role !== "director") throw new ConvexError("No autorizado");
    return await ctx.storage.generateUploadUrl();
  },
});

/** Devuelve la URL pública de un archivo en Convex Storage */
export const getFileUrl = internalQuery({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    return await ctx.storage.getUrl(storageId);
  },
});

/** Publica un aviso y notifica a los padres por WhatsApp si sendViaWhatsapp=true */
export const publish = mutation({
  args: {
    sessionToken: v.string(),
    groupId: v.optional(v.id("groups")),
    title: v.string(),
    body: v.string(),
    sendViaWhatsapp: v.boolean(),
    mediaStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, { sessionToken, ...fields }) => {
    const session = await getSessionByToken(ctx, sessionToken);
    if (session?.role !== "director") throw new ConvexError("No autorizado");
    if (fields.groupId) {
      const group = await ctx.db.get(fields.groupId);
      if (group?.schoolId !== session.schoolId) throw new ConvexError("Grupo inválido");
    }
    const args = { ...fields, schoolId: session.schoolId, authorUserId: session.userId };
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
