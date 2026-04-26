import { httpRouter } from "convex/server";
import { handleKapsoWebhook } from "./webhooks/kapso";
import { handleCalcomWebhook } from "./webhooks/calcom";

const http = httpRouter();

/**
 * Webhook de Kapso (WhatsApp inbound)
 * URL a configurar en Kapso dashboard:
 *   https://scrupulous-retriever-232.convex.site/webhooks/kapso
 */
http.route({
  path: "/webhooks/kapso",
  method: "POST",
  handler: handleKapsoWebhook,
});

/**
 * Webhook de Cal.com (confirmaciones / cancelaciones)
 * URL a configurar en Cal.com settings → Webhooks:
 *   https://scrupulous-retriever-232.convex.site/webhooks/calcom
 */
http.route({
  path: "/webhooks/calcom",
  method: "POST",
  handler: handleCalcomWebhook,
});

export default http;
