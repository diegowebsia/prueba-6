/**
 * Google Maps — enlaces reales de «déjanos una reseña» por empresa.
 * La empresa pega su Place ID (se obtiene gratis en 1 min, ver docs/GUIA_PASOS_MANUALES.md)
 * y el panel genera el enlace universal + el de búsqueda.
 */

/** Enlace directo a escribir reseña (requiere Place ID). */
export function googleReviewLink(placeId: string): string {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
}

/** Enlace a la ficha en Maps (búsqueda por Place ID). */
export function googleMapsLink(placeId: string): string {
  return `https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${encodeURIComponent(placeId)}`;
}
