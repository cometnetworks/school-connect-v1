import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const createOrGet = internalMutation({
  args: {
    schoolId: v.id("schools"),
    contactPhone: v.string(),
    channel: v.union(v.literal("whatsapp"), v.literal("webchat")),
    contactName: v.optional(v.string()),
    kapsoConversationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("conversations")
      .withIndex("by_phone", (q) => q.eq("contactPhone", args.contactPhone))
      .filter((q) => q.eq(q.field("schoolId"), args.schoolId))
      .first();
    if (existing) return existing._id;

    return await ctx.db.insert("conversations", {
      schoolId: args.schoolId,
      channel: args.channel,
      contactPhone: args.contactPhone,
      contactName: args.contactName,
      kapsoConversationId: args.kapsoConversationId,
      status: "new",
      lastMessageAt: Date.now(),
    });
  },
});

export const addMessage = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    direction: v.union(v.literal("inbound"), v.literal("outbound")),
    sender: v.union(
      v.literal("contact"),
      v.literal("agent"),
      v.literal("human"),
    ),
    body: v.string(),
    kapsoMessageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, { lastMessageAt: Date.now() });
    return await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      direction: args.direction,
      sender: args.sender,
      body: args.body,
      kapsoMessageId: args.kapsoMessageId,
    });
  },
});

export const updateStatus = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    status: v.union(
      v.literal("new"),
      v.literal("qualified"),
      v.literal("visit_scheduled"),
      v.literal("visited"),
      v.literal("enrolled"),
      v.literal("lost"),
    ),
    updates: v.optional(
      v.object({
        contactName: v.optional(v.string()),
        interestStudentName: v.optional(v.string()),
        interestGradeLevel: v.optional(v.string()),
        pendingSlots: v.optional(v.string()),
        lostReason: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, { conversationId, status, updates }) => {
    await ctx.db.patch(conversationId, { status, ...updates });
  },
});

/** Query pública para el panel del director */
export const getDetail = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const conversation = await ctx.db.get(conversationId);
    if (!conversation) return null;
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .order("asc")
      .collect();
    return { conversation, messages };
  },
});

export const replyAsHuman = mutation({
  args: {
    conversationId: v.id("conversations"),
    body: v.string(),
    phoneNumberId: v.string(),
  },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (!conv?.contactPhone) return;
    await ctx.db.patch(args.conversationId, { lastMessageAt: Date.now() });
    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      direction: "outbound",
      sender: "human",
      body: args.body,
    });
    await ctx.scheduler.runAfter(0, internal.external.kapso.sendText, {
      phoneNumberId: args.phoneNumberId,
      to: conv.contactPhone,
      body: args.body,
    });
  },
});

/** Marca un relay como resuelto cambiando el prefijo 📋 → 📋✅ */
export const resolveRelay = internalMutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, { messageId }) => {
    const msg = await ctx.db.get(messageId);
    if (!msg) return;
    await ctx.db.patch(messageId, {
      body: msg.body.replace("📋 SOLICITUD", "📋✅ RESUELTA"),
    });
  },
});

export const getWithHistory = internalQuery({
  args: {
    conversationId: v.id("conversations"),
    lastN: v.optional(v.number()),
  },
  handler: async (ctx, { conversationId, lastN = 20 }) => {
    const conversation = await ctx.db.get(conversationId);
    if (!conversation) return null;
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .order("desc")
      .take(lastN);
    return { conversation, messages: messages.reverse() };
  },
});

/**
 * Devuelve la conversación más reciente de la escuela que tiene
 * una nota de relay pendiente (mensaje outbound con sender "human"
 * que empiece con "📋").
 */
export const getLatestPendingRelay = internalQuery({
  args: { schoolId: v.id("schools") },
  handler: async (ctx, { schoolId }) => {
    const cutoff = Date.now() - 48 * 60 * 60 * 1000; // últimas 48 h

    // Conversaciones recientes de la escuela
    const convs = await ctx.db
      .query("conversations")
      .withIndex("by_school", (q) => q.eq("schoolId", schoolId))
      .order("desc")
      .take(20);

    for (const conv of convs) {
      if (conv.lastMessageAt < cutoff) continue;
      if (!conv.contactPhone) continue;

      // Buscar TODOS los mensajes humanos outbound de la conversación
      const humanMsgs = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
        .filter((q) =>
          q.and(
            q.eq(q.field("sender"), "human"),
            q.eq(q.field("direction"), "outbound"),
          ),
        )
        .collect();

      // Relay pendiente = existe un 📋 que NO tiene un 📋✅ más reciente
      const relayNotes = humanMsgs
        .filter((m) => m.body.startsWith("📋") && !m.body.startsWith("📋✅"))
        .sort((a, b) => b._creationTime - a._creationTime);

      if (relayNotes.length > 0) {
        return {
          conversationId: conv._id,
          contactPhone: conv.contactPhone,
          contactName: conv.contactName ?? "Padre/Madre",
          relayBody: relayNotes[0].body,
          relayMessageId: relayNotes[0]._id,
        };
      }
    }
    return null;
  },
});

/** Conteo de relays pendientes para el badge del dashboard */
export const pendingRelayCount = query({
  args: { schoolSlug: v.string() },
  handler: async (ctx, { schoolSlug }) => {
    const school = await ctx.db
      .query("schools")
      .withIndex("by_slug", (q) => q.eq("slug", schoolSlug))
      .first();
    if (!school) return 0;

    const cutoff = Date.now() - 48 * 60 * 60 * 1000;
    const convs = await ctx.db
      .query("conversations")
      .withIndex("by_school", (q) => q.eq("schoolId", school._id))
      .order("desc")
      .take(20);

    let count = 0;
    for (const conv of convs) {
      if (conv.lastMessageAt < cutoff) continue;
      const relayNote = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
        .order("desc")
        .filter((q) =>
          q.and(
            q.eq(q.field("sender"), "human"),
            q.eq(q.field("direction"), "outbound"),
          ),
        )
        .first();
      if (relayNote?.body.startsWith("📋")) count++;
    }
    return count;
  },
});
