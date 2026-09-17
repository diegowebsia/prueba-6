import crypto from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { enforce } from '@/lib/usage';
import { orderDeliveredMessage, sendWhatsappForTenant } from '@/lib/whatsapp';
import { googleReviewLink } from '@/lib/maps';
import { systemLog } from '@/lib/logger';

type AdminLike = SupabaseClient<any, 'public', any>;

export function verifyShopifyHmac(rawBody: string, secret: string, hmacHeader: string | null): boolean {
  if (!secret || !hmacHeader) return false;
  const digest = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64');
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
  } catch {
    return false;
  }
}

export function verifyWooHmac(rawBody: string, secret: string, sig: string | null): boolean {
  return verifyShopifyHmac(rawBody, secret, sig); // mismo esquema HMAC-SHA256/base64
}

export type DeliveredOrder = {
  orderId: string;
  customerName: string;
  customerPhone: string;
  provider: 'shopify' | 'woocommerce' | 'store';
};

/**
 * Pedido entregado → WhatsApp automático al CLIENTE pidiendo valoración.
 * Solo plan Business + suscripción con acceso + cuota. Descuenta 1 unidad.
 */
export async function handleDeliveredOrder(
  admin: AdminLike,
  tenant: { id: string; name: string; plan: string; subscription_status: string; suspended: boolean; settings: any },
  order: DeliveredOrder,
): Promise<{ ok: boolean; status: number; body: Record<string, unknown>; headers?: Record<string, string> }> {
  // 1) Feature del plan: la tienda + WhatsApp post-venta son del plan Business.
  const featureGate = await enforce(admin, tenant.id, {
    metric: 'requests',
    feature: 'storeIntegration',
    amount: 0,
    action: 'Conexión con tienda',
  });
  if (!featureGate.ok) {
    return {
      ok: false,
      status: featureGate.status,
      body: featureGate.body,
    };
  }
  // 2) Cuota: 1 evento de WhatsApp por pedido entregado.
  const quotaGate = await enforce(admin, tenant.id, {
    metric: 'requests',
    feature: 'whatsappOrders',
    amount: 1,
    action: 'WhatsApp post-venta',
  });
  if (!quotaGate.ok) {
    return {
      ok: false,
      status: quotaGate.status,
      body: quotaGate.body,
      headers: quotaGate.headers,
    };
  }
  if (!order.customerPhone || order.customerPhone.replace(/\D/g, '').length < 9) {
    await systemLog('warn', 'store.webhook', `Pedido ${order.orderId} sin móvil de cliente`, {
      tenantId: tenant.id,
    });
    return { ok: false, status: 200, body: { ok: true, skipped: 'no-customer-phone' } };
  }

  // Idempotencia: mismo pedido no se avisa dos veces (log por external_id).
  const marker = `order:${order.provider}:${order.orderId}`;
  const { data: dup } = await admin
    .from('system_logs')
    .select('id')
    .eq('source', 'store.review-request')
    .eq('message', marker)
    .limit(1);
  if (dup && dup.length > 0) {
    return { ok: true, status: 200, body: { ok: true, skipped: 'duplicate' } };
  }

  const placeId = tenant.settings?.place_id as string | undefined;
  const link = placeId
    ? googleReviewLink(placeId)
    : `${(process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')}/`;
  const msg = orderDeliveredMessage(tenant.name, order.customerName, link);

  // Envío CON control de cuota: el crédito solo se descuenta si Meta acepta.
  const sent = await sendWhatsappForTenant(
    { admin, tenantId: tenant.id },
    {
      to: order.customerPhone,
      body: msg,
      kind: 'pedido',
      feature: 'whatsappOrders',
      action: 'WhatsApp post-venta (pedido entregado)',
    },
  );
  if (!sent.ok) {
    await systemLog('warn', 'store.webhook', sent.error, { tenantId: tenant.id, code: sent.code });
    return {
      ok: false,
      status: sent.status,
      body: { error: sent.error, code: sent.code, ...('body' in sent ? ((sent as any).body ?? {}) : {}) },
    };
  }

  await systemLog('info', 'store.review-request', marker, {
    tenantId: tenant.id,
    provider: order.provider,
    messageId: sent.messageId,
  });
  return { ok: true, status: 200, body: { ok: true, messageId: sent.messageId, quota: sent.quota } };
}

/** Localiza empresa por su API key (usada en la URL del webhook de la tienda). */
export async function tenantByApiKey(admin: AdminLike, apiKey: string | null) {
  if (!apiKey) return null;
  const { data } = await admin
    .from('tenants')
    .select('id, name, plan, subscription_status, suspended, settings')
    .eq('api_key', apiKey)
    .single();
  return data ?? null;
}
