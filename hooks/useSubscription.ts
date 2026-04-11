'use client';

import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useUser } from '@/hooks/useUser';

export const useSubscription = () => {
  const { user: firebaseUser } = useAuth();
  const { user: userProfile } = useUser();
  const [isPortalLoading, setIsPortalLoading] = useState(false);

  // Allow both 'active' and 'past_due' (grace period while Stripe retries payment)
  const isSubscribed = userProfile?.subscriptionStatus === 'active' || userProfile?.subscriptionStatus === 'past_due';
  const isPastDue = userProfile?.subscriptionStatus === 'past_due';
  const isCanceling = userProfile?.subscriptionStatus === 'active' && userProfile?.cancelAtPeriodEnd === true;
  const isMonthly = userProfile?.plan?.includes('monthly');
  const isYearly = userProfile?.plan?.includes('yearly');

  const openBillingPortal = async () => {
    if (!firebaseUser) throw new Error('Not authenticated');

    setIsPortalLoading(true);
    try {
      const token = await firebaseUser.getIdToken(true);
      if (!token) throw new Error('Could not retrieve authentication token');

      const response = await fetch('/api/billing/manage-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to open billing portal');
      if (data.url) window.location.href = data.url;
    } finally {
      setIsPortalLoading(false);
    }
  };

  const switchPlan = async (targetPlan: 'monthly' | 'yearly') => {
    if (!firebaseUser) throw new Error('Not authenticated');

    const token = await firebaseUser.getIdToken(true);
    if (!token) throw new Error('Could not retrieve authentication token');

    const response = await fetch('/api/billing/switch-plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ targetPlan }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to switch plan');
    return data;
  };

  return {
    isSubscribed,
    isPastDue,
    isCanceling,
    isMonthly,
    isYearly,
    isPortalLoading,
    openBillingPortal,
    switchPlan,
    subscriptionStatus: userProfile?.subscriptionStatus,
    currentPeriodEnd: userProfile?.currentPeriodEnd,
    cancelAtPeriodEnd: userProfile?.cancelAtPeriodEnd,
  };
};
