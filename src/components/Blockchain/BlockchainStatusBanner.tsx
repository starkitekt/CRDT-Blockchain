'use client';

import { useMemo } from 'react';
import { Button, InlineNotification } from '@carbon/react';
import { formatChainName, isBalanceSufficient, isSupportedChain } from '@/lib/blockchain';
import { useWallet } from '@/hooks/useWallet';

export default function BlockchainStatusBanner() {
  const { wallet, balanceEth, isConnecting, connectError, connect, refreshBalance } = useWallet();

  const status = useMemo(() => {
    if (connectError) {
      return {
        kind: 'error' as const,
        title: 'Wallet connection failed',
        subtitle: connectError,
      };
    }

    if (!wallet.isConnected) {
      return {
        kind: 'warning' as const,
        title: 'Blockchain wallet not connected',
        subtitle: 'Connect a wallet to anchor batches on-chain and submit recalls.',
      };
    }

    if (!isSupportedChain(wallet.chainId)) {
      return {
        kind: 'error' as const,
        title: 'Unsupported wallet network',
        subtitle: `Connected to ${formatChainName(wallet.chainId)}. Switch to Base Sepolia or Local Hardhat.`,
      };
    }

    if (balanceEth !== null && !isBalanceSufficient(balanceEth)) {
      return {
        kind: 'warning' as const,
        title: 'Insufficient gas balance',
        subtitle: `Current balance: ${balanceEth.toFixed(5)} ETH. Fund wallet before on-chain submissions.`,
      };
    }

    return {
      kind: 'success' as const,
      title: 'Blockchain wallet ready',
      subtitle: `Connected to ${formatChainName(wallet.chainId)}${balanceEth !== null ? ` with ${balanceEth.toFixed(5)} ETH` : ''}.`,
    };
  }, [balanceEth, connectError, wallet.chainId, wallet.isConnected]);

  return (
    <div className="px-4 pt-4 md:px-8">
      <InlineNotification
        lowContrast
        hideCloseButton
        kind={status.kind}
        title={status.title}
        subtitle={status.subtitle}
      />
      <div className="mt-2">
        {!wallet.isConnected ? (
          <Button size="sm" kind="tertiary" onClick={connect} disabled={isConnecting}>
            {isConnecting ? 'Connecting...' : 'Connect wallet'}
          </Button>
        ) : (
          <Button size="sm" kind="tertiary" onClick={refreshBalance}>
            Refresh balance
          </Button>
        )}
      </div>
    </div>
  );
}