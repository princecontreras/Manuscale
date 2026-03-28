'use client';

import { useAuth } from '@/components/AuthProvider';
import { useUser } from '@/hooks/useUser';

export const useSubscription = () => {
  const { user: firebaseUser } = useAuth();
  const { user: userProfile } = useUser();

  // Direct checks instead of callbacks for proper reactivity
  const isSubscribed = userProfile?.subscriptionStatus === 'active';
  const isMonthly = userProfile?.plan?.includes('monthly');
  const isYearly = userProfile?.plan?.includes('yearly');

  const openBillingPortal = async () => {
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
  };

  return {
    isSubscribed,
    isMonthly,
    isYearly,
    openBillingPortal,
    subscriptionStatus: userProfile?.subscriptionStatus,
    currentPeriodEnd: userProfile?.currentPeriodEnd,
  };
};
