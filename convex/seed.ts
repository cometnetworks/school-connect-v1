import { mutation, internalMutation } from "./_generated/server";

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

/** Seed completo de datos demo para el Dashboard y Portal */
export const seedDemo = mutation({
  args: {},
  handler: async (ctx) => {
    // 1. Escuela
    let school = await ctx.db
      .query("schools")
      .withIndex("by_slug", (q) => q.eq("slug", "instituto-alina"))
      .first();
    if (!school) {
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
      });
      school = await ctx.db.get(id);
    }
    if (!school) throw new Error("Could not create school");
    const schoolId = school._id;

    // Verificar si ya hay datos demo
    const existingConvs = await ctx.db
      .query("conversations")
      .withIndex("by_school", (q) => q.eq("schoolId", schoolId))
      .take(1);
    if (existingConvs.length > 0) return { note: "demo data already exists" };

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    // 2. Conversaciones / Pipeline de admisiones
    const conversations = [
      { contactName: "Karla Mendoza", contactPhone: "+529991110001", status: "new" as const, interestStudentName: "Sofía Mendoza", interestGradeLevel: "2° primaria", lastMessageAt: now - 2 * 60 * 60 * 1000 },
      { contactName: "Roberto Díaz", contactPhone: "+529991110002", status: "new" as const, interestStudentName: "Emilio Díaz", interestGradeLevel: "1° primaria", lastMessageAt: now - 5 * 60 * 60 * 1000 },
      { contactName: "Fernanda Uc", contactPhone: "+529991110003", status: "qualified" as const, interestStudentName: "Valentina Uc", interestGradeLevel: "3° primaria", lastMessageAt: now - 1 * day },
      { contactName: "Jorge Cetina", contactPhone: "+529991110004", status: "qualified" as const, interestStudentName: "Andrés Cetina", interestGradeLevel: "4° primaria", lastMessageAt: now - 1.5 * day },
      { contactName: "Paola Herrera", contactPhone: "+529991110005", status: "visit_scheduled" as const, interestStudentName: "Isabella Herrera", interestGradeLevel: "1° primaria", lastMessageAt: now - 2 * day },
      { contactName: "Luis Peraza", contactPhone: "+529991110006", status: "visit_scheduled" as const, interestStudentName: "Mateo Peraza", interestGradeLevel: "2° primaria", lastMessageAt: now - 2 * day },
      { contactName: "Ana Canul", contactPhone: "+529991110007", status: "visited" as const, interestStudentName: "Regina Canul", interestGradeLevel: "3° primaria", lastMessageAt: now - 4 * day },
      { contactName: "Marco Poot", contactPhone: "+529991110008", status: "enrolled" as const, interestStudentName: "Diego Poot", interestGradeLevel: "1° primaria", lastMessageAt: now - 6 * day },
      { contactName: "Silvia Tun", contactPhone: "+529991110009", status: "enrolled" as const, interestStudentName: "Camila Tun", interestGradeLevel: "5° primaria", lastMessageAt: now - 8 * day },
      { contactName: "Eduardo May", contactPhone: "+529991110010", status: "lost" as const, interestStudentName: "Samuel May", interestGradeLevel: "2° primaria", lastMessageAt: now - 10 * day, lostReason: "Precio fuera de presupuesto" },
    ];

    const convIds: string[] = [];
    for (const c of conversations) {
      const id = await ctx.db.insert("conversations", {
        schoolId,
        channel: "whatsapp",
        ...c,
      });
      convIds.push(id);
    }

    // Mensajes demo en las primeras 3 conversaciones
    const msgScripts = [
      // Karla Mendoza — "new"
      [
        { direction: "inbound" as const, sender: "contact" as const, body: "Hola buenas tardes, me interesa inscribir a mi hija en primero" },
        { direction: "outbound" as const, sender: "agent" as const, body: "¡Hola Karla! Bienvenida al Instituto Educativo Alina 🎓 Con mucho gusto te ayudamos. ¿En qué grado le gustaría inscribir a tu hija y para cuándo la estarías considerando?" },
        { direction: "inbound" as const, sender: "contact" as const, body: "Para agosto, entraría a segundo de primaria" },
        { direction: "outbound" as const, sender: "agent" as const, body: "Perfecto, para 2° de primaria ciclo 2025-2026. La colegiatura es de $2,400 MXN mensuales. ¿Te gustaría agendar una visita para conocer las instalaciones y platicar con la directora?" },
        { direction: "inbound" as const, sender: "contact" as const, body: "Sí me interesa, ¿cuándo tienen disponibilidad?" },
      ],
      // Roberto Díaz — "new"
      [
        { direction: "inbound" as const, sender: "contact" as const, body: "Buenas, quiero información de primaria" },
        { direction: "outbound" as const, sender: "agent" as const, body: "¡Hola Roberto! Claro, ofrecemos educación primaria bilingüe español-inglés del 1° al 6° grado, con certificación Progrentis. Horario 7 AM a 3 PM. ¿Para qué grado sería?" },
        { direction: "inbound" as const, sender: "contact" as const, body: "Primero, mi hijo tiene 6 años" },
        { direction: "outbound" as const, sender: "agent" as const, body: "¡Perfecto! Para 1° de primaria tenemos cupo disponible. La colegiatura es de $2,000 MXN al mes. ¿Te cuento más sobre nuestro modelo educativo?" },
      ],
      // Fernanda Uc — "qualified"
      [
        { direction: "inbound" as const, sender: "contact" as const, body: "Hola, me pasan el número, quiero info de 3ro de primaria" },
        { direction: "outbound" as const, sender: "agent" as const, body: "¡Hola Fernanda! Para 3° de primaria la colegiatura es $2,400 MXN/mes. Somos bilingües con enfoque en desarrollo cognitivo. ¿Tu hija tiene experiencia previa con inglés?" },
        { direction: "inbound" as const, sender: "contact" as const, body: "Sí, estuvo en un colegio donde daban inglés pero no era bilingüe" },
        { direction: "outbound" as const, sender: "agent" as const, body: "Genial, encajará muy bien. Nuestro programa Progrentis refuerza el inglés desde dentro. ¿Quieres que agendemos una visita esta semana para que conozcas a la maestra de 3°?" },
        { direction: "inbound" as const, sender: "contact" as const, body: "Me interesa, ¿el jueves por la mañana tienen?" },
        { direction: "outbound" as const, sender: "agent" as const, body: "Déjame revisar disponibilidad... Tenemos el jueves a las 10:00 AM o 11:30 AM. ¿Cuál te queda mejor?" },
      ],
    ];

    for (let i = 0; i < Math.min(msgScripts.length, convIds.length); i++) {
      const convId = convIds[i] as unknown as import("./_generated/dataModel").Id<"conversations">;
      for (const msg of msgScripts[i]) {
        await ctx.db.insert("messages", { conversationId: convId, ...msg });
      }
    }

    // 3. Visitas agendadas
    await ctx.db.insert("visits", {
      schoolId,
      contactName: "Paola Herrera",
      contactPhone: "+529991110005",
      studentName: "Isabella Herrera",
      gradeLevel: "1° primaria",
      scheduledAt: now + 1 * day + 10 * 60 * 60 * 1000, // mañana 10 AM
      durationMinutes: 45,
      status: "confirmed",
    });
    await ctx.db.insert("visits", {
      schoolId,
      contactName: "Luis Peraza",
      contactPhone: "+529991110006",
      studentName: "Mateo Peraza",
      gradeLevel: "2° primaria",
      scheduledAt: now + 2 * day + 11 * 60 * 60 * 1000,
      durationMinutes: 45,
      status: "scheduled",
    });
    await ctx.db.insert("visits", {
      schoolId,
      contactName: "Gloria Chan",
      contactPhone: "+529991110011",
      studentName: "Lucas Chan",
      gradeLevel: "3° primaria",
      scheduledAt: now + 4 * day + 9 * 60 * 60 * 1000,
      durationMinutes: 45,
      status: "scheduled",
    });

    // 4. Grupo y alumnos (para el portal de padres)
    const groupId = await ctx.db.insert("groups", {
      schoolId,
      name: "2° A",
      gradeLevel: "2° primaria",
      cycleYear: "2025-2026",
    });

    const teacherUserId = await ctx.db.insert("users", {
      fullName: "Mtra. Carmen López",
      email: "carmen.lopez@institutoalina.mx",
    });
    await ctx.db.insert("groupTeachers", {
      groupId,
      teacherUserId,
      subject: "Titular",
      isHomeroom: true,
    });

    // Alumno demo
    const studentId = await ctx.db.insert("students", {
      schoolId,
      fullName: "Sofía Mendoza García",
      birthDate: "2018-03-15",
      gradeLevel: "2° primaria",
      isActive: true,
    });
    await ctx.db.insert("studentGroups", { studentId, groupId });

    // Parent user
    const parentUserId = await ctx.db.insert("users", {
      fullName: "Karla Mendoza",
      email: "karla.mendoza@gmail.com",
      phone: "+529991110001",
    });
    await ctx.db.insert("parentStudentLinks", {
      studentId,
      parentUserId,
      relation: "Madre",
      canPickup: true,
    });

    // 5. Avisos
    const authorId = teacherUserId;
    await ctx.db.insert("announcements", {
      schoolId,
      authorUserId: authorId,
      title: "Festival de Primavera — Viernes 2 de mayo",
      body: "Invitamos a todas las familias a nuestro Festival de Primavera el próximo viernes 2 de mayo a las 10:00 AM en el patio principal. Los alumnos presentarán números artísticos preparados durante el mes. Entrada libre.",
      publishedAt: now - 2 * day,
      sendViaWhatsapp: true,
    });
    await ctx.db.insert("announcements", {
      schoolId,
      groupId,
      authorUserId: authorId,
      title: "Proyecto de Ciencias — entrega 30 de abril",
      body: "Recordamos a los alumnos de 2° A que el miércoles 30 de abril es la fecha límite para entregar el proyecto de Ciencias Naturales: \"El ciclo del agua\". Deben incluir maqueta o lámina ilustrada.",
      publishedAt: now - 1 * day,
      sendViaWhatsapp: false,
    });
    await ctx.db.insert("announcements", {
      schoolId,
      authorUserId: authorId,
      title: "Suspensión de clases — 1 de mayo",
      body: "Les recordamos que el jueves 1 de mayo es día festivo (Día del Trabajo). No hay clases. Reanudan actividades el viernes 2 de mayo con el Festival de Primavera.",
      publishedAt: now - 3 * day,
      sendViaWhatsapp: true,
    });

    // 6. Tareas
    await ctx.db.insert("assignments", {
      groupId,
      teacherUserId,
      subject: "Español",
      title: "Lectura: Cap. 4 de \"El principito\"",
      description: "Leer el capítulo 4 y escribir un párrafo con la idea principal. Mínimo 5 oraciones.",
      dueDate: now + 2 * day,
      createdAt: now - 1 * day,
    });
    await ctx.db.insert("assignments", {
      groupId,
      teacherUserId,
      subject: "Matemáticas",
      title: "Ejercicios de multiplicación — pág. 38",
      description: "Completar los 20 ejercicios de la página 38 del libro de Matemáticas. Mostrar procedimiento.",
      dueDate: now + 3 * day,
      createdAt: now - 2 * day,
    });
    await ctx.db.insert("assignments", {
      groupId,
      teacherUserId,
      subject: "Ciencias Naturales",
      title: "Maqueta: El ciclo del agua",
      description: "Proyecto final del bimestre. Entregar maqueta o lámina ilustrada explicando el ciclo del agua.",
      dueDate: now + 4 * day,
      createdAt: now - 5 * day,
    });

    // 7. Calificaciones
    const gradeData = [
      { subject: "Español", period: "Bim 2", score: 9.2 },
      { subject: "Matemáticas", period: "Bim 2", score: 8.7 },
      { subject: "Ciencias Naturales", period: "Bim 2", score: 9.5 },
      { subject: "Inglés", period: "Bim 2", score: 9.8 },
      { subject: "Educación Física", period: "Bim 2", score: 10 },
      { subject: "Historia", period: "Bim 2", score: 8.4 },
      { subject: "Español", period: "Bim 1", score: 8.8 },
      { subject: "Matemáticas", period: "Bim 1", score: 8.2 },
    ];
    for (const g of gradeData) {
      await ctx.db.insert("grades", {
        studentId,
        teacherUserId,
        ...g,
        capturedAt: now - 5 * day,
      });
    }

    // 8. Eventos escolares
    await ctx.db.insert("events", {
      schoolId,
      title: "Festival de Primavera",
      description: "Presentación artística de todos los grupos. Entrada libre para familias.",
      startsAt: now + 6 * day + 10 * 60 * 60 * 1000,
      endsAt: now + 6 * day + 12 * 60 * 60 * 1000,
      audience: "all",
    });
    await ctx.db.insert("events", {
      schoolId,
      title: "Día del Maestro",
      description: "Celebración en honor a todos los docentes del instituto.",
      startsAt: now + 9 * day + 9 * 60 * 60 * 1000,
      audience: "all",
    });
    await ctx.db.insert("events", {
      schoolId,
      title: "Entrega de boletas — 2° Bimestre",
      description: "Entrega de boleta física. Los padres deben pasar a recogerla con identificación.",
      startsAt: now + 12 * day + 8 * 60 * 60 * 1000,
      endsAt: now + 12 * day + 14 * 60 * 60 * 1000,
      audience: "all",
    });

    // 9. Colegiaturas
    await ctx.db.insert("tuitionInvoices", {
      studentId,
      schoolId,
      period: "Abril 2026",
      amount: 2400,
      currency: "MXN",
      dueDate: now - 5 * day,
      paidAt: now - 3 * day,
      status: "paid",
    });
    await ctx.db.insert("tuitionInvoices", {
      studentId,
      schoolId,
      period: "Mayo 2026",
      amount: 2400,
      currency: "MXN",
      dueDate: now + 5 * day,
      status: "pending",
    });

    return { note: "demo seed complete", schoolId, studentId };
  },
});

