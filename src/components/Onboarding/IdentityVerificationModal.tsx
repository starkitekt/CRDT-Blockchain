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

  const handleSubmit = () => {
    if (!docId) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onCompleteAction();
    }, 2000);
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
        primaryButtonText={loading ? tDashboard('verifying_loading') : tDashboard('submit_docs')}
        secondaryButtonText={tCommon('logout')}
        onRequestClose={() => {}}
        onRequestSubmit={handleSubmit}
        primaryButtonDisabled={loading || !docId}
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
