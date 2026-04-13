import { ethers } from 'ethers';
import { Contract, JsonRpcProvider, Wallet } from 'ethers';
import HoneyTraceAbi from './abis/HoneyTraceRegistry.json';

const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || process.env.LOCAL_RPC_URL || 'http://127.0.0.1:8545';
const privateKey = process.env.BLOCKCHAIN_RELAYER_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
const contractAddress = process.env.HONEYTRACE_CONTRACT_ADDRESS || process.env.NEXT_PUBLIC_HONEYTRACE_CONTRACT;

const chainEnabled = Boolean(privateKey && contractAddress);

let contractInstance: Contract | null = null;

function getRelayContract(): Contract {
  if (!chainEnabled) {
    throw new Error('Blockchain relay is not configured. Set BLOCKCHAIN_RELAYER_PRIVATE_KEY and HONEYTRACE_CONTRACT_ADDRESS.');
  }

  if (contractInstance) return contractInstance;
  const provider = new JsonRpcProvider(rpcUrl);
  const signer = new Wallet(privateKey as string, provider);
  contractInstance = new Contract(contractAddress as string, HoneyTraceAbi, signer);
  return contractInstance;
}

function keccakHash(data: unknown): string {
  const json = JSON.stringify(
    data,
    Object.keys(data as object).sort()
  );
  return ethers.keccak256(ethers.toUtf8Bytes(json));
}

export function isBlockchainRelayEnabled(): boolean {
  return chainEnabled;
}

export async function anchorBatchOnChain(
  batchId: string,
  payload: Record<string, unknown>,
  bizStep: string,
  location: string
): Promise<string> {
  const contract = getRelayContract();
  const payloadHash = keccakHash(payload);  // ← pass object, not pre-stringified string
  const tx = await contract.recordBatch(batchId, payloadHash, bizStep, location);
  const receipt = await tx.wait();
  return receipt.hash;
}

export async function anchorLabResultOnChain(batchId: string, payload: Record<string, unknown>): Promise<string> {
  const contract = getRelayContract();
  const payloadHash = keccakHash(payload);
  const tx = await contract.linkLabResult(batchId, payloadHash);
  const receipt = await tx.wait();
  return receipt.hash;
}

export async function anchorRecallOnChain(batchId: string, tier: number, reason: string): Promise<string> {
  const contract = getRelayContract();
  const tx = await contract.initRecall(batchId, tier, reason);
  const receipt = await tx.wait();
  return receipt.hash;
}
