/**
 * Block-explorer helpers.
 *
 * Single source of truth for the public BaseScan URLs we link out to from
 * the UI (settled auctions, batch journey, recall receipts, etc.). Keeping
 * the chain-id ↔ explorer mapping here means we only have to change one
 * place when we promote the contract to mainnet.
 */

export type SupportedChainId = 84532 | 8453 | 31337;

const EXPLORER_BASE: Record<SupportedChainId, string | null> = {
  // Base Sepolia (testnet) — what we ship today.
  84532: 'https://sepolia.basescan.org',
  // Base mainnet — placeholder for the production cutover.
  8453: 'https://basescan.org',
  // Local hardhat node — no public explorer.
  31337: null,
};

const NETWORK_LABEL: Record<SupportedChainId, string> = {
  84532: 'Base Sepolia',
  8453: 'Base',
  31337: 'Hardhat Localhost',
};

/** Default chain we anchor to today. Swap when promoting to mainnet. */
export const DEFAULT_CHAIN_ID: SupportedChainId = 84532;

export function explorerTxUrl(
  txHash: string,
  chainId: SupportedChainId = DEFAULT_CHAIN_ID
): string | null {
  const base = EXPLORER_BASE[chainId];
  if (!base) return null;
  if (!txHash || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) return null;
  return `${base}/tx/${txHash}`;
}

export function explorerAddressUrl(
  address: string,
  chainId: SupportedChainId = DEFAULT_CHAIN_ID
): string | null {
  const base = EXPLORER_BASE[chainId];
  if (!base) return null;
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) return null;
  return `${base}/address/${address}`;
}

export function networkLabel(chainId: SupportedChainId = DEFAULT_CHAIN_ID): string {
  return NETWORK_LABEL[chainId] ?? `Chain ${chainId}`;
}

export function shortHash(hash: string, headLen = 8, tailLen = 6): string {
  if (!hash) return '';
  if (hash.length <= headLen + tailLen + 1) return hash;
  return `${hash.slice(0, headLen)}…${hash.slice(-tailLen)}`;
}
