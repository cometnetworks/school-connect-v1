export const site = {
  name: "School Connect",
  tagline: "Conecta tu escuela con los padres",
  description:
    "Agente IA que responde admisiones, agenda visitas y mantiene a los padres informados — todo desde WhatsApp. Diseñado para preescolar y primaria en México.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  contactEmail: "hola@schoolconnect.mx",
  social: {
    whatsapp: "",
    instagram: "",
  },
  pilotCity: "Mérida, Yucatán",
} as const;

export const pricing = [
  {
    plan: "Starter",
    students: "Hasta 150 alumnos",
    priceMxn: 1990,
    features: [
      "Agente de admisiones en WhatsApp",
      "Agendado de visitas con Cal.com",
      "Portal de padres",
      "1,500 conversaciones / mes",
      "Soporte por correo",
    ],
  },
  {
    plan: "Growth",
    students: "151 a 400 alumnos",
    priceMxn: 3490,
    highlighted: true,
    features: [
      "Todo lo de Starter",
      "Captura por voz y foto (Profe Bot)",
      "Reportes de avance por alumno",
      "3,500 conversaciones / mes",
      "Soporte prioritario",
    ],
  },
  {
    plan: "Pro",
    students: "Más de 400 alumnos",
    priceMxn: 5990,
    features: [
      "Todo lo de Growth",
      "Integraciones a medida",
      "API y exportaciones",
      "Conversaciones ilimitadas*",
      "Onboarding dedicado",
    ],
  },
] as const;
