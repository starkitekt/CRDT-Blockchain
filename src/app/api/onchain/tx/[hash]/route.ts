import { NextRequest, NextResponse } from 'next/server';
import { JsonRpcProvider, Network, formatEther } from 'ethers';
import { DEFAULT_CHAIN_ID, networkLabel, explorerTxUrl } from '@/lib/explorer';

/**
 * GET /api/onchain/tx/[hash]
 *
 * Surfaces the on-chain receipt for a given transaction hash so the UI can
 * show users **what is actually recorded on Base Sepolia** without having to
 * leave the app. Hashes are public — no auth required, but we cap the rate
 * implicitly by caching aggressively (304-friendly).
 *
 * Response:
 *   {
 *     ok: true,
 *     hash, network, chainId,
 *     blockNumber, blockTimestamp, confirmations,
 *     status: 'success' | 'failed',
 *     gasUsed, gasPrice, feeEth,
 *     from, to, contractAddress,
 *     logs: [{ address, topics }],
 *     explorerUrl,
 *   }
 */

const RPC_URL =
  process.env.BASE_SEPOLIA_RPC_URL ||
  process.env.BLOCKCHAIN_RPC_URL ||
  'https://sepolia.base.org';

let cachedProvider: JsonRpcProvider | null = null;
function getProvider(): JsonRpcProvider {
  if (cachedProvider) return cachedProvider;
  // staticNetwork avoids the chainId-detection round-trip on every call.
  const net = new Network('base-sepolia', 84532);
  cachedProvider = new JsonRpcProvider(RPC_URL, net, { staticNetwork: net });
  return cachedProvider;
}

const HASH_RE = /^0x[0-9a-fA-F]{64}$/;

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ hash: string }> }
) {
  const { hash } = await ctx.params;

  if (!hash || !HASH_RE.test(hash)) {
    return NextResponse.json(
      { ok: false, error: 'INVALID_TX_HASH' },
      { status: 400 }
    );
  }

  try {
    const provider = getProvider();
    const [receipt, tx, currentBlock] = await Promise.all([
      provider.getTransactionReceipt(hash),
      provider.getTransaction(hash),
      provider.getBlockNumber(),
    ]);

    if (!receipt) {
      // Tx exists but isn't mined yet, or it's unknown to this node.
      return NextResponse.json({
        ok: true,
        hash,
        chainId: 84532,
        network: networkLabel(DEFAULT_CHAIN_ID),
        explorerUrl: explorerTxUrl(hash),
        status: 'pending',
        message: tx ? 'Transaction is in mempool — not mined yet.'
                    : 'Transaction not found on Base Sepolia.',
      });
    }

    const block = await provider.getBlock(receipt.blockNumber).catch(() => null);
    const confirmations = Math.max(0, currentBlock - receipt.blockNumber + 1);
    const gasUsed = receipt.gasUsed?.toString() ?? null;
    const gasPriceWei = tx?.gasPrice ?? receipt.gasPrice ?? null;
    const feeWei = receipt.fee ?? (gasPriceWei && receipt.gasUsed
      ? gasPriceWei * receipt.gasUsed
      : null);

    return NextResponse.json({
      ok: true,
      hash,
      chainId: 84532,
      network: networkLabel(DEFAULT_CHAIN_ID),
      explorerUrl: explorerTxUrl(hash),
      blockNumber: receipt.blockNumber,
      blockTimestamp: block?.timestamp ?? null,
      blockTimestampIso: block?.timestamp ? new Date(block.timestamp * 1000).toISOString() : null,
      confirmations,
      status: receipt.status === 1 ? 'success' : 'failed',
      gasUsed,
      gasPriceWei: gasPriceWei?.toString() ?? null,
      feeWei: feeWei?.toString() ?? null,
      feeEth: feeWei != null ? formatEther(feeWei) : null,
      from: receipt.from ?? null,
      to: receipt.to ?? null,
      contractAddress: receipt.contractAddress ?? null,
      logsCount: receipt.logs?.length ?? 0,
      logs: (receipt.logs ?? []).slice(0, 6).map((l) => ({
        address: l.address,
        topics: l.topics,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        ok: false,
        error: 'CHAIN_READ_FAILED',
        message,
        explorerUrl: explorerTxUrl(hash),
      },
      { status: 502 }
    );
  }
}