/** Fix: quita el whatsappPhoneNumberId de Santa Cruz para que Alina sea la única en el webhook */
export const fixSantaCruzPhone = mutation({
  args: {},
  handler: async (ctx) => {
    const santaCruz = await ctx.db
      .query("schools")
      .withIndex("by_slug", (q) => q.eq("slug", "instituto-santa-cruz"))
      .first();
    if (!santaCruz) return { note: "Santa Cruz no encontrado" };
    await ctx.db.patch(santaCruz._id, { whatsappPhoneNumberId: undefined });
    return { fixed: true, id: santaCruz._id };
  },
});

/** Debug: muestra el contactPhone exacto de las últimas conversaciones */
export const debugPhones = mutation({
  args: {},
  handler: async (ctx) => {
    const school = await ctx.db
      .query("schools")
      .withIndex("by_slug", (q) => q.eq("slug", "instituto-alina"))
      .first();
    if (!school) return [];

    const convs = await ctx.db
      .query("conversations")
      .withIndex("by_school", (q) => q.eq("schoolId", school._id))
      .order("desc")
      .take(5);

    return convs.map((c) => ({
      contactName: c.contactName,
      contactPhone: c.contactPhone,
      phoneLength: c.contactPhone?.length,
      phoneChars: c.contactPhone?.split("").map((ch) => ch.charCodeAt(0)),
      lastMessageAt: new Date(c.lastMessageAt).toISOString(),
    }));
  },
});

