import { internalAction } from "../_generated/server";
import { v } from "convex/values";

const KAPSO_BASE = "https://api.kapso.ai/meta/whatsapp/v24.0";

async function kapsoPost(phoneNumberId: string, apiKey: string, payload: object) {
  const res = await fetch(`${KAPSO_BASE}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Kapso send failed ${res.status}: ${text}`);
  }
  const data = (await res.json()) as { messages?: Array<{ id: string }> };
  return data.messages?.[0]?.id ?? null;
}

export const sendText = internalAction({
  args: {
    phoneNumberId: v.string(),
    to: v.string(),
    body: v.string(),
  },
  handler: async (_ctx, { phoneNumberId, to, body }) => {
    const apiKey = process.env.KAPSO_API_KEY;
    if (!apiKey) throw new Error("KAPSO_API_KEY not set in Convex env");
    return kapsoPost(phoneNumberId, apiKey, {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { body, preview_url: false },
    });
  },
});

/** Envía una imagen con caption opcional */
export const sendImage = internalAction({
  args: {
    phoneNumberId: v.string(),
    to: v.string(),
    imageUrl: v.string(),
    caption: v.optional(v.string()),
  },
  handler: async (_ctx, { phoneNumberId, to, imageUrl, caption }) => {
    const apiKey = process.env.KAPSO_API_KEY;
    if (!apiKey) throw new Error("KAPSO_API_KEY not set in Convex env");
    return kapsoPost(phoneNumberId, apiKey, {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "image",
      image: { link: imageUrl, ...(caption ? { caption } : {}) },
    });
  },
});
