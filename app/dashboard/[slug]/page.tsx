"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";

const STATUS_LABEL: Record<string, string> = {
  new: "Nuevo",
  qualified: "Calificado",
  visit_scheduled: "Visita agendada",
  visited: "Visitó",
  enrolled: "Inscrito",
  lost: "Perdido",
};

const STATUS_COLOR: Record<string, string> = {
  new: "bg-blue-50 text-blue-700 border-blue-200",
  qualified: "bg-amber-50 text-amber-700 border-amber-200",
  visit_scheduled: "bg-purple-50 text-purple-700 border-purple-200",
  visited: "bg-teal-50 text-teal-700 border-teal-200",
  enrolled: "bg-green-50 text-green-700 border-green-200",
  lost: "bg-zinc-100 text-zinc-500 border-zinc-200",
};

const STATUS_DOT: Record<string, string> = {
  new: "bg-blue-500",
  qualified: "bg-amber-500",
  visit_scheduled: "bg-purple-500",
  visited: "bg-teal-500",
  enrolled: "bg-green-500",
  lost: "bg-zinc-400",
};

function fmtVisit(ts: number) {
  return new Date(ts).toLocaleDateString("es-MX", {
    weekday: "short", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtShort(ts: number) {
  const now = Date.now();
  const diff = now - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 24) return `hace ${hrs} h`;
  const days = Math.floor(diff / 86400000);
  return `hace ${days} día${days > 1 ? "s" : ""}`;
}

function fmtTime(id: string) {
  // Convex IDs encode creation time — use Date.now() approximation via index
  return new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

// ── Slide-over de detalle de conversación ───────────────────────────
function ConversationDrawer({
  convId,
  onClose,
}: {
  convId: Id<"conversations">;
  onClose: () => void;
}) {
  const data = useQuery(api.conversations.getDetail, { conversationId: convId });

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-20"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-30 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
          <div>
            <p className="font-semibold text-fg text-sm">
              {data?.conversation.contactName ?? "Prospecto"}
            </p>
            <p className="text-xs text-fg-muted mt-0.5">
              {data?.conversation.contactPhone}
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-zinc-100 transition-colors text-fg-muted"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Datos del prospecto */}
        {data && (
          <div className="px-6 py-4 border-b border-border bg-[#FAF7F2] flex-shrink-0">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Alumno", value: data.conversation.interestStudentName },
                { label: "Grado", value: data.conversation.interestGradeLevel },
                { label: "Canal", value: data.conversation.channel === "whatsapp" ? "WhatsApp" : "Web" },
                { label: "Estado", value: STATUS_LABEL[data.conversation.status] },
                ...(data.conversation.lostReason
                  ? [{ label: "Razón de pérdida", value: data.conversation.lostReason }]
                  : []),
              ]
                .filter((f) => f.value)
                .map((f) => (
                  <div key={f.label}>
                    <p className="text-xs text-fg-muted">{f.label}</p>
                    <p className="text-sm font-medium text-fg mt-0.5">{f.value}</p>
                  </div>
                ))}
            </div>
            {/* Badge de status */}
            <div className="mt-3">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${STATUS_COLOR[data.conversation.status]}`}>
                <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1.5 ${STATUS_DOT[data.conversation.status]}`} />
                {STATUS_LABEL[data.conversation.status]}
              </span>
            </div>
          </div>
        )}

        {/* Historial de mensajes */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {!data && (
            <div className="flex items-center justify-center h-24 gap-2 text-fg-muted text-sm">
              <span className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              Cargando...
            </div>
          )}

          {data?.messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-32 gap-2 text-fg-muted">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <p className="text-sm">Sin mensajes registrados</p>
            </div>
          )}

          {data?.messages.map((msg) => {
            const isNote = msg.direction === "outbound" && msg.sender === "human";
            const isOutbound = msg.direction === "outbound";

            // Nota interna (relay a dirección) — burbuja especial centrada
            if (isNote) {
              return (
                <div key={msg._id} className="flex justify-center">
                  <div className="max-w-[90%] rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 leading-relaxed whitespace-pre-line">
                    {msg.body}
                    <p className="text-[10px] mt-1 text-amber-600 font-medium">Nota interna · pendiente de dirección</p>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg._id}
                className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    isOutbound
                      ? "bg-primary text-white rounded-br-sm"
                      : "bg-zinc-100 text-fg rounded-bl-sm"
                  }`}
                >
                  {msg.body}
                  <p className={`text-[10px] mt-1 ${isOutbound ? "text-white/60" : "text-fg-muted"}`}>
                    {isOutbound ? "Agente IA" : "Prospecto / Padre"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer — respuesta directora */}
        <div className="px-4 py-3 border-t border-border flex-shrink-0 space-y-2">
          <p className="text-xs text-fg-muted text-center">
            Conversación vía {data?.conversation.channel === "whatsapp" ? "WhatsApp" : "Web"} ·{" "}
            {fmtShort(data?.conversation.lastMessageAt ?? Date.now())}
          </p>
          <DirectorReplyBox conversationId={convId} />
        </div>
      </div>
    </>
  );
}

// ── Modal publicar aviso ─────────────────────────────────────────────
function PublishModal({
  schoolId,
  onClose,
}: {
  schoolId: Id<"schools">;
  onClose: () => void;
}) {
  const publish = useMutation(api.announcements.publish);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sendWA, setSendWA] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    setError(null);
    try {
      await publish({
        schoolId,
        title: title.trim(),
        body: body.trim(),
        sendViaWhatsapp: sendWA,
      });
      setDone(true);
      setTimeout(onClose, 2500);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Error al publicar. Intenta de nuevo.");
      setSending(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/25 backdrop-blur-[2px] z-20" onClick={onClose} />
      <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-border shadow-2xl w-full max-w-md">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-fg text-sm">Publicar Aviso</h2>
            <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-zinc-100 text-fg-muted">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {done ? (
            <div className="px-6 py-10 text-center">
              <div className="text-4xl mb-3">✅</div>
              <p className="font-semibold text-fg">¡Aviso publicado!</p>
              {sendWA && <p className="text-xs text-fg-muted mt-1">Enviando WhatsApp a los padres...</p>}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-fg-muted block mb-1.5">Título</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Suspensión de clases — viernes 3"
                  className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-fg-muted block mb-1.5">Mensaje</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  placeholder="Escribe el aviso completo aquí..."
                  className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                />
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendWA}
                  onChange={(e) => setSendWA(e.target.checked)}
                  className="h-4 w-4 rounded accent-primary"
                />
                <span className="text-sm text-fg flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-green-500">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M11.999 2C6.477 2 2 6.477 2 11.999c0 1.848.487 3.58 1.337 5.082L2 22l5.059-1.316A9.944 9.944 0 0 0 12 22c5.523 0 10-4.477 10-10.001C22 6.477 17.523 2 12 2z" fillRule="evenodd" clipRule="evenodd"/>
                  </svg>
                  Enviar por WhatsApp a los padres
                </span>
              </label>
              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
              )}
              <button
                type="submit"
                disabled={sending || !title.trim() || !body.trim()}
                className="w-full bg-primary text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? "Publicando..." : "Publicar aviso"}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

// ── Caja de respuesta del director ──────────────────────────────────
function DirectorReplyBox({ conversationId }: { conversationId: Id<"conversations"> | null }) {
  const reply = useMutation(api.conversations.replyAsHuman);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  if (!conversationId) return null;

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await reply({
        conversationId,
        body: text.trim(),
        phoneNumberId: "597907523413541",
      });
      setText("");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex gap-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
        placeholder="Responder como directora..."
        className="flex-1 rounded-xl border border-border px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
      />
      <button
        onClick={handleSend}
        disabled={!text.trim() || sending}
        className="bg-primary text-white rounded-xl px-4 py-2 text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 transition-colors"
      >
        {sending ? "..." : "Enviar"}
      </button>
    </div>
  );
}

// ── Dashboard principal ──────────────────────────────────────────────
export default function DirectorDashboard() {
  const { slug } = useParams<{ slug: string }>();
  const data = useQuery(api.director.summary, { schoolSlug: slug });
  const pendingRelays = useQuery(api.conversations.pendingRelayCount, { schoolSlug: slug }) ?? 0;
  const [selectedConvId, setSelectedConvId] = useState<Id<"conversations"> | null>(null);
  const [showPublish, setShowPublish] = useState(false);

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

  if (!data) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <p className="text-fg-muted">Escuela no encontrada.</p>
      </div>
    );
  }

  const { school, kpis, upcomingVisits, recentConversations, recentAnnouncements } = data;

  const kpiCards = [
    { label: "Leads activos", value: kpis.newLeads + kpis.qualified, sub: "sin visita", color: "text-blue-600" },
    { label: "Visitas agendadas", value: kpis.visitScheduled, sub: "pendientes", color: "text-purple-600" },
    { label: "Inscritos", value: kpis.enrolled, sub: "este ciclo", color: "text-green-600" },
    { label: "Esta semana", value: kpis.thisWeek, sub: "mensajes nuevos", color: "text-primary" },
  ];

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* Modales */}
      {selectedConvId && (
        <ConversationDrawer
          convId={selectedConvId}
          onClose={() => setSelectedConvId(null)}
        />
      )}
      {showPublish && (
        <PublishModal
          schoolId={school._id as Id<"schools">}
          onClose={() => setShowPublish(false)}
        />
      )}

      {/* Nav */}
      <header className="border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="9" fill="#0F6E6E" />
              <path d="M28 20a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              <circle cx="28" cy="12" r="3.5" fill="#F4B740" />
            </svg>
            <span className="font-semibold text-fg text-sm">School Connect</span>
            <span className="text-fg-muted/40 text-sm">·</span>
            <span className="text-fg-muted text-sm">{school.name}</span>
          </div>
          <div className="flex items-center gap-3">
            {pendingRelays > 0 && (
              <div className="flex items-center gap-1.5 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-full animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {pendingRelays} solicitud{pendingRelays > 1 ? "es" : ""} pendiente{pendingRelays > 1 ? "s" : ""}
              </div>
            )}
            <button
              onClick={() => setShowPublish(true)}
              className="flex items-center gap-1.5 text-xs font-semibold bg-primary text-white px-3 py-1.5 rounded-full hover:bg-primary/90 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Publicar aviso
            </button>
            <span className="text-xs font-medium text-primary bg-primary/8 px-2.5 py-1 rounded-full border border-primary/20">
              Panel Director
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {kpiCards.map((k) => (
            <div key={k.label} className="bg-white rounded-2xl border border-border p-5 shadow-sm">
              <p className="text-xs text-fg-muted font-medium uppercase tracking-wide">{k.label}</p>
              <p className={`text-4xl font-bold mt-1 ${k.color}`}>{k.value}</p>
              <p className="text-xs text-fg-muted mt-1">{k.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Pipeline de admisiones */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-fg text-sm">Pipeline de Admisiones</h2>
              <span className="text-xs text-fg-muted">{kpis.total} conversaciones · click para ver detalle</span>
            </div>
            <div className="divide-y divide-border">
              {recentConversations.length === 0 && (
                <p className="px-6 py-10 text-center text-fg-muted text-sm">Sin conversaciones aún.</p>
              )}
              {recentConversations.map((c) => (
                <button
                  key={c._id}
                  onClick={() => setSelectedConvId(c._id as Id<"conversations">)}
                  className="w-full px-6 py-4 flex items-center gap-4 hover:bg-[#FAF7F2] transition-colors text-left"
                >
                  {/* Avatar */}
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary text-sm font-semibold">
                      {(c.contactName ?? "?")[0].toUpperCase()}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-fg truncate">{c.contactName ?? c.contactPhone}</p>
                      {c.interestStudentName && (
                        <span className="text-xs text-fg-muted hidden sm:block">· {c.interestStudentName}</span>
                      )}
                    </div>
                    <p className="text-xs text-fg-muted mt-0.5">
                      {c.interestGradeLevel ?? "Grado no especificado"} · {fmtShort(c.lastMessageAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border hidden sm:flex items-center ${STATUS_COLOR[c.status]}`}>
                      <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1.5 ${STATUS_DOT[c.status]}`} />
                      {STATUS_LABEL[c.status]}
                    </span>
                    {/* Chevron */}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-fg-muted">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Sidebar derecha */}
          <div className="space-y-6">
            {/* Resumen por status */}
            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="font-semibold text-fg text-sm">Estado del Funnel</h2>
              </div>
              <div className="p-5 space-y-3">
                {[
                  { key: "new", count: kpis.newLeads },
                  { key: "qualified", count: kpis.qualified },
                  { key: "visit_scheduled", count: kpis.visitScheduled },
                  { key: "enrolled", count: kpis.enrolled },
                ].map(({ key, count }) => (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${STATUS_DOT[key]}`} />
                      <span className="text-sm text-fg-muted">{STATUS_LABEL[key]}</span>
                    </div>
                    <span className="text-sm font-semibold text-fg">{count}</span>
                  </div>
                ))}
                <div className="pt-3 border-t border-border">
                  <div className="flex justify-between text-xs text-fg-muted">
                    <span>Tasa de inscripción</span>
                    <span className="font-semibold text-green-600">
                      {kpis.total > 0 ? Math.round((kpis.enrolled / kpis.total) * 100) : 0}%
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${kpis.total > 0 ? Math.round((kpis.enrolled / kpis.total) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Próximas visitas */}
            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="font-semibold text-fg text-sm">Próximas Visitas</h2>
              </div>
              <div className="divide-y divide-border">
                {upcomingVisits.length === 0 && (
                  <p className="px-5 py-6 text-center text-fg-muted text-sm">Sin visitas agendadas.</p>
                )}
                {upcomingVisits.map((v) => (
                  <div key={v._id} className="px-5 py-3.5">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${v.status === "confirmed" ? "bg-green-500" : "bg-amber-400"}`} />
                      <p className="text-sm font-medium text-fg truncate">{v.contactName}</p>
                    </div>
                    {v.studentName && (
                      <p className="text-xs text-fg-muted pl-3.5">{v.studentName} · {v.gradeLevel}</p>
                    )}
                    <p className="text-xs text-primary mt-1 pl-3.5 font-medium">
                      {fmtVisit(v.scheduledAt)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Avisos recientes */}
            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="font-semibold text-fg text-sm">Avisos Recientes</h2>
              </div>
              <div className="divide-y divide-border">
                {recentAnnouncements.length === 0 && (
                  <p className="px-5 py-6 text-center text-fg-muted text-sm">Sin avisos publicados.</p>
                )}
                {recentAnnouncements.map((a) => (
                  <div key={a._id} className="px-5 py-3.5">
                    <p className="text-sm font-medium text-fg truncate">{a.title}</p>
                    <p className="text-xs text-fg-muted mt-0.5 line-clamp-2">{a.body}</p>
                    <p className="text-xs text-fg-muted/60 mt-1">{fmtShort(a.publishedAt)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
