# School Connect

Agente IA + portal multi-tenant para escuelas primarias en México.
Piloto: **Mérida, Yucatán**.

## Stack

| Capa | Tech |
|------|------|
| Frontend / SSR | Next.js 16 + TypeScript + Tailwind v4 |
| DB / backend reactivo | Convex (multi-tenant por `schoolId`) |
| WhatsApp | Kapso.ai |
| Agendado de visitas | Cal.com |
| IA | OpenRouter (Claude Sonnet 4.5 / Haiku 4.5) |
| Hosting | Netlify |

## Setup local

```bash
cd school-connect
cp .env.example .env.local      # ya creado con keys reales (NO commitear)

# Primera vez — interactivo, pide login + crea deployment Convex
npx convex dev

# En otra terminal
npm run dev                     # http://localhost:3000
```

`npx convex dev` debe quedarse corriendo: regenera `convex/_generated/`
cuando cambias schema/funciones. Sin eso, los imports de `@/convex/_generated/api`
fallan en TypeScript.

## Branding

Verde Cenote `#0F6E6E` · Ámbar Mérida `#F4B740` · Blanco hueso `#FAF7F2`
Inter (UI) + Fraunces (display).

## Deploy en Netlify

`netlify.toml` ya está configurado. Variables a configurar en Netlify:

```
NEXT_PUBLIC_CONVEX_URL    # de `npx convex dev`
OPENROUTER_API_KEY
KAPSO_API_KEY
KAPSO_WEBHOOK_SECRET
CALCOM_API_KEY
CALCOM_WEBHOOK_SECRET
NEXT_PUBLIC_APP_URL
```

## Roadmap

| Sem | Entregable |
|-----|-----------|
| 1   | Branding + landing + setup técnico ✅ |
| 2   | Dashboard escuela + onboarding multi-tenant |
| 3   | Agente admisiones WhatsApp + agendado Cal.com |
| 4   | Portal padres |
| 5   | Profe Bot (audio/foto/texto) |
| 6   | QA + aviso LFPDPPP + go-live |

Ver `CLAUDE.md` para convenciones del proyecto.
