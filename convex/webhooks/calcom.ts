import { httpAction } from "../_generated/server";

type CalcomWebhookPayload = {
  triggerEvent: string;
  payload: {
    uid: string;
    status: string;
    metadata?: { source?: string };
    attendees?: Array<{ phoneNumber?: string }>;
  };
};

export const handleCalcomWebhook = httpAction(async (ctx, request) => {
  let payload: CalcomWebhookPayload;
  try {
    payload = (await request.json()) as CalcomWebhookPayload;
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const { triggerEvent, payload: data } = payload;

  // Solo nos interesan cancelaciones de bookings de School Connect
  if (data.metadata?.source === "school-connect-whatsapp") {
    // Sprint 2: notificar al padre por WhatsApp cuando se cancele/confirme.
    // Por ahora registramos el evento para trazabilidad.
    console.log(`Cal.com event: ${triggerEvent}`, {
      uid: data.uid,
      status: data.status,
      phone: data.attendees?.[0]?.phoneNumber,
    });
  }

  return new Response("ok", { status: 200 });
});
