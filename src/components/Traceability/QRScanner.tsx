'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
  onResult: (batchId: string) => void;
  onError?: (err: string) => void;
}

export default function QRScanner({ onResult, onError }: QRScannerProps) {
  const regionId = 'qr-reader-region';
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [active, setActive] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    return () => {
      scannerRef.current?.stop().catch(() => {});
    };
  }, []);

  async function startScan() {
    setError(null);
    const scanner = new Html5Qrcode(regionId);
    scannerRef.current = scanner;
    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (text) => {
          // Extract batchId — QR may encode full URL or bare batchId
          const match = text.match(/HT-\d{8}-\d{3}/);
          const batchId = match ? match[0] : text.trim();
          scanner.stop().catch(() => {});
          setActive(false);
          onResult(batchId);
        },
        () => {} // frame error — ignore
      );
      setActive(true);
    } catch (err: any) {
      const msg = err?.message ?? 'Camera access denied';
      setError(msg);
      onError?.(msg);
    }
  }

  function stopScan() {
    scannerRef.current?.stop().catch(() => {});
    setActive(false);
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div
        id={regionId}
        className="w-full max-w-sm rounded-xl overflow-hidden border border-border-subtle bg-black"
        style={{ minHeight: active ? 300 : 0 }}
      />

      {error && (
        <p className="text-sm text-red-500 text-center">{error}</p>
      )}

      {!active ? (
        <button
          onClick={startScan}
          className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 
                     text-white font-semibold rounded-xl transition-colors"
        >
          📷 Scan QR Code
        </button>
      ) : (
        <button
          onClick={stopScan}
          className="flex items-center gap-2 px-6 py-3 bg-gray-500 hover:bg-gray-600 
                     text-white font-semibold rounded-xl transition-colors"
        >
          ✕ Stop Scanning
        </button>
      )}
    </div>
  );
}