/** Debug: verifica la cadena completa del lookup de padres */
export const debugParentLookup = mutation({
  args: {},
  handler: async (ctx) => {
    // 1. ¿Existe Aurora con el teléfono correcto?
    const aurora = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", "529998022013"))
      .first();

    if (!aurora) return { step: "FAIL: Aurora no encontrada con 529998022013" };

    // 2. ¿Tiene parentStudentLinks?
    const links = await ctx.db
      .query("parentStudentLinks")
      .withIndex("by_parent", (q) => q.eq("parentUserId", aurora._id))
      .collect();

    if (links.length === 0) return { step: "FAIL: Sin parentStudentLinks para Aurora", auroraId: aurora._id };

    // 3. ¿El alumno existe y tiene schoolId correcto?
    const student = await ctx.db.get(links[0].studentId);
    const school = await ctx.db
      .query("schools")
      .withIndex("by_slug", (q) => q.eq("slug", "instituto-alina"))
      .first();

    return {
      step: "OK",
      aurora: { id: aurora._id, phone: aurora.phone, name: aurora.fullName },
      linksCount: links.length,
      student: student ? { id: student._id, name: student.fullName, schoolId: student.schoolId } : null,
      alinaSchoolId: school?._id,
      schoolMatch: student?.schoolId === school?._id,
    };
  },
});

/** Corrige el teléfono de Aurora al formato que envía Kapso (sin +) */
export const fixAuroraPhone = mutation({
  args: {},
  handler: async (ctx) => {
    // Buscar con "+" y actualizar a sin "+"
    const withPlus = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", "+529998022013"))
      .first();
    if (withPlus) {
      await ctx.db.patch(withPlus._id, { phone: "529998022013" });
      return { updated: true, id: withPlus._id };
    }
    const withoutPlus = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", "529998022013"))
      .first();
    return { updated: false, note: "ya estaba correcto o no existe", found: !!withoutPlus };
  },
});

/** Agrega mensajes demo a las conversaciones existentes (idempotente) */
export const seedMessages = mutation({
  args: {},
  handler: async (ctx) => {
    const school = await ctx.db
      .query("schools")
      .withIndex("by_slug", (q) => q.eq("slug", "instituto-alina"))
      .first();
    if (!school) return { note: "school not found" };

    const convs = await ctx.db
      .query("conversations")
      .withIndex("by_school", (q) => q.eq("schoolId", school._id))
      .order("asc")
      .take(3);

    const scripts = [
      [
        { direction: "inbound" as const, sender: "contact" as const, body: "Hola buenas tardes, me interesa inscribir a mi hija en segundo de primaria" },
        { direction: "outbound" as const, sender: "agent" as const, body: "¡Hola Karla! Bienvenida al Instituto Educativo Alina 🎓 Con mucho gusto te ayudamos. Para 2° de primaria la colegiatura es de $2,400 MXN mensuales. ¿Te gustaría agendar una visita para conocer las instalaciones?" },
        { direction: "inbound" as const, sender: "contact" as const, body: "Sí me interesa, ¿cuándo tienen disponibilidad?" },
        { direction: "outbound" as const, sender: "agent" as const, body: "Tenemos disponibilidad el martes y jueves por la mañana. ¿Alguno de esos días le queda bien?" },
        { direction: "inbound" as const, sender: "contact" as const, body: "El martes a las 10 estaría perfecto" },
      ],
      [
        { direction: "inbound" as const, sender: "contact" as const, body: "Buenas, quiero información de primaria, mi hijo tiene 6 años" },
        { direction: "outbound" as const, sender: "agent" as const, body: "¡Hola Roberto! Para 1° de primaria tenemos cupo disponible. Somos bilingües español-inglés con certificación Progrentis. Colegiatura $2,000 MXN/mes. ¿Le cuento más?" },
        { direction: "inbound" as const, sender: "contact" as const, body: "Sí, ¿qué horario manejan?" },
        { direction: "outbound" as const, sender: "agent" as const, body: "Horario de 7:00 AM a 3:00 PM, lunes a viernes. ¿Desea agendar una visita para conocernos?" },
      ],
      [
        { direction: "inbound" as const, sender: "contact" as const, body: "Hola, me pasan el número. Busco colegio para mi hija de 3ro de primaria" },
        { direction: "outbound" as const, sender: "agent" as const, body: "¡Hola Fernanda! Para 3° de primaria la colegiatura es $2,400 MXN/mes. Somos bilingüe español-inglés con programa Progrentis. ¿Tu hija tiene experiencia con inglés?" },
        { direction: "inbound" as const, sender: "contact" as const, body: "Sí, estuvo en un colegio con inglés como materia" },
        { direction: "outbound" as const, sender: "agent" as const, body: "Perfecto, encajará muy bien. ¿Quieres agendar una visita esta semana para conocer las instalaciones y platicar con la directora?" },
        { direction: "inbound" as const, sender: "contact" as const, body: "¿El jueves por la mañana tienen disponibilidad?" },
        { direction: "outbound" as const, sender: "agent" as const, body: "Tenemos el jueves a las 10:00 AM o 11:30 AM. ¿Cuál le queda mejor?" },
        { direction: "inbound" as const, sender: "contact" as const, body: "Las 10 está bien" },
        { direction: "outbound" as const, sender: "agent" as const, body: "¡Listo! Quedamos el jueves a las 10:00 AM. La directora los recibirá en la entrada principal. ¿Confirmas tu nombre completo para el registro?" },
      ],
    ];

    let added = 0;
    for (let i = 0; i < convs.length; i++) {
      const existing = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) => q.eq("conversationId", convs[i]._id))
        .take(1);
      if (existing.length > 0) continue; // ya tiene mensajes
      for (const msg of scripts[i]) {
        await ctx.db.insert("messages", { conversationId: convs[i]._id, ...msg });
        added++;
      }
    }
    return { added };
  },
});

/**
 * Seed de datos reales del demo con Alina:
 * - Zaíd Cedillo (alumno real)
 * - Aurora Oscoy (mamá, +52 999 802 2013)
 * - Instituto Santa Cruz (escuela ficticia para Cristhian como prospecto)
 */
