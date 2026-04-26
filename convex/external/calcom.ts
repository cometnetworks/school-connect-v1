import { internalAction } from "../_generated/server";
import { v } from "convex/values";

const CALCOM_BASE = "https://api.cal.com/v1";

type CalSlot = { time: string };
type CalAvailabilityResponse = {
  slots: Record<string, CalSlot[]>;
};

export type SlotOption = { start: string; label: string };

function formatSlot(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es-MX", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Merida",
  });
}

export const getAvailableSlots = internalAction({
  args: {
    eventTypeId: v.string(),
    daysAhead: v.optional(v.number()),
  },
  handler: async (_ctx, { eventTypeId, daysAhead = 7 }): Promise<SlotOption[]> => {
    const apiKey = process.env.CALCOM_API_KEY;
    if (!apiKey) throw new Error("CALCOM_API_KEY not set in Convex env");

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + daysAhead);

    const params = new URLSearchParams({
      apiKey,
      eventTypeId,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      timeZone: "America/Merida",
    });

    const res = await fetch(`${CALCOM_BASE}/availability?${params}`);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Cal.com availability failed ${res.status}: ${text}`);
    }

    const data = (await res.json()) as CalAvailabilityResponse;
    const slots: SlotOption[] = [];

    for (const daySlots of Object.values(data.slots)) {
      for (const slot of daySlots) {
        if (slots.length >= 5) break;
        slots.push({ start: slot.time, label: formatSlot(slot.time) });
      }
      if (slots.length >= 5) break;
    }

    return slots;
  },
});

export const createBooking = internalAction({
  args: {
    eventTypeId: v.string(),
    startTime: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.CALCOM_API_KEY;
    if (!apiKey) throw new Error("CALCOM_API_KEY not set in Convex env");

    const res = await fetch(`${CALCOM_BASE}/bookings?apiKey=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventTypeId: Number(args.eventTypeId),
        start: args.startTime,
        responses: {
          name: args.name,
          email: args.email ?? `${args.phone.replace(/\D/g, "")}@whatsapp.schoolconnect`,
          phone: args.phone,
          notes: args.notes,
        },
        timeZone: "America/Merida",
        language: "es",
        metadata: { source: "school-connect-whatsapp" },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Cal.com booking failed ${res.status}: ${text}`);
    }

    const data = (await res.json()) as { uid: string; id: number };
    return { uid: data.uid, id: data.id };
  },
});
