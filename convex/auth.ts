import { action, internalMutation, internalQuery, mutation, query, MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError, v } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { normalizeMxPhone, phoneVariants, samePhone } from "./lib/phone";
import { getSchoolSession, getSessionByToken, sha256Hex } from "./lib/session";

/**
 * Acceso por WhatsApp con OTP inverso:
 * 1. startLogin: el portal pide un código para un teléfono.
 * 2. El usuario ENVÍA el código al WhatsApp de la escuela (link wa.me).
 * 3. verifyLoginCode (desde el webhook): si el número que lo envía coincide
 *    y está registrado, la solicitud queda "verified".
 * 4. completeLogin: el navegador canjea su secreto por un token de sesión.
 *
 * Así no se necesitan plantillas de Meta para mandar el código.
 */

const LOGIN_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sin 0/O, 1/I/L

function randomCode(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// ── 1. Iniciar acceso ────────────────────────────────────────────────

export const startLogin = action({
  args: { schoolSlug: v.string(), phone: v.string() },
  handler: async (ctx, { schoolSlug, phone }): Promise<{
    code: string;
    secret: string;
    waLink: string;
    expiresAt: number;
  }> => {
    const normalized = normalizeMxPhone(phone);
    if (!/^52\d{10}$/.test(normalized)) {
      throw new ConvexError("Escribe tu número de WhatsApp a 10 dígitos.");
    }

    const school = await ctx.runQuery(internal.schools.getBySlug, { slug: schoolSlug });
    if (!school?.whatsappNumber) {
      throw new ConvexError("Esta escuela aún no tiene WhatsApp configurado.");
    }

    const code = `SC-${randomCode(6)}`;
    const secret = randomHex(32);
    const expiresAt = Date.now() + LOGIN_TTL_MS;

    await ctx.runMutation(internal.auth.createLoginRequest, {
      schoolId: school._id,
      phone: normalized,
      code,
      secretHash: await sha256Hex(secret),
      expiresAt,
    });

    const schoolNumber = school.whatsappNumber.replace(/\D/g, "");
    const text = `Mi código de acceso al portal es ${code}`;
    return {
      code,
      secret,
      waLink: `https://wa.me/${schoolNumber}?text=${encodeURIComponent(text)}`,
      expiresAt,
    };
  },
});

export const createLoginRequest = internalMutation({
  args: {
    schoolId: v.id("schools"),
    phone: v.string(),
    code: v.string(),
    secretHash: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const windowStart = Date.now() - LOGIN_TTL_MS;
    const recent = await ctx.db
      .query("loginRequests")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .filter((q) => q.gt(q.field("_creationTime"), windowStart))
      .collect();
    if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
      throw new ConvexError("Demasiados intentos. Espera unos minutos e intenta de nuevo.");
    }
    await ctx.db.insert("loginRequests", { ...args, status: "pending" });
  },
});

// ── 2. Estado (el navegador lo observa en tiempo real) ───────────────

export const loginStatus = query({
  args: { secret: v.string() },
  handler: async (ctx, { secret }) => {
    const secretHash = await sha256Hex(secret);
    const req = await ctx.db
      .query("loginRequests")
      .withIndex("by_secret", (q) => q.eq("secretHash", secretHash))
      .first();
    return req ? { status: req.status } : null;
  },
});

// ── 3. Verificación desde el webhook de WhatsApp ─────────────────────

async function resolveIdentity(
  ctx: MutationCtx,
  school: Doc<"schools">,
  phone: string,
): Promise<{ role: "parent" | "director"; userId?: Doc<"users">["_id"]; displayName: string } | null> {
  if (school.directorPhone && samePhone(school.directorPhone, phone)) {
    return { role: "director", displayName: "Dirección" };
  }
  for (const variant of phoneVariants(phone)) {
    const user = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", variant))
      .first();
    if (!user) continue;
    const links = await ctx.db
      .query("parentStudentLinks")
      .withIndex("by_parent", (q) => q.eq("parentUserId", user._id))
      .collect();
    for (const link of links) {
      const student = await ctx.db.get(link.studentId);
      if (student?.schoolId === school._id) {
        return { role: "parent", userId: user._id, displayName: user.fullName };
      }
    }
  }
  return null;
}

