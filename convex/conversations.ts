import { internalMutation, internalQuery } from "./_generated/server";
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
