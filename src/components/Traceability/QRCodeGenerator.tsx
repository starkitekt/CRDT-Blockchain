'use client';

import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@carbon/react';
import { Download, Printer, Launch } from '@carbon/icons-react';

interface QRCodeGeneratorProps {
  batchId: string;
  /** Show compact inline variant (no heading/description) */
  compact?: boolean;
}

export default function QRCodeGenerator({ batchId, compact = false }: QRCodeGeneratorProps) {
  const [traceUrl, setTraceUrl] = useState('');
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    // Build full public URL so any phone scanner works without the portal
    const origin = window.location.origin;
    setTraceUrl(`${origin}/en/trace/${batchId}`);
  }, [batchId]);

  function downloadPNG() {
    if (!svgRef.current) return;
    const svg = svgRef.current;
    const serialized = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([serialized], { type: 'image/svg+xml' });
    const url  = URL.createObjectURL(blob);

    // Convert SVG → canvas → PNG
    const img = new Image();
    img.onload = () => {
      const size   = 400;
      const canvas = document.createElement('canvas');
      canvas.width  = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);

      const link    = document.createElement('a');
      link.download = `HoneyTrace-${batchId}.png`;
      link.href     = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = url;
  }

  function printQR() {
    if (!svgRef.current || !traceUrl) return;
    const svgHtml = svgRef.current.outerHTML;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>HoneyTrace QR – ${batchId}</title>
          <style>
            body { display: flex; flex-direction: column; align-items: center;
                   justify-content: center; min-height: 100vh; margin: 0;
                   font-family: sans-serif; padding: 24px; }
            svg  { width: 240px; height: 240px; }
            p    { margin: 8px 0; font-size: 13px; color: #444; text-align: center; }
            h2   { margin: 0 0 12px; font-size: 16px; }
          </style>
        </head>
        <body>
          <h2>HoneyTrace Verification</h2>
          ${svgHtml}
          <p><strong>Batch ID: ${batchId}</strong></p>
          <p>Scan to verify origin &amp; journey</p>
          <script>window.onload = () => { window.print(); window.close(); }<\/script>
        </body>
      </html>
    `);
    win.document.close();
  }

  if (!traceUrl) return null;

  return (
    <div className={compact ? 'flex flex-col items-center gap-2' : 'flex flex-col items-center gap-4 p-4'}>
      {!compact && (
        <div className="text-center mb-1">
          <p className="text-sm font-semibold">Product QR Code</p>
          <p className="text-xs text-muted">
            Print &amp; attach to jar — consumers scan with any camera app
          </p>
        </div>
      )}

      {/* White background padding so QR scans cleanly when printed */}
      <div className="bg-white p-3 rounded-xl shadow-md border border-gray-200 inline-block">
        <QRCodeSVG
          ref={svgRef as React.Ref<SVGSVGElement>}
          value={traceUrl}
          size={compact ? 140 : 180}
          level="H"
          includeMargin={false}
        />
      </div>

      {!compact && (
        <p className="text-xs text-muted text-center font-mono break-all max-w-xs">
          {traceUrl}
        </p>
      )}

      <div className="flex gap-2 flex-wrap justify-center">
        <Button
          size="sm"
          kind="primary"
          renderIcon={Launch}
          onClick={() => window.open(traceUrl, '_blank')}
        >
          View Journey
        </Button>
        <Button
          size="sm"
          kind="secondary"
          renderIcon={Download}
          onClick={downloadPNG}
        >
          Download
        </Button>
        <Button
          size="sm"
          kind="ghost"
          renderIcon={Printer}
          onClick={printQR}
        >
          Print
        </Button>
      </div>
    </div>
  );
}