export const seedAlinaDemo = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    // ── Instituto Alina ──────────────────────────────────────────────
    let alina = await ctx.db
      .query("schools")
      .withIndex("by_slug", (q) => q.eq("slug", "instituto-alina"))
      .first();
    if (!alina) throw new Error("Instituto Alina no encontrado — corre seedDemo primero");
    const alinaId = alina._id;

    // Verificar si Zaíd ya existe
    const existingZaid = await ctx.db
      .query("students")
      .withIndex("by_school", (q) => q.eq("schoolId", alinaId))
      .filter((q) => q.eq(q.field("fullName"), "Zaíd Cedillo"))
      .first();
    if (existingZaid) return { note: "Zaíd ya existe", studentId: existingZaid._id };

    // Grupo 2°A (puede que ya exista)
    let grupo2A = await ctx.db
      .query("groups")
      .withIndex("by_school", (q) => q.eq("schoolId", alinaId))
      .filter((q) => q.eq(q.field("name"), "2° A"))
      .first();
    if (!grupo2A) {
      const gid = await ctx.db.insert("groups", {
        schoolId: alinaId,
        name: "2° A",
        gradeLevel: "2° primaria",
        cycleYear: "2025-2026",
      });
      grupo2A = await ctx.db.get(gid);
    }
    if (!grupo2A) throw new Error("No se pudo crear grupo 2°A");
    const groupId = grupo2A._id;

    // Maestra (puede existir)
    let maestra = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "carmen.lopez@institutoalina.mx"))
      .first();
    if (!maestra) {
      const mid = await ctx.db.insert("users", {
        fullName: "Mtra. Carmen López",
        email: "carmen.lopez@institutoalina.mx",
      });
      maestra = await ctx.db.get(mid);
    }
    if (!maestra) throw new Error("No se pudo crear maestra");
    const maestraId = maestra._id;

    // GroupTeacher si no existe
    const existingGT = await ctx.db
      .query("groupTeachers")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .first();
    if (!existingGT) {
      await ctx.db.insert("groupTeachers", {
        groupId,
        teacherUserId: maestraId,
        subject: "Titular",
        isHomeroom: true,
      });
    }

    // ── Zaíd Cedillo ────────────────────────────────────────────────
    const zaidId = await ctx.db.insert("students", {
      schoolId: alinaId,
      fullName: "Zaíd Cedillo",
      birthDate: "2018-08-10",
      gradeLevel: "2° primaria",
      isActive: true,
    });
    await ctx.db.insert("studentGroups", { studentId: zaidId, groupId });

    // ── Aurora Oscoy (mamá) ─────────────────────────────────────────
    // Kapso envía números sin "+" → guardamos ambos formatos buscando el que ya exista
    const existingAurora = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", "529998022013"))
      .first() ?? await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", "+529998022013"))
      .first();

    const auroraId = existingAurora?._id ?? await ctx.db.insert("users", {
      fullName: "Aurora Oscoy",
      phone: "529998022013", // sin "+" — formato que envía Kapso
    });
    await ctx.db.insert("parentStudentLinks", {
      studentId: zaidId,
      parentUserId: auroraId,
      relation: "Madre",
      canPickup: true,
    });

    // ── Cristhian Cedillo (papá) ────────────────────────────────────
    const cristhianId = await ctx.db.insert("users", {
      fullName: "Cristhian Cedillo",
      phone: "+529998022014", // número placeholder — actualizar si es necesario
    });
    await ctx.db.insert("parentStudentLinks", {
      studentId: zaidId,
      parentUserId: cristhianId,
      relation: "Padre",
      canPickup: true,
    });

    // ── Calificaciones de Zaíd ──────────────────────────────────────
    const califs = [
      { subject: "Español", score: 9.0 },
      { subject: "Matemáticas", score: 9.5 },
      { subject: "Ciencias Naturales", score: 8.8 },
      { subject: "Inglés", score: 10 },
      { subject: "Historia", score: 8.5 },
      { subject: "Educación Física", score: 10 },
    ];
    for (const c of califs) {
      await ctx.db.insert("grades", {
        studentId: zaidId,
        teacherUserId: maestraId,
        subject: c.subject,
        period: "Bim 2",
        score: c.score,
        capturedAt: now - 3 * day,
      });
    }

    // ── Tareas próximas para Zaíd ───────────────────────────────────
    await ctx.db.insert("assignments", {
      groupId,
      teacherUserId: maestraId,
      subject: "Español",
      title: "Redacción: Mi animal favorito",
      description: "Escribir una redacción de mínimo 10 oraciones sobre tu animal favorito. Incluir descripción, hábitat y por qué te gusta.",
      dueDate: now + 2 * day,
      createdAt: now - 1 * day,
    });
    await ctx.db.insert("assignments", {
      groupId,
      teacherUserId: maestraId,
      subject: "Matemáticas",
      title: "Tablas de multiplicar del 6 al 9",
      description: "Memorizar y practicar las tablas del 6 al 9. El miércoles habrá dictado en clase.",
      dueDate: now + 3 * day,
      createdAt: now - 2 * day,
    });

    // ── Colegiatura de Zaíd ─────────────────────────────────────────
    await ctx.db.insert("tuitionInvoices", {
      studentId: zaidId,
      schoolId: alinaId,
      period: "Abril 2026",
      amount: 2400,
      currency: "MXN",
      dueDate: now - 5 * day,
      paidAt: now - 3 * day,
      status: "paid",
    });
    await ctx.db.insert("tuitionInvoices", {
      studentId: zaidId,
      schoolId: alinaId,
      period: "Mayo 2026",
      amount: 2400,
      currency: "MXN",
      dueDate: now + 7 * day,
      status: "pending",
    });

    // ── Instituto Santa Cruz (para demo de Cristhian como prospecto) ─
    const santaCruzExisting = await ctx.db
      .query("schools")
      .withIndex("by_slug", (q) => q.eq("slug", "instituto-santa-cruz"))
      .first();

    if (!santaCruzExisting) {
      await ctx.db.insert("schools", {
        name: "Instituto Santa Cruz",
        slug: "instituto-santa-cruz",
        locale: "es-MX",
        timezone: "America/Merida",
        plan: "beta",
        studentCapacity: 250,
        isActive: true,
        onboardingStatus: "live",
        whatsappPhoneNumberId: undefined, // sin número propio — usa Alina para el demo
        calComEventTypeId: "5493950",
        admissionsInfo: {
          gradesOffered: "Preescolar y 1° a 6° de primaria",
          educationModel: "Educación primaria con valores católicos. Sistema SEP, enfoque en disciplina, respeto y excelencia académica.",
          schedule: "Lunes a viernes de 7:30 AM a 2:30 PM",
          tuitionRanges: "$1,800 a $2,500 MXN al mes según grado. Inscripción anual requerida.",
          requirements: "Acta de nacimiento, comprobante de domicilio, certificado del grado anterior.",
          differentiators: "Formación en valores, grupos pequeños, instalaciones deportivas, clases de natación opcionales.",
          visitInstructions: "Visitas de lunes a viernes por las mañanas. Llamar al coordinador para confirmar horario.",
          faqs: "¿Tienen transporte? Sí, cubrimos colonias del norte de Mérida. ¿Tienen uniforme? Sí, se adquiere en la escuela.",
        },
      });
    }

    return {
      note: "Seed Alina demo completo",
      zaidId,
      auroraPhone: "+529998022013",
    };
  },
});

/** Debug: muestra TODAS las escuelas y su whatsappPhoneNumberId */
export const debugAllSchools = mutation({
  args: {},
  handler: async (ctx) => {
    const schools = await ctx.db.query("schools").collect();
    return schools.map((s) => ({
      id: s._id,
      name: s.name,
      slug: s.slug,
      whatsappPhoneNumberId: s.whatsappPhoneNumberId ?? "(none)",
    }));
  },
});

