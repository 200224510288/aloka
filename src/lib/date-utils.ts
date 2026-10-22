/**
 * Standardizes various date string formats used by NLB, DLB, and Sri Lankan lottery sites
 * into ISO format: YYYY-MM-DD
 */
export function parseToIsoDate(rawDateStr?: string | null): string | null {
  if (!rawDateStr) return null;
  const s = rawDateStr.trim();

  // If already YYYY-MM-DD
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  // DLB format: "2026-Oct-20 Tuesday" or "2026-Oct-20"
  const dlbMatch = s.match(/(\d{4})-([A-Za-z]{3})-(\d{1,2})/i);
  if (dlbMatch) {
    const year = dlbMatch[1];
    const monthStr = dlbMatch[2].toLowerCase();
    const day = dlbMatch[3].padStart(2, '0');
    const months: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };
    const month = months[monthStr];
    if (month) return `${year}-${month}-${day}`;
  }

  // NLB format: "Tuesday October 20, 2026" or "October 20, 2026"
  const nlbMatch = s.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/i);
  if (nlbMatch) {
    const monthStr = nlbMatch[1].slice(0, 3).toLowerCase();
    const day = nlbMatch[2].padStart(2, '0');
    const year = nlbMatch[3];
    const months: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };
    const month = months[monthStr];
    if (month) return `${year}-${month}-${day}`;
  }

  // Fallback to Native Date parse
  try {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch {}

  return null;
}
