import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";

type KapsoMessage = {
  id: string;
  type: string;
  from: string;
  kapso: {
    direction: string;
    content: string;
    has_media: boolean;
    transcript?: { text: string };
  };
};

type KapsoWebhookPayload = {
  message?: KapsoMessage;
  phone_number_id?: string;
  conversation?: {
    id: string;
    kapso?: { contact_name?: string };
  };
  is_new_conversation?: boolean;
};

export const handleKapsoWebhook = httpAction(async (ctx, request) => {
  // Verificación de firma Kapso (cuando tengan el webhook secret configurado)
  const webhookSecret = process.env.KAPSO_WEBHOOK_SECRET;
  if (webhookSecret) {
    const signature = request.headers.get("x-kapso-signature") ?? "";
    if (!signature || signature !== webhookSecret) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  let payload: KapsoWebhookPayload;
  try {
    payload = (await request.json()) as KapsoWebhookPayload;
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const { message, phone_number_id, conversation: kapsoConversation } = payload;

  // Solo procesamos mensajes inbound de texto/audio/imagen
  if (
    !message ||
    !phone_number_id ||
    message.kapso.direction !== "inbound"
  ) {
    return new Response("ok");
  }

  const inboundText = message.kapso.content?.trim();
  if (!inboundText) return new Response("ok");

  const contactPhone = message.from;
  const contactName = kapsoConversation?.kapso?.contact_name;

  // Busca la escuela por phone_number_id
  const school = await ctx.runQuery(
    internal.schools.getByWhatsappPhoneNumberId,
    { phoneNumberId: phone_number_id },
  );

  if (!school) {
    console.warn(`No school found for phone_number_id: ${phone_number_id}`);
    return new Response("ok");
  }

  // Crea o recupera la conversación en Convex
  const conversationId = await ctx.runMutation(
    internal.conversations.createOrGet,
    {
      schoolId: school._id,
      contactPhone,
      channel: "whatsapp",
      contactName,
      kapsoConversationId: kapsoConversation?.id,
    },
  );

  // Guarda el mensaje inbound
  await ctx.runMutation(internal.conversations.addMessage, {
    conversationId,
    direction: "inbound",
    sender: "contact",
    body: inboundText,
    kapsoMessageId: message.id,
  });

  // Dispara el agente IA de forma async (no bloquea la respuesta del webhook)
  await ctx.scheduler.runAfter(0, internal.agent.admissions.processMessage, {
    conversationId,
    schoolId: school._id,
    phoneNumberId: phone_number_id,
    contactPhone,
    inboundText,
  });

  return new Response("ok", { status: 200 });
});
