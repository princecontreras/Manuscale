'use client';

import { useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useUser } from '@/hooks/useUser';

export const useSubscription = () => {
  const { user: firebaseUser } = useAuth();
  const { user: userProfile } = useUser();

  const hasSubscription = useCallback(
    () => userProfile?.subscriptionStatus === 'active',
    [userProfile?.subscriptionStatus]
  );

  const isMonthly = useCallback(
    () => userProfile?.plan?.includes('monthly'),
    [userProfile?.plan]
  );

  const isYearly = useCallback(
    () => userProfile?.plan?.includes('yearly'),
    [userProfile?.plan]
  );

  const openBillingPortal = useCallback(async () => {
    if (!firebaseUser) return;

    try {
      const token = await firebaseUser.getIdToken?.();
      if (!token) {
        console.error('No ID token available');
        return;
      }

      const response = await fetch('/api/billing/manage-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const { url, error } = await response.json();

      if (error) throw new Error(error);
      if (url) window.location.href = url;
    } catch (error) {
      console.error('Portal error:', error);
    }
  }, [firebaseUser]);

  return {
    isSubscribed: hasSubscription(),
    isMonthly: isMonthly(),
    isYearly: isYearly(),
    openBillingPortal,
    subscriptionStatus: userProfile?.subscriptionStatus,
    currentPeriodEnd: userProfile?.currentPeriodEnd,
  };
};
