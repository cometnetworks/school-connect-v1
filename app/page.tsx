import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BetaForm from "@/components/BetaForm";
import { pricing, site } from "@/lib/site";

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <Hero />
        <DemoSection />
        <SocialProof />
        <HowItWorks />
        <ForParents />
        <ForTeachers />
        <Pricing />
        <FAQ />
        <Beta />
      </main>
      <Footer />
    </>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-[600px] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(15,110,110,0.12),transparent_70%)]"
      />
      <div className="mx-auto max-w-6xl px-6 pt-16 pb-20 sm:pt-24 md:pb-32">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Beta abierta · 10 escuelas en Mérida
          </span>
          <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-fg sm:text-6xl">
            El agente IA que <span className="text-primary">conecta</span> tu
            escuela con los padres
          </h1>
          <p className="mt-6 text-lg text-fg-muted sm:text-xl">
            Responde admisiones por WhatsApp, agenda visitas y mantiene a los
            padres informados sobre tareas, calificaciones y comunicados —
            todo en un solo lugar. Diseñado para preescolar y primaria en México.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="#beta"
              className="inline-flex w-full items-center justify-center rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover sm:w-auto"
            >
              Aplicar a la beta
            </a>
            <a
              href="#como-funciona"
              className="inline-flex w-full items-center justify-center rounded-full border border-border bg-bg-elevated px-7 py-3.5 text-sm font-semibold text-fg transition-colors hover:border-border-strong sm:w-auto"
            >
              Cómo funciona
            </a>
          </div>
          <p className="mt-5 text-sm text-fg-muted">
            3 meses gratis · sin tarjeta · cancelas cuando quieras
          </p>
        </div>
      </div>
    </section>
  );
}

function Bubble({
  side,
  children,
}: {
  side: "left" | "right";
  children: React.ReactNode;
}) {
  const base = "max-w-[80%] rounded-2xl px-4 py-2.5 leading-relaxed";
  if (side === "left") {
    return (
      <div className="flex justify-start">
        <p className={`${base} bg-primary-soft text-fg`}>{children}</p>
      </div>
    );
  }
  return (
    <div className="flex justify-end">
      <p className={`${base} bg-primary text-white`}>{children}</p>
    </div>
  );
}

