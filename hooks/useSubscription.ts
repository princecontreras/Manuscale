'use client';

import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useUser } from '@/hooks/useUser';

export const useSubscription = () => {
  const { user: firebaseUser } = useAuth();
  const { user: userProfile } = useUser();
  const [isPortalLoading, setIsPortalLoading] = useState(false);

  // Direct checks instead of callbacks for proper reactivity
  const isSubscribed = userProfile?.subscriptionStatus === 'active';
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
    isMonthly,
    isYearly,
    isPortalLoading,
    openBillingPortal,
    switchPlan,
    subscriptionStatus: userProfile?.subscriptionStatus,
    currentPeriodEnd: userProfile?.currentPeriodEnd,
  };
};
