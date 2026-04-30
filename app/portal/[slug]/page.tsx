"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import { useState, useEffect, useRef } from "react";

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString("es-MX", {
    weekday: "long", day: "numeric", month: "long",
  });
}
function fmtShort(ts: number) {
  return new Date(ts).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}
function daysLeft(ts: number) {
  const diff = ts - Date.now();
  return Math.ceil(diff / 86400000);
}

// ─── Student selector (demo) ────────────────────────────────────────
function StudentSelector({
  slug,
  onSelect,
}: {
  slug: string;
  onSelect: (id: Id<"students">) => void;
}) {
  const students = useQuery(api.portal.studentsBySchool, { schoolSlug: slug });

  if (!students || students.length === 0) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <p className="text-fg-muted text-sm">No hay alumnos en esta escuela.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-border">
          <div className="flex items-center gap-2.5 mb-1">
            <svg width="22" height="22" viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="9" fill="#0F6E6E" />
              <path d="M28 20a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" stroke="white" strokeWidth="2.5" fill="none" />
              <circle cx="28" cy="12" r="3.5" fill="#F4B740" />
            </svg>
            <span className="font-semibold text-fg text-sm">Portal de Padres</span>
          </div>
          <p className="text-xs text-fg-muted">Selecciona un alumno para continuar</p>
        </div>
        <div className="divide-y divide-border">
          {students.map((s) => (
            <button
              key={s._id}
              onClick={() => onSelect(s._id)}
              className="w-full px-6 py-4 text-left flex items-center gap-3 hover:bg-[#FAF7F2] transition-colors"
            >
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary text-sm font-semibold">{s.fullName[0]}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-fg">{s.fullName}</p>
                <p className="text-xs text-fg-muted">{s.gradeLevel}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Chat history ────────────────────────────────────────────────────
function ChatHistory({ slug, studentId }: { slug: string; studentId: Id<"students"> }) {
  const chatData = useQuery(api.portal.parentConversation, { schoolSlug: slug, studentId });
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatData?.messages.length]);

  const messages = chatData?.messages ?? [];

  return (
    <div className="md:col-span-2 bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center gap-2">
        <span className="text-base">💬</span>
        <h2 className="font-semibold text-fg text-sm">Mensajes con Aurora</h2>
        <span className="ml-auto text-xs font-medium text-primary bg-primary/8 px-2 py-0.5 rounded-full border border-primary/20">
          WhatsApp ✨
        </span>
      </div>

      {/* Chat bubble area — WhatsApp style */}
      <div
        className="h-80 overflow-y-auto p-4 space-y-2"
        style={{ background: "url('data:image/svg+xml,%3Csvg xmlns=\"http://www.w3.org/2000/svg\" width=\"60\" height=\"60\"%3E%3C/svg%3E') #e5ddd5" }}
      >
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="bg-white/80 rounded-xl px-5 py-4 text-center shadow-sm">
              <p className="text-sm font-medium text-zinc-600">Sin mensajes aún</p>
              <p className="text-xs text-zinc-400 mt-1">
                Escríbele a Aurora por WhatsApp<br />para ver tu historial aquí.
              </p>
            </div>
          </div>
        )}

        {messages.map((msg) => {
          const isParent = msg.direction === "inbound";
          const time = new Date(msg._creationTime).toLocaleTimeString("es-MX", {
            hour: "2-digit",
            minute: "2-digit",
          });
          return (
            <div key={msg._id} className={`flex ${isParent ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[78%] rounded-2xl px-3.5 py-2 shadow-sm ${
                  isParent
                    ? "bg-[#dcf8c6] rounded-tr-sm"
                    : "bg-white rounded-tl-sm"
                }`}
              >
                {!isParent && (
                  <p className="text-[11px] font-semibold text-primary mb-0.5">Aurora ✨</p>
                )}
                <p className="text-sm text-zinc-800 whitespace-pre-wrap leading-snug">{msg.body}</p>
                <p className="text-[10px] text-zinc-400 text-right mt-0.5">{time}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="px-5 py-3 border-t border-border bg-zinc-50">
        <p className="text-xs text-fg-muted text-center">
          Para enviar mensajes, usa WhatsApp — las respuestas aparecen aquí automáticamente.
        </p>
      </div>
    </div>
  );
}

// ─── Main portal ─────────────────────────────────────────────────────
function PortalHome({ slug, studentId }: { slug: string; studentId: Id<"students"> }) {
  const data = useQuery(api.portal.parentHome, { schoolSlug: slug, studentId });

  if (data === undefined) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <div className="flex gap-2 items-center text-fg-muted text-sm">
          <span className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          Cargando...
        </div>
      </div>
    );
  }

  if (!data) return <p className="p-8 text-fg-muted">Alumno no encontrado.</p>;

  const { school, student, announcements, assignments, grades, events, invoices } = data;

  const pendingInvoice = invoices.find((i) => i.status === "pending");
  const bim2Grades = grades.filter((g) => g.period === "Bim 2");
  const avg = bim2Grades.length
    ? (bim2Grades.reduce((a, b) => a + b.score, 0) / bim2Grades.length).toFixed(1)
    : null;

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* Nav */}
      <header className="border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-4xl px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg width="26" height="26" viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="9" fill="#0F6E6E" />
              <path d="M28 20a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" stroke="white" strokeWidth="2.5" fill="none" />
              <circle cx="28" cy="12" r="3.5" fill="#F4B740" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-fg leading-none">{school.name}</p>
              <p className="text-xs text-fg-muted">{student.fullName} · {student.gradeLevel}</p>
            </div>
          </div>
          <span className="text-xs font-medium text-primary bg-primary/8 px-2.5 py-1 rounded-full border border-primary/20">
            Portal Padres
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 space-y-6">

        {/* Colegiatura pendiente — banner si aplica */}
        {pendingInvoice && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">💳</span>
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  Colegiatura pendiente — {pendingInvoice.period}
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Vence {fmtDate(pendingInvoice.dueDate)} · ${pendingInvoice.amount.toLocaleString("es-MX")} {pendingInvoice.currency}
                </p>
              </div>
            </div>
            <button className="text-xs font-semibold text-amber-800 bg-amber-100 border border-amber-300 px-3 py-1.5 rounded-full hover:bg-amber-200 transition-colors flex-shrink-0">
              Ver detalles
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Avisos */}
          <div className="md:col-span-2 bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center gap-2">
              <span className="text-base">📢</span>
              <h2 className="font-semibold text-fg text-sm">Avisos Escolares</h2>
            </div>
            <div className="divide-y divide-border">
              {announcements.length === 0 && (
                <p className="px-6 py-8 text-center text-fg-muted text-sm">Sin avisos recientes.</p>
              )}
              {announcements.map((a) => (
                <div key={a._id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-fg">{a.title}</p>
                      <p className="text-xs text-fg-muted mt-1 line-clamp-2">{a.body}</p>
                    </div>
                    <span className="text-xs text-fg-muted flex-shrink-0">{fmtShort(a.publishedAt)}</span>
                  </div>
                  {a.groupId && (
                    <span className="inline-block mt-2 text-xs text-primary bg-primary/8 px-2 py-0.5 rounded-full border border-primary/20">
                      Tu grupo
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tareas próximas */}
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <span className="text-base">📚</span>
              <h2 className="font-semibold text-fg text-sm">Tareas Próximas</h2>
            </div>
            <div className="divide-y divide-border">
              {assignments.length === 0 && (
                <p className="px-5 py-6 text-center text-fg-muted text-sm">Sin tareas pendientes.</p>
              )}
              {assignments.map((a) => {
                const dl = daysLeft(a.dueDate);
                return (
                  <div key={a._id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-primary">{a.subject}</span>
                        <p className="text-sm text-fg mt-0.5 font-medium">{a.title}</p>
                        {a.description && (
                          <p className="text-xs text-fg-muted mt-1 line-clamp-2">{a.description}</p>
                        )}
                      </div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ${
                        dl <= 1 ? "bg-red-50 text-red-600 border border-red-200" :
                        dl <= 3 ? "bg-amber-50 text-amber-600 border border-amber-200" :
                        "bg-zinc-50 text-zinc-500 border border-zinc-200"
                      }`}>
                        {dl === 0 ? "Hoy" : dl === 1 ? "Mañana" : `${dl} días`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Calificaciones */}
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">📊</span>
                <h2 className="font-semibold text-fg text-sm">Calificaciones — Bim 2</h2>
              </div>
              {avg && (
                <span className="text-sm font-bold text-primary">{avg}</span>
              )}
            </div>
            <div className="divide-y divide-border">
              {bim2Grades.length === 0 && (
                <p className="px-5 py-6 text-center text-fg-muted text-sm">Sin calificaciones aún.</p>
              )}
              {bim2Grades.map((g) => (
                <div key={g._id} className="px-5 py-3 flex items-center justify-between">
                  <span className="text-sm text-fg">{g.subject}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-20 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${g.score >= 9 ? "bg-green-500" : g.score >= 7 ? "bg-amber-400" : "bg-red-400"}`}
                        style={{ width: `${(g.score / 10) * 100}%` }}
                      />
                    </div>
                    <span className={`text-sm font-bold w-8 text-right ${g.score >= 9 ? "text-green-600" : g.score >= 7 ? "text-amber-600" : "text-red-600"}`}>
                      {g.score}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat con Aurora */}
          <ChatHistory slug={slug} studentId={studentId} />

          {/* Próximos eventos */}
          <div className="md:col-span-2 bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center gap-2">
              <span className="text-base">📅</span>
              <h2 className="font-semibold text-fg text-sm">Calendario Escolar</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
              {events.length === 0 && (
                <p className="px-6 py-8 text-center text-fg-muted text-sm col-span-3">Sin eventos próximos.</p>
              )}
              {events.map((e) => (
                <div key={e._id} className="px-5 py-4">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wide">
                    {fmtShort(e.startsAt)}
                  </p>
                  <p className="text-sm font-medium text-fg mt-1">{e.title}</p>
                  {e.description && (
                    <p className="text-xs text-fg-muted mt-1 line-clamp-2">{e.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Page root ────────────────────────────────────────────────────────
export default function PortalPage() {
  const { slug } = useParams<{ slug: string }>();
  const [studentId, setStudentId] = useState<Id<"students"> | null>(null);

  if (!studentId) {
    return <StudentSelector slug={slug} onSelect={setStudentId} />;
  }

  return <PortalHome slug={slug} studentId={studentId} />;
}
