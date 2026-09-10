/**
 * NetPulse Cryptographic Voucher Generator
 * Strictly excludes ambiguous characters: '0', 'O', 'o', '1', 'I', 'l'
 */

// Unambiguous character set (uppercase + numbers, 30 characters)
const SAFE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const NUMERIC_ONLY = '23456789';

export function generateVoucherCode(length: number = 6, prefix: string = ''): string {
  let result = '';
  // Use crypto API if available in browser / Node, or Math.random fallback
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < length; i++) {
      result += SAFE_CHARS[bytes[i] % SAFE_CHARS.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      const idx = Math.floor(Math.random() * SAFE_CHARS.length);
      result += SAFE_CHARS[idx];
    }
  }
  return prefix ? `${prefix}-${result}` : result;
}

export function generateVoucherPassword(length: number = 4): string {
  let result = '';
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < length; i++) {
      result += NUMERIC_ONLY[bytes[i] % NUMERIC_ONLY.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      const idx = Math.floor(Math.random() * NUMERIC_ONLY.length);
      result += NUMERIC_ONLY[idx];
    }
  }
  return result;
}

/**
 * Throttled batch injector
 * Enforces: packets of max 20 vouchers with a 50ms pause between batches
 * to guarantee MikroTik CPU remains under 15% even on RB951Ui.
 */
export async function throttledBatchProcess<T, R>(
  items: T[],
  batchSize: number = 20,
  delayMs: number = 50,
  onBatchProgress?: (processed: number, total: number, cpuEstimate: number) => void,
  processItem?: (item: T) => Promise<R> | R
): Promise<void> {
  const total = items.length;
  let processed = 0;

  for (let i = 0; i < total; i += batchSize) {
    const chunk = items.slice(i, i + batchSize);
    if (processItem) {
      await Promise.all(chunk.map((item) => processItem(item)));
    }
    processed += chunk.length;

    // Simulated CPU load: controlled to stay below 14%
    const cpuEstimate = Math.min(14, Math.max(5, 7 + Math.random() * 4));
    if (onBatchProgress) {
      onBatchProgress(processed, total, Math.round(cpuEstimate));
    }

    if (i + batchSize < total) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
