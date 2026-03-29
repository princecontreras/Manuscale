'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
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

    let isMounted = true;
    let unsubscribe: (() => void) | null = null;

    const userDocRef = doc(db, 'users', firebaseUser.uid);
    
    // Initialize user doc and set up listener
    const initUserDoc = async () => {
      try {
        // First check if user doc exists
        const docSnapshot = await getDoc(userDocRef);
        
        if (!docSnapshot.exists()) {
          // Create new user document if it doesn't exist
          const newProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || null,
            photoURL: firebaseUser.photoURL || null,
            createdAt: new Date(),
          };
          await setDoc(userDocRef, newProfile);
          console.log('[useUser] Created new user profile document');
        }

        if (!isMounted) return;

        // Now set up the onSnapshot listener
        unsubscribe = onSnapshot(
          userDocRef,
          (doc) => {
            if (!isMounted) return;

            if (doc.exists()) {
              const userData = doc.data();
              console.log('[useUser] User profile updated:', {
                subscriptionStatus: userData.subscriptionStatus,
                plan: userData.plan,
              });
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
              // This shouldn't happen, but handle it
              console.warn('[useUser] User doc does not exist');
              setUserProfile({
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                displayName: firebaseUser.displayName || undefined,
                photoURL: firebaseUser.photoURL || undefined,
              });
            }
            setIsLoading(false);
          },
          (err) => {
            if (!isMounted) return;
            console.error('[useUser] Error listening to user profile:', err);
            setError(err instanceof Error ? err.message : 'Failed to load user profile');
            setIsLoading(false);
            setUserProfile({
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || undefined,
              photoURL: firebaseUser.photoURL || undefined,
            });
          }
        );
      } catch (err) {
        if (!isMounted) return;
        console.error('[useUser] Error initializing user doc:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize user');
        setIsLoading(false);
        setUserProfile({
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || undefined,
          photoURL: firebaseUser.photoURL || undefined,
        });
      }
    };

    initUserDoc();

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [firebaseUser, authLoading]);

  return {
    user: (userProfile as UserProfile | null) || (firebaseUser ? { uid: firebaseUser.uid, email: firebaseUser.email || '' } : null),
    isLoading: authLoading || isLoading,
    error,
  };
};
