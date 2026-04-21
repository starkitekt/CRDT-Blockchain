import { describe, expect, it } from 'vitest';

import {
  DEFAULT_CHAIN_ID,
  explorerAddressUrl,
  explorerTxUrl,
  networkLabel,
  shortHash,
} from '../../src/lib/explorer';

const VALID_TX = `0x${'a'.repeat(64)}`;
const VALID_ADDR = `0x${'b'.repeat(40)}`;

describe('explorer helpers', () => {
  describe('explorerTxUrl', () => {
    it('builds a Base Sepolia tx URL by default', () => {
      expect(explorerTxUrl(VALID_TX)).toBe(
        `https://sepolia.basescan.org/tx/${VALID_TX}`
      );
    });

    it('supports Base mainnet', () => {
      expect(explorerTxUrl(VALID_TX, 8453)).toBe(
        `https://basescan.org/tx/${VALID_TX}`
      );
    });

    it('returns null for the local hardhat chain (no public explorer)', () => {
      expect(explorerTxUrl(VALID_TX, 31337)).toBeNull();
    });

    it('rejects malformed hashes', () => {
      expect(explorerTxUrl('')).toBeNull();
      expect(explorerTxUrl('0xnothex')).toBeNull();
      expect(explorerTxUrl(`0x${'a'.repeat(63)}`)).toBeNull();
    });
  });

  describe('explorerAddressUrl', () => {
    it('builds a Base Sepolia address URL by default', () => {
      expect(explorerAddressUrl(VALID_ADDR)).toBe(
        `https://sepolia.basescan.org/address/${VALID_ADDR}`
      );
    });

    it('rejects malformed addresses', () => {
      expect(explorerAddressUrl('')).toBeNull();
      expect(explorerAddressUrl('not-an-address')).toBeNull();
      expect(explorerAddressUrl(`0x${'b'.repeat(39)}`)).toBeNull();
    });
  });

  describe('networkLabel', () => {
    it('labels known chains', () => {
      expect(networkLabel(84532)).toBe('Base Sepolia');
      expect(networkLabel(8453)).toBe('Base');
      expect(networkLabel(31337)).toBe('Hardhat Localhost');
    });

    it('uses the default chain when no id is provided', () => {
      expect(networkLabel()).toBe(networkLabel(DEFAULT_CHAIN_ID));
    });
  });

  describe('shortHash', () => {
    it('shortens long hashes with an ellipsis', () => {
      const result = shortHash(VALID_TX);
      expect(result.startsWith('0xaaaaaa')).toBe(true);
      expect(result.endsWith('aaaaaa')).toBe(true);
      expect(result).toContain('…');
      expect(result.length).toBeLessThan(VALID_TX.length);
    });

    it('returns the original string when it is already short', () => {
      expect(shortHash('0xabcd')).toBe('0xabcd');
    });

    it('handles empty input gracefully', () => {
      expect(shortHash('')).toBe('');
    });

    it('honours custom head/tail lengths', () => {
      const trimmed = shortHash(VALID_TX, 4, 4);
      expect(trimmed).toBe(`0xaa…aaaa`);
    });
  });
});
