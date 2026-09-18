# 🚀 GUIA_DESPLIEGUE.md — ReviewFlow AI v3.9.0

Despliegue en **producción desde cero**, paso a paso, sin asumir conocimientos previos.
Al final tendrás `https://tudominio.com` cobrando con Stripe en modo live.

> ¿Solo quieres probar gratis antes? Empieza por **[GUIA_GRATIS.md](./GUIA_GRATIS.md)** (0 €)
> y vuelve aquí cuando vayas a comercializar. Los pasos manuales a tu cargo están en
> **[GUIA_PASOS_MANUALES.md](./GUIA_PASOS_MANUALES.md)**, y todo lo que debes aportar
> para vender al público (empresa, marca, legal, soporte…) en
> **[GUIA_COMERCIALIZACION.md](./GUIA_COMERCIALIZACION.md)**.

---

## 0. Lo que necesitas (checklist)

| # | Qué | Dónde | Coste aprox. |
|---|---|---|---|
| 1 | Dominio (`.com`/`.es`) | DonDominio, Cloudflare, Ionos… | ~12 €/año |
| 2 | Cuenta Supabase | supabase.com | Gratis (Pro ~25 $/mes recomendado) |
| 3 | Cuenta Stripe (+ empresa/autónomo) | stripe.com | Gratis + comisión por cobro |
| 4 | Hosting (VPS o PaaS) | Hetzner, Vercel Pro, Render, Railway… | 5–25 €/mes |
| 5 | SMTP para emails | Brevo (gratis 300/día), Postmark, SES | 0 € para empezar |
| 6 | WhatsApp Business (opcional) | Meta for Developers | Gratis (mensajes según país) |
| 7 | Google Cloud (opcional) | console.cloud.google.com | Gratis (OAuth) |

---

## 1. Dominio + DNS (15 min)

1. Compra el dominio (ver [GUIA_COMPRA_DOMINIO.md](./GUIA_COMPRA_DOMINIO.md) si existe en tu repo; si no, cualquier registrador vale).
2. Apunta el dominio a tu hosting:
   - **Vercel/Render/Railway:** sigue su pantalla «Add domain» y pega los registros que te den (normalmente `A` o `CNAME`).
   - **VPS:** crea un registro `A` → IP del servidor, para `@` y para `www`.
3. Espera a que resuelva (`nslookup tudominio.com`) y activa el SSL:
   - PaaS: automático. VPS: Caddy o Nginx + Certbot (el `docker-compose` expone el puerto 3000; pon un reverse-proxy delante con HTTPS).

> ⚠️ Sin HTTPS no funcionarán bien los webhooks de Stripe/Shopify ni el OAuth de Google.

---

## 2. Supabase: base de datos + auth (20 min)

