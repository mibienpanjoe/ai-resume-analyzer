/**
 * Convert a byte size to a human‑readable string (KB, MB, or GB).
 *
 * Examples:
 *  - formatSize(1024) => "1 KB"
 *  - formatSize(1536) => "1.5 KB"
 *  - formatSize(5_242_880) => "5 MB"
 *
 * @param bytes Number of bytes
 * @param fractionDigits How many decimals to keep for values under 10 of a unit (default: 1)
 */
export function formatSize(bytes: number, fractionDigits: number = 1): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';

  const KB = 1024;
  const MB = KB * 1024;
  const GB = MB * 1024;

  const format = (value: number, unit: 'KB' | 'MB' | 'GB') => {
    // For values under 10, keep a decimal; otherwise no decimals by default
    const decimals = value < 10 ? Math.max(1, fractionDigits) : 0;
    return `${value.toFixed(decimals)} ${unit}`;
  };

  if (bytes < KB) return `${bytes} B`;
  if (bytes < MB) return format(bytes / KB, 'KB');
  if (bytes < GB) return format(bytes / MB, 'MB');
  return format(bytes / GB, 'GB');
}

export default formatSize;


export const generateUUID = () => crypto.randomUUID();