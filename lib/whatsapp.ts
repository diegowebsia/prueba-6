/**
 * WhatsApp Cloud API (Meta) — alertas reales al móvil del negocio.
 * Configuración (Meta for Developers → tu app → WhatsApp):
 *   WHATSAPP_TOKEN               = token de acceso (permanente en producción)
 *   WHATSAPP_PHONE_NUMBER_ID     = ID del número remitente
 *   WHATSAPP_BUSINESS_ACCOUNT_ID = ID de la cuenta de negocio (opcional, métricas)
 *   WHATSAPP_API_VERSION         = versión del Graph API (por defecto v21.0)
 * El destino (móvil del negocio, formato 34612345678) se guarda por empresa
 * en tenants.settings.whatsapp_to desde el panel.
 */

export function whatsappApiVersion(): string {
  return (process.env.WHATSAPP_API_VERSION ?? 'v21.0').replace(/^\/+|\/+$/g, '');
}

export function isWhatsappConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

/**
 * Envío RAW a la Cloud API. Devuelve el `wamid` del mensaje.
 * ⚠️ No comprueba cuota ni plan: usa `sendWhatsappForTenant()` desde el negocio.
 */
export async function sendWhatsapp(to: string, body: string): Promise<string | undefined> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) throw new Error('WhatsApp no configurado (WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID).');

  const res = await fetch(
    `https://graph.facebook.com/${whatsappApiVersion()}/${phoneId}/messages`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to.replace(/\D/g, ''),
        type: 'text',
        text: { preview_url: false, body: body.slice(0, 4000) },
      }),
    },
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`WhatsApp error (${res.status}): ${detail.slice(0, 200)}`);
  }
  const data: any = await res.json().catch(() => ({}));
  return (data?.messages?.[0]?.id as string | undefined) ?? undefined;
}

/** Alerta de reseña negativa (≤3★) al móvil configurado de la empresa. */
export function negativeReviewAlert(business: string, author: string, rating: number, text: string): string {
  return (
    `⚠️ Nueva reseña de ${rating}★ en ${business}\n` +
    `👤 ${author}\n💬 “${text.slice(0, 280)}”\n\n` +
    `Respóndela desde tu panel de ReviewFlow AI.`
  );
}

/* ================================================================== */
/* Capa de negocio: WhatsApp conectado al contador de cuota            */
/* ================================================================== */

import type { PlanFeatures } from '@/lib/plans';
import type { AdminLike, GateBlocked } from '@/lib/usage';
import { consume, enforce, publicQuota } from '@/lib/usage';
import { systemLog } from '@/lib/logger';

export type WhatsappContext = { admin: AdminLike; tenantId: string };

export type WhatsappOk = {
  ok: true;
  status: 200;
  messageId?: string;
  quota: ReturnType<typeof publicQuota>;
};

export type WhatsappBlocked = {
  ok: false;
  status: number;
  code: string;
  error: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
};

export type WhatsappResult = WhatsappOk | WhatsappBlocked;

function blocked(gate: GateBlocked): WhatsappBlocked {
  return {
    ok: false,
    status: gate.status,
    code: gate.code,
    error: gate.error,
    headers: gate.headers,
    body: gate.body,
  };
}

/**
 * Envío de WhatsApp CON control de cuota y de plan.
 * Ningún mensaje sale a la Cloud API de Meta sin pasar por aquí:
 *   1. enforce() → 402 (sin suscripción) / 403 (feature fuera de plan) / 429 (cuota).
 *   2. sendWhatsapp() → Meta Graph API.
 *   3. consume('requests') → usage_counters.whatsapp_sent +1 (atómico).
 * Si Meta falla, NO se descuenta crédito (solo se paga lo que se entrega).
 */
export async function sendWhatsappForTenant(
  ctx: WhatsappContext,
  payload: {
    to: string;
    body: string;
    /** Feature del plan que habilita este envío. */
    feature?: keyof PlanFeatures;
    /** Etiqueta para logs y auditoría. */
    kind?: 'alerta' | 'pedido' | 'prueba' | 'campana';
    action?: string;
  },
): Promise<WhatsappResult> {
  const kind = payload.kind ?? 'alerta';
  const gate = await enforce(ctx.admin, ctx.tenantId, {
    metric: 'requests',
    feature: payload.feature ?? 'whatsappAlerts',
    amount: 1,
    action: payload.action ?? `WhatsApp (${kind})`,
  });
  if (!gate.ok) {
    await systemLog('warn', 'whatsapp.quota', gate.error, { tenantId: ctx.tenantId, code: gate.code, kind });
    return blocked(gate);
  }

  if (!isWhatsappConfigured()) {
    return {
      ok: false,
      status: 503,
      code: 'whatsapp_not_configured',
      error: 'WhatsApp Cloud API no configurada en el servidor (WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID).',
      headers: {},
      body: { error: 'WhatsApp no configurado.', code: 'whatsapp_not_configured', quota: publicQuota(gate.check) },
    };
  }

  try {
    const messageId = await sendWhatsapp(payload.to, payload.body);
    await consume(ctx.admin, ctx.tenantId, 'requests', 1);
    await systemLog('info', 'whatsapp.sent', `WhatsApp ${kind} enviado`, {
      tenantId: ctx.tenantId,
      messageId,
    });
    const q = publicQuota(gate.check);
    return {
      ok: true,
      status: 200,
      messageId,
      quota: { ...q, used: q.used + 1, remaining: Math.max(0, q.remaining - 1) },
    };
  } catch (e: any) {
    await systemLog('error', 'whatsapp.sent', e?.message ?? 'Fallo enviando WhatsApp', {
      tenantId: ctx.tenantId,
    });
    return {
      ok: false,
      status: 502,
      code: 'provider_error',
      error: e?.message ?? 'No se pudo enviar el WhatsApp.',
      headers: {},
      body: { error: e?.message ?? 'No se pudo enviar el WhatsApp.', code: 'provider_error' },
    };
  }
}

/** Mensaje de petición de valoración tras entrega (plan Business). */
export function orderDeliveredMessage(business: string, customerName: string, reviewLink: string): string {
  return (
    `¡Hola ${customerName}! 🎉 Tu pedido de ${business} ha sido entregado.\n` +
    `¿Te ha gustado? Nos ayudarías muchísimo con tu valoración (30 segundos):\n${reviewLink}`
  );
}