function DemoSection() {
  return (
    <section className="relative">
      <div
        aria-hidden
        className="absolute inset-x-0 top-1/2 -z-10 mx-auto h-[420px] max-w-5xl -translate-y-1/2 bg-[radial-gradient(50%_50%_at_30%_50%,rgba(15,110,110,0.12),transparent_70%),radial-gradient(40%_40%_at_75%_50%,rgba(244,183,64,0.18),transparent_70%)]"
      />
      <div className="mx-auto max-w-5xl px-6 py-24 text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-fg-muted">
          Demo
        </p>
        <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
          Mira a <span className="text-primary">School Connect</span>{" "}
          <em className="font-normal text-fg-muted">en un minuto.</em>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-fg-muted">
          Un padre escribe al WhatsApp de la escuela un domingo a las 9 PM.
          Así es como respondes, agendas la visita y mantienes a la dirección
          informada — todo en un solo flujo.
        </p>

        <div className="relative mx-auto mt-12 overflow-hidden rounded-3xl border border-border bg-bg-elevated shadow-[0_40px_80px_-40px_rgba(15,110,110,0.35)]">
          <div className="flex items-center gap-2 border-b border-border bg-bg/60 px-5 py-3 text-left">
            <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
            <span className="ml-3 flex items-center gap-2 text-xs text-fg-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              WhatsApp Business · Instituto Alina · en vivo
            </span>
          </div>

          <div className="grid gap-0 sm:grid-cols-[1fr_auto]">
            <div className="space-y-3 p-6 text-left text-sm sm:p-8">
              <Bubble side="right">
                Hola, ¿siguen aceptando inscripciones para 2° de primaria?
              </Bubble>
              <Bubble side="left">
                ¡Hola! Sí, sí seguimos. Soy el agente del Instituto. ¿Me
                compartes el nombre de tu hija y su edad para revisar?
              </Bubble>
              <Bubble side="right">Se llama Mariana, tiene 7 años.</Bubble>
              <Bubble side="left">
                Perfecto. Para 2° de primaria, la colegiatura es de
                <strong> $4,800 MXN</strong> al mes (10 mensualidades) e
                incluye comedor y dos talleres. La inscripción es por única
                vez. ¿Te late agendar una visita esta semana?
              </Bubble>
              <Bubble side="right">¿Tienen martes en la mañana?</Bubble>
              <Bubble side="left">
                Sí. Tengo el <strong>martes 10:00 AM</strong> con la
                directora, Miss Andrea. ¿Te lo aparto?
              </Bubble>
              <Bubble side="right">Sí porfa.</Bubble>
              <Bubble side="left">
                Listo, Mariana queda agendada el martes 10:00 AM. Te llegará
                un recordatorio 24 horas antes. Si necesitas cambiar el
                horario, escríbeme aquí mismo. ¡Nos vemos!
              </Bubble>
              <p className="pt-2 text-xs text-fg-muted">
                Mientras tanto, la directora ya recibió la ficha de Mariana
                en su panel.
              </p>
            </div>

            <div className="hidden border-l border-border bg-bg/50 p-6 text-left sm:block sm:w-72">
              <p className="text-xs font-medium uppercase tracking-widest text-primary">
                Panel de la dirección
              </p>
              <div className="mt-4 rounded-xl border border-border bg-bg-elevated p-4">
                <p className="text-xs text-fg-muted">Nueva visita agendada</p>
                <p className="mt-1 text-sm font-semibold text-fg">
                  Mariana · 2° primaria
                </p>
                <p className="mt-0.5 text-xs text-fg-muted">
                  Martes · 10:00 AM
                </p>
                <p className="mt-3 text-xs text-fg-muted">Mamá: 999 ··· 4567</p>
              </div>
              <div className="mt-4 grid gap-2 text-xs">
                <Stat label="Conversaciones esta semana" value="47" />
                <Stat label="Visitas agendadas" value="9" />
                <Stat label="Tasa de respuesta" value="100%" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-fg-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Conversación real del producto
          </span>
          <span aria-hidden>·</span>
          <span>Responde en segundos</span>
          <span aria-hidden>·</span>
          <span>Setup en 1 día</span>
        </div>

        <div className="mt-10">
          <a
            href="#beta"
            className="inline-flex items-center justify-center rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover"
          >
            Aplicar a la beta privada →
          </a>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-bg-elevated px-3 py-2">
      <span className="text-fg-muted">{label}</span>
      <span className="font-semibold text-fg">{value}</span>
    </div>
  );
}

