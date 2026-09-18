# 🌍 GUIA_GENERAL — Publica ReviewFlow AI en cualquier hosting (v3.9.0)

Guía resumida para producción comercial en el host que elijas: el mismo código
funciona en todos sin cambios. Flujo: registro → **prueba de 7 días** en Pro/Business
(con tarjeta) → panel. **Sin plan gratuito.** Tiempo estimado: **~40 minutos**.

> 🆓 ¿Aún no quieres pagar? Prueba primero gratis con [GUIA_GRATIS.md](../GUIA_GRATIS.md).
> 💰 ¿Vas a vender al público? Lee también [GUIA_COMERCIALIZACION.md](../GUIA_COMERCIALIZACION.md)
> (empresa, marca, legal, soporte y checklist go-live).

## Paso 1 — Cuentas necesarias (10 min)

| Servicio | Web | Para qué | Coste aprox. |
|---|---|---|---|
| Código | [github.com](https://github.com) | Alojar el proyecto | Gratis |
| Base de datos + auth | [supabase.com](https://supabase.com) | Postgres + login (Pro recomendado en prod.) | Gratis / ~25 $/mes Pro |
| Cobros | [stripe.com](https://stripe.com) | Planes Pro/Business + recargas (**live**) | % por cobro |
| Emails | [brevo.com](https://www.brevo.com) (o Postmark/SES) | SMTP transaccional | Gratis / desde ~9 €/mes |
| IA (opcional) | [openai.com](https://openai.com) | Respuestas y triaje con **gpt-4o-mini** (si no, plantillas locales) | Céntimos/mes |
| Google (opcional) | [console.cloud.google.com](https://console.cloud.google.com) | OAuth Business Profile (reseñas reales) | Gratis |
| WhatsApp (opcional) | [developers.facebook.com](https://developers.facebook.com) | Cloud API (peticiones y alertas) | Gratis / por uso |
| Dominio | [cloudflare.com](https://www.cloudflare.com) / [namecheap.com](https://www.namecheap.com) | `tu-dominio.com` | ~10-15 €/año |
| Hosting | **El que elijas** (paso 5) | Ejecutar la app | Según host |

## Paso 2 — Base de datos Supabase (5 min)

1. [supabase.com](https://supabase.com) → **New project**.
2. **Project Settings → API** → copia `Project URL`, `anon public`, `service_role`.
3. **SQL Editor** → pega todo `supabase/schema.sql` → **Run** (`Success`).
   - ¿BD de versión anterior? Ejecuta en orden `migration_3_2_0.sql` → … → `migration_3_7_0.sql` →
     `migration_3_8_0.sql` (contabilidad de tokens de IA, índices y RLS) →
     **`migration_3_9_0.sql`** (modelo 100 % de pago: planes `pro|business`, `inactive`/`paused`).
4. **Settings → Database → Connection string → Connection pooling** → copia la cadena del
   **puerto 6543** (Supavisor, modo *transaction*) y pégala como `DATABASE_URL`.
   Es la conexión que aguanta los picos de tráfico comercial: la app solo la usa para
   diagnóstico, mantenimiento y analítica; el CRUD sigue por PostgREST con RLS.
   Comprueba el resultado en `GET /api/health?db=1` (`mode: "transaction"`, latencia en ms).

## Paso 3 — Stripe en modo LIVE (6 min)

1. Completa la activación → pasa a **Live mode**.
2. **Developers → API keys** → `Secret key` (`sk_live_…`).
3. **Product catalog** → crea **dos precios mensuales**: `ReviewFlow Pro` (29 €/mes) y
   `ReviewFlow Business` (79 €/mes) → cópialos como `STRIPE_PRICE_PRO` y `STRIPE_PRICE_BUSINESS`.
4. **Recargas de pago único** (opcional pero recomendado): +1.000 peticiones 9 €,
   +2.000 opiniones 12 €, +500 respuestas IA 15 €, +500 sincronizaciones 6 € →
   `STRIPE_PRICE_ADDON_{REQUESTS,REVIEWS,AI,SYNCS}`. Si las dejas vacías, el checkout
   usa los importes de `lib/plans.ts` (`price_data` inline).
5. El `whsec_…` se crea en el paso 7. La prueba de 7 días y la pausa por impago las
   aplica el código solo.

## Paso 3b — IA con `gpt-4o-mini` (4 min, opcional pero recomendado)

1. [platform.openai.com](https://platform.openai.com) → **API keys → Create new secret key** → `OPENAI_API_KEY`.
2. **Settings → Limits → Monthly budget**: pon un tope (p. ej. 10 $). Es tu red de seguridad externa.
3. `OPENAI_MODEL=gpt-4o-mini` (por defecto). Ajustes finos opcionales en `.env.example`:
   `OPENAI_TIMEOUT_MS`, `OPENAI_MAX_ATTEMPTS`, `OPENAI_RPM_PER_TENANT`, `OPENAI_MAX_CONCURRENCY`.
4. **El coste ya está acotado por diseño**: cada plan tiene un presupuesto de tokens
   (Pro 250.000 · Business 1.200.000 al mes). Al agotarlo, la API responde
   `429 token_budget_exhausted` hasta el día 1 o hasta que el cliente compre la recarga de IA.
   A 0,15 $/1M de entrada y 0,60 $/1M de salida, un borrador cuesta ~0,0001 $: incluso el plan
   Business usado a tope cuesta céntimos.
5. ¿Sin clave? La app funciona igual: usa plantilla local y heurísticas (fallback). Nunca se cae.

## Paso 4 — SMTP + integraciones (5 min)

- **SMTP**: Brevo → **SMTP & API → SMTP keys → Generate** (+ autentica tu dominio: ver GUIA_PASOS_MANUALES §4).
- **Google** (opcional): Cloud Console → OAuth client Web con redirect
  `https://tu-dominio.com/api/integrations/google/callback` → `GOOGLE_CLIENT_ID/SECRET`.
- **WhatsApp** (opcional): Meta Developers → app → WhatsApp API Setup → `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID`.
- **Trustpilot/Maps**: por empresa desde el panel (API key Business / Place ID).

## Paso 5 — Despliega en tu host (10 min)

Variables necesarias: las de `.env.example` + `SUPERADMIN_EMAILS=tu@email.com`.

### Opción A · VPS con Docker (recomendado)

```bash
curl -fsSL https://get.docker.com | sh
git clone https://github.com/diegowebsia/prueba-6.git reviewflow-ai && cd reviewflow-ai
cp .env.example .env && nano .env      # pega TODAS las claves reales
docker compose up -d --build
curl http://localhost:3000/api/health  # → {"ok":true,...}
```

### Opción B · Coolify

[coolify.io](https://coolify.io) → **New Resource → From GitHub** → env vars → **Deploy** → dominio (HTTPS auto).

### Opción C · Vercel Pro (~20 $/mes para uso comercial)

[vercel.com](https://vercel.com) → **Import** repo → **Deploy** → env vars → **Redeploy**.

### Opción D · Render / Railway / Fly.io

- [render.com](https://render.com): **New → Web Service** (usa el `Dockerfile`) → env vars → Deploy.
- [railway.com](https://railway.com): **New Project → Deploy from Repo** → env vars → Deploy.
- [fly.io](https://fly.io): `fly launch` → `fly secrets set …` → `fly deploy`.

### Opción E · Node.js puro

```bash
npm install && npm run build && npm run start   # $PORT, ideal con pm2
```

## Paso 6 — Dominio + HTTPS (10 min)

1. DNS: registro `A` a tu VPS (o `CNAME` al PaaS según su panel).
2. HTTPS: Coolify/Vercel/Render/Railway/Fly automático; VPS puro con Caddy/Nginx + certbot.
3. `NEXT_PUBLIC_APP_URL=https://tu-dominio.com` (sin barra final) → reinicia/redespliega.

## Paso 7 — Webhook de Stripe (3 min)

1. Stripe (**live**): **Developers → Webhooks → Add endpoint** → `https://tu-dominio.com/api/stripe/webhook`.
2. Eventos: `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted`,
   `invoice.payment_failed`, `invoice.paid`, `trial_will_end`.
3. **Signing secret** → `STRIPE_WEBHOOK_SECRET` → reinicia/redespliega.

## Paso 8 — Verificación final E2E ✅

0. Ejecuta la comprobación automática:
   ```bash
   npm run verify -- --url https://tu-dominio.com
   # Verifica: health · IA (modelo y límites) · pool de PostgreSQL ·
   # precios de Stripe · firma del webhook (válida 2xx / falsa 400) · rutas de IA sin sesión → 401
   ```
1. `/api/health?verbose=1` → `"ok":true`, `version:"3.9.0"` (Google/WhatsApp pueden estar
   en `false`: opcionales) y `integrations.database` en `true` si pusiste `DATABASE_URL`.
2. Regístrate → `/bienvenido`: verás solo los 2 planes de pago. Haz la
   **prueba de 7 días** de Pro/Business → entras al `/dashboard`.
3. Conecta Google (1 clic) → **Sincronizar** → genera un borrador IA → publícalo.
4. Comprueba la cuota en *Facturación y cuota* y el catálogo de recargas.
5. Genera un borrador de IA: la respuesta incluye `usage.tokens` y `usage.costUsd` reales, y
   *Facturación y cuota* → **Presupuesto de IA** refleja el consumo del ciclo.
6. Ciclo comercial completo (prueba en Stripe test antes de LIVE): alta con trial, cambio de plan
   en el portal, compra de una recarga, impago con `4000 0000 0000 0341` (→ `past_due` y corte del
   panel) y cancelación (→ `inactive`, conservando datos 30 días).
7. Panel interno: empresa visible, suscripción `trialing`, **tokens de IA del ciclo**, evento en
   **Logs**, y `GET /api/admin/db` con latencia, conexiones y tamaño real por tabla.
6. Completa [GUIA_PASOS_MANUALES.md](./GUIA_PASOS_MANUALES.md) (fiscal, logo, DNS, integraciones). 🎉

## Problemas típicos

| Síntoma | Solución |
|---|---|
| `forbidden` en `/admin` | Email fuera de `SUPERADMIN_EMAILS` |
| Empresa no se crea tras pagar | Webhook mal configurado (paso 7); mira Logs en `/admin` |
| Paywall inesperado | Suscripción `past_due/canceled` → portal de Stripe |
| Error `507` al importar opiniones | Tope de filas/almacenamiento del plan → recarga de opiniones o plan superior |
| Google OAuth error | Redirect URI exacta en Cloud Console (paso 4) |
| `429 token_budget_exhausted` | El cliente agotó el presupuesto de IA del plan → recarga `+500 respuestas IA` o plan superior |
| Respuestas de IA «genéricas» | Sin `OPENAI_API_KEY` o clave sin saldo: la app usó el fallback local. Revisa `ai_interactions` (`ok = false`) |
| `429 rate_limited` de OpenAI | El proveedor limita tu clave: sube el tier en OpenAI o ajusta `OPENAI_RPM_PER_TENANT` |
| Webhook `400 Firma inválida` | El `whsec_…` es de otro endpoint u otro modo (test/live), o un proxy altera el body. Diagnóstico: `GET /api/stripe/webhook` |
| Conexiones agotadas en Postgres | Usa el Connection Pooler (puerto 6543) en `DATABASE_URL` y ajusta `DATABASE_POOL_MAX` |
| Actualizar versión | `git pull` + migraciones SQL nuevas + `docker compose up -d --build` |
