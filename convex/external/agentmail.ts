import { internalAction } from "../_generated/server";
import { v } from "convex/values";

const AGENTMAIL_BASE = "https://api.agentmail.to/v0";
const FROM_INBOX = "schoolconnect@agentmail.to";

interface SendEmailArgs {
  to: string;
  subject: string;
  text: string;
  html: string;
}

async function sendEmail({ to, subject, text, html }: SendEmailArgs) {
  const apiKey = process.env.AGENTMAIL_API_KEY;
  if (!apiKey) throw new Error("AGENTMAIL_API_KEY not set in Convex env");

  const res = await fetch(`${AGENTMAIL_BASE}/inboxes/${FROM_INBOX}/messages/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ to: [to], subject, text, html }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`AgentMail error ${res.status}: ${body}`);
  }

  return (await res.json()) as { id: string };
}

/* ── Correo de bienvenida para la escuela ── */
export const sendWelcome = internalAction({
  args: {
    contactName: v.string(),
    schoolName: v.string(),
    email: v.string(),
  },
  handler: async (_ctx, { contactName, schoolName, email }) => {
    const subject = `¡Bienvenido a School Connect, ${schoolName}!`;

    const text = `
Hola ${contactName},

Gracias por tu interés en School Connect. Registramos a ${schoolName} en nuestra lista de acceso beta.

En los próximos días te contactaremos para agendar una llamada de onboarding y darte acceso a la plataforma.

Si tienes alguna pregunta, responde a este correo o escríbenos por WhatsApp.

El equipo de School Connect
schoolconnect.mx
`.trim();

    const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FAF7F2;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF7F2;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;border:1px solid rgba(15,110,110,0.15);overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:#0F6E6E;padding:28px 36px;text-align:center;">
            <span style="font-size:22px;font-weight:700;color:#fff;font-family:Georgia,serif;letter-spacing:-0.02em;">School Connect</span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px;">
            <p style="margin:0 0 16px;font-size:16px;color:#1A2B2B;font-weight:600;">Hola ${contactName},</p>
            <p style="margin:0 0 16px;font-size:15px;color:#4A6060;line-height:1.6;">
              Gracias por tu interés en <strong>School Connect</strong>. Registramos a <strong>${schoolName}</strong>
              en nuestra lista de acceso beta.
            </p>
            <p style="margin:0 0 24px;font-size:15px;color:#4A6060;line-height:1.6;">
              En los próximos días te contactaremos para agendar una llamada de onboarding
              y darte acceso a la plataforma.
            </p>
            <!-- CTA -->
            <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
              <tr>
                <td style="background:#0F6E6E;border-radius:99px;padding:14px 32px;">
                  <a href="https://schoolconnect.mx" style="color:#fff;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.01em;">
                    Visitar schoolconnect.mx →
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0;font-size:13px;color:#7A9090;line-height:1.6;">
              Si tienes alguna pregunta, responde a este correo y con gusto te ayudamos.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 36px;border-top:1px solid rgba(15,110,110,0.1);text-align:center;">
            <p style="margin:0;font-size:11px;color:#9BB0B0;">
              School Connect · Mérida, Yucatán, México · schoolconnect.mx
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`.trim();

    return sendEmail({ to: email, subject, text, html });
  },
});

/* ── Notificación interna a Miguel ── */
export const sendNotification = internalAction({
  args: {
    schoolName: v.string(),
    contactName: v.string(),
    contactRole: v.optional(v.string()),
    email: v.string(),
    phone: v.string(),
    studentCount: v.optional(v.number()),
    city: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const { schoolName, contactName, contactRole, email, phone, studentCount, city, notes } = args;

    const subject = `Nueva solicitud beta: ${schoolName}`;

    const lines = [
      `Escuela: ${schoolName}`,
      `Contacto: ${contactName}${contactRole ? ` (${contactRole})` : ""}`,
      `Email: ${email}`,
      `Teléfono: ${phone}`,
      studentCount != null ? `Alumnos: ${studentCount}` : null,
      city ? `Ciudad: ${city}` : null,
      notes ? `Notas: ${notes}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const text = `Nueva solicitud de acceso beta:\n\n${lines}`;

    const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:32px 20px;background:#FAF7F2;font-family:system-ui,-apple-system,sans-serif;">
  <table width="540" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid rgba(15,110,110,0.15);overflow:hidden;margin:0 auto;">
    <tr>
      <td style="background:#0F6E6E;padding:20px 28px;">
        <span style="font-size:14px;font-weight:700;color:#fff;letter-spacing:0.06em;text-transform:uppercase;">Nueva solicitud beta</span>
      </td>
    </tr>
    <tr>
      <td style="padding:28px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          ${(
            [
              ["Escuela", schoolName],
              ["Contacto", `${contactName}${contactRole ? ` <span style="color:#7A9090">(${contactRole})</span>` : ""}`],
              ["Email", `<a href="mailto:${email}" style="color:#0F6E6E;">${email}</a>`],
              ["Teléfono", `<a href="tel:${phone}" style="color:#0F6E6E;">${phone}</a>`],
              ...(studentCount != null ? [["Alumnos", String(studentCount)]] : []),
              ...(city ? [["Ciudad", city]] : []),
              ...(notes ? [["Notas", `<em>${notes}</em>`]] : []),
            ] as [string, string][]
          )
            .map(
              ([label, value]) => `
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #F0EDE8;font-size:12px;color:#7A9090;width:120px;vertical-align:top;">${label}</td>
            <td style="padding:8px 0;border-bottom:1px solid #F0EDE8;font-size:14px;color:#1A2B2B;font-weight:500;">${value}</td>
          </tr>`
            )
            .join("")}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

    return sendEmail({ to: "luismiguelcedillom@gmail.com", subject, text, html });
  },
});
