import { randomUUID } from 'crypto';

/**
 * Generate a short unique ID (defaults to 12 chars).
 * Safe for database IDs, ticket codes, and tokens.
 */
export function nanoid(size = 12): string {
  return randomUUID().replace(/-/g, '').slice(0, size);
}

/**
 * Generate a random alphanumeric voucher code (format: XXXX-XXXX or custom).
 */
export function generateTicketCode(length = 8, prefix = ''): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Avoid confusing chars like 0/O, 1/I
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return prefix ? `${prefix}-${result}` : result;
}
