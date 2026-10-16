import { action, internalMutation, internalQuery, mutation, query, MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError, v } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { normalizeMxPhone, phoneVariants, samePhone } from "./lib/phone";
import { getSchoolSession, getSessionByToken, randomHex, sha256Hex } from "./lib/session";
import { agentNameOf } from "./lib/agent";

/**
 * Acceso con link personal por WhatsApp:
 * 1. El usuario le escribe "portal" a la asistente de la escuela.
 * 2. El webhook (con firma verificada) identifica el número y, si es dirección
 *    o un padre registrado, responde con un link de un solo uso (15 min).
 * 3. La página /acceso/[slug] canjea el link por una sesión de 30 días y
 *    lleva a cada quien a lo suyo según su rol.
 *
 * El token viaja en el #fragmento del link: no llega a servidores ni a
 * los previews de WhatsApp.
 */

const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

type Identity = { role: "parent" | "director"; userId?: Doc<"users">["_id"]; displayName: string };

async function resolveIdentity(
  ctx: MutationCtx,
  school: Doc<"schools">,
  phone: string,
): Promise<Identity | null> {
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

// ── 1. Crear link (desde el webhook) ─────────────────────────────────

/** Devuelve null si el número no es dirección ni un padre registrado */
export const createMagicLink = internalMutation({
  args: { schoolId: v.id("schools"), phone: v.string(), tokenHash: v.string() },
  handler: async (ctx, { schoolId, phone, tokenHash }) => {
    const school = await ctx.db.get(schoolId);
    if (!school) return null;
    const identity = await resolveIdentity(ctx, school, phone);
    if (!identity) return null;

    await ctx.db.insert("magicLinks", {
      tokenHash,
      schoolId,
      phone: normalizeMxPhone(phone),
      ...identity,
      expiresAt: Date.now() + MAGIC_LINK_TTL_MS,
    });
    return { role: identity.role, displayName: identity.displayName, schoolSlug: school.slug };
  },
});

// ── 2. Canjear link por sesión (desde /acceso/[slug]) ────────────────

export const redeemMagicLink = action({
  args: { schoolSlug: v.string(), token: v.string() },
  handler: async (ctx, { schoolSlug, token }): Promise<{ sessionToken: string; role: "parent" | "director" }> => {
    const sessionToken = randomHex(32);
    const role = await ctx.runMutation(internal.auth.consumeMagicLink, {
      schoolSlug,
      tokenHash: await sha256Hex(token),
      sessionTokenHash: await sha256Hex(sessionToken),
    });
    return { sessionToken, role };
  },
});

export const consumeMagicLink = internalMutation({
  args: { schoolSlug: v.string(), tokenHash: v.string(), sessionTokenHash: v.string() },
  handler: async (ctx, { schoolSlug, tokenHash, sessionTokenHash }) => {
    const link = await ctx.db
      .query("magicLinks")
      .withIndex("by_token", (q) => q.eq("tokenHash", tokenHash))
      .first();
    const school = link ? await ctx.db.get(link.schoolId) : null;
    if (!link || !school || school.slug !== schoolSlug || link.usedAt || link.expiresAt < Date.now()) {
      throw new ConvexError("Este link ya se usó o venció. Escribe *portal* al WhatsApp de la escuela para recibir uno nuevo.");
    }
    await ctx.db.patch(link._id, { usedAt: Date.now() });
    await ctx.db.insert("sessions", {
      tokenHash: sessionTokenHash,
      schoolId: link.schoolId,
      phone: link.phone,
      role: link.role,
      userId: link.userId,
      displayName: link.displayName,
      expiresAt: Date.now() + SESSION_TTL_MS,
    });
    return link.role;
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

// ── Sesión actual ────────────────────────────────────────────────────

/** Datos públicos para la pantalla de acceso: nombre y WhatsApp de la escuela */
export const schoolAccessInfo = query({
  args: { schoolSlug: v.string() },
  handler: async (ctx, { schoolSlug }) => {
    const school = await ctx.db
      .query("schools")
      .withIndex("by_slug", (q) => q.eq("slug", schoolSlug))
      .first();
    if (!school) return null;
    return {
      name: school.name,
      agentName: agentNameOf(school),
      whatsappNumber: school.whatsappNumber?.replace(/\D/g, "") ?? null,
    };
  },
});

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

/** Limpieza de links y sesiones vencidos (cron diario) */
export const purgeExpired = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let removed = 0;
    for (const table of ["magicLinks", "sessions"] as const) {
      const docs = await ctx.db.query(table).collect();
      for (const d of docs) {
        if (d.expiresAt < now) {
          await ctx.db.delete(d._id);
          removed++;
        }
      }
    }
    return { removed };
  },
});

