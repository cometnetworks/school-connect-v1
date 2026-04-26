"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

type Status = "idle" | "submitting" | "success" | "error";

export default function BetaForm() {
  const submit = useMutation(api.betaApplications.submit);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      await submit({
        schoolName: String(fd.get("schoolName") ?? ""),
        contactName: String(fd.get("contactName") ?? ""),
        contactRole: String(fd.get("contactRole") ?? "") || undefined,
        email: String(fd.get("email") ?? ""),
        phone: String(fd.get("phone") ?? ""),
        studentCount: fd.get("studentCount")
          ? Number(fd.get("studentCount"))
          : undefined,
        city: String(fd.get("city") ?? "") || undefined,
        notes: String(fd.get("notes") ?? "") || undefined,
      });
      setStatus("success");
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof Error
          ? err.message
          : "No pudimos enviar tu solicitud. Inténtalo de nuevo.",
      );
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-primary/20 bg-primary-soft p-8 text-center">
        <h3 className="font-display text-2xl font-semibold text-primary">
          ¡Recibimos tu solicitud!
        </h3>
        <p className="mt-2 text-fg-muted">
          Te contactamos en menos de 24 horas para coordinar una llamada de 20
          minutos y revisar si tu escuela encaja en el piloto.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <Field name="schoolName" label="Nombre de la escuela" required />
      <Field name="contactName" label="Tu nombre" required />
      <Field name="contactRole" label="Tu cargo" placeholder="Director(a), dueño(a)..." />
      <Field name="city" label="Ciudad" defaultValue="Mérida" />
      <Field name="email" type="email" label="Correo" required />
      <Field name="phone" type="tel" label="WhatsApp" required placeholder="999 123 4567" />
      <Field name="studentCount" type="number" label="Número aproximado de alumnos" />
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-fg">
          ¿Qué te gustaría resolver primero?
        </label>
        <textarea
          name="notes"
          rows={3}
          className="mt-1 w-full rounded-xl border border-border bg-bg-elevated px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          placeholder="Ej. saturación de WhatsApp, agendar visitas, tareas en Excel..."
        />
      </div>
      <div className="sm:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-fg-muted">
          3 meses gratis para las primeras 10 escuelas. 20% de descuento de por vida después.
        </p>
        <button
          type="submit"
          disabled={status === "submitting"}
          className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {status === "submitting" ? "Enviando..." : "Aplicar a la beta"}
        </button>
      </div>
      {error && (
        <p className="sm:col-span-2 text-sm text-danger">{error}</p>
      )}
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  placeholder,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-fg">
        {label}
        {required && <span className="ml-0.5 text-support">*</span>}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="mt-1 w-full rounded-xl border border-border bg-bg-elevated px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}
