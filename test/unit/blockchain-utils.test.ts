import { describe, expect, it } from 'vitest';
import { hashBatchData, isBalanceSufficient } from '../../src/lib/blockchain';

describe('blockchain utils', () => {
  it('hashes same object deterministically', () => {
    const one = hashBatchData({ floraType: 'Mustard', weightKg: 12, farmerId: 'F-1' });
    const two = hashBatchData({ weightKg: 12, farmerId: 'F-1', floraType: 'Mustard' });
    expect(one).toEqual(two);
  });

  it('flags low balance as insufficient', () => {
    expect(isBalanceSufficient(0.0001)).toBe(false);
    expect(isBalanceSufficient(0.1)).toBe(true);
  });
});