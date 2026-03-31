import { useState, useCallback } from 'react';
import {
  connectWallet,
  getWalletBalanceEth,
  INITIAL_WALLET_STATE,
  WalletState,
} from '@/lib/blockchain';

export function useWallet() {
  const [wallet, setWallet] = useState<WalletState>(INITIAL_WALLET_STATE);
  const [balanceEth, setBalanceEth] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setConnectError(null);
    try {
      const state = await connectWallet();
      setWallet(state);
      const nextBalance = await getWalletBalanceEth(state.provider!, state.address!);
      setBalanceEth(nextBalance);
    } catch (err: unknown) {
      setConnectError(err instanceof Error ? err.message : 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!wallet.provider || !wallet.address) return;
    const nextBalance = await getWalletBalanceEth(wallet.provider, wallet.address);
    setBalanceEth(nextBalance);
  }, [wallet.address, wallet.provider]);

  const disconnect = useCallback(() => {
    setWallet(INITIAL_WALLET_STATE);
    setBalanceEth(null);
    setConnectError(null);
  }, []);

  return { wallet, balanceEth, isConnecting, connectError, connect, disconnect, refreshBalance };
}
