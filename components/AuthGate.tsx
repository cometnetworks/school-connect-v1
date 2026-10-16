"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

// ─── Token de sesión (por escuela, en localStorage) ──────────────────
const storageKey = (slug: string) => `sc_session_${slug}`;

// Respaldo en memoria si el navegador bloquea localStorage (modo privado)
const memoryStore = new Map<string, string | null>();
const storeListeners = new Set<() => void>();

function readToken(slug: string): string | null {
  try {
    return localStorage.getItem(storageKey(slug));
  } catch {
    return memoryStore.get(slug) ?? null;
  }
}

function subscribeToken(onChange: () => void) {
  storeListeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    storeListeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function useStoredToken(slug: string) {
  // undefined durante el render del servidor (aún no hay localStorage)
  const token = useSyncExternalStore(
    subscribeToken,
    () => readToken(slug),
    () => undefined,
  );

  const save = useCallback(
    (value: string | null) => {
      try {
        if (value) localStorage.setItem(storageKey(slug), value);
        else localStorage.removeItem(storageKey(slug));
      } catch {
        memoryStore.set(slug, value);
      }
      storeListeners.forEach((l) => l());
    },
    [slug],
  );

  return [token, save] as const;
}

const SessionContext = createContext<string>("");

/** Token de la sesión actual; solo usar dentro de <AuthGate> */
export function useSessionToken() {
  return useContext(SessionContext);
}

export type SessionInfo = {
  role: "parent" | "director";
  displayName: string;
  schoolName: string;
};

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ConvexError && typeof err.data === "string" ? err.data : fallback;
}

// ─── UI compartida ───────────────────────────────────────────────────
function Spinner({ label }: { label: string }) {
  return (
    <div className="flex gap-2 items-center text-fg-muted text-sm">
      <span className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      {label}
    </div>
  );
}

function CardShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-border">
          <div className="flex items-center gap-2.5 mb-1">
            <svg width="22" height="22" viewBox="0 0 40 40" fill="none" aria-hidden="true">
              <rect width="40" height="40" rx="9" fill="#0F6E6E" />
              <path d="M28 20a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" stroke="white" strokeWidth="2.5" fill="none" />
              <circle cx="28" cy="12" r="3.5" fill="#F4B740" />
            </svg>
            <h1 className="font-semibold text-fg text-sm">{title}</h1>
          </div>
          <p className="text-xs text-fg-muted">{subtitle}</p>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Sin sesión: pedir acceso por WhatsApp ───────────────────────────
function RequestAccess({ slug, title }: { slug: string; title: string }) {
  const info = useQuery(api.auth.schoolAccessInfo, { schoolSlug: slug });
  const waLink = info?.whatsappNumber
    ? `https://wa.me/${info.whatsappNumber}?text=${encodeURIComponent("portal")}`
    : null;

  return (
    <CardShell title={title} subtitle={info?.name ?? "School Connect"}>
      <div className="space-y-4">
        <p className="text-sm text-fg">
          Para entrar, escríbele <span className="font-semibold">portal</span> a {info?.agentName ?? "la asistente"}{" "}
          por WhatsApp y te mandará tu acceso personal.
        </p>
        {waLink && (
          <a
            href={waLink}
            className="flex items-center justify-center gap-2 w-full rounded-full bg-[#25D366] text-white text-sm font-semibold py-2.5 hover:bg-[#1fb857] transition-colors"
          >
            Pedir mi acceso por WhatsApp
          </a>
        )}
        <p className="text-[11px] text-fg-muted">
          Solo funciona con el número que tienes registrado en la escuela. El link es personal y vence en 15
          minutos.
        </p>
      </div>
    </CardShell>
  );
}

// ─── Canjear el link recibido por WhatsApp (/acceso/[slug]#token) ────
export function RedeemAccess({ slug }: { slug: string }) {
  const redeem = useAction(api.auth.redeemMagicLink);
  const [, saveToken] = useStoredToken(slug);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  // Un link nuevo abierto en la misma pestaña solo cambia el #: recargar para canjearlo
  useEffect(() => {
    const onHashChange = () => window.location.reload();
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    if (started.current) return; // el link solo se canjea una vez
    started.current = true;
    const token = window.location.hash.slice(1);
    // Quitar el token de la barra de direcciones y del historial
    window.history.replaceState(null, "", window.location.pathname);
    const attempt = token
      ? redeem({ schoolSlug: slug, token })
      : Promise.reject(new ConvexError("Este link está incompleto. Escribe *portal* al WhatsApp de la escuela para recibir uno nuevo."));
    attempt
      .then(({ sessionToken, role }) => {
        saveToken(sessionToken);
        window.location.replace(role === "director" ? `/dashboard/${slug}` : `/portal/${slug}`);
      })
      .catch((err) => setError(errorMessage(err, "No pudimos abrir tu acceso. Pide uno nuevo por WhatsApp.")));
  }, [slug, redeem, saveToken]);

  if (error) {
    return (
      <CardShell title="Acceso" subtitle="No pudimos abrir este link.">
        <p className="text-sm text-fg">{error.replace(/\*/g, "")}</p>
        <a href={`/portal/${slug}`} className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">
          Pedir un acceso nuevo
        </a>
      </CardShell>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
      <Spinner label="Entrando..." />
    </div>
  );
}

// ─── Puerta de acceso ────────────────────────────────────────────────
export function AuthGate({
  slug,
  title,
  requireRole,
  children,
}: {
  slug: string;
  title: string;
  requireRole?: "director";
  children: (session: SessionInfo, logout: () => void) => ReactNode;
}) {
  const [token, saveToken] = useStoredToken(slug);
  const me = useQuery(api.auth.me, token ? { schoolSlug: slug, sessionToken: token } : "skip");
  const logoutMutation = useMutation(api.auth.logout);

  // Token guardado pero ya inválido (expiró o se cerró por WhatsApp)
  useEffect(() => {
    if (token && me === null) saveToken(null);
  }, [token, me, saveToken]);

  const logout = useCallback(() => {
    if (token) logoutMutation({ sessionToken: token }).catch(() => {});
    saveToken(null);
  }, [token, logoutMutation, saveToken]);

  if (token === undefined || (token && me === undefined)) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <Spinner label="Cargando..." />
      </div>
    );
  }

  if (!token || !me) {
    return <RequestAccess slug={slug} title={title} />;
  }

  if (requireRole && me.role !== requireRole) {
    return (
      <CardShell title={title} subtitle={me.schoolName}>
        <p className="text-sm text-fg">Esta sección es solo para la dirección de la escuela.</p>
        <div className="mt-4 flex items-center gap-4">
          <a href={`/portal/${slug}`} className="text-sm font-semibold text-primary hover:underline">
            Ir al portal de padres
          </a>
          <button onClick={logout} className="text-sm text-fg-muted hover:text-fg">
            Cerrar sesión
          </button>
        </div>
      </CardShell>
    );
  }

  return <SessionContext.Provider value={token}>{children(me, logout)}</SessionContext.Provider>;
}
