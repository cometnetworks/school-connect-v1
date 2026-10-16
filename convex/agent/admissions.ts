import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { buildAdmissionsSystemPrompt, buildParentSystemPrompt, buildSlotsMessage } from "./prompts";
import type { SlotOption } from "../external/calcom";
import { samePhone } from "../lib/phone";

type AgentResponse = {
  text: string;
  intent: "reply" | "show_availability" | "book_slot" | "escalate";
  contact_name: string | null;
  student_name: string | null;
  grade_level: string | null;
  slot_iso: string | null;
};

type Message = {
  direction: "inbound" | "outbound";
  sender: "contact" | "agent" | "human";
  body: string;
};

async function callLLMRaw(
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  maxTokens = 768,
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.LLM_MODEL_PRIMARY ?? "claude-haiku-4-5-20251001";
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const request = () =>
    fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        system: systemPrompt,
        messages,
        temperature: 0.1,
        max_tokens: maxTokens,
      }),
    });

  let res = await request();
  // Un reintento ante saturación o error temporal (429 / 5xx / 529)
  if (res.status === 429 || res.status >= 500) {
    console.warn(`[LLM] Anthropic HTTP ${res.status}, reintentando...`);
    await new Promise((r) => setTimeout(r, 1500));
    res = await request();
  }

  if (!res.ok) {
    const text = await res.text();
    console.error(`[LLM] Anthropic HTTP ${res.status}:`, text);
    throw new Error(`Anthropic error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as {
    content: Array<{ type: string; text: string }>;
    stop_reason?: string;
  };

  // Log stop_reason para detectar truncaciones
  if (data.stop_reason && data.stop_reason !== "end_turn") {
    console.warn(`[LLM] stop_reason=${data.stop_reason} (maxTokens=${maxTokens})`);
  }

  let cleaned = (data.content[0]?.text ?? "{}").trim();
  console.log("[LLM] raw response:", cleaned.slice(0, 500));

  // 1. Si hay bloque de código, extraer solo el contenido
  if (cleaned.includes("```")) {
    const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      cleaned = match[1].trim();
    } else {
      // bloque sin cierre — quitar solo la apertura
      cleaned = cleaned.replace(/^```(?:json)?\n?/, "").trim();
    }
  }

  // 2. Extraer el objeto JSON aunque haya texto antes/después
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }

  console.log("[LLM] cleaned JSON:", cleaned.slice(0, 300));
  return cleaned;
}

async function callLLM(
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<AgentResponse> {
  let cleaned: string | null = null;
  try {
    cleaned = await callLLMRaw(systemPrompt, messages);
    return JSON.parse(cleaned) as AgentResponse;
  } catch {
    // El modelo a veces contesta un saludo en texto plano en vez de JSON: es válido
    if (cleaned && !cleaned.trimStart().startsWith("{") && cleaned.trim().length > 1) {
      console.warn("[LLM] respuesta sin JSON, se usa como texto");
      return {
        text: cleaned.trim(),
        intent: "reply",
        contact_name: null,
        student_name: null,
        grade_level: null,
        slot_iso: null,
      };
    }
    return {
      text: "Disculpa, en este momento tengo un problema técnico. Por favor escribe en unos minutos.",
      intent: "reply",
      contact_name: null,
      student_name: null,
      grade_level: null,
      slot_iso: null,
    };
  }
}

export const processMessage = internalAction({
  args: {
    conversationId: v.id("conversations"),
    schoolId: v.id("schools"),
    phoneNumberId: v.string(),
    contactPhone: v.string(),
    inboundText: v.string(),
  },
  handler: async (ctx, args) => {
    const [schoolData, historyData, parentCtx] = await Promise.all([
      ctx.runQuery(internal.schools.getById, { schoolId: args.schoolId }),
      ctx.runQuery(internal.conversations.getWithHistory, {
        conversationId: args.conversationId,
        lastN: 10,
      }),
      ctx.runQuery(internal.parentLookup.getParentContext, {
        schoolId: args.schoolId,
        phone: args.contactPhone,
      }),
    ]);

    if (!schoolData || !historyData) return;

    const today = new Date().toLocaleDateString("es-MX", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "America/Merida",
    });

    // ── Personal escolar (dirección o maestra): responde solicitudes de padres ──
    // Cada solicitud se guarda como nota "📋 SOLICITUD PARA <destinatario>" en la
    // conversación del padre; quien la recibe contesta y Aurora se la reenvía.
    let staff: { kind: "director" | "teacher"; name: string; relayTarget: string } | null = null;
    if (schoolData.directorPhone && samePhone(schoolData.directorPhone, args.contactPhone)) {
      staff = { kind: "director", name: "Dirección", relayTarget: "DIRECCIÓN" };
    } else if (!parentCtx) {
      const teacher = await ctx.runQuery(internal.parentLookup.getTeacherByPhone, {
        schoolId: args.schoolId,
        phone: args.contactPhone,
      });
      if (teacher) staff = { kind: "teacher", name: teacher.fullName, relayTarget: teacher.fullName };
    }

    if (staff) {
      const send = async (conversationId: typeof args.conversationId, to: string, body: string, sender: "agent" | "human") => {
        await ctx.runMutation(internal.conversations.addMessage, { conversationId, direction: "outbound", sender, body });
        await ctx.runAction(internal.external.kapso.sendText, { phoneNumberId: args.phoneNumberId, to, body });
      };

      // Marcar tipo en segundo plano — no bloquea si falla
      ctx.runMutation(internal.conversations.setType, {
        conversationId: args.conversationId,
        type: staff.kind,
        contactName: staff.kind === "teacher" ? staff.name : undefined,
      }).catch((e) => console.error("[staff-mode] setType error:", e));

      const pendingRelay = await ctx.runQuery(internal.conversations.getLatestPendingRelay, {
        schoolId: args.schoolId,
        relayTarget: staff.relayTarget,
      });

      if (!pendingRelay) {
        const ackBody =
          staff.kind === "director"
            ? "✅ Mensaje recibido. Para ver prospectos, citas y mensajes de padres, escribe *portal* y te mando tu acceso al panel de dirección."
            : `👋 Hola, ${staff.name}. Soy Aurora, la asistente de ${schoolData.name}. Cuando un papá o mamá de tu grupo quiera hablar contigo, te llegará su mensaje por aquí y podrás contestarle directamente.`;
        await send(args.conversationId, args.contactPhone, ackBody, "agent");
        return;
      }

      // ¿Ya se le mostró ESTA solicitud? (aviso con "Escribe tu respuesta" posterior a la nota)
      const staffHistory = historyData.messages as Array<Message & { _creationTime: number }>;
      const alreadyPrompted = staffHistory.some(
        (m) =>
          m.direction === "outbound" &&
          m.body.includes("Escribe tu respuesta") &&
          m._creationTime >= pendingRelay.relayCreatedAt,
      );
      console.log(`[staff-mode] ${staff.kind} alreadyPrompted=${alreadyPrompted} relay=${pendingRelay.contactName}`);

      if (!alreadyPrompted) {
        // Paso 1: mostrar la solicitud pendiente, no reenviar todavía
        const summary =
          `📋 *Solicitud de ${pendingRelay.contactName}:*\n\n` +
          `${pendingRelay.relayBody.replace(`📋 SOLICITUD PARA ${staff.relayTarget}\n`, "").trim()}\n\n` +
          `Escribe tu respuesta y te la enviamos automáticamente a ${pendingRelay.contactName}.`;
        await send(args.conversationId, args.contactPhone, summary, "agent");
        return;
      }

      // Paso 2: pulir la nota con el LLM antes de enviarla al padre
      const author = staff.kind === "director" ? "La directora" : `La maestra (${staff.name})`;
      const polishPrompt = `Eres el asistente de comunicación de ${schoolData.name}.
${author} te manda una nota informal y debes convertirla en un mensaje cálido y profesional para el padre/madre de familia.

Contexto del relay original:
${pendingRelay.relayBody}

Nombre del padre/madre: ${pendingRelay.contactName}

Nota original (texto crudo, puede ser incompleto o informal):
"${args.inboundText}"

Escribe UN mensaje directo al padre/madre en español mexicano, cálido, breve (máx 60 palabras).
- Usa su nombre
- Refleja la intención de la nota aunque el texto sea incompleto
- NO uses comillas, NO expliques que es un mensaje reenviado, escríbelo en primera persona de quien responde
- Solo devuelve el mensaje final, sin JSON ni explicaciones`;

      let polishedText: string;
      try {
        // La API exige al menos un mensaje; el contexto completo va en el system prompt
        polishedText = await callLLMRaw(polishPrompt, [{ role: "user", content: "Escribe el mensaje final." }], 256);
        // Si el LLM devuelve JSON o texto raro, usar el texto crudo como fallback
        if (polishedText.startsWith("{") || polishedText.length < 5) {
          throw new Error("respuesta inesperada");
        }
      } catch {
        polishedText = args.inboundText;
      }

      const from = staff.kind === "director" ? "Dirección" : staff.name;
      await send(pendingRelay.conversationId, pendingRelay.contactPhone, `📩 *Respuesta de ${from}:*\n\n${polishedText}`, "human");

      // Marcar relay como resuelto (cambia 📋 → 📋✅)
      await ctx.runMutation(internal.conversations.resolveRelay, { messageId: pendingRelay.relayMessageId });

      await send(args.conversationId, args.contactPhone, `✅ Mensaje enviado a ${pendingRelay.contactName}.`, "agent");
      return;
    }

    // ── Modo padre: número registrado como papá/mamá ─────────────────
    if (parentCtx) {
      const parentName = parentCtx.parent.fullName ?? "Papá/Mamá";
      // Marcar tipo en segundo plano — no bloquea si falla
      ctx.runMutation(internal.conversations.setType, {
        conversationId: args.conversationId,
        type: "parent",
        contactName: parentCtx.parent.fullName ?? undefined,
      }).catch((e) => console.error("[parent-mode] setType error:", e));
      const systemPrompt = buildParentSystemPrompt(
        schoolData,
        parentName,
        parentCtx.children,
        today,
      );

      // Limpiar historial para modo padre:
      // - Excluir mensajes de error técnico
      // - Excluir respuestas del agente en modo admisiones (confunden al LLM)
      const NOISE_PATTERNS = [
        "Disculpa, tengo un problema técnico",
        "agente de admisiones",
        "Yo soy el agente",
        "soy el agente de admisiones",
      ];
      const llmMessages: Array<{ role: "user" | "assistant"; content: string }> =
        (historyData.messages as Message[])
          .filter((m) => {
            if (m.direction === "outbound" && m.sender === "agent") {
              return !NOISE_PATTERNS.some((p) => m.body.includes(p));
            }
            return true;
          })
          .map((m) => ({
            role: m.direction === "inbound" ? "user" : "assistant",
            content: m.body,
          }));

      console.log("[parent-mode] parentName:", parentName, "| historyMsgs:", historyData.messages.length, "| llmMsgs:", llmMessages.length);
      let parentReply: {
        text: string;
        intent: string;
        relay_message: string | null;
        relay_to?: "maestra" | "direccion" | null;
        slot_iso?: string | null;
      };
      let raw: string | null = null;
      try {
        raw = await callLLMRaw(systemPrompt, llmMessages, 2048);
        parentReply = JSON.parse(raw);
      } catch (err) {
        if (raw && !raw.trimStart().startsWith("{") && raw.trim().length > 1) {
          // Respuesta en texto plano: válida como respuesta normal
          console.warn("[parent-mode] respuesta sin JSON, se usa como texto");
          parentReply = { text: raw.trim(), intent: "reply", relay_message: null };
        } else {
          console.error("[parent-mode] JSON parse / LLM error:", err, "| systemPromptLen:", systemPrompt.length);
          parentReply = {
            text: "Disculpa, tengo un problema técnico. Intenta de nuevo en un momento.",
            intent: "reply",
            relay_message: null,
          };
        }
      }

      // ── Cal.com: cita presencial en modo padre ────────────────────────
      if (parentReply.intent === "show_availability") {
        const eventTypeId = schoolData.calComParentEventTypeId ?? schoolData.calComEventTypeId;
        if (eventTypeId) {
          let slots: SlotOption[] = [];
          try {
            slots = await ctx.runAction(internal.external.calcom.getAvailableSlots, {
              eventTypeId,
            });
          } catch (err) {
            console.error("[parent-cal] getAvailableSlots error:", err);
          }
          parentReply.text = buildSlotsMessage(slots);
          // Guardar slots para el siguiente turno
          await ctx.runMutation(internal.conversations.updateStatus, {
            conversationId: args.conversationId,
            status: historyData.conversation.status,
            updates: { pendingSlots: JSON.stringify(slots) },
          });
        } else {
          parentReply.text =
            "Con gusto agenda una cita. Déjame revisar los horarios disponibles y te escribo en un momento.";
          parentReply.intent = "reply";
        }
      }

      if (parentReply.intent === "book_slot" && parentReply.slot_iso) {
        const eventTypeId = schoolData.calComParentEventTypeId ?? schoolData.calComEventTypeId;
        if (eventTypeId) {
          try {
            await ctx.runAction(internal.external.calcom.createBooking, {
              eventTypeId,
              startTime: parentReply.slot_iso,
              name: parentCtx.parent.fullName ?? "Padre/Madre",
              phone: args.contactPhone,
              notes: `Portal de padres — ${parentCtx.children[0]?.student.fullName ?? ""}`,
            });
            await ctx.runMutation(internal.conversations.updateStatus, {
              conversationId: args.conversationId,
              status: historyData.conversation.status,
              updates: { pendingSlots: undefined },
            });
          } catch (err) {
            console.error("[parent-cal] createBooking error:", err);
            parentReply.text =
              "Tuve un problema al confirmar la cita. Por favor inténtalo de nuevo.";
            parentReply.intent = "reply";
          }
        }
      }

      // Guardar respuesta al padre
      await ctx.runMutation(internal.conversations.addMessage, {
        conversationId: args.conversationId,
        direction: "outbound",
        sender: "agent",
        body: parentReply.text,
      });

      // Solicitud para la maestra o para dirección: guardar nota + notificar por WhatsApp
      if (parentReply.intent === "relay_teacher" && parentReply.relay_message) {
        const parentName = parentCtx.parent.fullName ?? "Papá/Mamá";
        const child = parentCtx.children[0];
        const childName = child?.student.fullName ?? "";
        const teacher = child?.teacher;
        // A la maestra solo si el padre lo pidió y tiene WhatsApp registrado; si no, a dirección
        const toTeacher = parentReply.relay_to === "maestra" && Boolean(teacher?.phone);
        const recipient = toTeacher
          ? { relayTarget: teacher!.fullName, phone: teacher!.phone!, contactName: teacher!.fullName, label: teacher!.fullName }
          : schoolData.directorPhone
            ? { relayTarget: "DIRECCIÓN", phone: schoolData.directorPhone, contactName: "Directora", label: "Dirección" }
            : null;

        const note = `📋 SOLICITUD PARA ${recipient?.relayTarget ?? "DIRECCIÓN"}\nDe: ${parentName} (mamá/papá de ${childName})\n\n${parentReply.relay_message}`;

        // Nota interna (visible en el dashboard, oculta en el portal)
        await ctx.runMutation(internal.conversations.addMessage, {
          conversationId: args.conversationId,
          direction: "outbound",
          sender: "human",
          body: note,
        });

        if (recipient) {
          const staffMsg =
            `📋 *${schoolData.name} — Solicitud de padre*\n\n` +
            `De: ${parentName} (mamá/papá de ${childName})\n\n` +
            `${parentReply.relay_message}\n\n` +
            `Escribe tu respuesta y te la enviamos automáticamente a ${parentName}.`;

          try {
            // Guardar la notificación en la conversación de quien la recibe
            // para que el flujo de dos pasos funcione cuando responda
            const staffConvId = await ctx.runMutation(internal.conversations.createOrGet, {
              schoolId: args.schoolId,
              contactPhone: recipient.phone,
              channel: "whatsapp",
              contactName: recipient.contactName,
            });
            await ctx.runMutation(internal.conversations.addMessage, {
              conversationId: staffConvId,
              direction: "outbound",
              sender: "agent",
              body: staffMsg,
            });
            await ctx.runAction(internal.external.kapso.sendText, {
              phoneNumberId: args.phoneNumberId,
              to: recipient.phone,
              body: staffMsg,
            });
          } catch (err) {
            console.error(`[relay] Error notificando a ${recipient.label}:`, err);
          }
        }
      }

      await ctx.runAction(internal.external.kapso.sendText, {
        phoneNumberId: args.phoneNumberId,
        to: args.contactPhone,
        body: parentReply.text,
      });

      return; // salir — no procesar como admisiones
    }

    // ── Modo admisiones (prospecto) ──────────────────────────────────
    const systemPrompt = buildAdmissionsSystemPrompt(schoolData, today);

    const llmMessages: Array<{ role: "user" | "assistant"; content: string }> =
      (historyData.messages as Message[]).map((m) => ({
        role: m.direction === "inbound" ? "user" : "assistant",
        content: m.body,
      }));

    let agentReply: AgentResponse;
    try {
      agentReply = await callLLM(systemPrompt, llmMessages);
    } catch (err) {
      agentReply = {
        text: "Disculpa, en este momento tengo un problema técnico. Por favor escribe en unos minutos o llama directamente a la escuela.",
        intent: "reply",
        contact_name: null,
        student_name: null,
        grade_level: null,
        slot_iso: null,
      };
      console.error("LLM error:", err);
    }

    // Si el agente quiere mostrar disponibilidad de Cal.com
    if (agentReply.intent === "show_availability") {
      const eventTypeId = schoolData.calComEventTypeId;
      if (eventTypeId) {
        let slots: SlotOption[] = [];
        try {
          slots = await ctx.runAction(internal.external.calcom.getAvailableSlots, {
            eventTypeId,
          });
        } catch (err) {
          console.error("Cal.com slots error:", err);
        }
        agentReply.text = buildSlotsMessage(slots);

        // Guarda los slots pendientes en la conversación para el siguiente turno
        await ctx.runMutation(internal.conversations.updateStatus, {
          conversationId: args.conversationId,
          status: "qualified",
          updates: {
            pendingSlots: JSON.stringify(slots),
            contactName: agentReply.contact_name ?? undefined,
            interestStudentName: agentReply.student_name ?? undefined,
            interestGradeLevel: agentReply.grade_level ?? undefined,
          },
        });
      } else {
        agentReply.text =
          "Me da gusto que quieras visitarnos. Déjame confirmarte el horario disponible y te escribo enseguida.";
      }
    }

    // Si el agente quiere crear el booking
    if (agentReply.intent === "book_slot" && agentReply.slot_iso) {
      const eventTypeId = schoolData.calComEventTypeId;
      if (eventTypeId) {
        try {
          await ctx.runAction(internal.external.calcom.createBooking, {
            eventTypeId,
            startTime: agentReply.slot_iso,
            name: agentReply.contact_name ?? historyData.conversation.contactName ?? "Padre/Madre",
            phone: args.contactPhone,
            notes: agentReply.student_name
              ? `Alumno/a: ${agentReply.student_name} · Grado: ${agentReply.grade_level ?? "por definir"}`
              : undefined,
          });
          await ctx.runMutation(internal.conversations.updateStatus, {
            conversationId: args.conversationId,
            status: "visit_scheduled",
            updates: {
              contactName: agentReply.contact_name ?? undefined,
              interestStudentName: agentReply.student_name ?? undefined,
              interestGradeLevel: agentReply.grade_level ?? undefined,
              pendingSlots: undefined,
            },
          });
        } catch (err) {
          console.error("Cal.com booking error:", err);
          agentReply.text =
            "Tuve un problema al confirmar la cita. Por favor escríbeme de nuevo o llama a la escuela directamente.";
        }
      }
    }

    // Si hay datos nuevos de contacto, actualizar la conversación
    if (
      agentReply.contact_name ||
      agentReply.student_name ||
      agentReply.grade_level
    ) {
      await ctx.runMutation(internal.conversations.updateStatus, {
        conversationId: args.conversationId,
        status: historyData.conversation.status,
        updates: {
          contactName: agentReply.contact_name ?? undefined,
          interestStudentName: agentReply.student_name ?? undefined,
          interestGradeLevel: agentReply.grade_level ?? undefined,
        },
      });
    }

    // Guardar mensaje outbound
    await ctx.runMutation(internal.conversations.addMessage, {
      conversationId: args.conversationId,
      direction: "outbound",
      sender: "agent",
      body: agentReply.text,
    });

    // Si el prospecto pidió hablar con la directora, notificar por WhatsApp
    if (agentReply.intent === "escalate" && schoolData.directorPhone) {
      const contactName = agentReply.contact_name ?? historyData.conversation.contactName ?? "Prospecto";
      const studentName = agentReply.student_name ?? historyData.conversation.interestStudentName;
      const gradeLevel = agentReply.grade_level ?? historyData.conversation.interestGradeLevel;

      const directorMsg =
        `📋 *${schoolData.name} — Prospecto solicita hablar contigo*\n\n` +
        `👤 Nombre: ${contactName}\n` +
        `📱 Teléfono: ${args.contactPhone}\n` +
        (studentName ? `👦 Hijo/a: ${studentName}\n` : "") +
        (gradeLevel ? `📚 Grado de interés: ${gradeLevel}\n` : "") +
        `\n_El agente le indicó que lo contactarás pronto._`;

      try {
        await ctx.runAction(internal.external.kapso.sendText, {
          phoneNumberId: args.phoneNumberId,
          to: schoolData.directorPhone,
          body: directorMsg,
        });
      } catch (err) {
        console.error("[escalate] Error notificando a directora:", err);
      }
    }

    // Enviar via Kapso
    await ctx.runAction(internal.external.kapso.sendText, {
      phoneNumberId: args.phoneNumberId,
      to: args.contactPhone,
      body: agentReply.text,
    });
  },
});
