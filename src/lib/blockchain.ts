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
import HoneyTraceAbi from './abis/HoneyTraceRegistry.json';
import deploymentAddresses from '../../deployments/addresses.json';

const HONEYTRACE_ABI = HoneyTraceAbi;

const SUPPORTED_CHAIN_IDS = new Set([84532, 31337]);
const CHAIN_NAME: Record<number, string> = {
  84532: 'baseSepolia',
  31337: 'localhost',
};

const minOperationalBalanceEth = Number(process.env.NEXT_PUBLIC_MIN_BALANCE_ETH ?? '0.002');

type AddressMap = {
  [networkName: string]: {
    HoneyTraceRegistry?: string;
  };
};

const ADDRESS_MAP = deploymentAddresses as AddressMap;

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

function resolveContractAddress(chainId: number | null): string {
  if (!chainId) {
    return process.env.NEXT_PUBLIC_HONEYTRACE_CONTRACT ?? '';
  }

  const chainKey = CHAIN_NAME[chainId];
  if (!chainKey) return process.env.NEXT_PUBLIC_HONEYTRACE_CONTRACT ?? '';
  return ADDRESS_MAP[chainKey]?.HoneyTraceRegistry ?? process.env.NEXT_PUBLIC_HONEYTRACE_CONTRACT ?? '';
}

function getConnectedContract(signer: JsonRpcSigner, chainId: number): Contract {
  const address = resolveContractAddress(chainId);
  if (!address) throw new Error('HoneyTrace contract is not configured for this network.');
  return new Contract(address, HONEYTRACE_ABI, signer);
}

export function isSupportedChain(chainId: number | null): boolean {
  return chainId !== null && SUPPORTED_CHAIN_IDS.has(chainId);
}

export function formatChainName(chainId: number | null): string {
  if (!chainId) return 'Unknown network';
  if (chainId === 84532) return 'Base Sepolia';
  if (chainId === 31337) return 'Local Hardhat';
  return `Chain ${chainId}`;
}

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
  const chainId = Number(network.chainId);

  if (!isSupportedChain(chainId)) {
    throw new Error(`Unsupported chain ${chainId}. Please switch to Base Sepolia or Local Hardhat.`);
  }

  return {
    provider,
    signer,
    address,
    chainId,
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

export async function getWalletBalanceEth(provider: BrowserProvider, walletAddress: string): Promise<number> {
  const balanceWei = await provider.getBalance(walletAddress);
  return Number(ethers.formatEther(balanceWei));
}

export function isBalanceSufficient(balanceEth: number): boolean {
  return balanceEth >= minOperationalBalanceEth;
}

/**
 * Write a batch record to the HoneyTraceRegistry contract.
 */
export async function writeBatchOnChain(
  signer: JsonRpcSigner,
  chainId: number,
  batchId: string,
  batchData: Record<string, unknown>,
  bizStep: string,
  location: string,
): Promise<string> {
  const contract = getConnectedContract(signer, chainId);
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
  chainId: number,
  batchId: string,
): Promise<{ dataHash: string; timestamp: number; recorder: string; bizStep: string } | null> {
  const address = resolveContractAddress(chainId);
  if (!address) return null;

  const contract = new Contract(address, HONEYTRACE_ABI, provider);
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
  chainId: number,
  batchId: string,
  tier: 1 | 2 | 3,
  reason: string,
): Promise<string> {
  const contract = getConnectedContract(signer, chainId);
  const tx = await contract.initRecall(batchId, tier, reason);
  const receipt = await tx.wait();
  return receipt.hash as string;
}