/** Debug: busca conversaciones de Aurora en CUALQUIER escuela */
export const debugAuroraConversations = mutation({
  args: {},
  handler: async (ctx) => {
    // Buscar por teléfono con y sin "+"
    const phones = ["529998022013", "+529998022013"];
    const results = [];
    for (const phone of phones) {
      const convs = await ctx.db
        .query("conversations")
        .withIndex("by_phone", (q) => q.eq("contactPhone", phone))
        .collect();
      for (const c of convs) {
        const school = await ctx.db.get(c.schoolId);
        results.push({
          convId: c._id,
          phone,
          schoolName: school?.name ?? "unknown",
          schoolId: c.schoolId,
          lastMessageAt: new Date(c.lastMessageAt).toISOString(),
          status: c.status,
        });
      }
    }
    return results.length > 0 ? results : { note: "No conversations found for Aurora's phone" };
  },
});

/** Fuerza el whatsappPhoneNumberId de Alina y elimina de Santa Cruz */
export const forceFixPhoneRouting = mutation({
  args: {},
  handler: async (ctx) => {
    const ALINA_PHONE_ID = "597907523413541";

    // Patch todos los schools que tengan ese phone ID excepto Alina
    const allSchools = await ctx.db.query("schools").collect();
    const fixed = [];
    for (const school of allSchools) {
      if (school.whatsappPhoneNumberId === ALINA_PHONE_ID && school.slug !== "instituto-alina") {
        await ctx.db.patch(school._id, { whatsappPhoneNumberId: undefined });
        fixed.push({ id: school._id, name: school.name, action: "cleared" });
      }
    }

    // Verificar que Alina siga teniendo el ID correcto
    const alina = await ctx.db
      .query("schools")
      .withIndex("by_slug", (q) => q.eq("slug", "instituto-alina"))
      .first();

    return {
      fixed,
      alinaPhone: alina?.whatsappPhoneNumberId ?? "(missing!)",
      totalSchools: allSchools.length,
    };
  },
});

/** Seed de eventos escolares y avisos para el demo */
export const seedEventsAndAnnouncements = mutation({
  args: {},
  handler: async (ctx) => {
    const school = await ctx.db
      .query("schools")
      .withIndex("by_slug", (q) => q.eq("slug", "instituto-alina"))
      .first();
    if (!school) return { note: "Alina no encontrada" };

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    // Verificar si ya hay eventos
    const existingEvents = await ctx.db
      .query("events")
      .withIndex("by_school", (q) => q.eq("schoolId", school._id))
      .take(1);

    if (existingEvents.length === 0) {
      await ctx.db.insert("events", {
        schoolId: school._id,
        title: "Día del Niño — Festival escolar",
        description: "Celebración con actividades, concursos y convivio para todos los alumnos. Los papás están invitados a partir de las 10 AM.",
        startsAt: now + 3 * day,
        endsAt: now + 3 * day + 4 * 60 * 60 * 1000,
        audience: "all",
      });
      await ctx.db.insert("events", {
        schoolId: school._id,
        title: "Junta de padres — 2° A",
        description: "Reunión con la Mtra. Carmen para revisar avances del bimestre. Obligatoria para todos los padres del grupo.",
        startsAt: now + 7 * day,
        endsAt: now + 7 * day + 90 * 60 * 1000,
        audience: "group",
      });
      await ctx.db.insert("events", {
        schoolId: school._id,
        title: "Examen de Inglés — 2° grado",
        description: "Evaluación bimestral de inglés. Repasar vocabulario del Unit 4 y el presente simple.",
        startsAt: now + 5 * day,
        audience: "grade",
        gradeLevel: "2° primaria",
      });
    }

    // Verificar si ya hay avisos
    const existingAnnouncements = await ctx.db
      .query("announcements")
      .withIndex("by_school", (q) => q.eq("schoolId", school._id))
      .take(1);

    if (existingAnnouncements.length === 0) {
      // Necesitamos un authorUserId — buscamos a la maestra
      const maestra = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", "carmen.lopez@institutoalina.mx"))
        .first();
      if (maestra) {
        await ctx.db.insert("announcements", {
          schoolId: school._id,
          authorUserId: maestra._id,
          title: "Cambio de horario — Semana del 30 de abril",
          body: "Recordamos a los papás que el miércoles 30 de abril no hay clases por conmemoración del Día del Trabajo. El jueves 1° de mayo regresamos a horario normal.",
          publishedAt: now - 1 * day,
          sendViaWhatsapp: false,
        });
        await ctx.db.insert("announcements", {
          schoolId: school._id,
          authorUserId: maestra._id,
          title: "Solicitud de materiales — Mayo",
          body: "Para el proyecto de Ciencias del mes de mayo, cada alumno deberá traer: una lupa pequeña, libreta de apuntes y colores de madera. Traerlos antes del viernes 2.",
          publishedAt: now - 2 * day,
          sendViaWhatsapp: false,
        });
      }
    }

    return { note: "Eventos y avisos sembrados correctamente" };
  },
});

/**
 * Enriquece la información de Instituto Alina con datos reales y detallados:
 * calendario SEP 2025-2026, costos completos, juntas y vida escolar.
 * Idempotente — se puede correr múltiples veces.
 */
