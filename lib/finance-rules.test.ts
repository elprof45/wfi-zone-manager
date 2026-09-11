import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { calculateClosureTotals } from './finance-rules';

describe('cash closure rules', () => {
  it('aggregates revenue and breakdown by profile', () => {
    const result = calculateClosureTotals([
      { price: '500', profileId: 'hour', profileName: '1 Heure' },
      { price: 500, profileId: 'hour', profileName: '1 Heure' },
      { price: '1000', profileId: 'day', profileName: '24 Heures' },
    ]);

    assert.equal(result.totalRevenue, 2000);
    assert.equal(result.ticketsSoldCount, 3);
    assert.deepEqual(result.breakdown, [
      { profileId: 'hour', profileName: '1 Heure', count: 2, revenue: 1000 },
      { profileId: 'day', profileName: '24 Heures', count: 1, revenue: 1000 },
    ]);
  });

  it('rejects invalid ticket prices', () => {
    assert.throws(() => calculateClosureTotals([
      { price: 'not-a-number', profileId: 'hour', profileName: '1 Heure' },
    ]), /Prix de ticket invalide/);
  });
});