"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

// ─── Token de sesión (por escuela, en localStorage) ──────────────────
const storageKey = (slug: string) => `sc_session_${slug}`;

function useStoredToken(slug: string) {
  // undefined = aún no se lee localStorage
  const [token, setToken] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    try {
      setToken(localStorage.getItem(storageKey(slug)));
    } catch {
      setToken(null);
    }
  }, [slug]);

  const save = useCallback(
    (value: string | null) => {
      try {
        if (value) localStorage.setItem(storageKey(slug), value);
        else localStorage.removeItem(storageKey(slug));
      } catch {
        // Sin storage (modo privado): la sesión dura lo que la pestaña
      }
      setToken(value);
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

// ─── Login con código por WhatsApp ───────────────────────────────────
type PendingLogin = { code: string; secret: string; waLink: string; expiresAt: number };

function WhatsAppLogin({
  slug,
  title,
  onToken,
}: {
  slug: string;
  title: string;
  onToken: (token: string) => void;
}) {
  const startLogin = useAction(api.auth.startLogin);
  const completeLogin = useAction(api.auth.completeLogin);
  const [phone, setPhone] = useState("");
  const [pending, setPending] = useState<PendingLogin | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const claimedSecret = useRef<string | null>(null);

  const status = useQuery(api.auth.loginStatus, pending ? { secret: pending.secret } : "skip");
  const expired = pending !== null && status?.status === "pending" && now > pending.expiresAt;

  // Reloj para detectar que el código venció
  useEffect(() => {
    if (!pending) return;
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, [pending]);

  // En cuanto WhatsApp confirma el número, canjear por la sesión
  useEffect(() => {
    if (!pending || status?.status !== "verified") return;
    if (claimedSecret.current === pending.secret) return; // el secreto solo se canjea una vez
    claimedSecret.current = pending.secret;
    completeLogin({ secret: pending.secret })
      .then(({ token }) => onToken(token))
      .catch((err) => {
        setError(errorMessage(err, "No pudimos completar el acceso. Intenta de nuevo."));
        setPending(null);
      });
  }, [pending, status?.status, completeLogin, onToken]);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setPending(await startLogin({ schoolSlug: slug, phone }));
      setNow(Date.now());
    } catch (err) {
      setError(errorMessage(err, "No pudimos generar tu código. Intenta de nuevo."));
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setPending(null);
    setError(null);
  };

  if (!pending) {
    return (
      <CardShell title={title} subtitle="Entra con tu WhatsApp, sin contraseñas.">
        <form onSubmit={handleStart} className="space-y-4">
          <div>
            <label htmlFor="phone" className="block text-xs font-medium text-fg mb-1.5">
              Tu número de WhatsApp
            </label>
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="999 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              required
            />
            <p className="text-[11px] text-fg-muted mt-1.5">El número que tienes registrado en la escuela.</p>
          </div>
          {error && (
            <p role="alert" className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy || phone.replace(/\D/g, "").length < 10}
            className="w-full rounded-full bg-primary text-white text-sm font-semibold py-2.5 hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {busy ? "Generando código..." : "Continuar"}
          </button>
        </form>
      </CardShell>
    );
  }

  if (status?.status === "rejected") {
    return (
      <CardShell title={title} subtitle="No pudimos darte acceso.">
        <p className="text-sm text-fg">
          Tu número no está registrado en la escuela. Pide a la dirección que lo agregue y vuelve a intentarlo.
        </p>
        <button onClick={reset} className="mt-4 text-sm font-semibold text-primary hover:underline">
          Usar otro número
        </button>
      </CardShell>
    );
  }

  if (status?.status === "verified" || status?.status === "consumed") {
    return (
      <CardShell title={title} subtitle="Número verificado.">
        <Spinner label="Entrando..." />
      </CardShell>
    );
  }

  return (
    <CardShell title={title} subtitle="Último paso: confirma desde tu WhatsApp.">
      {expired ? (
        <>
          <p className="text-sm text-fg">El código venció. Genera uno nuevo para continuar.</p>
          <button onClick={reset} className="mt-4 text-sm font-semibold text-primary hover:underline">
            Generar código nuevo
          </button>
        </>
      ) : (
        <div className="space-y-4">
          <ol className="text-sm text-fg space-y-1.5 list-decimal list-inside">
            <li>Toca el botón verde para abrir WhatsApp.</li>
            <li>Envía el mensaje tal como aparece.</li>
            <li>Regresa aquí: entrarás automáticamente.</li>
          </ol>
          <div className="rounded-xl bg-[#FAF7F2] border border-border py-3 text-center">
            <p className="text-[11px] text-fg-muted">Tu código</p>
            <p className="font-mono text-xl font-bold tracking-widest text-primary">{pending.code}</p>
          </div>
          <a
            href={pending.waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full rounded-full bg-[#25D366] text-white text-sm font-semibold py-2.5 hover:bg-[#1fb857] transition-colors"
          >
            Abrir WhatsApp y enviar código
          </a>
          <div className="flex items-center justify-between">
            <Spinner label="Esperando confirmación..." />
            <button onClick={reset} className="text-xs text-fg-muted hover:text-fg">
              Cambiar número
            </button>
          </div>
          <p className="text-[11px] text-fg-muted">
            El código vence en 10 minutos. Si abres el portal en una computadora, puedes enviar el mensaje desde tu
            celular.
          </p>
          {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
        </div>
      )}
    </CardShell>
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
    return <WhatsAppLogin slug={slug} title={title} onToken={saveToken} />;
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
