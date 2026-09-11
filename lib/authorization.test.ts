import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { hasAllowedRole, canManageOperations } from './authorization';

describe('authorization rules', () => {
  it('allows only explicitly assigned roles', () => {
    assert.equal(hasAllowedRole('admin', ['admin', 'super_admin']), true);
    assert.equal(hasAllowedRole('cashier', ['admin', 'super_admin']), false);
    assert.equal(hasAllowedRole(undefined, ['admin']), false);
  });

  it('limits operational management to administrators', () => {
    assert.equal(canManageOperations('super_admin'), true);
    assert.equal(canManageOperations('admin'), true);
    assert.equal(canManageOperations('cashier'), false);
  });
});