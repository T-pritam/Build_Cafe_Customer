/**
 * Extracts a tableId from a QR code string.
 * Handles two formats:
 *   buildcafe://table/UUID
 *   buildcafecustomer://scan?tableId=UUID[&tableNumber=N]
 * Returns null for unrecognised formats.
 */
export function extractTableIdFromQR(value: string): string | null {
  const tableMatch = value.match(/\/\/(?:.*\/)?table\/([0-9a-f-]{36})/i);
  if (tableMatch) {return tableMatch[1];}

  const queryString = value.includes('?') ? value.split('?')[1] : '';
  const params: Record<string, string> = {};
  queryString.split('&').forEach(pair => {
    const [k, v] = pair.split('=');
    if (k) {params[decodeURIComponent(k)] = decodeURIComponent(v ?? '');}
  });
  return params.tableId ?? null;
}
