import Link from "next/link";

const STEPS = [
  {
    number: "01",
    time: "~15 min",
    title: "Datos de tu escuela",
    description:
      "Ingresa el nombre, horarios, colegiaturas por grado, modelo educativo y requisitos de admisión. El agente aprende todo esto para responder como si fuera tu secretaria.",
    details: [
      "Nombre y dirección",
      "Horario escolar",
      "Colegiaturas por grado",
      "Modelo educativo y diferenciadores",
      "Requisitos de inscripción",
    ],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
    color: "bg-blue-50 text-blue-600 border-blue-100",
    dot: "bg-blue-500",
  },
  {
    number: "02",
    time: "~20 min",
    title: "Alumnos y padres de familia",
    description:
      "Sube un archivo Excel o CSV con el listado de alumnos y sus padres. El sistema vincula automáticamente a cada papá con su hijo.",
    details: [
      "Nombre del alumno y grado",
      "Nombre del padre/madre",
      "Número de WhatsApp del padre",
      "Grupo o salón",
      "Estado de colegiatura",
    ],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    color: "bg-amber-50 text-amber-600 border-amber-100",
    dot: "bg-amber-500",
  },
  {
    number: "03",
    time: "~10 min",
    title: "Conectar WhatsApp Business",
    description:
      "Escaneas un código QR con tu celular — igual que WhatsApp Web. Tu número actual, sin cambiar nada. En menos de 10 minutos el agente ya está activo en tu línea.",
    details: [
      "Usar tu número actual",
      "Sin cambiar de celular",
      "Sin configuraciones técnicas",
      "Igual que WhatsApp Web",
      "Soporte en tiempo real si necesitas ayuda",
    ],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="text-green-500">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z M11.999 2C6.477 2 2 6.477 2 11.999c0 1.848.487 3.58 1.337 5.082L2 22l5.059-1.316A9.944 9.944 0 0 0 12 22c5.523 0 10-4.477 10-10.001C22 6.477 17.523 2 12 2z"/>
      </svg>
    ),
    color: "bg-green-50 text-green-600 border-green-100",
    dot: "bg-green-500",
  },
  {
    number: "04",
    time: "¡Listo!",
    title: "Tu escuela ya trabaja sola",
    description:
      "Desde este momento el agente responde admisiones 24/7, notifica a padres por WhatsApp y tú tienes el panel de director para ver todo en tiempo real.",
    details: [
      "Agente responde admisiones 24/7",
      "Padres reciben avisos al instante",
      "Dashboard de director en tiempo real",
      "Portal de padres activo",
      "Soporte School Connect incluido",
    ],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    ),
    color: "bg-primary/8 text-primary border-primary/15",
    dot: "bg-primary",
  },
];

export default function EmpezarPage() {
  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* Nav */}
      <header className="border-b border-border bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <svg width="26" height="26" viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="9" fill="#0F6E6E" />
              <path d="M28 20a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" stroke="white" strokeWidth="2.5" fill="none" />
              <circle cx="28" cy="12" r="3.5" fill="#F4B740" />
            </svg>
            <span className="font-semibold text-fg text-sm">School Connect</span>
          </Link>
          <Link
            href="/#beta"
            className="text-xs font-semibold text-white bg-primary px-4 py-1.5 rounded-full hover:bg-primary/90 transition-colors"
          >
            Solicitar acceso beta
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pt-16 pb-12 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-xs font-medium text-primary mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Setup en menos de 1 día
        </span>
        <h1 className="font-display text-4xl font-semibold text-fg tracking-tight sm:text-5xl">
          Tu escuela lista en{" "}
          <span className="text-primary">una tarde.</span>
        </h1>
        <p className="mt-5 text-lg text-fg-muted max-w-xl mx-auto">
          Sin código, sin técnicos, sin complicaciones.
          Te acompañamos en cada paso y en menos de un día
          el agente ya trabaja por ti.
        </p>

        {/* Tiempo total */}
        <div className="mt-8 inline-flex items-center gap-6 bg-white rounded-2xl border border-border px-6 py-4 shadow-sm">
          {[
            { value: "4", label: "pasos" },
            { value: "~45 min", label: "tiempo total" },
            { value: "0", label: "líneas de código" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-bold text-primary">{s.value}</p>
              <p className="text-xs text-fg-muted mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Steps */}
      <section className="mx-auto max-w-3xl px-6 pb-20 space-y-6">
        {STEPS.map((step, i) => (
          <div
            key={step.number}
            className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-start gap-5">
                {/* Step number + icon */}
                <div className="flex flex-col items-center gap-2 flex-shrink-0">
                  <div className={`h-11 w-11 rounded-xl border flex items-center justify-center ${step.color}`}>
                    {step.icon}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="w-px flex-1 min-h-[24px] bg-border" />
                  )}
                </div>

                <div className="flex-1 min-w-0 pb-2">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-bold text-fg-muted tracking-widest">PASO {step.number}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${step.color}`}>
                      {step.time}
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold text-fg mb-2">{step.title}</h2>
                  <p className="text-sm text-fg-muted leading-relaxed mb-4">{step.description}</p>

                  {/* Checklist */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-4">
                    {step.details.map((d) => (
                      <div key={d} className="flex items-center gap-2">
                        <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${step.dot}`} />
                        <span className="text-xs text-fg-muted">{d}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* CTA final */}
        <div className="bg-primary rounded-2xl p-8 text-center text-white">
          <p className="text-xs font-semibold tracking-widest uppercase opacity-70 mb-3">¿Lista para empezar?</p>
          <h3 className="font-display text-2xl font-semibold mb-2">
            Te acompañamos en todo el proceso
          </h3>
          <p className="text-sm opacity-80 mb-6 max-w-md mx-auto">
            Nuestro equipo está contigo en cada paso. En el onboarding te ayudamos a cargar los datos y conectar WhatsApp en tiempo real.
          </p>
          <Link
            href="/#beta"
            className="inline-block bg-white text-primary text-sm font-bold px-8 py-3 rounded-full hover:bg-white/90 transition-colors"
          >
            Solicitar acceso beta →
          </Link>
          <p className="mt-4 text-xs opacity-60">Beta gratuita · 10 escuelas en Mérida · Soporte incluido</p>
        </div>
      </section>
    </div>
  );
}