export const enrichAlinaInfo = mutation({
  args: {},
  handler: async (ctx) => {
    const alina = await ctx.db
      .query("schools")
      .withIndex("by_slug", (q) => q.eq("slug", "instituto-alina"))
      .first();
    if (!alina) return { note: "Instituto Alina no encontrado" };

    await ctx.db.patch(alina._id, {
      admissionsInfo: {
        // ── Oferta educativa ───────────────────────────────────────────
        gradesOffered: "1° a 6° de primaria (ciclo completo de educación básica primaria)",

        educationModel:
          "Educación primaria bilingüe español-inglés con certificación Progrentis reconocida internacionalmente. " +
          "Sistema SEP con plan de estudios enriquecido. Enfoque en desarrollo cognitivo, dominio del inglés desde 1° grado " +
          "y habilidades del siglo XXI. Grupos reducidos (máx 20 alumnos) para atención personalizada.",

        schedule:
          "Lunes a viernes de 7:00 AM a 3:00 PM. " +
          "Horario extendido opcional de cuidado hasta las 4:00 PM (cupo limitado, costo adicional). " +
          "Los viernes de Consejo Técnico Escolar no hay clases para los alumnos (aprox. 1 vez al mes, se avisa con anticipación).",

        differentiators:
          "✓ Bilingüe español-inglés desde 1° grado. " +
          "✓ Certificación Progrentis con reconocimiento internacional. " +
          "✓ Grupos pequeños (máx 20 alumnos) para atención personalizada. " +
          "✓ Instalaciones modernas: laboratorio de cómputo, biblioteca, canchas deportivas. " +
          "✓ Talleres extracurriculares: ajedrez, danza, robótica (costo adicional). " +
          "✓ Sistema de comunicación digital con padres vía WhatsApp y portal web.",

        // ── Costos detallados ──────────────────────────────────────────
        costsDetail:
          // PROVISIONAL: montos 2026-2027 pendientes de confirmar con la directora
          "Montos de referencia ciclo 2026-2027; la directora confirma el monto final en la visita.\n\n" +
          "INSCRIPCIÓN (pago único anual, ciclo 2026-2027):\n" +
          "• 1° y 2° primaria: $6,800 MXN\n" +
          "• 3° y 4° primaria: $7,300 MXN\n" +
          "• 5° y 6° primaria: $7,900 MXN\n\n" +
          "COLEGIATURA MENSUAL (10 mensualidades: septiembre a junio):\n" +
          "• 1° primaria: $2,100 MXN/mes\n" +
          "• 2° primaria: $2,300 MXN/mes\n" +
          "• 3° primaria: $2,500 MXN/mes\n" +
          "• 4° primaria: $2,500 MXN/mes\n" +
          "• 5° primaria: $2,700 MXN/mes\n" +
          "• 6° primaria: $2,900 MXN/mes\n\n" +
          "POLÍTICA DE PAGO:\n" +
          "• Colegiatura: primeros 10 días de cada mes.\n" +
          "• Del día 11 en adelante: recargo de $120 MXN.\n" +
          "• Descuento por pago puntual los primeros 5 días: $100 MXN.\n" +
          "• Descuento hermanos inscritos: 10% en la colegiatura del segundo hijo.\n\n" +
          "ÚTILES ESCOLARES:\n" +
          "• Lista de útiles se entrega al inscribirse (costo aproximado $800-1,200 MXN según grado).\n" +
          "• Libros de texto SEP gratuitos provistos por la escuela.\n" +
          "• Libro de inglés Progrentis: incluido en inscripción.\n\n" +
          "UNIFORME:\n" +
          "• Uniforme diario (pants azul marino + polo blanco con logo): $1,200 MXN aprox.\n" +
          "• Uniforme de deportes (pants gris + playera gris): $850 MXN aprox.\n" +
          "• Se adquiere directamente con el proveedor autorizado (datos al inscribirse).\n\n" +
          "EXTRACURRICULARES OPCIONALES (cobro aparte):\n" +
          "• Ajedrez: $350 MXN/mes\n" +
          "• Danza folclórica: $400 MXN/mes\n" +
          "• Robótica: $500 MXN/mes\n" +
          "• Cuidado extendido (3-4 PM): $800 MXN/mes",

        // ── Calendario escolar SEP 2026-2027 ──────────────────────────
        // PROVISIONAL: basado en el calendario SEP publicado en medios (jul 2026);
        // vacaciones de invierno y CTE de 2027 pueden variar — confirmar con la escuela.
        schoolCalendar:
          "CICLO ESCOLAR 2026-2027:\n" +
          "• Inicio de clases: lunes 31 de agosto de 2026\n" +
          "• Fin de ciclo: viernes 9 de julio de 2027\n\n" +
          "PERÍODOS VACACIONALES:\n" +
          "• Vacaciones de invierno: 21 de diciembre 2026 al 5 de enero 2027 (regreso a clases miércoles 6 de enero)\n" +
          "• Semana Santa: 22 de marzo al 2 de abril de 2027\n\n" +
          "DÍAS FESTIVOS SIN CLASES (oficiales SEP):\n" +
          "• Miércoles 16 de septiembre 2026 — Día de la Independencia\n" +
          "• Lunes 2 de noviembre 2026 — Día de Muertos\n" +
          "• Lunes 16 de noviembre 2026 — Revolución Mexicana\n" +
          "• Lunes 1 de febrero 2027 — Día de la Constitución\n" +
          "• Lunes 15 de marzo 2027 — Natalicio de Benito Juárez\n" +
          "• Miércoles 5 de mayo 2027 — Batalla de Puebla\n\n" +
          "TRIMESTRES (períodos de evaluación, Nueva Escuela Mexicana):\n" +
          "• 1er Trimestre: 31 agosto – 27 noviembre 2026\n" +
          "• 2do Trimestre: 30 noviembre 2026 – 12 marzo 2027\n" +
          "• 3er Trimestre: 16 marzo – 9 julio 2027\n\n" +
          "CONSEJOS TÉCNICOS ESCOLARES (viernes sin clases para alumnos):\n" +
          "• 25 de septiembre 2026\n" +
          "• 30 de octubre 2026\n" +
          "• 27 de noviembre 2026\n" +
          "• 29 de enero 2027\n" +
          "• 26 de febrero 2027\n" +
          "• 26 de marzo 2027 (cae en Semana Santa)\n" +
          "• 30 de abril 2027\n" +
          "• 28 de mayo 2027\n" +
          "• 25 de junio 2027\n" +
          "(Se confirma con circular oficial cada mes)",

        // ── Juntas de padres y evaluaciones ───────────────────────────
        parentMeetings:
          "JUNTAS DE PADRES DE FAMILIA (obligatorias):\n" +
          "• Junta de inicio de ciclo: viernes 4 de septiembre de 2026, 5:00 PM\n" +
          "• Junta 1er trimestre: viernes 4 de diciembre de 2026, 5:00 PM\n" +
          "• Junta 2do trimestre: viernes 19 de marzo de 2027, 5:00 PM\n" +
          "• Junta de fin de ciclo: viernes 9 de julio de 2027, 10:00 AM\n\n" +
          "ENTREGA DE BOLETAS:\n" +
          "• 1er trimestre: semana del 30 de noviembre al 4 de diciembre de 2026\n" +
          "• 2do trimestre: semana del 15 al 19 de marzo de 2027\n" +
          "• 3er trimestre / fin de ciclo: 9 de julio de 2027\n\n" +
          "CITAS CON MAESTRAS (Mtra. Carmen López, grupo 2°A):\n" +
          "• Martes y jueves de 1:15 PM a 2:00 PM (previa cita)\n" +
          "• Se agenda vía WhatsApp al sistema de comunicación de la escuela.\n\n" +
          "CITAS CON DIRECCIÓN:\n" +
          "• Lunes, miércoles y viernes de 12:00 PM a 2:00 PM\n" +
          "• Se agenda vía WhatsApp o en la recepción de la escuela.\n\n" +
          "EVALUACIONES (fechas aproximadas por trimestre):\n" +
          "• 1er trimestre: 23-26 de noviembre 2026\n" +
          "• 2do trimestre: 8-12 de marzo 2027\n" +
          "• 3er trimestre: 28 de junio - 2 de julio 2027",

        // ── Vida escolar ───────────────────────────────────────────────
        schoolLife:
          "EVENTOS ESCOLARES IMPORTANTES 2026-2027:\n" +
          "• Semana de bienvenida: 31 agosto - 4 septiembre 2026\n" +
          "• Ceremonia de Independencia: martes 15 de septiembre 2026 (circular previa)\n" +
          "• Festival de Día de Muertos (altar y concurso de calaveritas): jueves 29 de octubre 2026\n" +
          "• Festival de Navidad: viernes 18 de diciembre 2026, 10:00 AM\n" +
          "• Día del Amor y la Amistad: viernes 12 de febrero 2027 (evento interno)\n" +
          "• Día del Niño: jueves 29 de abril 2027, festival con actividades especiales\n" +
          "• Festival del Día de las Madres: viernes 7 de mayo 2027\n" +
          "• Día del Maestro: sábado 15 de mayo 2027 (convivio el viernes 14)\n" +
          "• Kermés de fin de ciclo: junio 2027 (fecha por confirmar)\n" +
          "• Clausura y ceremonia de graduación 6°: 9 de julio 2027\n\n" +
          "SERVICIOS INCLUIDOS:\n" +
          "• Seguro escolar de accidentes incluido en la colegiatura.\n" +
          "• Acceso al portal digital para padres (calificaciones, tareas, avisos).\n" +
          "• Comunicación directa con maestros vía WhatsApp escolar.\n" +
          "• Sanitización diaria de instalaciones.\n\n" +
          "COMITÉ DE PADRES:\n" +
          "• Se elige en la junta de inicio de ciclo (agosto).\n" +
          "• Coordina eventos especiales y apoya proyectos de mejora.\n\n" +
          "REGLAMENTO ESCOLAR:\n" +
          "• Uniforme obligatorio de lunes a jueves. Viernes: uniforme deportivo.\n" +
          "• Puntualidad: entrada máxima 7:15 AM (posterior a esa hora se registra retardo).\n" +
          "• Dispositivos electrónicos: no permitidos para alumnos durante clases.\n" +
          "• Salida: solo con adulto autorizado registrado en la escuela.",

        // ── Requisitos ─────────────────────────────────────────────────
        requirements:
          "DOCUMENTOS PARA INSCRIPCIÓN:\n" +
          "• Acta de nacimiento original + 2 copias\n" +
          "• CURP del alumno (impresa)\n" +
          "• Comprobante de domicilio reciente (máx 3 meses)\n" +
          "• Certificado o constancia del último grado cursado\n" +
          "• Cartilla de vacunación completa (copia)\n" +
          "• 4 fotografías tamaño infantil a color\n" +
          "• Identificación oficial del padre/madre o tutor\n" +
          "• Comprobante de pago de inscripción\n\n" +
          "PROCESO DE ADMISIÓN:\n" +
          "1. Visita de conocimiento (presencial, 45 min) — sin costo.\n" +
          "2. Solicitud de inscripción y entrega de documentos.\n" +
          "3. Evaluación de ubicación de grado (si viene de otra escuela).\n" +
          "4. Pago de inscripción para reservar lugar.\n" +
          "5. Entrega de lista de útiles y datos de proveedor de uniforme.",

        // ── Visitas ────────────────────────────────────────────────────
        visitInstructions:
          "Las visitas son de lunes a viernes de 8:00 AM a 1:00 PM. " +
          "Duran aproximadamente 45 minutos. " +
          "La directora te recibe personalmente para mostrarte las instalaciones, " +
          "presentarte con los maestros y resolver todas tus dudas. " +
          "No hay costo y no necesitas traer documentos para la visita. " +
          "Solo agenda tu horario por este WhatsApp y te confirmamos.",

        // ── FAQs ───────────────────────────────────────────────────────
        faqs:
          "¿Tienen transporte escolar? No contamos con transporte propio, pero te podemos recomendar servicio privado de camionetas en la zona.\n" +
          "¿Cuántos alumnos hay por salón? Máximo 20 alumnos por grupo para garantizar atención personalizada.\n" +
          "¿El inglés es desde 1°? Sí, inmersión bilingüe desde primer grado con maestro nativo o bilingüe certificado.\n" +
          "¿Se aceptan alumnos a mitad de ciclo? Sí, sujeto a disponibilidad de lugar en el grado. Se hace evaluación de nivel.\n" +
          "¿Tienen descuento para hermanos? Sí, 10% de descuento en la colegiatura del segundo hijo inscrito.\n" +
          "¿Cómo se comunican los avisos? Por WhatsApp a través del sistema escolar y en el portal de padres.\n" +
          "¿El seguro escolar cubre qué? Accidentes dentro y fuera del plantel durante horario escolar. No incluye enfermedades.\n" +
          "¿Cuándo inicia el siguiente ciclo escolar? El ciclo 2026-2027 inició el 31 de agosto de 2026 y aún hay lugares en algunos grados. Inscripciones para el ciclo 2027-2028 abren en marzo de 2027.\n" +
          "¿Tienen prepa o secundaria? Solo primaria (1° a 6°). Al terminar 6° te orientamos con secundarias afines a nuestro modelo.",

        tuitionRanges:
          "$2,100 a $2,900 MXN/mes según grado. Inscripción: $6,800 a $7,900 MXN. 10 mensualidades por ciclo (referencia 2026-2027).",
      },
    });

    return { updated: true, school: alina.name };
  },
});

