'use client';

import { useState } from 'react';
import { Button } from '@carbon/react';
import { Copy } from '@carbon/icons-react';

interface CopyableValueProps {
  value: string;
  label?: string;
  className?: string;
}

async function copyToClipboard(value: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const ta = document.createElement('textarea');
  ta.value = value;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}

export default function CopyableValue({ value, label = 'Copy', className = '' }: CopyableValueProps) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    await copyToClipboard(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <Button
      size="sm"
      kind="ghost"
      renderIcon={Copy}
      iconDescription={copied ? 'Copied' : label}
      onClick={() => { void onCopy(); }}
      className={className}
    >
      {copied ? 'Copied' : label}
    </Button>
  );
}