1. Crea un proyecto en [supabase.com](https://supabase.com) (región **West EU / Frankfurt** si tus clientes son españoles).
2. **SQL Editor** → pega el contenido de `supabase/schema.sql` → **Run**. (Si ya tenías datos de una versión anterior, ejecuta en orden `migration_3_4_0.sql` → `migration_3_5_0.sql` → `migration_3_6_0.sql` → `migration_3_7_0.sql` → `migration_3_8_0.sql` → **`migration_3_9_0.sql`**) — la última deja el modelo 100 % de pago.
3. **Authentication → Providers → Email**: activado (magic link desactivado, contraseña activada).
4. **Authentication → URL Configuration** → Site URL = `https://tudominio.com` (+ añade la URL a Redirect URLs).
5. **Project Settings → API**: copia `URL`, `anon public` y `service_role` → irán al `.env` del paso 6.

---

## 3. Stripe: productos, precios y webhook (25 min)

1. Activa tu cuenta (empresa/autónomo + IBAN) y pasa a **Live mode**.
2. **Product catalog** → crea dos productos mensuales (**sin plan gratuito**):
   - `Solo Reseñas` → 29 €/mes → copia su **Price ID** (`price_…`) → `STRIPE_PRICE_PRO`.
   - `Completo E-commerce` → 79 €/mes → copia su **Price ID** → `STRIPE_PRICE_BUSINESS`.
   - Activa **Smart Retries + email de impago** (Settings → Billing → Revenue recovery) y los
     **emails de prueba que termina** para el trial de 7 días (lo aplica el código).
3. **Developers → API keys** → copia la `Secret key` **live** (`sk_live_…`). La `Publishable key` no se usa (el checkout es server-side).
4. **Developers → Webhooks** → **Add endpoint**:
   - URL: `https://tudominio.com/api/stripe/webhook`
   - Eventos: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.trial_will_end`, `invoice.payment_failed`, `invoice.payment_succeeded`, `checkout.session.expired`, `payment_intent.succeeded`.
   - Copia el **Signing secret** (`whsec_…`).
5. Prueba con una tarjeta live real pequeña o con un cupón del 100 % el primer mes; verifica en `/admin` que el tenant pasa a `trialing` y luego a `active`.

Variables resultantes: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_BUSINESS` (+ `STRIPE_PRICE_ADDON_{REQUESTS,REVIEWS,AI,SYNCS}` si usas Price IDs para las recargas).

---

## 4. Emails SMTP (10 min)

1. Crea cuenta en [Brevo](https://www.brevo.com) (gratis, 300 emails/día) → **SMTP & API** → crea una clave SMTP.
2. Añade y verifica tu dominio (registros SPF/DKIM que te indican) para no caer en spam.
3. Variables: `SMTP_HOST` (`smtp-relay.brevo.com`), `SMTP_PORT` (`587`), `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` (`ReviewFlow AI <no-reply@tudominio.com>`).

---

## 5. Google + WhatsApp (opcional, 30 min)

- **Google Business Profile:** en [Google Cloud Console](https://console.cloud.google.com) crea un proyecto → habilita *Business Profile APIs* → credenciales OAuth (tipo Web) con redirect `https://tudominio.com/api/integrations/google/callback` → `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`.
- **WhatsApp Cloud API:** en [Meta for Developers](https://developers.facebook.com) crea una app → añade producto WhatsApp → número de teléfono + token permanente → `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID`. Para plantillas de marketing («pide valoración»), créalas en el panel de Meta y úsalas en producción.
- **Trustpilot / Place ID de Maps / tienda:** no van en el `.env`; cada cliente los conecta desde su panel.

---

## 6. Variables de entorno (10 min)

1. Copia la plantilla: `cp .env.example .env` (o pega cada variable en el panel de tu hosting: Vercel → Settings → Environment Variables, etc.).
2. Rellena **todas**: `NEXT_PUBLIC_APP_URL=https://tudominio.com`, `SUPERADMIN_EMAILS=tu@email.com`, las **6 legales/empresa** (`NEXT_PUBLIC_COMPANY_NAME`, `NEXT_PUBLIC_CIF`, `NEXT_PUBLIC_ADDRESS`, `NEXT_PUBLIC_LEGAL_EMAIL`, `NEXT_PUBLIC_SUPPORT_EMAIL`, `NEXT_PUBLIC_DOMAIN` — salen en el footer y en las páginas legales), las 3 de Supabase, las de Stripe (precios **live** + secretos **live**) y las 5 de SMTP.
3. ⚠️ Nunca subas el `.env` a Git ni lo pegues en chats. Rota cualquier clave que se exponga.

---

## 7. Despliegue según hosting

### Opción A · Vercel (el más fácil, ~10 min)

1. Sube el repo a GitHub → **vercel.com → Add New → Project** → Import.
2. Pega las variables del paso 6 → **Deploy**.
3. **Settings → Domains** → añade `tudominio.com` (+ `www`) y sigue su DNS.
4. ⚠️ **Uso comercial = plan Pro de Vercel** (~20 $/mes): el plan Hobby prohíbe vender. Si prefieres no pagar a Vercel, usa la opción B.

### Opción B · VPS con Docker (Hetzner/Contabo ~5 €/mes, 30 min)

```bash
# En el servidor (Ubuntu 22.04+)
apt update && apt install -y docker.io docker-compose-plugin git
git clone https://github.com/TU-USUARIO/TU-REPO.git reviewflow && cd reviewflow
cp .env.example .env && nano .env   # pega tus claves
docker compose up -d --build
# → http://IP-SERVIDOR:3000 (delante, Caddy/Nginx con HTTPS a tudominio.com)
```

Ejemplo mínimo de Caddy (`/etc/caddy/Caddyfile`):

```
tudominio.com {
    reverse_proxy 127.0.0.1:3000
}
```

### Opción C · Render / Railway / Fly.io

New Web Service desde el repo → comando `npm run build && npm start` (o usa el `Dockerfile`) → pega las variables → añade tu dominio.

---

## 8. Verificación post-despliegue (15 min) ✅

Marca cada punto antes de vender:

- [ ] `https://tudominio.com` carga y `/api/health` responde `{"ok":true,...}`.
- [ ] `/registro` crea una cuenta y `/bienvenido` muestra los dos planes.
- [ ] Checkout Stripe live abre el trial de 7 días (tarjeta).
- [ ] Tras pagar, el webhook crea el tenant: visible en `/admin` (entra con tu email de `SUPERADMIN_EMAILS`).
- [ ] `/dashboard` muestra la empresa, el consumo del ciclo, los topes de BD del plan y el selector de recargas (`?tab=facturacion`).
- [ ] Conexión Google (OAuth) importa reseñas; WhatsApp de prueba llega al móvil.
- [ ] Email de contacto (`/contacto`) llega a tu bandeja (revisa spam la primera vez).
- [ ] Cancelar la suscripción en Stripe → el acceso al dashboard se corta (paywall en `/bienvenido`).

---

## 9. Problemas típicos

| Síntoma | Causa probable | Solución |
|---|---|---|
| `/dashboard` redirige siempre a `/bienvenido` | Webhook no llega / `STRIPE_WEBHOOK_SECRET` mal | Revisa el endpoint en Stripe → Recent events; compara el `whsec_…` |
| OAuth Google: `redirect_uri_mismatch` | Falta la URI exacta | Añade `https://tudominio.com/api/integrations/google/callback` tal cual en Google Cloud |
| No llegan emails | SMTP o SPF/DKIM | Prueba `/contacto`; revisa logs del hosting y la verificación del dominio en Brevo |
| Supabase «pausado» | Plan gratis inactivo 1 semana | Dashboard → Resume (en producción usa Pro) |
| Webhook tienda 401 | Secreto distinto | El `webhookSecret` guardado en el panel debe ser el mismo que configuraste en Shopify/Woo |

¿Todo verde? Pasa a **[GUIA_ADMIN.md](./GUIA_ADMIN.md)** para operar tu negocio día a día. 🎉
