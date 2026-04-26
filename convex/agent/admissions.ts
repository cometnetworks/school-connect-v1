import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { buildAdmissionsSystemPrompt, buildSlotsMessage } from "./prompts";
import type { SlotOption } from "../external/calcom";

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

async function callLLM(
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<AgentResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.LLM_MODEL_PRIMARY ?? "anthropic/claude-haiku-4.5-20251001";
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://schoolconnect.app",
      "X-Title": "School Connect Admissions Agent",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      response_format: { type: "json_object" },
      temperature: 0.4,
      max_tokens: 512,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  const raw = data.choices[0]?.message?.content ?? "{}";

  try {
    return JSON.parse(raw) as AgentResponse;
  } catch {
    return {
      text: raw.slice(0, 300),
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
    const [schoolData, historyData] = await Promise.all([
      ctx.runQuery(internal.schools.getById, { schoolId: args.schoolId }),
      ctx.runQuery(internal.conversations.getWithHistory, {
        conversationId: args.conversationId,
        lastN: 20,
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

    // Enviar via Kapso
    await ctx.runAction(internal.external.kapso.sendText, {
      phoneNumberId: args.phoneNumberId,
      to: args.contactPhone,
      body: agentReply.text,
    });
  },
});
