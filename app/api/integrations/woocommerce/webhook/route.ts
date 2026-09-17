import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleDeliveredOrder, tenantByApiKey, verifyWooHmac } from '@/lib/store';
import { systemLog } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * Webhook REAL de WooCommerce: WooCommerce → Settings → Advanced → Webhooks →
 * Add webhook (Topic: Order updated, Status: Active) con esta URL:
 * /api/integrations/woocommerce/webhook?key=TU_API_KEY
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
    .eq('provider', 'woocommerce')
    .single();
  const secret = (integ?.credentials as any)?.webhook_secret as string | undefined;

  const raw = await req.text();
  if (!verifyWooHmac(raw, secret ?? '', req.headers.get('x-wc-webhook-signature'))) {
    await systemLog('warn', 'store.webhook', 'Firma WooCommerce inválida', { tenantId: tenant.id });
    return NextResponse.json({ error: 'Firma inválida.' }, { status: 401 });
  }

  let order: any;
  try {
    order = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  if (order.status !== 'completed') return NextResponse.json({ ok: true, skipped: 'not-completed' });

  const phone = order.billing?.phone ?? '';
  const name =
    [order.billing?.first_name, order.billing?.last_name].filter(Boolean).join(' ') || 'cliente';

  const result = await handleDeliveredOrder(admin, tenant as any, {
    orderId: String(order.id ?? Date.now()),
    customerName: name,
    customerPhone: phone,
    provider: 'woocommerce',
  });

  // v3.6.0: si la causa es comercial (cuota agotada, plan o suscripción),
  // devolvemos 200 con un ESTADO INFORMATIVO en vez de 4xx/5xx: la cola de
  // reintentos de WooCommerce no se satura y el motivo queda visible en el panel.
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
