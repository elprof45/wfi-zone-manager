import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.ROUTER_CREDENTIALS_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

import {
    decryptRouterPassword,
    decryptSecret,
    encryptRouterPassword,
    encryptSecret,
} from './secret-crypto';

describe('router credential encryption', () => {
  it('round-trips secrets without storing plaintext', () => {
    const encrypted = encryptSecret('router-password');

    assert.notEqual(encrypted, 'router-password');
    assert.match(encrypted, /^v1:/);
    assert.equal(decryptSecret(encrypted), 'router-password');
  });

  it('keeps legacy unencrypted values readable during migration', () => {
    assert.equal(decryptRouterPassword('legacy-password'), 'legacy-password');
  });

  it('preserves empty router passwords as null', () => {
    assert.equal(encryptRouterPassword(''), null);
    assert.equal(decryptRouterPassword(null), undefined);
  });

  it('rejects malformed encrypted values', () => {
    assert.throws(() => decryptSecret('v1:broken'), /Invalid encrypted secret format/);
  });

  it('rejects tampered ciphertext', () => {
    const encrypted = encryptSecret('router-password');
    const parts = encrypted.split(':');
    parts[3] = `${parts[3]}tampered`;

    assert.throws(() => decryptSecret(parts.join(':')));
  });
});