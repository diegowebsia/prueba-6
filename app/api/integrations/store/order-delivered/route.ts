import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleDeliveredOrder, tenantByApiKey } from '@/lib/store';

const Body = z.object({
  api_key: z.string().min(10),
  order_id: z.string().min(1).max(100),
  customer_name: z.string().min(1).max(120),
  customer_phone: z.string().min(5).max(25),
});

/**
 * Endpoint GENÉRICO «pedido entregado» para cualquier tienda/TPV/Stripe:
 * llámalo al entregar y enviamos el WhatsApp de valoración al cliente.
 * (Solo plan Business + cuota disponible.)
 */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Parámetros inválidos.' }, { status: 400 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'Supabase no configurado.' }, { status: 503 });

  const tenant = await tenantByApiKey(admin, parsed.data.api_key);
  if (!tenant) return NextResponse.json({ error: 'API key inválida.' }, { status: 401 });

  const result = await handleDeliveredOrder(admin, tenant as any, {
    orderId: parsed.data.order_id,
    customerName: parsed.data.customer_name,
    customerPhone: parsed.data.customer_phone,
    provider: 'store',
  });
  return NextResponse.json(result.body, { status: result.status });
}
