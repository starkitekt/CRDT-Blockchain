'use client';

import React from 'react';
import { 
  Modal, 
  Stack, 
  Button,
  Tag
} from '@carbon/react';
import { 
  Certificate, 
  Blockchain, 
  Download, 
  CheckmarkFilled,
  Security
} from '@carbon/icons-react';
import CopyableValue from '@/components/CopyableValue';

interface BlockchainCertificateProps {
  isOpen: boolean;
  onClose: () => void;
  batchId: string;
  stakeholders: string[];
}

export default function BlockchainCertificate({ 
  isOpen, 
  onClose, 
  batchId,
  stakeholders 
}: BlockchainCertificateProps) {
  const [currentDate, setCurrentDate] = React.useState<string>('');

  React.useEffect(() => {
    if (isOpen) {
      setCurrentDate(new Date().toLocaleDateString());
    }
  }, [isOpen]);

  const handlePrint = () => {
    const style = document.createElement('style');
    style.id = 'cert-print-style';
    style.textContent = `@media print { body > * { visibility: hidden !important; } #certificate-print-root, #certificate-print-root * { visibility: visible !important; } #certificate-print-root { position: fixed; inset: 0; padding: 40px; background: white; } }`;
    document.head.appendChild(style);
    window.print();
    document.head.removeChild(style);
  };

  return (
    <Modal
      open={isOpen}
      onRequestClose={onClose}
      modalHeading="Digital Certificate of Authenticity"
      primaryButtonText="Download PDF"
      secondaryButtonText="Close"
      onRequestSubmit={handlePrint}
      className="certificate-modal"
    >
      <div id="certificate-print-root" className="p-spacing-lg bg-white text-slate-900 rounded-lg shadow-inner border-[12px] border-slate-100 relative overflow-hidden">
        {/* Decorative Seal */}
        <div className="absolute right-[-20px] top-[-20px] opacity-5 rotate-12">
          <Blockchain size={240} />
        </div>

        <Stack gap={6}>
          <div className="flex justify-between items-start border-b-2 border-slate-200 pb-spacing-md">
            <div>
              <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-[10px] mb-1">
                <Security size={16} /> Secured by HoneyTRACE
              </div>
              <h2 className="text-h2 !text-2xl text-slate-900">{batchId}</h2>
            </div>
            <div className="text-right">
              <Tag type="green" className="!m-0">IMMU-VERIFIED</Tag>
              <p className="text-[10px] mt-1 font-mono text-slate-500">Hash: 0x88f2...7c12</p>
              <div className="mt-2 flex justify-end">
                <CopyableValue value="0x88f2...7c12" label="Copy Hash" className="min-h-0 h-7 px-2" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-spacing-lg">
            <div className="space-y-4">
              <div>
                <h4 className="text-caption font-bold text-slate-500 uppercase tracking-tighter">Purity Verification</h4>
                <div className="flex items-center gap-spacing-xs mt-1">
                  <CheckmarkFilled size={20} className="text-success" />
                  <span className="text-lg font-bold">98.2% Natural Origin</span>
                </div>
              </div>
              <div>
                <h4 className="text-caption font-bold text-slate-500 uppercase tracking-tighter">Harvest Origin</h4>
                <p className="text-body font-medium">Siwan Cluster, Bihar, India</p>
              </div>
            </div>

            <div className="bg-slate-50 p-spacing-md rounded border border-slate-100">
              <h4 className="text-caption font-bold text-slate-500 uppercase tracking-tighter mb-2">Stakeholder Chain</h4>
              <Stack gap={2}>
                {stakeholders.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span>{s}</span>
                  </div>
                ))}
              </Stack>
            </div>
          </div>

          <div className="mt-spacing-lg pt-spacing-md border-t border-slate-200 flex justify-between items-end">
             <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-900 rounded text-white">
                   <Certificate size={32} />
                </div>
                <div>
                   <p className="text-[10px] font-bold uppercase text-slate-400">Issued On</p>
                   <p className="text-xs font-mono">{currentDate || '---'} UTC</p>
                </div>
             </div>
             <p className="text-[10px] italic text-slate-400 max-w-[200px] text-right">
                This document is a digital representation of an immutable record on the HoneyTRACE blockchain.
             </p>
          </div>
        </Stack>
      </div>
    </Modal>
  );
}