/** Registra el teléfono de la Mtra. Carmen López (maestra de Zaíd) */
export const setCarmenPhone = mutation({
  args: {},
  handler: async (ctx) => {
    // Buscar por email
    const carmen = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "carmen.lopez@institutoalina.mx"))
      .first();
    if (!carmen) return { note: "Carmen no encontrada — corre seedAlinaDemo primero" };

    // Verificar si ya tiene el teléfono correcto
    if (carmen.phone === "529901030316") return { note: "Ya tiene el teléfono correcto", id: carmen._id };

    await ctx.db.patch(carmen._id, { phone: "529901030316" });
    return { updated: true, id: carmen._id, phone: "529901030316" };
  },
});

/** Registra el teléfono de la directora demo en Instituto Alina */
export const setAlinaDirectorPhone = mutation({
  args: {},
  handler: async (ctx) => {
    const alina = await ctx.db
      .query("schools")
      .withIndex("by_slug", (q) => q.eq("slug", "instituto-alina"))
      .first();
    if (!alina) return { note: "Alina no encontrada" };
    await ctx.db.patch(alina._id, { directorPhone: "525614159461" });
    return { updated: true, directorPhone: "525614159461" };
  },
});

/**
 * Pasa el demo al ciclo 2026-2027 (octubre 2026): Zaíd a 3° A, calificaciones
 * parciales del 1er trimestre, tareas, eventos, avisos y colegiaturas actuales.
 * No borra nada: los datos del ciclo anterior quedan como historial.
 * Idempotente — si ya existe el grupo 3° A 2026-2027, no hace nada.
 */
