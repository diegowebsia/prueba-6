import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleDeliveredOrder, tenantByApiKey, verifyShopifyHmac } from '@/lib/store';
import { systemLog } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * Webhook REAL de Shopify: pega esta URL en
 * Settings → Notifications → Webhooks → Evento `Fulfillment events`.
 * URL: /api/integrations/shopify/webhook?key=TU_API_KEY
 */
export async function POST(req: Request) {
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'Supabase no configurado.' }, { status: 503 });

  const key = new URL(req.url).searchParams.get('key');
  const tenant = await tenantByApiKey(admin, key);
  if (!tenant) return NextResponse.json({ error: 'Tienda desconocida.' }, { status: 404 });

  const { data: integ } = await admin
    .from('integrations')
    .select('credentials')
    .eq('tenant_id', tenant.id)
    .eq('provider', 'shopify')
    .single();
  const secret = (integ?.credentials as any)?.webhook_secret as string | undefined;

  const raw = await req.text();
  if (!verifyShopifyHmac(raw, secret ?? '', req.headers.get('x-shopify-hmac-sha256'))) {
    await systemLog('warn', 'store.webhook', 'HMAC Shopify inválido', { tenantId: tenant.id });
    return NextResponse.json({ error: 'Firma inválida.' }, { status: 401 });
  }

  let order: any;
  try {
    order = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  const topic = req.headers.get('x-shopify-topic') ?? '';
  const fulfilled =
    topic.includes('fulfillments/create') ||
    order.fulfillment_status === 'fulfilled' ||
    (Array.isArray(order.fulfillments) && order.fulfillments.length > 0);
  if (!fulfilled) return NextResponse.json({ ok: true, skipped: 'not-fulfilled' });

  const phone =
    order.customer?.phone ?? order.shipping_address?.phone ?? order.billing_address?.phone ?? '';
  const name =
    [order.customer?.first_name, order.customer?.last_name].filter(Boolean).join(' ') ||
    order.shipping_address?.name ||
    'cliente';

  const result = await handleDeliveredOrder(admin, tenant as any, {
    orderId: String(order.id ?? order.name ?? Date.now()),
    customerName: name,
    customerPhone: phone,
    provider: 'shopify',
  });

  // v3.6.0: si la causa es comercial (cuota agotada, plan o suscripción),
  // devolvemos 200 con un ESTADO INFORMATIVO en vez de 4xx/5xx: la cola de
  // reintentos de Shopify no se satura y el motivo queda visible en el panel.
  if (!result.ok && (result.status === 402 || result.status === 403 || result.status === 429)) {
    const body = (result.body ?? {}) as Record<string, unknown>;
    return NextResponse.json(
      {
        ok: false,
        accepted: true,
        processed: false,
        reason: result.status === 429 ? 'quota_exhausted' : result.status === 403 ? 'feature_not_included' : 'no_subscription',
        message: (body.error as string) ?? 'Operación bloqueada por el estado de la suscripción.',
        quota: body.quota ?? null,
        upgrade: body.upgrade ?? null,
      },
      { status: 200 },
    );
  }

  return NextResponse.json(result.body, { status: result.status });
}
