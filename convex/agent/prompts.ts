import { Doc } from "../_generated/dataModel";

type ChildContext = {
  student: { fullName: string; gradeLevel: string };
  relation: string;
  group: { name: string } | null;
  assignments: Array<{ subject: string; title: string; dueDate: number }>;
  grades: Array<{ subject: string; score: number; period: string }>;
  events: Array<{ title: string; startsAt: number }>;
  pendingInvoice: { period: string; amount: number; currency: string; dueDate: number; status: string } | null;
  announcements: Array<{ title: string; body: string; publishedAt: number }>;
};

export function buildParentSystemPrompt(
  school: Doc<"schools">,
  parentName: string,
  children: ChildContext[],
  today: string,
): string {
  const childrenInfo = children.map((c) => {
    const fmtDate = (ts: number) =>
      new Date(ts).toLocaleDateString("es-MX", {
        weekday: "long", day: "numeric", month: "long", timeZone: "America/Merida",
      });

    const tasks = c.assignments.length
      ? c.assignments.map((a) => `• ${a.subject}: "${a.title}" — vence ${fmtDate(a.dueDate)}`).join("\n")
      : "Sin tareas próximas registradas";

    const grades = c.grades.length
      ? c.grades.map((g) => `• ${g.subject}: ${g.score}`).join("\n")
      : "Sin calificaciones registradas";

    const events = c.events.length
      ? c.events.map((e) => `• ${e.title} — ${fmtDate(e.startsAt)}`).join("\n")
      : "Sin eventos próximos";

    const announcements = c.announcements.length
      ? c.announcements.map((a) => `• ${a.title}: ${a.body}`).join("\n")
      : "Sin avisos recientes";

    const invoice = c.pendingInvoice
      ? `PENDIENTE: ${c.pendingInvoice.period} — vence ${fmtDate(c.pendingInvoice.dueDate)}`
      : "Al corriente";

    const tuitionPolicy = `Política de pago: primeros 10 días de cada mes. Del día 11 en adelante se cobra recargo de $120 MXN por mes.`;

    return `
ALUMNO: ${c.student.fullName} (${c.student.gradeLevel}, ${c.group?.name ?? "sin grupo"})
Relación: ${c.relation}

TAREAS PRÓXIMAS:
${tasks}

CALIFICACIONES (Bim 2):
${grades}

PRÓXIMOS EVENTOS:
${events}

AVISOS RECIENTES:
${announcements}

COLEGIATURA:
${invoice}
${tuitionPolicy}`;
  }).join("\n\n---\n");

  return `Eres el asistente escolar de ${school.name}, una escuela primaria en México.
Estás hablando con ${parentName}, padre/madre de familia. Hoy es ${today}.

${childrenInfo}

INSTRUCCIONES:
1. Responde siempre en español mexicano, cálido y natural. Tuteo.
2. Respuestas cortas (máx 100 palabras) — estás en WhatsApp.
3. Solo usa la información que tienes arriba. No inventes datos.
4. Si preguntan algo que no tienes (notas específicas, permisos, etc.),
   diles que lo comunicas con la maestra y queda registrado.
5. Cuando el padre quiere agendar una cita o hablar con la maestra/dirección:
   - Convierte los días mencionados a FECHAS ESPECÍFICAS usando "Hoy es ${today}".
     Ejemplo: si hoy es lunes 28 y dice "jueves", escribe "jueves 1 de mayo".
   - Incluye la fecha específica (día + número de mes) tanto en tu respuesta al padre
     como en el relay_message, para evitar ambigüedades.
   - Confirma con el padre la fecha exacta antes de enviar el relay.
6. Sé proactivo: si hay colegiatura pendiente o tarea urgente, menciónalo.

FORMATO DE RESPUESTA (JSON estricto, sin texto extra):
{
  "text": "tu respuesta al padre",
  "intent": "reply" | "relay_teacher" | "escalate",
  "relay_message": "mensaje para la maestra/dirección si intent=relay_teacher, con fechas específicas (día + número de mes), o null"
}`;
}

export function buildAdmissionsSystemPrompt(
  school: Doc<"schools">,
  today: string,
): string {
  const info = school.admissionsInfo;

  const schoolBrief = info
    ? `
INFORMACIÓN DE LA ESCUELA:
- Niveles: ${info.gradesOffered ?? "preescolar y primaria"}
- Horario: ${info.schedule ?? "consultar con la escuela"}
- Colegiaturas: ${info.tuitionRanges ?? "consultar con la escuela"}
- Modelo educativo: ${info.educationModel ?? "sin especificar"}
- Requisitos de admisión: ${info.requirements ?? "sin especificar"}
- Diferenciadores: ${info.differentiators ?? "sin especificar"}
- Visitas: ${info.visitInstructions ?? "agenda una visita para conocernos"}
- Preguntas frecuentes: ${info.faqs ?? "sin especificar"}`
    : `
INFORMACIÓN DE LA ESCUELA:
No hay información cargada aún. Si el padre pregunta detalles específicos,
dile que con gusto lo comunicas con la directora.`;

  return `Eres el agente de admisiones de ${school.name}, una escuela en México.
Tu rol es responder preguntas de padres interesados, calificar su interés y
agendar visitas. Hoy es ${today}.

${schoolBrief}

INSTRUCCIONES CRÍTICAS:
1. Responde siempre en español mexicano, cálido y profesional. Tuteo natural.
2. Respuestas cortas (máx 120 palabras) — estás en WhatsApp, no en email.
3. Nunca inventes información de la escuela. Si no sabes, di que lo revisas.
4. Guía la conversación hacia agendar una visita cuando hay interés real.
5. Recopila: nombre del padre/madre, nombre del hijo/a, grado deseado.

FORMATO DE RESPUESTA (JSON estricto, sin texto extra):
{
  "text": "tu respuesta al padre",
  "intent": "reply" | "show_availability" | "book_slot" | "escalate",
  "contact_name": "nombre detectado del padre/madre o null",
  "student_name": "nombre del hijo/a detectado o null",
  "grade_level": "grado deseado detectado o null",
  "slot_iso": "datetime ISO 8601 del slot confirmado, solo si intent=book_slot, o null"
}

CUÁNDO USAR CADA INTENT:
- "reply": información general, preguntas, seguimiento normal, confirmaciones de citas
- "show_availability": el padre quiere agendar o confirma querer visitar
- "book_slot": SOLO cuando el padre elige un número de la lista de horarios que TÚ le presentaste en este chat. NUNCA uses book_slot si la fecha fue mencionada en conversación o propuesta por otra persona.
- "escalate": el padre pide hablar directamente con la directora o no puedes resolver su duda`;
}

export function buildSlotsMessage(
  slots: Array<{ start: string; label: string }>,
): string {
  if (slots.length === 0) {
    return "En este momento no tenemos horarios disponibles esta semana. ¿Te parece si te contactamos para buscar una fecha?";
  }
  const list = slots
    .map((s, i) => `${i + 1}. ${s.label}`)
    .join("\n");
  return `Estos son los horarios disponibles para visitar la escuela:\n\n${list}\n\n¿Cuál te acomoda mejor? Responde el número o dime el día.`;
}
