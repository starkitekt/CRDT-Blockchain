import { useState, useCallback } from 'react';
import { connectWallet, INITIAL_WALLET_STATE, WalletState } from '@/lib/blockchain';

export function useWallet() {
  const [wallet, setWallet] = useState<WalletState>(INITIAL_WALLET_STATE);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setConnectError(null);
    try {
      const state = await connectWallet();
      setWallet(state);
    } catch (err: unknown) {
      setConnectError(err instanceof Error ? err.message : 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setWallet(INITIAL_WALLET_STATE);
    setConnectError(null);
  }, []);

  return { wallet, isConnecting, connectError, connect, disconnect };
}
