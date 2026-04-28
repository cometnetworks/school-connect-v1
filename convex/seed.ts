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
