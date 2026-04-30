import { internalAction } from "../_generated/server";
import { v } from "convex/values";

const CALCOM_BASE = "https://api.cal.com/v2";

export type SlotOption = { start: string; label: string };

function calHeaders(version: string) {
  const apiKey = process.env.CALCOM_API_KEY;
  if (!apiKey) throw new Error("CALCOM_API_KEY not set in Convex env");
  return {
    Authorization: `Bearer ${apiKey}`,
    "cal-api-version": version,
    "Content-Type": "application/json",
  };
}

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
  handler: async (_ctx, { eventTypeId, daysAhead = 14 }): Promise<SlotOption[]> => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + daysAhead);

    const params = new URLSearchParams({
      eventTypeId,
      start: start.toISOString().split("T")[0], // YYYY-MM-DD
      end: end.toISOString().split("T")[0],
      timeZone: "America/Merida",
    });

    const res = await fetch(`${CALCOM_BASE}/slots?${params}`, {
      headers: calHeaders("2024-09-04"),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Cal.com slots failed ${res.status}: ${text}`);
    }

    // v2 puede devolver slots como string[] o { start: string }[]
    const data = (await res.json()) as {
      status: string;
      data: Record<string, Array<string | { start: string }>>;
    };

    if (data.status !== "success") {
      throw new Error(`Cal.com slots error: ${JSON.stringify(data)}`);
    }

    const slots: SlotOption[] = [];
    for (const daySlots of Object.values(data.data)) {
      for (const raw of daySlots) {
        if (slots.length >= 5) break;
        const iso = typeof raw === "string" ? raw : raw.start;
        slots.push({ start: iso, label: formatSlot(iso) });
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
    const email =
      args.email ?? `${args.phone.replace(/\D/g, "")}@whatsapp.schoolconnect`;

    const res = await fetch(`${CALCOM_BASE}/bookings`, {
      method: "POST",
      headers: calHeaders("2026-02-25"),
      body: JSON.stringify({
        eventTypeId: Number(args.eventTypeId),
        start: args.startTime,
        attendee: {
          name: args.name,
          email,
          timeZone: "America/Merida",
          phoneNumber: args.phone,
          language: "es",
        },
        ...(args.notes
          ? { bookingFieldsResponses: { notes: args.notes } }
          : {}),
        metadata: { source: "school-connect-whatsapp" },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Cal.com booking failed ${res.status}: ${text}`);
    }

    const data = (await res.json()) as {
      status: string;
      data: { uid: string; id: number };
    };

    if (data.status !== "success") {
      throw new Error(`Cal.com booking error: ${JSON.stringify(data)}`);
    }

    return { uid: data.data.uid, id: data.data.id };
  },
});
