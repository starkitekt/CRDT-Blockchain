'use client';

import { InlineNotification } from '@carbon/react';
import { Time, CheckmarkFilled, Document } from '@carbon/icons-react';

interface KYCPendingScreenProps {
  role: string;
  userName?: string;
}

const ROLE_LABELS: Record<string, string> = {
  farmer:    'Farmer',
  warehouse: 'Warehouse Operator',
  lab:       'Laboratory',
  officer:   'Quality Officer',
};

export default function KYCPendingScreen({ role, userName }: KYCPendingScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-lg w-full text-center space-y-8">

        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-warning/10 rounded-full flex items-center justify-center">
            <Time size={40} className="text-warning" />
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-text-primary">
            Pending KYC Approval
          </h1>
          {userName && (
            <p className="text-text-secondary">
              Hi <span className="font-semibold">{userName}</span>, your {ROLE_LABELS[role] ?? role} account is under review.
            </p>
          )}
        </div>

        <InlineNotification
          kind="info"
          title="Your profile has been submitted."
          subtitle="Our team will verify your documents and activate your account. This typically takes 1–2 business days."
          hideCloseButton
          lowContrast
        />

        {/* Steps */}
        <div className="bg-surface border border-border-subtle rounded-xl p-6 text-left space-y-4">
          <p className="text-sm font-bold uppercase tracking-widest text-text-secondary">What happens next</p>
          <ol className="space-y-3">
            {[
              'Your submitted details are being reviewed by our verification team.',
              'You will receive an email notification once your account is approved.',
              'After approval, you will have full access to your dashboard.',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </span>
                <span className="text-sm text-text-secondary">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <p className="text-xs text-text-secondary">
          If you have questions, contact{' '}
          <span className="text-primary font-medium">support@honeytrace.gov</span>
        </p>
      </div>
    </div>
  );
}