/** Devuelve el texto de respuesta que se le manda por WhatsApp a quien envió el código */
export const verifyLoginCode = internalMutation({
  args: { schoolId: v.id("schools"), phone: v.string(), code: v.string() },
  handler: async (ctx, { schoolId, phone, code }): Promise<string> => {
    const school = await ctx.db.get(schoolId);
    if (!school) return "No pudimos validar tu código. Intenta de nuevo desde el portal.";

    const req = await ctx.db
      .query("loginRequests")
      .withIndex("by_code", (q) => q.eq("code", code))
      .filter((q) => q.eq(q.field("schoolId"), schoolId))
      .first();

    if (!req || req.status !== "pending" || req.expiresAt < Date.now()) {
      return "Ese código no es válido o ya expiró. Genera uno nuevo en el portal.";
    }
    if (!samePhone(req.phone, phone)) {
      return "Este código se generó para otro número de WhatsApp. Revisa el número que escribiste en el portal y vuelve a intentarlo.";
    }

    const identity = await resolveIdentity(ctx, school, phone);
    if (!identity) {
      await ctx.db.patch(req._id, { status: "rejected" });
      return `Tu número no está registrado en ${school.name}. Pide a la dirección que lo agregue para poder entrar al portal.`;
    }

    await ctx.db.patch(req._id, {
      status: "verified",
      ...identity,
      expiresAt: Date.now() + LOGIN_TTL_MS, // tiempo para que el navegador canjee
    });

    const firstName = identity.displayName.split(" ")[0];
    return (
      `✅ Listo, ${firstName}. Ya puedes regresar al portal de ${school.name}.\n\n` +
      `Si no fuiste tú, responde *CERRAR SESIÓN* y cerramos todos tus accesos.`
    );
  },
});

/** "CERRAR SESIÓN" por WhatsApp: revoca todas las sesiones de ese número */
export const revokeSessionsByPhone = internalMutation({
  args: { schoolId: v.id("schools"), phone: v.string() },
  handler: async (ctx, { schoolId, phone }): Promise<number> => {
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_phone", (q) => q.eq("phone", normalizeMxPhone(phone)))
      .filter((q) => q.eq(q.field("schoolId"), schoolId))
      .collect();
    for (const s of sessions) await ctx.db.delete(s._id);
    return sessions.length;
  },
});

// ── 4. Canjear la solicitud verificada por un token de sesión ────────

export const completeLogin = action({
  args: { secret: v.string() },
  handler: async (ctx, { secret }): Promise<{ token: string }> => {
    const token = randomHex(32);
    await ctx.runMutation(internal.auth.createSession, {
      secretHash: await sha256Hex(secret),
      tokenHash: await sha256Hex(token),
    });
    return { token };
  },
});

export const createSession = internalMutation({
  args: { secretHash: v.string(), tokenHash: v.string() },
  handler: async (ctx, { secretHash, tokenHash }) => {
    const req = await ctx.db
      .query("loginRequests")
      .withIndex("by_secret", (q) => q.eq("secretHash", secretHash))
      .first();
    if (!req || req.status !== "verified" || req.expiresAt < Date.now() || !req.role) {
      throw new ConvexError("El acceso expiró. Genera un código nuevo.");
    }
    await ctx.db.patch(req._id, { status: "consumed" });
    await ctx.db.insert("sessions", {
      tokenHash,
      schoolId: req.schoolId,
      phone: req.phone,
      role: req.role,
      userId: req.userId,
      displayName: req.displayName,
      expiresAt: Date.now() + SESSION_TTL_MS,
    });
  },
});

// ── Sesión actual ────────────────────────────────────────────────────

export const me = query({
  args: { schoolSlug: v.string(), sessionToken: v.string() },
  handler: async (ctx, { schoolSlug, sessionToken }) => {
    const auth = await getSchoolSession(ctx, sessionToken, schoolSlug);
    if (!auth) return null;
    return {
      role: auth.session.role,
      displayName: auth.session.displayName ?? "",
      schoolName: auth.school.name,
    };
  },
});

export const logout = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const session = await getSessionByToken(ctx, sessionToken);
    if (session) await ctx.db.delete(session._id);
  },
});

/** Para actions, que no tienen acceso directo a la DB */
export const validateSession = internalQuery({
  args: { schoolSlug: v.string(), sessionToken: v.string() },
  handler: async (ctx, { schoolSlug, sessionToken }) => {
    const auth = await getSchoolSession(ctx, sessionToken, schoolSlug);
    return auth ? { role: auth.session.role, schoolId: auth.school._id } : null;
  },
});
