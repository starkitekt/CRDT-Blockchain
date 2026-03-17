// Type augment window.ethereum for MetaMask / injected wallets
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ethereum?: any;
  }
}

/**
 * HoneyTRACE Blockchain Integration Layer
 *
 * Uses ethers.js v6 to:
 *  1. Connect a MetaMask / injected wallet
 *  2. Write batch hashes to a deployed HoneyTrace smart contract
 *  3. Read on-chain batch records
 *
 * CONTRACT: Deploy HoneyTraceRegistry.sol to your chosen network
 * (Polygon PoS recommended for low gas fees in India)
 */

import { ethers, BrowserProvider, JsonRpcSigner, Contract } from 'ethers';

// Minimal ABI — matches HoneyTraceRegistry.sol
const HONEYTRACE_ABI = [
  'function recordBatch(string batchId, bytes32 dataHash, string bizStep, string location) public',
  'function getBatch(string batchId) public view returns (bytes32 dataHash, uint256 timestamp, address recorder, string bizStep)',
  'function initRecall(string batchId, uint8 tier, string reason) public',
  'event BatchRecorded(string indexed batchId, bytes32 dataHash, address indexed recorder, uint256 timestamp)',
  'event RecallInitiated(string indexed batchId, uint8 tier, address indexed officer, uint256 timestamp)',
];

// Replace with deployed contract address for your network
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_HONEYTRACE_CONTRACT ?? '';

export interface WalletState {
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
}

export const INITIAL_WALLET_STATE: WalletState = {
  provider: null,
  signer: null,
  address: null,
  chainId: null,
  isConnected: false,
};

/**
 * Connect the browser's injected wallet (MetaMask / WalletConnect).
 * Returns wallet state or throws with a user-friendly message.
 */
export async function connectWallet(): Promise<WalletState> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No Web3 wallet detected. Please install MetaMask to use blockchain features.');
  }

  const provider = new BrowserProvider(window.ethereum);
  await provider.send('eth_requestAccounts', []);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  const network = await provider.getNetwork();

  return {
    provider,
    signer,
    address,
    chainId: Number(network.chainId),
    isConnected: true,
  };
}

/**
 * Hash a batch data object into a bytes32 for on-chain storage.
 * Uses keccak256 over a JSON-serialised payload (deterministic).
 */
export function hashBatchData(data: Record<string, unknown>): string {
  const payload = JSON.stringify(data, Object.keys(data).sort());
  return ethers.keccak256(ethers.toUtf8Bytes(payload));
}

/**
 * Write a batch record to the HoneyTraceRegistry contract.
 */
export async function writeBatchOnChain(
  signer: JsonRpcSigner,
  batchId: string,
  batchData: Record<string, unknown>,
  bizStep: string,
  location: string,
): Promise<string> {
  if (!CONTRACT_ADDRESS) throw new Error('NEXT_PUBLIC_HONEYTRACE_CONTRACT not configured.');

  const contract = new Contract(CONTRACT_ADDRESS, HONEYTRACE_ABI, signer);
  const dataHash = hashBatchData(batchData);
  const tx = await contract.recordBatch(batchId, dataHash, bizStep, location);
  const receipt = await tx.wait();
  return receipt.hash as string;
}

/**
 * Read a batch record from the chain.
 */
export async function readBatchFromChain(
  provider: BrowserProvider,
  batchId: string,
): Promise<{ dataHash: string; timestamp: number; recorder: string; bizStep: string } | null> {
  if (!CONTRACT_ADDRESS) return null;

  const contract = new Contract(CONTRACT_ADDRESS, HONEYTRACE_ABI, provider);
  try {
    const result = await contract.getBatch(batchId);
    return {
      dataHash: result.dataHash,
      timestamp: Number(result.timestamp) * 1000, // convert to ms
      recorder: result.recorder,
      bizStep: result.bizStep,
    };
  } catch {
    return null;
  }
}

/**
 * Submit a recall event on-chain.
 */
export async function submitRecallOnChain(
  signer: JsonRpcSigner,
  batchId: string,
  tier: 1 | 2 | 3,
  reason: string,
): Promise<string> {
  if (!CONTRACT_ADDRESS) throw new Error('NEXT_PUBLIC_HONEYTRACE_CONTRACT not configured.');

  const contract = new Contract(CONTRACT_ADDRESS, HONEYTRACE_ABI, signer);
  const tx = await contract.initRecall(batchId, tier, reason);
  const receipt = await tx.wait();
  return receipt.hash as string;
}