function SocialProof() {
  return (
    <section className="border-y border-border bg-bg-elevated">
      <div className="mx-auto max-w-6xl px-6 py-10 text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-fg-muted">
          Construido sobre tecnología confiable
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-8 text-sm font-medium text-fg-muted">
          <span>WhatsApp Business</span>
          <span aria-hidden>·</span>
          <span>Cal.com</span>
          <span aria-hidden>·</span>
          <span>Convex</span>
          <span aria-hidden>·</span>
          <span>Claude IA</span>
          <span aria-hidden>·</span>
          <span>Netlify</span>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Cuéntanos de tu escuela",
      body: "Cargamos colegiaturas, modelo educativo, horarios y FAQs. El agente aprende el tono de tu escuela en 1 día.",
    },
    {
      n: "02",
      title: "Conectamos tu WhatsApp",
      body: "Activamos un número de WhatsApp Business con Kapso. Los padres escriben al mismo número que ya conocen.",
    },
    {
      n: "03",
      title: "Agenda visitas y comunica",
      body: "El agente responde 24/7, agenda visitas en Cal.com y manda recordatorios. Los padres existentes ven tareas y calificaciones de sus hijos.",
    },
  ];
  return (
    <section id="como-funciona" className="mx-auto max-w-6xl px-6 py-24">
      <h2 className="font-display text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
        Setup en un día. Sin grupos de WhatsApp saturados, sin Excel a las 11pm.
      </h2>
      <p className="mt-4 max-w-2xl text-fg-muted">
        Cambias 5 grupos de WhatsApp por un solo número que siempre responde,
        siempre informado, siempre con el tono de tu escuela.
      </p>
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {steps.map((s) => (
          <div
            key={s.n}
            className="rounded-2xl border border-border bg-bg-elevated p-7"
          >
            <span className="font-display text-sm font-medium text-accent-hover">
              {s.n}
            </span>
            <h3 className="mt-3 font-display text-xl font-semibold text-fg">
              {s.title}
            </h3>
            <p className="mt-2 text-sm text-fg-muted">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ForParents() {
  const features = [
    "Calendario escolar y eventos",
    "Tareas y fechas de entrega",
    "Calificaciones por bloque",
    "Comunicados oficiales (no más cadenas)",
    "Estado de colegiatura",
    "Reportes de avance del hijo",
  ];
  return (
    <section
      id="para-padres"
      className="mx-auto max-w-6xl px-6 py-24"
    >
      <div className="grid gap-12 md:grid-cols-2 md:items-center">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-primary">
            Para padres y madres
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
            Toda la información de tu hijo, en un solo chat.
          </h2>
          <p className="mt-4 text-fg-muted">
            Olvídate de cazar mensajes en 4 grupos distintos. Pregunta lo que
            necesites — el agente conoce a tu hijo y solo le da acceso a su
            información.
          </p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {features.map((f) => (
            <li
              key={f}
              className="flex items-start gap-3 rounded-xl border border-border bg-bg-elevated p-4"
            >
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent-hover">
                ✓
              </span>
              <span className="text-sm text-fg">{f}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ForTeachers() {
  return (
    <section className="bg-bg-elevated">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <div className="order-2 md:order-1">
            <div className="rounded-2xl border border-border bg-bg p-6">
              <p className="text-xs font-medium uppercase tracking-widest text-fg-muted">
                Profe Bot · 5°A
              </p>
              <div className="mt-4 space-y-3 text-sm">
                <Bubble side="right">
                  🎙️ <em>&ldquo;Califiqué a Juan Pérez con 9 en el examen de fracciones&rdquo;</em>
                </Bubble>
                <Bubble side="left">
                  Listo. Guardé la calificación de Juan Pérez. ¿Algún comentario para mostrar a sus papás?
                </Bubble>
                <Bubble side="right">
                  📷 <em>(foto de la libreta de calificaciones)</em>
                </Bubble>
                <Bubble side="left">
                  Detecté 18 calificaciones. ¿Confirmas que las guarde?
                </Bubble>
              </div>
            </div>
          </div>
          <div className="order-1 md:order-2">
            <p className="text-xs font-medium uppercase tracking-widest text-primary">
              Para maestros y dirección
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
              Captura calificaciones y tareas hablando o con una foto.
            </h2>
            <p className="mt-4 text-fg-muted">
              El maestro nunca abre un dashboard si no quiere. Manda un audio
              al Profe Bot, una foto de la libreta o un texto rápido — el
              agente lo estructura, lo confirma y lo publica al grupo correcto.
              Cambia entre grupos con{" "}
              <code className="rounded bg-primary-soft px-1.5 py-0.5 text-xs text-primary">
                /5A
              </code>{" "}
              o{" "}
              <code className="rounded bg-primary-soft px-1.5 py-0.5 text-xs text-primary">
                /3B
              </code>
              .
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="precios" className="mx-auto max-w-6xl px-6 py-24">
      <div className="text-center">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
          Precios simples. Una mensualidad por escuela.
        </h2>
        <p className="mt-4 text-fg-muted">
          Las primeras 10 escuelas reciben 3 meses gratis y 20% de descuento
          permanente.
        </p>
      </div>
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {pricing.map((p) => {
          const highlighted = "highlighted" in p && p.highlighted;
          return (
            <div
              key={p.plan}
              className={`rounded-2xl border p-7 ${
                highlighted
                  ? "border-primary bg-primary-soft shadow-[0_30px_60px_-30px_rgba(15,110,110,0.35)]"
                  : "border-border bg-bg-elevated"
              }`}
            >
              {highlighted && (
                <span className="mb-3 inline-block rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-fg">
                  Más popular
                </span>
              )}
              <h3 className="font-display text-xl font-semibold text-fg">
                {p.plan}
              </h3>
              <p className="mt-1 text-sm text-fg-muted">{p.students}</p>
              <p className="mt-5">
                <span className="font-display text-4xl font-semibold text-fg">
                  ${p.priceMxn.toLocaleString("es-MX")}
                </span>
                <span className="ml-2 text-sm text-fg-muted">MXN / mes</span>
              </p>
              <ul className="mt-6 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-fg">
                    <span className="mt-0.5 text-primary">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <p className="mt-8 text-center text-xs text-fg-muted">
        Setup gratis · sin contrato anual · datos alojados en infraestructura mexicana.
      </p>
    </section>
  );
}

function FAQ() {
  const items = [
    {
      q: "¿Necesito una nueva línea de WhatsApp?",
      a: "Sí, te ayudamos a configurar un número de WhatsApp Business dedicado para la escuela. Tarda entre 1 y 7 días dependiendo de la verificación de Meta.",
    },
    {
      q: "¿Mis maestros tienen que aprender una nueva app?",
      a: "No. Los maestros usan WhatsApp como siempre. El Profe Bot recibe sus audios, fotos y textos. La web es solo para correcciones masivas o boletas finales.",
    },
    {
      q: "¿Dónde se guardan los datos de los alumnos?",
      a: "En infraestructura segura cumpliendo con la LFPDPPP. Cada escuela ve únicamente sus datos. Los padres ven solo a sus hijos.",
    },
    {
      q: "¿Qué pasa si el agente no sabe responder?",
      a: "Lo escala automáticamente a una persona designada por la escuela y registra la pregunta para que la próxima vez sí pueda responderla.",
    },
    {
      q: "¿Cuánto cuesta después de los 3 meses gratis?",
      a: "Depende de tu plan (Starter desde $1,990 MXN/mes). Las primeras 10 escuelas reciben 20% de descuento de por vida.",
    },
    {
      q: "¿Se integra con mi sistema escolar actual?",
      a: "Si usas Excel o WhatsApp como hoy, no necesitas integrar nada. Si tienes un sistema escolar, evaluamos integración en plan Pro.",
    },
  ];
  return (
    <section id="faq" className="bg-bg-elevated">
      <div className="mx-auto max-w-3xl px-6 py-24">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
          Preguntas frecuentes
        </h2>
        <div className="mt-10 divide-y divide-border rounded-2xl border border-border bg-bg">
          {items.map((item) => (
            <details key={item.q} className="group p-6">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-left">
                <span className="font-medium text-fg">{item.q}</span>
                <span className="mt-1 text-fg-muted transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm text-fg-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Beta() {
  return (
    <section id="beta" className="mx-auto max-w-3xl px-6 py-24">
      <div className="text-center">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
          Aplica al programa beta
        </h2>
        <p className="mt-4 text-fg-muted">
          Primeras 10 escuelas en {site.pilotCity}. 3 meses gratis, 20% de
          descuento de por vida y soporte directo del equipo fundador.
        </p>
      </div>
      <div className="mt-10 rounded-3xl border border-border bg-bg-elevated p-6 sm:p-10">
        <BetaForm />
      </div>
    </section>
  );
}
