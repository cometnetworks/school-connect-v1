"use client";

import { useState, useEffect, useCallback } from "react";

const SCENE_DURATION = 9000; // ms por escena

// ─── Mini componentes de UI ──────────────────────────────────────────────────

function MiniChat({ rows }: { rows: Array<{ side: "l" | "r"; text: string }> }) {
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className={`flex ${r.side === "r" ? "justify-end" : "justify-start"}`}>
          <p
            className={`max-w-[85%] rounded-2xl px-3 py-2 text-[11px] leading-snug ${
              r.side === "r"
                ? "bg-[#0F6E6E] text-white"
                : "bg-[rgba(15,110,110,0.1)] text-[#0F6E6E]"
            }`}
          >
            {r.text}
          </p>
        </div>
      ))}
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[rgba(15,110,110,0.15)] bg-white/60 px-3 py-2">
      <span className="text-[10px] text-[#6B7280]">{label}</span>
      <span className={`text-xs font-bold ${accent ? "text-[#0F6E6E]" : "text-[#1a1a1a]"}`}>{value}</span>
    </div>
  );
}

function CheckItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
          done ? "bg-[#0F6E6E] text-white" : "border border-[rgba(15,110,110,0.3)] text-transparent"
        }`}
      >
        ✓
      </span>
      <span className={`text-[11px] ${done ? "text-[#1a1a1a]" : "text-[#9CA3AF]"}`}>{label}</span>
    </div>
  );
}

// ─── Escenas ────────────────────────────────────────────────────────────────

const SCENES = [
  {
    label: "AGENTE DE ADMISIONES · 24/7",
    headline: "Responde antes de que busquen otra escuela.",
    sub: "El agente conoce tus colegiaturas, niveles y horarios. Agenda la visita sin que la directora levante el teléfono.",
    ui: (
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-xl border border-[rgba(15,110,110,0.15)] bg-white/70 px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
          <span className="text-[10px] font-medium text-[#0F6E6E]">WhatsApp Business · Instituto Alina</span>
        </div>
        <MiniChat
          rows={[
            { side: "r", text: "Hola, ¿siguen aceptando inscripciones para 2° de primaria?" },
            { side: "l", text: "¡Hola! Sí, seguimos. Soy el agente del Instituto. ¿Me compartes el nombre de tu hija?" },
            { side: "r", text: "Se llama Mariana, tiene 7 años." },
            { side: "l", text: "Para 2° la colegiatura es de $2,500 MXN/mes. ¿Agendo una visita esta semana?" },
            { side: "r", text: "¿Tienen martes en la mañana?" },
            { side: "l", text: "✅ Martes 10:00 AM con la directora. ¡Listo, queda agendado!" },
          ]}
        />
      </div>
    ),
  },
  {
    label: "PORTAL DE PADRES",
    headline: "Los papás, siempre informados.",
    sub: "Tareas, calificaciones, avisos y colegiatura — en un portal privado para cada familia, sin grupos de WhatsApp.",
    ui: (
      <div className="space-y-2.5">
        <div className="rounded-xl border border-[rgba(15,110,110,0.15)] bg-white/70 p-3">
          <p className="text-[9px] font-medium uppercase tracking-widest text-[#0F6E6E]">Mariana · 2° A</p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Promedio", val: "9.2" },
              { label: "Tareas", val: "3 pend." },
              { label: "Asistencia", val: "96%" },
            ].map((s) => (
              <div key={s.label} className="rounded-lg bg-[rgba(15,110,110,0.07)] py-2">
                <p className="text-sm font-bold text-[#0F6E6E]">{s.val}</p>
                <p className="text-[9px] text-[#6B7280]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-[rgba(15,110,110,0.15)] bg-white/70 p-3">
          <p className="text-[9px] font-medium uppercase tracking-widest text-[#6B7280]">Próximas tareas</p>
          <div className="mt-2 space-y-1.5">
            {[
              { sub: "Matemáticas", title: "Ejercicios pág. 45–47", due: "Vie 30 abr" },
              { sub: "Español", title: "Lectura: El principito cap. 3", due: "Jue 29 abr" },
            ].map((t) => (
              <div key={t.title} className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] text-[#0F6E6E]">{t.sub}</p>
                  <p className="text-[10px] font-medium text-[#1a1a1a]">{t.title}</p>
                </div>
                <span className="rounded-full bg-[rgba(244,183,64,0.2)] px-2 py-0.5 text-[9px] font-medium text-[#b45309]">
                  {t.due}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    label: "PANEL DE DIRECCIÓN",
    headline: "Tu escuela en tiempo real.",
    sub: "Conversaciones de admisión, grupos, maestros y reportes — sin hojas de Excel ni mensajes perdidos.",
    ui: (
      <div className="space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Conversaciones", value: "47", sub: "esta semana" },
            { label: "Visitas agendadas", value: "9", sub: "próximos 7 días" },
            { label: "Tasa de respuesta", value: "100%", sub: "promedio" },
            { label: "Familias inscritas", value: "138", sub: "activas" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-[rgba(15,110,110,0.15)] bg-white/70 p-3">
              <p className="text-lg font-bold text-[#0F6E6E]">{s.value}</p>
              <p className="text-[10px] font-medium text-[#1a1a1a]">{s.label}</p>
              <p className="text-[9px] text-[#9CA3AF]">{s.sub}</p>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-[rgba(15,110,110,0.15)] bg-white/70 p-3">
          <p className="text-[9px] font-medium uppercase tracking-widest text-[#6B7280]">Conversaciones recientes</p>
          <div className="mt-2 space-y-1.5">
            {[
              { name: "Sofía R.", grade: "1° · visita agendada", dot: "#22c55e" },
              { name: "Carlos M.", grade: "3° · en proceso", dot: "#F4B740" },
            ].map((c) => (
              <div key={c.name} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.dot }} />
                <span className="text-[10px] font-medium text-[#1a1a1a]">{c.name}</span>
                <span className="text-[9px] text-[#9CA3AF]">{c.grade}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    label: "PARA MAESTROS",
    headline: "Captura calificaciones hablando.",
    sub: "Audio, foto o texto al Profe Bot. Estructura, confirma y publica al grupo correcto. Sin abrir ningún dashboard.",
    ui: (
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-xl border border-[rgba(15,110,110,0.15)] bg-white/70 px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-[#0F6E6E]" />
          <span className="text-[10px] font-medium text-[#0F6E6E]">Profe Bot · 5°A</span>
        </div>
        <MiniChat
          rows={[
            { side: "r", text: "🎙️ Califiqué a Juan Pérez con 9 en el examen de fracciones" },
            { side: "l", text: "Listo. Guardé la calificación de Juan. ¿Algún comentario para sus papás?" },
            { side: "r", text: "📷 (foto de la libreta de calificaciones)" },
            { side: "l", text: "Detecté 18 calificaciones. ¿Confirmas que las guarde todas?" },
            { side: "r", text: "Sí, confírmalo." },
            { side: "l", text: "✅ 18 calificaciones guardadas. Los padres ya pueden verlas en su portal." },
          ]}
        />
      </div>
    ),
  },
  {
    label: "SETUP · 1 DÍA",
    headline: "Lo armas en una tarde. Sin código.",
    sub: "Cargas la info de tu escuela, conectas WhatsApp, y ese mismo día ya estás respondiendo familias reales.",
    ui: (
      <div className="space-y-4">
        <div className="rounded-xl border border-[rgba(15,110,110,0.15)] bg-white/70 p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-medium uppercase tracking-widest text-[#6B7280]">Progreso de configuración</p>
            <span className="rounded-full bg-[rgba(15,110,110,0.1)] px-2 py-0.5 text-[10px] font-bold text-[#0F6E6E]">
              08:42
            </span>
          </div>
          <div className="mt-3 space-y-2">
            <CheckItem done label="Datos de tu escuela" />
            <CheckItem done label="Colegiaturas y niveles" />
            <CheckItem done label="Horarios y calendario" />
            <CheckItem done label="Personalidad del agente" />
            <CheckItem done={false} label="Conectar WhatsApp" />
          </div>
        </div>
        <MiniStat label="Tiempo promedio de setup" value="< 1 día" accent />
        <MiniStat label="Líneas de código necesarias" value="0" />
      </div>
    ),
  },
] as const;

// ─── Componente principal ─────────────────────────────────────────────────────

export default function DemoCarousel() {
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(true);

  const goTo = useCallback((index: number) => {
    setVisible(false);
    setTimeout(() => {
      setActive(index);
      setVisible(true);
    }, 350);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      goTo((active + 1) % SCENES.length);
    }, SCENE_DURATION);
    return () => clearInterval(id);
  }, [active, goTo]);

  const scene = SCENES[active];

  return (
    <div className="relative mx-auto mt-12 overflow-hidden rounded-3xl border border-border bg-bg-elevated shadow-[0_40px_80px_-40px_rgba(15,110,110,0.35)]">
      {/* Barra superior */}
      <div className="flex items-center gap-2 border-b border-border bg-bg/60 px-5 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
        <span className="ml-3 text-[10px] font-medium uppercase tracking-widest text-fg-muted">
          {scene.label}
        </span>
      </div>

      {/* Contenido animado */}
      <div
        className="grid gap-0 sm:grid-cols-[1fr_1fr]"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(8px)",
          transition: "opacity 350ms ease, transform 350ms ease",
        }}
      >
        {/* Izquierda — texto */}
        <div className="flex flex-col justify-center p-8 text-left sm:p-10">
          <h3 className="font-display text-2xl font-semibold leading-snug tracking-tight text-fg sm:text-3xl">
            {scene.headline}
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-fg-muted">{scene.sub}</p>
        </div>

        {/* Derecha — mockup */}
        <div className="border-t border-border bg-[rgba(15,110,110,0.03)] p-6 sm:border-t-0 sm:border-l sm:p-8">
          {scene.ui}
        </div>
      </div>

      {/* Indicadores de escena */}
      <div className="flex items-center justify-center gap-2 border-t border-border bg-bg/60 px-5 py-3">
        {SCENES.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Ir a escena ${i + 1}`}
            className="group relative h-1.5 rounded-full transition-all duration-500"
            style={{
              width: i === active ? "2rem" : "0.375rem",
              background: i === active ? "#0F6E6E" : "rgba(15,110,110,0.25)",
            }}
          />
        ))}
        <span className="ml-3 text-[10px] text-fg-muted">
          {active + 1} / {SCENES.length}
        </span>
      </div>
    </div>
  );
}
