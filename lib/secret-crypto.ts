import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ENCRYPTED_PREFIX = 'v1:';

function getEncryptionKey(): Buffer {
  const rawKey = process.env.ROUTER_CREDENTIALS_KEY;
  if (!rawKey) {
    throw new Error('ROUTER_CREDENTIALS_KEY must be configured to store router credentials');
  }

  const key = /^[0-9a-f]{64}$/i.test(rawKey)
    ? Buffer.from(rawKey, 'hex')
    : Buffer.from(rawKey, 'base64');

  if (key.length !== 32) {
    throw new Error('ROUTER_CREDENTIALS_KEY must encode exactly 32 bytes');
  }

  return key;
}

export function encryptSecret(secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    ENCRYPTED_PREFIX.slice(0, -1),
    iv.toString('base64url'),
    tag.toString('base64url'),
    ciphertext.toString('base64url'),
  ].join(':');
}

export function decryptSecret(value: string): string {
  if (!value.startsWith(ENCRYPTED_PREFIX)) {
    return value;
  }

  const [, ivValue, tagValue, ciphertextValue] = value.split(':');
  if (!ivValue || !tagValue || !ciphertextValue) {
    throw new Error('Invalid encrypted secret format');
  }

  const decipher = createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    Buffer.from(ivValue, 'base64url')
  );
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

export function encryptRouterPassword(password: string | null | undefined): string | null {
  if (!password) return null;
  return encryptSecret(password);
}

export function decryptRouterPassword(password: string | null | undefined): string | undefined {
  if (!password) return undefined;
  return decryptSecret(password);
}