import { QueryCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";

export function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Sesión vigente para el token, o null si no existe o expiró */
export async function getSessionByToken(
  ctx: QueryCtx,
  sessionToken: string | undefined,
): Promise<Doc<"sessions"> | null> {
  if (!sessionToken) return null;
  const tokenHash = await sha256Hex(sessionToken);
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q) => q.eq("tokenHash", tokenHash))
    .first();
  if (!session || session.expiresAt < Date.now()) return null;
  return session;
}

/** Sesión + escuela, verificando que la sesión pertenezca a esa escuela */
export async function getSchoolSession(
  ctx: QueryCtx,
  sessionToken: string | undefined,
  schoolSlug: string,
): Promise<{ session: Doc<"sessions">; school: Doc<"schools"> } | null> {
  const session = await getSessionByToken(ctx, sessionToken);
  if (!session) return null;
  const school = await ctx.db
    .query("schools")
    .withIndex("by_slug", (q) => q.eq("slug", schoolSlug))
    .first();
  if (!school || school._id !== session.schoolId) return null;
  return { session, school };
}

export async function getDirectorSession(
  ctx: QueryCtx,
  sessionToken: string | undefined,
  schoolSlug: string,
) {
  const auth = await getSchoolSession(ctx, sessionToken, schoolSlug);
  if (!auth || auth.session.role !== "director") return null;
  return auth;
}

/** Dirección ve a todos los alumnos de su escuela; padres solo a sus hijos */
export async function canAccessStudent(
  ctx: QueryCtx,
  session: Doc<"sessions">,
  studentId: Id<"students">,
): Promise<boolean> {
  const student = await ctx.db.get(studentId);
  if (!student || student.schoolId !== session.schoolId) return false;
  if (session.role === "director") return true;
  if (!session.userId) return false;
  const links = await ctx.db
    .query("parentStudentLinks")
    .withIndex("by_student", (q) => q.eq("studentId", studentId))
    .collect();
  return links.some((l) => l.parentUserId === session.userId);
}
