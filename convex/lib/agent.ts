import { Doc } from "../_generated/dataModel";

export const DEFAULT_AGENT_NAME = "Luna";

/** Nombre de la asistente de WhatsApp de la escuela */
export function agentNameOf(school: Pick<Doc<"schools">, "agentName">): string {
  return school.agentName?.trim() || DEFAULT_AGENT_NAME;
}
