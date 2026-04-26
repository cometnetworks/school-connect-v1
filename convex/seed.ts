import { mutation } from "./_generated/server";

export const insertAlina = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("schools")
      .withIndex("by_slug", (q) => q.eq("slug", "instituto-alina"))
      .first();
    if (existing) return { id: existing._id, note: "already exists" };

    const id = await ctx.db.insert("schools", {
      name: "Instituto Educativo Alina",
      slug: "instituto-alina",
      locale: "es-MX",
      timezone: "America/Merida",
      plan: "beta",
      studentCapacity: 300,
      isActive: true,
      onboardingStatus: "live",
      whatsappPhoneNumberId: "597907523413541",
      calComEventTypeId: "5493950",
      admissionsInfo: {
        gradesOffered: "1° a 6° de primaria",
        educationModel:
          "Educación primaria bilingüe (español-inglés) con certificación Progrentis reconocida internacionalmente. Sistema SEP con enfoque en desarrollo cognitivo y dominio del idioma inglés desde primero.",
        schedule: "Lunes a viernes de 7:00 AM a 3:00 PM",
        tuitionRanges: "$2,000 a $3,000 MXN al mes (según grado). 10 mensualidades al año. Inscripción anual por separado.",
        requirements:
          "Acta de nacimiento original, comprobante de domicilio reciente, certificado de kinder o preprimaria. Documentos en regla al momento de inscripción.",
        differentiators:
          "Bilingüe español-inglés desde 1°. Certificación Progrentis internacionalmente reconocida. Institución privada de educación básica con atención personalizada y grupos pequeños. Horario amplio 7 AM–3 PM.",
        visitInstructions:
          "Agendamos visitas de lunes a viernes en horario escolar. La directora te recibirá personalmente para mostrarte instalaciones y resolver todas tus dudas. Dura aprox. 45 minutos.",
        faqs:
          "¿Tienen transporte? Nos puedes preguntar directamente en la visita. ¿Cuántos alumnos por salón? Grupos reducidos para atención personalizada. ¿Cuándo inicia el ciclo? Agosto–julio calendario SEP.",
      },
    });

    return { id, note: "created" };
  },
});
