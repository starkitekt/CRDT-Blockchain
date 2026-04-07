'use client';

import React, { useState } from 'react';
import { 
  Modal, 
  Stack, 
  TextInput, 
  FileUploader, 
  InlineNotification,
  Loading
} from '@carbon/react';
import { useTranslations } from 'next-intl';
import { Identification, Certificate, Building } from '@carbon/icons-react';

const ROLE_LABELS: Record<string, string> = {
  enterprise: 'Enterprise',
  lab: 'Lab',
  officer: 'Officer',
  warehouse: 'Warehouse',
  farmer: 'Farmer',
  consumer: 'Consumer',
};

interface IdentityVerificationModalProps {
  isOpen: boolean;
  role: string;
  onCompleteAction: () => void;
}

export default function IdentityVerificationModal({
  isOpen,
  role,
  onCompleteAction
}: IdentityVerificationModalProps) {
  const tDashboard = useTranslations('Dashboard.lab');
  const tCommon = useTranslations('common');
  const [loading, setLoading] = useState(false);
  const [docId, setDocId] = useState('');
  const [otp, setOtp] = useState('');
  const [txnId, setTxnId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setStatusMessage(null);
    if (!docId) return;
    setLoading(true);
    try {
      if (role === 'farmer') {
        if (!txnId) {
          const res = await fetch('/api/kyc/aadhaar/initiate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ aadhaarNumber: docId.replace(/\s/g, '') }),
          });
          const body = await res.json() as { error?: string; txnId?: string; message?: string };
          if (!res.ok || !body.txnId) {
            throw new Error(body.error || 'Failed to initiate Aadhaar OTP.');
          }
          setTxnId(body.txnId);
          setStatusMessage(body.message || 'OTP sent to Aadhaar-linked mobile.');
          return;
        }

        const verifyRes = await fetch('/api/kyc/aadhaar/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ txnId, otp }),
        });
        const verifyBody = await verifyRes.json() as { error?: string; message?: string };
        if (!verifyRes.ok) {
          throw new Error(verifyBody.error || 'OTP verification failed.');
        }
      }
      setLoading(false);
      onCompleteAction();
    } catch (e) {
      setLoading(false);
      setError(e instanceof Error ? e.message : 'Verification failed.');
    }
  };

  const getRoleConfig = () => {
    switch (role) {
      case 'enterprise':
        return {
          title: tDashboard('org_verification'),
          idLabel: tDashboard('id_label_gstin'),
          idPlaceholder: '22AAAAA0000A1Z5',
          icon: Building,
          subtitle: tDashboard('org_subtitle')
        };
      case 'lab':
      case 'officer':
        return {
          title: tDashboard('govt_accreditation'),
          idLabel: tDashboard('id_label_employee'),
          idPlaceholder: 'GOV-IND-XXXX',
          icon: Certificate,
          subtitle: tDashboard('govt_subtitle')
        };
      default:
        return {
          title: tDashboard('identity_verification'),
          idLabel: tDashboard('id_label_aadhar'),
          idPlaceholder: 'XXXX-XXXX-XXXX',
          icon: Identification,
          subtitle: tDashboard('id_subtitle')
        };
    }
  };

  const config = getRoleConfig();

  return (
    <>
      <Modal
        open={isOpen}
        modalHeading={config.title}
        primaryButtonText={loading ? tDashboard('verifying_loading') : role === 'farmer' && txnId ? 'Verify OTP' : tDashboard('submit_docs')}
        secondaryButtonText={tCommon('logout')}
        onRequestClose={() => {}}
        onRequestSubmit={handleSubmit}
        primaryButtonDisabled={loading || (role === 'farmer' ? (!docId || (txnId !== null && otp.length !== 6)) : !docId)}
        preventCloseOnClickOutside
      >
        <Stack gap={6}>
          <InlineNotification
            kind="info"
            title={tDashboard('secure_blockchain_id')}
            subtitle={config.subtitle}
            hideCloseButton
          />
          
          <div className="flex items-center gap-4 p-spacing-md bg-gray-50 rounded border border-border-subtle">
             <config.icon size={32} className="text-primary shrink-0" />
             <div className="flex-1 min-w-0">
                <p className="text-caption !text-[10px]">{tDashboard('verified_persona')}</p>
                <p className="text-sm font-bold truncate uppercase">{ROLE_LABELS[role] ?? role} {tDashboard('stakeholder')}</p>
             </div>
          </div>

          <TextInput
            id="gov-id-input"
            labelText={config.idLabel}
            placeholder={config.idPlaceholder}
            size="lg"
            value={docId}
            onChange={(e) => setDocId(e.target.value)}
            required
          />

          {role === 'farmer' && txnId && (
            <TextInput
              id="aadhaar-otp-input"
              labelText="OTP"
              placeholder="Enter 6-digit OTP"
              size="lg"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
            />
          )}

          {statusMessage && (
            <InlineNotification kind="success" title="OTP initiated" subtitle={statusMessage} lowContrast />
          )}

          {error && (
            <InlineNotification kind="error" title="Verification failed" subtitle={error} lowContrast />
          )}

          <FileUploader
            labelTitle={tDashboard('attach_proof')}
            labelDescription={tDashboard('attach_proof_description')}
            buttonLabel={tDashboard('select_file')}
            buttonKind="secondary"
            size="md"
            filenameStatus="edit"
            accept={['.jpg', '.pdf']}
            multiple={false}
          />
        </Stack>
      </Modal>
      {loading && <Loading description={tDashboard('verifying_node')} withOverlay={true} />}
    </>
  );
}
