# School Connect — guía para Claude

Producto: agente IA + portal multi-tenant para escuelas primarias en México.
Piloto: 2 escuelas en Mérida (Instituto Alina, Little Genius), expansión a 10.

## Stack
- Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind v4
- Convex (DB reactiva, multi-tenant por `schoolId`)
- Kapso.ai para WhatsApp Business
- Cal.com para agendado de visitas
- OpenRouter (Claude Sonnet 4.5 / Haiku 4.5); migrar a Anthropic directo después
- Netlify para deploy

## Notas críticas
- Esta es Next.js 16 — APIs y convenciones difieren del training. Si tocas SSR/server actions/middleware, primero lee `node_modules/next/dist/docs/`.
- Tailwind v4: tokens se declaran en `app/globals.css` con `@theme inline`. Las clases (`bg-primary`, `text-fg`, etc.) se generan desde ahí.
- Convex requiere `npx convex dev` corriendo en otra terminal para regenerar `_generated/`.
- El directorio padre del proyecto contiene espacios y mayúsculas; npm rechazó el nombre. El código vive en `school-connect/` (subdirectorio).

## Convenciones
- Cada tabla con datos sensibles tiene `schoolId` y un índice por escuela.
- Roles: `owner`, `admin`, `director`, `teacher`, `parent` en `userRoles`.
- Padres ven solo sus hijos; maestros solo sus grupos; admin/director toda la escuela.
- Español MX neutro en todo el copy de cara al usuario.
- Branding: verde cenote `#0F6E6E`, ámbar Mérida `#F4B740`, fondo hueso `#FAF7F2`.
- Tipografía: Inter (UI) + Fraunces (display).

## Setup local
```bash
cd school-connect
cp .env.example .env.local  # ya existe con keys reales en local
npx convex dev              # primera vez: login + crear deployment
npm run dev                 # http://localhost:3000
```

## Variables de entorno
Ver `.env.example`. Para Netlify: configurar TODAS las del .env.example en
Site settings → Environment variables. Las `NEXT_PUBLIC_*` se exponen al cliente.
