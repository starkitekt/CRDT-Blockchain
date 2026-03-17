import { useState, useEffect } from 'react';

interface UseOnboardingOptions {
  /** The role key used to namespace localStorage (e.g. 'farmer', 'warehouse') */
  role: string;
  /** Set to true for roles that have a KYC/identity step before the tour */
  hasKYC?: boolean;
}

interface UseOnboardingReturn {
  isTourOpen: boolean;
  isKYCOpen: boolean;
  completeKYC: () => void;
  completeTour: () => void;
  closeTour: () => void;
}

/**
 * Manages the first-run onboarding flow for a dashboard role.
 *
 * Flow (when hasKYC = true):
 *   1. KYC modal opens on first visit
 *   2. After KYC completion → tour opens automatically
 *   3. Tour completion persisted to localStorage
 *
 * Flow (when hasKYC = false / default):
 *   1. Tour opens on first visit
 *   2. Tour completion persisted to localStorage
 */
export function useOnboarding({
  role,
  hasKYC = false,
}: UseOnboardingOptions): UseOnboardingReturn {
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isKYCOpen, setIsKYCOpen] = useState(false);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem(`${role}_tour_seen`);
    const hasCompletedKYC = localStorage.getItem(`${role}_kyc_completed`);

    if (hasKYC && !hasCompletedKYC) {
      setIsKYCOpen(true);
    } else if (!hasSeenTour) {
      setIsTourOpen(true);
    }
  }, [role, hasKYC]);

  const completeKYC = () => {
    localStorage.setItem(`${role}_kyc_completed`, 'true');
    setIsKYCOpen(false);
    setIsTourOpen(true);
  };

  const completeTour = () => {
    localStorage.setItem(`${role}_tour_seen`, 'true');
    setIsTourOpen(false);
  };

  const closeTour = () => {
    setIsTourOpen(false);
  };

  return { isTourOpen, isKYCOpen, completeKYC, completeTour, closeTour };
}
