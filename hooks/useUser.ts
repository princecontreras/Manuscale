'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { UserProfile, UserSubscription } from '@/types';

export const useUser = () => {
  const { user: firebaseUser, loading: authLoading } = useAuth();
  const [userProfile, setUserProfile] = useState<Partial<UserProfile> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseUser) {
      setUserProfile(null);
      setIsLoading(authLoading);
      return;
    }

    const fetchUserProfile = async () => {
      try {
        setIsLoading(true);
        // Try to fetch user profile from Firestore (includes subscription data)
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setUserProfile({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || userData.displayName,
            photoURL: firebaseUser.photoURL || userData.photoURL,
            stripeCustomerId: userData.stripeCustomerId,
            subscriptionId: userData.subscriptionId,
            subscriptionStatus: userData.subscriptionStatus,
            currentPeriodEnd: userData.currentPeriodEnd?.toDate?.() || userData.currentPeriodEnd,
            plan: userData.plan,
            createdAt: userData.createdAt?.toDate?.() || userData.createdAt,
            updatedAt: userData.updatedAt?.toDate?.() || userData.updatedAt,
          });
        } else {
          // User not in Firestore yet, create profile from Firebase auth
          setUserProfile({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || undefined,
            photoURL: firebaseUser.photoURL || undefined,
            createdAt: new Date(),
          });
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to load user profile');
        // Still set basic Firebase user data on error
        setUserProfile({
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || undefined,
          photoURL: firebaseUser.photoURL || undefined,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [firebaseUser, authLoading]);

  return {
    user: (userProfile as UserProfile | null) || (firebaseUser ? { uid: firebaseUser.uid, email: firebaseUser.email || '' } : null),
    isLoading: authLoading || isLoading,
    error,
  };
};
