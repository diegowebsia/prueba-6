# 🧑‍💻 GUIA_PASOS_MANUALES — Solo lo que tienes que hacer tú (v3.8.0)

Todo el código está programado, probado y con `npm run build` en verde. Esta guía lista
**únicamente** lo que requiere tus cuentas, tus claves o tus decisiones: rellenar, pegar y clicar.
Nada de programar.

| Bloque | Tiempo | ¿Obligatorio? |
|---|---|---|
| [1. Credenciales y formato del `.env`](#1-credenciales-lista-exacta-y-formato-del-env) | 10 min | ✅ Sí |
| [2. Supabase (BD + Auth)](#2-supabase-base-de-datos-y-auth) | 10 min | ✅ Sí |
| [3. Stripe: planes base + webhook](#3-stripe-planes-base-y-webhook) | 15 min | ✅ Sí |
| [4. OpenAI (respuestas con IA)](#4-openai-respuestas-con-ia--opcional) | 3 min | ⭕ Opcional |
| [5. Stripe: productos Add-on (ampliadores de cuota)](#5-stripe-productos-add-on-ampliadores-de-cuota) | 15 min | ⭕ Recomendado |
| [6. Meta WhatsApp Cloud API](#6-meta-whatsapp-cloud-api-alertas-3-y-post-venta) | 20 min | ⭕ Opcional |
| [7. Google Cloud: Business Profile + Places](#7-google-cloud-business-profile-oauth--places-api) | 20 min | ⭕ Opcional |
| [8. SMTP + DNS del correo](#8-smtp--dns-para-no-caer-en-spam) | 15 min | ⭕ Recomendado |
| [9. Datos fiscales, logo y textos](#9-datos-fiscales-logo-y-textos) | 20 min | ✅ Sí |
| [10. Verificación final y prueba E2E](#10-verificación-final-prueba-e2e) | 15 min | ✅ Sí |
| [11. Troubleshooting de cuotas y cobros](#11-troubleshooting-cuotas-402429-y-cobros) | — | Consulta |

> Despliegue (hosting, dominio, Docker, Vercel): [GUIA_GRATIS.md](../GUIA_GRATIS.md) para probar a 0 €
> y [GUIA_GENERAL.md](./GUIA_GENERAL.md) / [GUIA_DESPLIEGUE.md](../GUIA_DESPLIEGUE.md) para producción.
> Operación diaria del dueño: [GUIA_ADMIN.md](../GUIA_ADMIN.md).

---

## 1. Credenciales: lista exacta y formato del `.env`

Copia la plantilla y edita:

```bash
cp .env.example .env
```

### 1.1 Tabla de credenciales (qué es, dónde se consigue, si es obligatoria)

| # | Variable del `.env` | Qué es exactamente | Dónde se consigue | Obligatoria |
|---|---|---|---|---|
| 1 | `NEXT_PUBLIC_APP_URL` | URL pública final **sin** barra al final | Tu dominio / Vercel / `http://localhost:3000` | ✅ |
| 2 | `PORT` | Puerto del servidor Node | — (por defecto `3000`) | ⭕ |
| 3 | `SUPERADMIN_EMAILS` | Emails con acceso al panel interno (privado, nunca enlazado en la web), separados por comas | Tu email real | ✅ |
| 4 | `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | Supabase → Project Settings → **API** → Project URL | ✅ |
| 5 | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública `anon` (respeta RLS) | Supabase → Project Settings → **API** → `anon` `public` | ✅ |
| 6 | `SUPABASE_SERVICE_ROLE_KEY` | Clave **Service Role** (solo servidor; salta RLS) | Supabase → Project Settings → **API** → `service_role` `secret` | ✅ |
| 7 | `STRIPE_SECRET_KEY` | Clave secreta de Stripe (`sk_test_…` / `sk_live_…`) | Stripe → **Developers → API keys** → Secret key | ✅ |
| 8 | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Clave publicable (`pk_test_…` / `pk_live_…`) | Stripe → **Developers → API keys** → Publishable key | ⭕ |
| 9 | `STRIPE_WEBHOOK_SECRET` | Secreto del endpoint de webhook (`whsec_…`) | Stripe → **Developers → Webhooks** → tu endpoint → Signing secret | ✅ |
| 10 | `STRIPE_PRICE_PRO` | Price ID del plan **Pro** 29 €/mes | Stripe → **Product catalog** → producto → precio mensual → `price_…` | ✅ |
| 11 | `STRIPE_PRICE_BUSINESS` | Price ID del plan **Business** 79 €/mes | Idem | ✅ |
| 12 | `STRIPE_PRICE_ADDON_REQUESTS` | Price ID de la recarga **+1.000 peticiones** (9 €) | Idem (ver [sección 5](#5-stripe-productos-add-on-ampliadores-de-cuota)) | ⭕ |
| 13 | `STRIPE_PRICE_ADDON_REVIEWS` | Price ID de la recarga **+2.000 opiniones** (12 €) | Idem | ⭕ |
| 14 | `STRIPE_PRICE_ADDON_AI` | Price ID de la recarga **+500 respuestas IA** (15 €) | Idem | ⭕ |
| 15 | `STRIPE_PRICE_ADDON_SYNCS` | Price ID de la recarga **+500 sincronizaciones** (6 €) | Idem | ⭕ |
| 16 | `STRIPE_ADDON_*_PRICE_CENTS` | Importe alternativo en **céntimos** si no defines los Price ID de add-on | Lo decides tú | ⭕ |
| 17 | `SMTP_HOST` · `SMTP_PORT` · `SMTP_USER` · `SMTP_PASS` · `SMTP_FROM` | Credenciales de tu proveedor de correo | Brevo / Postmark / SES / Mailgun / Gmail App Password | ⭕ |
| 18 | `OPENAI_API_KEY` | Clave secreta de OpenAI (`sk-…` o `sk-proj-…`) | [platform.openai.com](https://platform.openai.com/api-keys) → **Create new secret key** | ⭕ |
| 19 | `OPENAI_MODEL` | Modelo de los borradores | — (por defecto `gpt-4o-mini`) | ⭕ |
| 19b | `DATABASE_URL` | Cadena **directa** de PostgreSQL contra el **Connection Pooler** de Supabase (puerto 6543, modo transaction). Da diagnóstico (`/api/health?db=1`, `/api/admin/db`) y mantenimiento (purga). Sin ella la app funciona igual. | Supabase → Project Settings → **Database** → Connection string → *Connection pooling* | ⭕ |
| 19c | `DATABASE_POOL_MAX` · `DATABASE_IDLE_TIMEOUT_MS` · `DATABASE_CONNECT_TIMEOUT_MS` · `DATABASE_STATEMENT_TIMEOUT_MS` · `DATABASE_SSL` | Ajustes del pool (por defecto `5` · `10000` · `8000` · `8000` · `require`) | En Vercel/serverless: `DATABASE_POOL_MAX=3`; en VPS: `10-20` | ⭕ |
| 19d | `OPENAI_TIMEOUT_MS` · `OPENAI_MAX_ATTEMPTS` · `OPENAI_RPM_PER_TENANT` · `OPENAI_MAX_CONCURRENCY` · `OPENAI_BASE_URL` | Blindaje del cliente de IA (por defecto `20000` · `3` · `20` · `6` · sin proxy) | Ajústalos solo si tu proveedor o tu plan lo exige | ⭕ |
| 20 | `GOOGLE_CLIENT_ID` | Client ID OAuth 2.0 (tipo **Web**) | Google Cloud → APIs & Services → **Credentials** | ⭕ |
| 21 | `GOOGLE_CLIENT_SECRET` | Client secret OAuth 2.0 | Idem | ⭕ |
| 22 | `GOOGLE_PLACES_API_KEY` | Clave de servidor para **Places API (New)** | Google Cloud → Credentials → **Create credentials → API key** | ⭕ |
| 23 | `WHATSAPP_TOKEN` | Token de acceso de la **WhatsApp Cloud API** | Meta for Developers → tu app → WhatsApp → **API Setup** | ⭕ |
| 24 | `WHATSAPP_PHONE_NUMBER_ID` | **Phone Number ID** del número emisor (no es el teléfono) | Idem, apartado «API Setup» | ⭕ |
| 25 | `WHATSAPP_BUSINESS_ACCOUNT_ID` | **WhatsApp Business Account ID** | Meta → Business Settings → Accounts → WhatsApp Accounts | ⭕ |
| 26 | `WHATSAPP_API_VERSION` | Versión de la Graph API | — (por defecto `v21.0`) | ⭕ |
| 27 | `WHATSAPP_VERIFY_TOKEN` | Cadena aleatoria que **tú inventas** (reservada para un webhook entrante futuro) | — | ⭕ |
| 28 | `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | Dominio de Plausible (analítica sin cookies) | [plausible.io](https://plausible.io) | ⭕ |

> 🔐 Reglas de oro: las claves con `NEXT_PUBLIC_` viajan al navegador (solo URL, `anon` y
> `publishable`); **`SUPABASE_SERVICE_ROLE_KEY` y `STRIPE_SECRET_KEY` jamás** deben exponerse.
> Si sospechas una fuga: Supabase → API → **Reset/rotate** y Stripe → **Roll key**.

### 1.2 Formato exacto del `.env`

```ini
# ---------- App ----------
NEXT_PUBLIC_APP_URL=https://tudominio.com
PORT=3000

# ---------- Super-Admin ----------
SUPERADMIN_EMAILS=tu@email.com,otro@socio.com

# ---------- Supabase ----------
NEXT_PUBLIC_SUPABASE_URL=https://xyzcompany.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....
# Pooler de Supabase (puerto 6543, modo transaction) — opcional pero recomendado
DATABASE_URL=postgresql://postgres.xyzcompany:TU_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
DATABASE_POOL_MAX=5

# ---------- Stripe ----------
STRIPE_SECRET_KEY=sk_live_51Nx...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_51Nx...
STRIPE_WEBHOOK_SECRET=whsec_8f3a...
STRIPE_PRICE_PRO=price_1NxAbC...
STRIPE_PRICE_BUSINESS=price_1NxDeF...
STRIPE_PRICE_ADDON_REQUESTS=price_1NxGhI...
STRIPE_PRICE_ADDON_REVIEWS=price_1NxJkL...
STRIPE_PRICE_ADDON_AI=price_1NxMnO...
STRIPE_PRICE_ADDON_SYNCS=price_1NxPqR...

# ---------- SMTP ----------
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=tu-login-smtp@tudominio.com
SMTP_PASS=xsmtps-...
SMTP_FROM=ReviewFlow AI <no-reply@tudominio.com>

# ---------- OpenAI (opcional) ----------
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_ATTEMPTS=3
OPENAI_RPM_PER_TENANT=20
OPENAI_MAX_CONCURRENCY=6

# ---------- Google (opcional) ----------
GOOGLE_CLIENT_ID=1234567890-abc123.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123...
GOOGLE_PLACES_API_KEY=AIzaSy...

# ---------- Meta WhatsApp (opcional) ----------
WHATSAPP_TOKEN=EAAGm0PX4ZCps...
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_BUSINESS_ACCOUNT_ID=987654321098765
WHATSAPP_API_VERSION=v21.0
WHATSAPP_VERIFY_TOKEN=una-cadena-aleatoria-larga

# ---------- Analítica (opcional) ----------
# NEXT_PUBLIC_PLAUSIBLE_DOMAIN=tudominio.com
```

Reglas de formato: **sin comillas**, **sin espacios** alrededor del `=`, una variable por línea,
`#` para comentarios. Tras cambiar el `.env`, **reinicia** el servidor (en Vercel: redeploy).

### 1.3 Lo que NO va en el `.env`

Se configura **por empresa** desde el panel (`/dashboard` → pestaña *Empresa*), cifrado y aislado
por tenant: API key de **Trustpilot** + Business Unit ID, **Place ID** de Google Maps, móvil de
alertas, tono de la IA, credenciales de **Shopify / WooCommerce / TPV** y la `api_key` de la API
pública de ingesta.

---

## 2. Supabase (base de datos y Auth)

1. [supabase.com](https://supabase.com) → **New project** (región **UE**, p. ej. `eu-central-1` o
   `eu-west-1`, por RGPD) → guarda la contraseña de la BD.
2. Copia las 3 claves a tu `.env` (sección 1.1, filas 4–6).
3. Ejecuta el esquema:
   - **Proyecto nuevo** → SQL Editor → pega todo `supabase/schema.sql` → **Run**.
   - **Proyecto existente** (vienes de v3.4.0 o anterior) → ejecuta en orden
     `supabase/migration_3_2_0.sql` → `migration_3_3_0.sql` → `migration_3_4_0.sql` →
     `migration_3_5_0.sql` → `migration_3_6_0.sql` → `migration_3_7_0.sql` → **`migration_3_8_0.sql`**
     (todas idempotentes: puedes re-ejecutarlas sin romper nada).
4. **Pool de conexiones (recomendado)**: Project Settings → **Database → Connection string →
   Connection pooling** → copia la URI del **puerto 6543** (Supavisor, modo *transaction*) a
   `DATABASE_URL`. Es lo que permite aguantar picos de tráfico comercial sin agotar las conexiones
   de Postgres; el CRUD sigue yendo por PostgREST. Verifícalo en `GET /api/health?db=1`.
5. Auth → **Providers → Email** → activado (confirmación de email a tu gusto: si la desactivas,
   el usuario entra directamente tras registrarse).
5. Auth → **URL Configuration**: `Site URL` = tu `NEXT_PUBLIC_APP_URL` y añade
   `https://tudominio.com/**` a *Redirect URLs*.
6. Verifica que la migración 3.7.0 dejó:
   - `tenants.plan` aceptando `free | pro | business` (y los nombres legacy `trial/resenas/completo`).
   - Columnas de recargas: `extra_requests`, `extra_reviews`, `extra_ai`, `extra_syncs`,
     `extra_stored`, `extra_quota_cycle`.
   - Columnas `google_calls` en `usage_counters` y tabla `quota_events` (auditoría de cada consumo).
   - Funciones `public.current_cycle()`, `public.consume_quota(...)`,
     `public.reset_expired_extras()`, **`purge_tenant()`**, **`purge_all_tenants()`** y la vista
     `public.v_quota_overview` (con los topes de BD por plan).
7. **Opcional pero recomendado** — reset mensual automático de los extras caducados y purga
   periódica de la base de datos:
   Database → **Extensions** → activa `pg_cron` → SQL Editor:

   ```sql
   select cron.schedule(
     'reviewflow-reset-extras',
     '5 0 1 * *',
     $$select public.reset_expired_extras()$$
   );
   -- Red de seguridad de la BD (topes de opiniones/auditoría/logs):
   select cron.schedule(
     'reviewflow-purge',
     '15 * * * *',
     $$select public.purge_all_tenants()$$
   );
   ```

   Sin `pg_cron` no pasa nada: la app detecta los extras caducados y purga lo que exceda los
   topes de cada plan en cada lectura de cuota (`checkQuota`).

---

## 3. Stripe: planes base y webhook

### 3.1 Crear los dos planes de pago

Stripe Dashboard → **Product catalog → + Add product** (repite para cada plan):

| Plan | Nombre del producto | Precio | Recurrencia | Trial |
|---|---|---|---|---|
| Pro | `ReviewFlow · Pro` | `29` EUR | Mensual (every 1 month) | 7 días |
| Business | `ReviewFlow · Business` | `79` EUR | Mensual (every 1 month) | 7 días |

- El **plan Gratuito (0 €) no se crea en Stripe**: se activa al instante desde
  `/bienvenido` (sin tarjeta) y no genera suscripción.
- El **trial de 7 días lo aplica el código** (`trial_period_days` en `/api/stripe/checkout`);
  no hace falta configurarlo en el producto, aunque puedes definirlo también en Stripe.
- Copia el **API ID** de cada precio (`price_…`) → `STRIPE_PRICE_PRO` y `STRIPE_PRICE_BUSINESS`.
- Los Price ID de **test no valen en live**: al pasar a producción, recrea productos y precios y
  actualiza las variables.

### 3.2 Crear el endpoint de webhook

**Developers → Webhooks → + Add endpoint**:

- **URL**: `https://tudominio.com/api/stripe/webhook`
- **Eventos a escuchar** (selecciona exactamente estos):
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`
  - `invoice.payment_succeeded`
- Copia el **Signing secret** (`whsec_…`) → `STRIPE_WEBHOOK_SECRET`.

En local, para recibir webhooks en tu máquina:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
# la CLI imprime el whsec_… temporal: pégalo en tu .env local
```

### 3.3 De test a live (cuando vayas a vender)

1. Completa la activación de la cuenta: empresa, IBAN, identidad (Stripe → **Activate account**).
2. Cambia el interruptor a **Live mode** y repite 3.1 y 3.2 con claves y precios `live`.
3. Facturación: Settings → **Business details / Billing / Tax** (logo, datos fiscales, IVA).

---

## 4. OpenAI (respuestas con IA) · opcional

1. [platform.openai.com](https://platform.openai.com) → crea cuenta → **Billing** (añade saldo:
   cada borrador cuesta fracciones de céntimo con `gpt-4o-mini`).
2. **API keys → Create new secret key** → copia la clave → `OPENAI_API_KEY`.
   · En **Settings → Limits → Monthly budget** pon un tope (p. ej. 10 $): segunda red de seguridad,
     además del presupuesto de tokens que ya aplica cada plan.
   · Deja `OPENAI_MODEL=gpt-4o-mini` (el más económico) y, si quieres afinar, usa
     `OPENAI_TIMEOUT_MS`, `OPENAI_MAX_ATTEMPTS`, `OPENAI_RPM_PER_TENANT` y `OPENAI_MAX_CONCURRENCY`.
3. Restringe el gasto en **Settings → Limits** (budget mensual + alertas por email).
4. **Sin esta clave la app funciona igual**: usa plantillas locales profesionales y el panel lo
   indica. Cada borrador generado (público o mensaje privado conciliador) consume **1 evento**
   del contador `ai` de la cuota.

---

## 5. Stripe: recargas de cuota (pago único)

v3.7.0 simplifica las ampliaciones: **solo hay 4 recargas de pago único** que suman capacidad al
**ciclo en curso**. Se aplican en el instante en que el webhook confirma el cobro.

El cliente puede **marcar varias a la vez** y pagarlas en un solo checkout. El código ya las
gestiona; tú solo creas los productos en Stripe y pegas sus Price ID (opcional).

### 5.1 Catálogo que espera la app

| ID interno | Producto a crear en Stripe | Añade | Importe | Variable del `.env` |
|---|---|---|---|---|
| `extra_requests_1000` | `ReviewFlow · +1.000 peticiones` | 1.000 peticiones (email/WhatsApp) | 9 € | `STRIPE_PRICE_ADDON_REQUESTS` |
| `extra_reviews_2000` | `ReviewFlow · +2.000 opiniones` | 2.000 opiniones + 2.000 plazas de almacenamiento | 12 € | `STRIPE_PRICE_ADDON_REVIEWS` |
| `extra_ai_500` | `ReviewFlow · +500 respuestas IA` | 500 borradores de IA | 15 € | `STRIPE_PRICE_ADDON_AI` |
| `extra_syncs_500` | `ReviewFlow · +500 sincronizaciones` | 500 sincronizaciones automáticas | 6 € | `STRIPE_PRICE_ADDON_SYNCS` |

**Todas son One-off** (pago único). No crees productos recurrentes: el modelo ya no tiene
suscripciones paralelas (menos casos límite y menos sobrecostes).

### 5.2 Paso a paso (repite por producto, ≈3 min cada uno)

1. Stripe Dashboard → **Product catalog → + Add product**.
2. **Name**: el de la tabla 5.1 (p. ej. `ReviewFlow · +1.000 peticiones`).
3. **Description** (opcional, aparece en el Checkout):
   `Amplía la cuota del ciclo actual. Pago único, no renovable; caduca al empezar el mes siguiente.`
4. **Pricing model**: *One-off* (⚠️ NO «Recurring»: se cobraría cada mes).
5. **Price**: el importe de la tabla · **Currency**: `EUR`.
6. **Save product** → copia el **API ID** del precio (`price_1…`). Si no lo ves, activa
   **Developers → Settings → Show test data / API IDs**.
7. Pégalo en la variable correspondiente del `.env` → **reinicia o redespliega**.
8. Comprueba en la pestaña *Sistema* del panel interno: cada recarga debe salir como **listo**.
   Si sale *falta en .env*, la app cobrará igualmente creando la línea con `price_data` inline
   (importe de `lib/plans.ts` o `STRIPE_ADDON_*_PRICE_CENTS`).

### 5.3 Cómo se compran y cómo se aplican

- **Dónde aparece el selector**:
  - Web pública: tabla de precios de la landing (`/#planes`).
  - Panel: `/dashboard?tab=facturacion` → *Ampliar cuota*, con la recarga sugerida según la
    métrica que te bloqueó (`blockedBy`).
- **Endpoints**:
  - `GET /api/stripe/addon?packs=1` → catálogo de recargas + cuota actual.
  - `POST /api/stripe/addon` con selección múltiple:
    `{ tenantId, addons: [ { key: "extra_requests_1000", quantity: 2 } ] }`
    → devuelve la URL de una única sesión `mode: 'payment'` con todos los `line_items`.
  - Legacy de un solo pack: `POST { tenantId, pack, quantity }` o
    `GET /api/stripe/addon?type=extra_requests_1000&tenantId=…` → redirección directa.
- **Al confirmar el pago**, el webhook (`checkout.session.completed`) inserta cada línea en el
  ledger `addons` (idempotente por `stripe_payment_id`) y suma la capacidad a
  `tenants.extra_requests / extra_reviews / extra_ai / extra_syncs`, más
  `extra_stored` (plazas de almacenamiento) en el caso de las opiniones.
  Esas columnas se leen desde `lib/usage.ts` y **caducan solas al cambiar de ciclo**.
- El panel refleja la nueva cuota **inmediatamente** (evento `rf:quota-refresh`, sin recargar).

### 5.4 Prueba rápida de la recarga (modo test)

1. `/dashboard?tab=facturacion` → elige *+1.000 peticiones* → **Comprar**.
2. En el Checkout de test usa la tarjeta `4242 4242 4242 4242`, fecha futura, CVC cualquiera.
3. Al volver a la app, el medidor muestra el extra del ciclo y la barra baja de porcentaje.
   En la pestaña *Cuotas y extras* del panel interno verás la recarga concedida.
4. Si no se aplica: revisa `stripe listen` / el endpoint del webhook y la sección
   [11. Troubleshooting](#11-troubleshooting-cuotas-402429-y-cobros).

---

## 6. Meta WhatsApp Cloud API (alertas ≤3★ y post-venta)

Cada mensaje enviado consume **1 evento** del contador `whatsapp`.

1. [developers.facebook.com](https://developers.facebook.com) → **My Apps → Create App** →
   tipo **Business**.
2. Añade el producto **WhatsApp** → **API Setup**.
3. Anota los tres identificadores que ves ahí:
   - **Temporary access token** (dura 24 h; suficiente para probar).
   - **Phone number ID** → `WHATSAPP_PHONE_NUMBER_ID`.
   - **WhatsApp Business Account ID** → `WHATSAPP_BUSINESS_ACCOUNT_ID`.
4. Verifica tu número y añade el móvil del negocio como **destinatario de prueba** (en test solo
   puedes escribir a números verificados).
5. **Token permanente para producción** (imprescindible antes de vender):
   Business Settings → **Users → System Users** → crea un usuario *Admin* → **Add assets**
   (tu app de WhatsApp) → **Generate token** con los permisos
   `whatsapp_business_messaging` y `whatsapp_business_management` → cópialo a `WHATSAPP_TOKEN`
   (ese token no caduca).
6. **Destino de las alertas**: en el panel → *Empresa* → pega el móvil del negocio **con prefijo
   internacional y sin `+`** (ej. `34612345678`) → **Guardar** → **Probar envío real**.
7. **Webhook entrante de Meta**: esta versión solo **envía** mensajes (alertas ≤3★ y peticiones
   de valoración post-venta); no procesa respuestas entrantes. Por eso `WHATSAPP_VERIFY_TOKEN` es
   opcional: queda reservado por si más adelante activas el Callback URL en
   App Dashboard → WhatsApp → **Configuration**.

---

## 7. Google Cloud: Business Profile (OAuth) + Places API

### 7.1 OAuth de Google Business Profile (importar **y publicar** respuestas)

1. [console.cloud.google.com](https://console.cloud.google.com) → crea un proyecto.
2. **APIs & Services → Library** → habilita **Google My Business API** (si no aparece, solicita
   acceso con la cuenta de Google del negocio) y, opcionalmente, **Places API (New)**.
3. **APIs & Services → OAuth consent screen**: tipo **External**, nombre de la app, tu email,
   scopes básicos (`openid`, `email`, `profile`) → publica en **Production** (o añade tu cuenta
   como *Test user* mientras tanto).
4. **Credentials → Create credentials → OAuth client ID** → tipo **Web application**.
5. **Authorized redirect URI** (debe ser EXACTA, con tu dominio real):

   ```
   https://tudominio.com/api/integrations/google/callback
   ```

6. Copia **Client ID** y **Client Secret** → `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` →
   redespliega.
7. En el panel → *Empresa* → **Conectar con Google** → autoriza con la cuenta propietaria de la
   ficha → **Sincronizar reseñas**.
8. Cada sincronización consume llamadas de `google_calls` (límite por plan: 20 / 60 / 200 al mes)
   y cada reseña importada consume **1 evento** de la cuota `reviews`.

### 7.2 Places API (New) — clave de servidor, opcional

Útil cuando no puedes hacer OAuth con la cuenta propietaria de la ficha: lee reseñas públicas por
**Place ID**.

1. **APIs & Services → Library → Places API (New) → Enable**.
2. **Credentials → Create credentials → API key** → copia → `GOOGLE_PLACES_API_KEY`.
3. **Restringe la clave**: *Edit API key* → Application restrictions = **IP addresses** (IP de tu
   servidor) → API restrictions = solo **Places API (New)**.
4. Activa la facturación de Google Cloud y ponte una **alerta de presupuesto** (el uso de esta app
   es bajo: solo se llama al sincronizar).

### 7.3 Place ID para los enlaces «déjanos una reseña» (gratis, sin API)

1. Busca tu negocio en [Google Maps](https://www.google.com/maps) → **Compartir** → el código
   largo tras `/place/`, o usa el [Place ID Finder](https://developers.google.com/maps/documentation/places/web-service/place-id) oficial.
2. Panel → *Empresa* → pega el **Place ID** → **Guardar** → aparece el enlace corto para pedir
   reseñas (WhatsApp, tickets, firma de email…).

---

## 8. SMTP + DNS para no caer en spam

1. Crea cuenta en tu proveedor (Brevo, Postmark, SES, Mailgun…) → obtén `SMTP_HOST`, `SMTP_PORT`,
   `SMTP_USER`, `SMTP_PASS` → pégalos en el `.env`.
2. Define el remitente `SMTP_FROM=Tu Marca <no-reply@tudominio.com>` (debe ser un dominio tuyo).
3. En el DNS de tu dominio añade los registros del proveedor (en Brevo: **Settings → Senders &
   domains → Domains → Add domain** te da los valores exactos):

   | Tipo | Host | Valor (ejemplo Brevo) | Para qué |
   |---|---|---|---|
   | `TXT` | `@` | `v=spf1 include:spf.sendinblue.com mx ~all` | SPF |
   | `TXT` | `mail._domainkey` | valor DKIM que te da Brevo | Firma DKIM |
   | `TXT` | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:legal@tudominio.com` | DMARC |
   | `TXT` | `@` | código de verificación del proveedor | Propiedad del dominio |

4. Pulsa **Authenticate** y espera a que los 3 checks estén en verde (minutos u horas).
5. Sin SMTP la app funciona igual: los avisos se registran en `system_logs` y se muestran en
   `/admin → Logs`.

---

## 9. Datos fiscales, logo y textos

### 9.1 `lib/site.ts` (única fuente de verdad de las páginas legales)

| Campo | Qué poner | Ejemplo |
|---|---|---|
| `brand` | Nombre comercial | `ReviewFlow AI` |
| `company` | Razón social | `Mi Empresa S.L.` |
| `cif` | CIF/NIF | `B12345678` |
| `address` | Domicilio social completo | `Calle Mayor 1, 28001 Madrid, España` |
| `email` | Email legal/RGPD | `legal@tudominio.com` |
| `supportEmail` | Email de soporte (recibe `/contacto`) | `soporte@tudominio.com` |
| `domain` | Tu dominio | `tudominio.com` |

- [ ] Sin `[corchetes]` pendientes → commit → redespliega.
- [ ] Textos legales revisados por tu asesoría si lo necesitas (son plantillas, no asesoramiento jurídico).
- [ ] Email legal operativo: los derechos RGPD se responden en **1 mes**.

### 9.2 Marca

- [ ] Sustituye `public/logo.svg` y `public/favicon.svg` (mismo nombre = cero código).
- [ ] Opcional: `public/apple-touch-icon.png` (180×180) y `public/og-image.png` (1200×630).

### 9.3 Contenido comercial honesto

La web **no** incluye testimonios inventados (prohibido por la Dir. (UE) 2019/2161 «Ómnibus»).

- [ ] Cuando tengas clientes reales: pide permiso escrito para nombre/logo y añádelos.
- [ ] Si cambias los 29 €/79 € o los importes de las recargas (9/12/15/6 €), actualízalos **a la vez** en
      Stripe, en `lib/plans.ts` y en los textos de `/terminos`.

---

## 10. Verificación final (prueba E2E)

1. **Build limpio**:

   ```bash
   npm install
   npm run typecheck   # 0 errores
   npm run build       # ✓ Compiled successfully
   npm run start       # o `npm run dev`
   ```

2. `GET /api/health?verbose=1` → `version: "3.8.0"` y todas las integraciones que configuraste en
   verde (`configured: true`). Si añadiste `DATABASE_URL`, comprueba también `GET /api/health?db=1`.
   Atajo: `npm run verify` lo revisa todo, incluida la firma del webhook de Stripe.
3. Panel interno (`/admin`, privado) → **sin** banner de modo demo; pestaña *Sistema* con todas
   las integraciones en «listo», incluidos los Price ID de Pro/Business y las 4 recargas.
4. **Flujo de alta (Gratuito)**: registro con otro email → `/bienvenido` → **Gratuito** → empresa
   creada al instante **sin tarjeta**.
5. **Flujo de alta (Pro/Business)**: registro → `/bienvenido` → elige Pro → Checkout con
   `4242 4242 4242 4242` → vuelta a la app → empresa **auto-creada** y estado `trialing`.
5. **Flujo de reseñas**: conecta Google o pega un Place ID → **Sincronizar** → reseñas reales en
   la bandeja → *Generar respuesta con IA* → editar → **Publicar**.
6. **Flujo de triaje**: fuerza una reseña de ≤3★ → aparece en la cola privada con análisis de la
   reclamación, mensaje conciliador privado y nota interna; si configuraste WhatsApp, llega la
   alerta al móvil.
8. **Flujo de cuota**: observa el medidor de `/dashboard` (y la pestaña *Cuotas y extras* del
   panel interno). Al llegar al 100 % las APIs responden `429` con cabecera `Retry-After` y el
   panel ofrece la recarga sugerida; al comprarla, la capacidad sube al instante.
8. **Corte del día 8**: cancela la suscripción en Stripe (o deja fallar el cobro) → el webhook la
   marca `canceled` / `past_due` → el middleware redirige a
   `/bienvenido?reason=trial-ended` (o `past-due`) y el panel queda inaccesible sin perder datos.
9. Seguridad: dominio + HTTPS, `NEXT_PUBLIC_APP_URL` final, contraseñas robustas y **2FA** en
   GitHub, Supabase, Stripe, Google Cloud, Meta y tu host.

---

## 11. Troubleshooting (cuotas, 402/429 y cobros)

| Síntoma | Causa habitual | Solución |
|---|---|---|
| `429 Too Many Requests` al sincronizar o generar IA | Cuota del ciclo agotada | Compra un add-on (`/dashboard?tab=facturacion`) o espera al siguiente ciclo. La respuesta incluye `Retry-After` y `X-RateLimit-*`. |
| `402 Payment Required` | Sin suscripción activa, prueba caducada o la feature no está en tu plan | Activa plan en `/bienvenido` (o pasa al Gratuito); si la feature es de otro plan, mejora de plan. |
| `403 Forbidden` en una integración | La integración no pertenece a tu plan (p. ej. tienda/WhatsApp en Gratuito) o la empresa está suspendida | Revisa el plan en *Facturación* y la tabla de features de `lib/plans.ts`. |
| `507 Insufficient Storage` | La empresa alcanzó el tope de opiniones, conexiones o almacenamiento de su plan | Es la protección de la BD: compra la recarga de opiniones, desconecta una integración o sube de plan. La purga de lo más antiguo es automática. |
| La recarga se cobra pero no sube la cuota | Webhook no llega o `STRIPE_WEBHOOK_SECRET` incorrecto | Revisa Stripe → Webhooks → intentos (error de firma = 400). En local usa `stripe listen --forward-to`. |
| «Se han archivado opiniones» | El plan llegó a su tope de filas (`reviewsStored`) y la purga borró las más antiguas | Es el comportamiento documentado en `GUIA_ADMIN.md` §3: ofrece recarga de opiniones o plan superior. |
| La capacidad sube el doble tras reintentar | — (no debería ocurrir) | Idempotencia por `stripe_payment_id`; si ves duplicados, revisa que ejecutaste `migration_3_7_0.sql`. |
| Los extras desaparecen el día 1 | Comportamiento correcto: las recargas valen solo para el ciclo en curso | `reset_expired_extras()` (pg_cron) o `checkQuota()` los pone a 0 al cambiar de ciclo. |
| `/dashboard` redirige a `/bienvenido?reason=trial-ended` el día 8 | Primer cobro fallido o trial terminado | Stripe → suscripción → *Retry payment* o el cliente contrata de nuevo. Los datos se conservan 30 días. |
| El panel interno muestra «Modo demo» | `SUPERADMIN_EMAILS` vacío o sin la Service Role key | Añade tu email exacto (minúsculas) + `SUPABASE_SERVICE_ROLE_KEY` y vuelve a entrar con esa cuenta. |
| Google OAuth devuelve `redirect_uri_mismatch` | URI autorizada distinta de la real | Pon EXACTAMENTE `https://tudominio.com/api/integrations/google/callback` y redespliega. |
| WhatsApp no envía en pruebas | Número destino no verificado o token caducado (24 h) | Verifica el móvil destinatario en Meta y genera un token permanente de System User. |
| La IA responde con plantilla en vez de OpenAI | `OPENAI_API_KEY` ausente/inválida o sin saldo | `/api/health` te lo dice; añade saldo y la clave. Comprueba `ai_interactions.ok = false`. |
| El cliente ve `429 token_budget_exhausted` | Agotó el presupuesto de tokens de su plan | Ofrécele la recarga `+500 respuestas IA` (15 €) o sube de plan; se reinicia el día 1. |
| Se agotan las conexiones de Postgres | `DATABASE_URL` apunta al host directo, no al pooler | Usa la cadena del puerto **6543** (Supavisor, transaction) y ajusta `DATABASE_POOL_MAX`. |
| Webhook con `400 Firma inválida` | `whsec_…` de otro endpoint o de otro modo | `GET /api/stripe/webhook` muestra el modo y las pistas, y `npm run verify` valida la firma. |

🎉 Hecho: altas (Gratuito y de pago), cobros, cuotas, recargas, empresas e integraciones funcionan solos; el panel interno sirve para supervisarlos.