export const refreshDemo2026 = mutation({
  args: {},
  handler: async (ctx) => {
    // Fechas absolutas en hora de Mérida (UTC-6)
    const at = (isoLocal: string) => new Date(`${isoLocal}-06:00`).getTime();

    const school = await ctx.db
      .query("schools")
      .withIndex("by_slug", (q) => q.eq("slug", "instituto-alina"))
      .first();
    if (!school) return { note: "Instituto Alina no encontrado" };
    const schoolId = school._id;

    const existingGroup = await ctx.db
      .query("groups")
      .withIndex("by_school", (q) => q.eq("schoolId", schoolId))
      .filter((q) =>
        q.and(q.eq(q.field("name"), "3° A"), q.eq(q.field("cycleYear"), "2026-2027")),
      )
      .first();
    if (existingGroup) return { note: "Demo 2026-2027 ya existe", groupId: existingGroup._id };

    const carmen = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "carmen.lopez@institutoalina.mx"))
      .first();
    if (!carmen) return { note: "Mtra. Carmen no encontrada" };

    const zaid = await ctx.db
      .query("students")
      .withIndex("by_school", (q) => q.eq("schoolId", schoolId))
      .filter((q) => q.eq(q.field("fullName"), "Zaíd Cedillo"))
      .first();
    if (!zaid) return { note: "Zaíd no encontrado" };

    // ── Grupo 3° A y cambio de grado ────────────────────────────────
    const groupId = await ctx.db.insert("groups", {
      schoolId,
      name: "3° A",
      gradeLevel: "3° primaria",
      cycleYear: "2026-2027",
    });
    await ctx.db.insert("groupTeachers", {
      groupId,
      teacherUserId: carmen._id,
      subject: "Titular",
      isHomeroom: true,
    });
    await ctx.db.patch(zaid._id, { gradeLevel: "3° primaria" });

    // Se reutiliza el vínculo existente: el portal toma el primer studentGroup
    const sgLinks = await ctx.db
      .query("studentGroups")
      .withIndex("by_student", (q) => q.eq("studentId", zaid._id))
      .collect();
    if (sgLinks.length > 0) {
      await ctx.db.patch(sgLinks[0]._id, { groupId });
    } else {
      await ctx.db.insert("studentGroups", { studentId: zaid._id, groupId });
    }

    // ── Calificaciones parciales 1er trimestre ──────────────────────
    const period = "1er Trimestre (parcial)";
    const califs = [
      { subject: "Lenguajes (Español)", score: 9.2 },
      { subject: "Saberes y Pensamiento Científico (Matemáticas)", score: 8.8 },
      { subject: "Ética, Naturaleza y Sociedades", score: 9.0 },
      { subject: "De lo Humano y lo Comunitario", score: 9.5 },
      { subject: "Inglés", score: 9.8 },
      { subject: "Educación Física", score: 10 },
    ];
    for (const c of califs) {
      await ctx.db.insert("grades", {
        studentId: zaid._id,
        teacherUserId: carmen._id,
        subject: c.subject,
        period,
        score: c.score,
        note: "Avance parcial al 9 de octubre; la calificación trimestral se entrega del 30 de nov al 4 de dic.",
        capturedAt: at("2026-10-09T14:00:00"),
      });
    }

    // ── Tareas del grupo 3° A ───────────────────────────────────────
    const tareas = [
      {
        subject: "Lenguajes (Español)",
        title: "Lectura: leyenda de Xtabentún",
        description: "Leer la leyenda maya y escribir un resumen de 8 oraciones con su opinión personal.",
        dueDate: at("2026-10-19T08:00:00"),
        createdAt: at("2026-10-13T13:00:00"),
      },
      {
        subject: "Saberes y Pensamiento Científico (Matemáticas)",
        title: "Tablas de multiplicar del 6 al 9",
        description: "Practicar las tablas del 6 al 9. El miércoles 21 habrá dictado en clase.",
        dueDate: at("2026-10-21T08:00:00"),
        createdAt: at("2026-10-14T13:00:00"),
      },
      {
        subject: "Inglés",
        title: "Unit 2 vocabulary — My Community",
        description: "Completar las páginas 18 y 19 del libro Progrentis y estudiar el vocabulario de lugares de la ciudad.",
        dueDate: at("2026-10-23T08:00:00"),
        createdAt: at("2026-10-14T13:30:00"),
      },
      {
        subject: "De lo Humano y lo Comunitario",
        title: "Materiales para el altar de Día de Muertos",
        description: "Traer una foto o dibujo de un ser querido o personaje histórico y una flor de cempasúchil para el altar del grupo.",
        dueDate: at("2026-10-27T08:00:00"),
        createdAt: at("2026-10-15T09:00:00"),
      },
    ];
    for (const t of tareas) {
      await ctx.db.insert("assignments", { groupId, teacherUserId: carmen._id, ...t });
    }

    // ── Eventos próximos ────────────────────────────────────────────
    const eventos = [
      {
        title: "Festival de Día de Muertos",
        description: "Altar de muertos por grupo y concurso de calaveritas literarias. Familias invitadas a partir de las 10:00 AM.",
        startsAt: at("2026-10-29T10:00:00"),
        endsAt: at("2026-10-29T12:00:00"),
        audience: "all" as const,
      },
      {
        title: "Consejo Técnico Escolar — sin clases",
        description: "No hay clases para los alumnos por sesión de Consejo Técnico Escolar.",
        startsAt: at("2026-10-30T07:00:00"),
        audience: "all" as const,
      },
      {
        title: "Día de Muertos — sin clases",
        description: "Suspensión de clases. Regresamos el martes 3 de noviembre.",
        startsAt: at("2026-11-02T07:00:00"),
        audience: "all" as const,
      },
      {
        title: "Revolución Mexicana — sin clases",
        description: "Día festivo oficial. No hay clases.",
        startsAt: at("2026-11-16T07:00:00"),
        audience: "all" as const,
      },
      {
        title: "Evaluaciones del 1er trimestre",
        description: "Semana de evaluaciones del primer trimestre, del lunes 23 al jueves 26 de noviembre.",
        startsAt: at("2026-11-23T07:00:00"),
        endsAt: at("2026-11-26T15:00:00"),
        audience: "all" as const,
      },
      {
        title: "Junta de padres — 3° A (entrega de boletas)",
        description: "Entrega de boletas del 1er trimestre con la Mtra. Carmen López. Asistencia obligatoria.",
        startsAt: at("2026-12-04T17:00:00"),
        endsAt: at("2026-12-04T18:30:00"),
        audience: "group" as const,
        groupId,
      },
      {
        title: "Festival de Navidad",
        description: "Presentación navideña de todos los grupos en el patio principal.",
        startsAt: at("2026-12-18T10:00:00"),
        endsAt: at("2026-12-18T12:00:00"),
        audience: "all" as const,
      },
    ];
    for (const e of eventos) {
      await ctx.db.insert("events", { schoolId, ...e });
    }

    // ── Avisos recientes ────────────────────────────────────────────
    await ctx.db.insert("announcements", {
      schoolId,
      authorUserId: carmen._id,
      title: "Festival de Día de Muertos — jueves 29 de octubre",
      body: "Las familias están invitadas a nuestro altar y concurso de calaveritas el jueves 29 a las 10:00 AM. Los alumnos pueden venir con maquillaje de catrina o catrín.",
      publishedAt: at("2026-10-14T12:00:00"),
      sendViaWhatsapp: true,
    });
    await ctx.db.insert("announcements", {
      schoolId,
      authorUserId: carmen._id,
      title: "Sin clases viernes 30 de octubre y lunes 2 de noviembre",
      body: "El viernes 30 hay Consejo Técnico Escolar y el lunes 2 es Día de Muertos. Regresamos a clases el martes 3 de noviembre en horario normal.",
      publishedAt: at("2026-10-13T12:00:00"),
      sendViaWhatsapp: true,
    });
    await ctx.db.insert("announcements", {
      schoolId,
      groupId,
      authorUserId: carmen._id,
      title: "3° A — Altar del grupo",
      body: "Para el altar del grupo, cada alumno debe traer a más tardar el martes 27 una foto o dibujo de un ser querido o personaje histórico y una flor de cempasúchil.",
      publishedAt: at("2026-10-15T09:00:00"),
      sendViaWhatsapp: false,
    });

    // ── Colegiaturas ────────────────────────────────────────────────
    // Cerrar pendientes del ciclo anterior para que no aparezcan como adeudo
    const oldInvoices = await ctx.db
      .query("tuitionInvoices")
      .withIndex("by_student", (q) => q.eq("studentId", zaid._id))
      .collect();
    for (const inv of oldInvoices) {
      if (inv.status !== "paid") {
        await ctx.db.patch(inv._id, { status: "paid", paidAt: inv.dueDate });
      }
    }
    const colegiaturas = [
      { period: "Septiembre 2026", dueDate: at("2026-09-10T23:59:00"), paidAt: at("2026-09-04T11:00:00"), status: "paid" as const },
      { period: "Octubre 2026", dueDate: at("2026-10-10T23:59:00"), paidAt: at("2026-10-08T11:00:00"), status: "paid" as const },
      { period: "Noviembre 2026", dueDate: at("2026-11-10T23:59:00"), status: "pending" as const },
    ];
    for (const c of colegiaturas) {
      await ctx.db.insert("tuitionInvoices", {
        studentId: zaid._id,
        schoolId,
        amount: 2500, // 3° primaria — monto provisional 2026-2027
        currency: "MXN",
        ...c,
      });
    }

    return { note: "Demo 2026-2027 listo", groupId, zaidId: zaid._id };
  },
});
