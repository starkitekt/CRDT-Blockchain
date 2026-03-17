'use client';

import React, { useState } from 'react';
import {
  Modal,
  TextInput,
  TextArea,
  Stack,
  Tag,
  Button,
  InlineNotification,
} from '@carbon/react';
import { WarningAltFilled, IbmCloudSecurityComplianceCenter as Audit } from '@carbon/icons-react';
import { recallsApi, ApiError } from '@/lib/api';

interface RecallManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pre-filled batch ID (optional) */
  batchId?: string;
  /** Called after a recall is successfully submitted, so parent can refresh */
  onRecallCreated?: () => void;
}

type RecallTier = 'Class I' | 'Class II' | 'Class III';
type RecallStatus = 'idle' | 'submitting' | 'submitted';

const TIER_DESCRIPTIONS: Record<RecallTier, string> = {
  'Class I': 'Immediate health hazard — potential adulteration, antibiotic residue above MRL, or contamination.',
  'Class II': 'Remote probability of adverse health consequence — labelling error, purity mismatch >5%.',
  'Class III': 'No health hazard — procedural non-compliance, documentation error.',
};

const TIER_NUMBER: Record<RecallTier, 1 | 2 | 3> = {
  'Class I': 1,
  'Class II': 2,
  'Class III': 3,
};

export default function RecallManagementModal({ isOpen, onClose, batchId = '', onRecallCreated }: RecallManagementModalProps) {
  const [recallBatchId, setRecallBatchId] = useState(batchId);
  const [tier, setTier] = useState<RecallTier>('Class II');
  const [reason, setReason] = useState('');
  const [affectedQuantity, setAffectedQuantity] = useState('');
  const [status, setStatus] = useState<RecallStatus>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!recallBatchId.trim()) e.batchId = 'Batch ID is required';
    if (!reason.trim() || reason.length < 20) e.reason = 'Provide a detailed reason (min. 20 characters)';
    if (!affectedQuantity || isNaN(Number(affectedQuantity))) e.qty = 'Enter affected quantity in kg';
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setStatus('submitting');
    setApiError(null);

    try {
      await recallsApi.create({
        batchId: recallBatchId.trim(),
        tier: TIER_NUMBER[tier],
        reason: reason.trim(),
        affectedKg: Number(affectedQuantity),
        initiatedBy: 'admin',
      });
      setStatus('submitted');
      onRecallCreated?.();
    } catch (err) {
      setStatus('idle');
      if (err instanceof ApiError) {
        setApiError(err.message);
      } else {
        setApiError('Failed to submit recall. Please try again.');
      }
    }
  };

  const handleClose = () => {
    setStatus('idle');
    setErrors({});
    setApiError(null);
    setReason('');
    setAffectedQuantity('');
    onClose();
  };

  return (
    <Modal
      open={isOpen}
      modalHeading="Initiate Batch Recall"
      primaryButtonText={status === 'submitting' ? 'Submitting...' : status === 'submitted' ? '✓ Recall Initiated' : 'Submit Recall Order'}
      secondaryButtonText="Cancel"
      danger
      onRequestClose={handleClose}
      onRequestSubmit={handleSubmit}
      primaryButtonDisabled={status === 'submitting' || status === 'submitted'}
    >
      <Stack gap={6}>
        {status === 'submitted' ? (
          <InlineNotification
            kind="success"
            title="Recall order submitted"
            subtitle={`Batch ${recallBatchId} has been flagged for ${tier} recall. All downstream nodes have been notified. An immutable recall event has been recorded.`}
          />
        ) : (
          <>
            <div className="flex items-start gap-3 p-spacing-md bg-red-50 border border-red-200 rounded-xl text-[11px] text-red-700 font-medium">
              <WarningAltFilled size={18} className="shrink-0 mt-0.5 text-red-600" />
              <span>Recall orders are irreversible blockchain events. All upstream and downstream stakeholders will be notified immediately.</span>
            </div>

            {apiError && (
              <InlineNotification kind="error" title="Submission failed" subtitle={apiError} lowContrast hideCloseButton />
            )}

            <TextInput
              id="recall-batch-id"
              labelText="Batch ID (GS1 format)"
              placeholder="HT-YYYYMMDD-NNN"
              value={recallBatchId}
              onChange={(e) => setRecallBatchId(e.target.value)}
              invalid={!!errors.batchId}
              invalidText={errors.batchId}
            />

            {/* Recall Tier Selector */}
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-spacing-sm">Recall Classification (FSSAI / FDA FSMA)</p>
              <div className="flex flex-col sm:flex-row gap-3">
                {(['Class I', 'Class II', 'Class III'] as RecallTier[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTier(t)}
                    className={`flex-1 p-spacing-md rounded-xl border-2 text-left transition-all ${
                      tier === t
                        ? t === 'Class I' ? 'border-red-500 bg-red-50 text-red-700' : t === 'Class II' ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-primary bg-primary/5 text-primary'
                        : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
                    }`}
                  >
                    <p className="font-bold text-sm mb-1">{t}</p>
                    <p className="text-[10px] leading-relaxed opacity-80">{TIER_DESCRIPTIONS[t]}</p>
                  </button>
                ))}
              </div>
            </div>

            <TextInput
              id="recall-qty"
              labelText="Affected Quantity (kg)"
              placeholder="e.g. 450"
              value={affectedQuantity}
              onChange={(e) => setAffectedQuantity(e.target.value)}
              invalid={!!errors.qty}
              invalidText={errors.qty}
            />

            <div>
              <label className="block text-[12px] font-medium text-slate-700 mb-1">Detailed Reason for Recall</label>
              <textarea
                rows={4}
                className="w-full p-3 border border-slate-200 rounded-lg text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                placeholder="Describe the non-conformance finding, test result deviation, or safety concern..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              {errors.reason && <p className="text-error text-xs mt-1">{errors.reason}</p>}
            </div>

            <div className="p-spacing-md bg-slate-50 rounded-xl border border-slate-100 font-mono text-[10px] text-slate-500 flex items-center gap-2">
              <Audit size={14} className="text-primary shrink-0" />
              RECALL_PAYLOAD: INITIATE_{tier.replace(' ', '_').toUpperCase()} · BATCH: {recallBatchId || '—'} · QTY: {affectedQuantity || '—'}kg
            </div>
          </>
        )}
      </Stack>
    </Modal>
  );
}
