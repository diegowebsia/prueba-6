/**
 * Trustpilot Business API (reseñas reales de tu tienda/negocio).
 * Cada empresa guarda su API key + Business Unit ID en `integrations`
 * (se configuran en el panel; Trustpilot las da en su plan Business).
 * Docs: https://developers.trustpilot.com
 */

export type TrustpilotReview = {
  externalId: string;
  author: string;
  rating: number;
  text: string;
  createdAt: string;
  verified: boolean;
};

export async function fetchTrustpilotReviews(
  apiKey: string,
  businessUnitId: string,
): Promise<TrustpilotReview[]> {
  const url =
    `https://api.trustpilot.com/v1/business-units/${encodeURIComponent(businessUnitId)}` +
    `/reviews?perPage=100&apikey=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Trustpilot error (${res.status}): revisa API key y Business Unit ID.`);
  const data = await res.json();
  return (data.reviews ?? []).map((r: any) => ({
    externalId: `trustpilot:${r.id}`,
    author: r.consumer?.displayName ?? 'Cliente de Trustpilot',
    rating: Number(r.stars ?? 5),
    text: r.text ?? r.title ?? '',
    createdAt: r.createdAt ?? new Date().toISOString(),
    verified: Boolean(r.isVerified),
  }));
}
