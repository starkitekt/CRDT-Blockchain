/**
 * Marketplace formatting helpers.
 * All monetary values stored & transmitted in paise (1 INR = 100 paise).
 */

export function formatPaiseToINR(paise: number, opts?: { showSymbol?: boolean }): string {
  const showSymbol = opts?.showSymbol ?? true;
  const rupees = (paise ?? 0) / 100;
  const formatted = rupees.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return showSymbol ? `\u20B9${formatted}` : formatted;
}

export function formatRemaining(ms: number): { text: string; ending: boolean } {
  if (ms <= 0) return { text: 'ENDED', ending: true };
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86_400);
  const hours = Math.floor((totalSec % 86_400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  if (days > 0) {
    return { text: `${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`, ending: false };
  }
  return {
    text: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
    ending: ms < 60_000,
  };
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 5_000) return 'just now';
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}
