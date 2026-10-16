import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { randomHex, sha256Hex } from "../lib/session";

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

async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const handleKapsoWebhook = httpAction(async (ctx, request) => {
  const rawBody = await request.text();

  let payload: KapsoWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as KapsoWebhookPayload;
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  // Firma de Kapso: X-Webhook-Signature = HMAC-SHA256(cuerpo, secreto) en hex.
  // Sus ejemplos firman JSON.stringify(payload); probamos ambas formas.
  const webhookSecret = process.env.KAPSO_WEBHOOK_SECRET;
  let signatureVerified = false;
  if (webhookSecret) {
    const signature = (request.headers.get("x-webhook-signature") ?? "").trim().toLowerCase();
    const candidates = await Promise.all([
      hmacSha256Hex(webhookSecret, rawBody),
      hmacSha256Hex(webhookSecret, JSON.stringify(payload)),
    ]);
    signatureVerified = signature !== "" && candidates.some((c) => timingSafeEqual(c, signature));
    if (!signatureVerified) {
      console.warn(`[kapso-webhook] firma inválida (header presente: ${signature !== ""})`);
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const { message, phone_number_id, conversation: kapsoConversation } = payload;
  console.log(
    `[kapso-webhook] phone_number_id=${phone_number_id} direction=${message?.kapso?.direction} type=${message?.type} from=${message?.from?.slice(-4)}`,
  );

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

  // "portal" → link personal de acceso (solo dirección y padres registrados;
  // a un prospecto no se le intercepta y lo atiende el agente normal)
  const normalizedText = inboundText
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z ]/g, "")
    .trim();
  const wantsPortal = /^(el |mi )?(portal|panel|acceso|link del portal|entrar al portal|quiero entrar al portal)$/.test(normalizedText);
  if (wantsPortal) {
    if (!signatureVerified) {
      // Sin firma no hay garantía de que el remitente sea real
      console.warn("[kapso-webhook] link de acceso no enviado: KAPSO_WEBHOOK_SECRET no configurado");
    } else {
      const token = randomHex(32);
      const link = await ctx.runMutation(internal.auth.createMagicLink, {
        schoolId: school._id,
        phone: contactPhone,
        tokenHash: await sha256Hex(token),
      });
      if (link) {
        const appUrl = (process.env.APP_URL ?? "https://schoolconnectmx.netlify.app").replace(/\/$/, "");
        const url = `${appUrl}/acceso/${link.schoolSlug}#${token}`;
        const firstName = link.displayName.split(" ")[0];
        const body =
          link.role === "director"
            ? `🔑 Aquí está tu acceso al panel de dirección:\n${url}\n\nEl link es personal, funciona una sola vez y vence en 15 minutos.`
            : `🔑 ¡Hola, ${firstName}! Aquí está tu acceso al portal de padres:\n${url}\n\nEl link es personal, funciona una sola vez y vence en 15 minutos.`;
        await ctx.scheduler.runAfter(0, internal.external.kapso.sendText, {
          phoneNumberId: phone_number_id,
          to: contactPhone,
          body,
        });
        return new Response("ok", { status: 200 });
      }
    }
  }

  const command = inboundText.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (command === "CERRAR SESION") {
    const revoked = await ctx.runMutation(internal.auth.revokeSessionsByPhone, {
      schoolId: school._id,
      phone: contactPhone,
    });
    await ctx.scheduler.runAfter(0, internal.external.kapso.sendText, {
      phoneNumberId: phone_number_id,
      to: contactPhone,
      body: revoked > 0
        ? "🔒 Listo, cerramos todos tus accesos al portal. Para volver a entrar genera un código nuevo."
        : "No tenías sesiones abiertas en el portal.",
    });
    return new Response("ok", { status: 200 });
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
