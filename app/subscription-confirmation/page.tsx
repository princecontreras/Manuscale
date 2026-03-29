'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ArrowRight, AlertCircle } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/Button';
import { useAuth } from '@/components/AuthProvider';
import { useSubscription } from '@/hooks/useSubscription';
import { useRouter } from 'next/navigation';

export default function SubscriptionConfirmationPage() {
  const { user, loading: authLoading } = useAuth();
  const subscription = useSubscription();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!authLoading) {
      setIsLoading(false);
    }
  }, [authLoading]);

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  // Poll for subscription status from Firestore
  useEffect(() => {
    if (authLoading || !user || !isVerifying) return;

    const verifySubscription = async () => {
      try {
        // Wait a bit for webhook to process (first time)
        if (retryCount === 0) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        console.log(`[Confirmation] Verifying subscription (attempt ${retryCount + 1})...`);
        
        // Check if subscription data exists
        if (subscription.subscriptionStatus === 'active') {
          console.log('[Confirmation] ✓ Subscription verified as active');
          setVerificationError(null);
          setIsVerifying(false);
          return;
        }

        // If still not active and we haven't retried too many times, retry
        if (retryCount < 5) {
          console.log(`[Confirmation] Subscription not yet active, retrying (${retryCount + 1}/5)...`);
          setRetryCount(prev => prev + 1);
          // Wait 2 seconds and try again
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          console.error('[Confirmation] ✗ Subscription failed to activate after 5 retries');
          setVerificationError('Subscription is taking longer than expected to activate. Please refresh or contact support.');
          setIsVerifying(false);
        }
      } catch (error) {
        console.error('[Confirmation] Error verifying subscription:', error);
        if (retryCount < 5) {
          setRetryCount(prev => prev + 1);
        } else {
          setVerificationError('Error verifying subscription. Please refresh the page.');
          setIsVerifying(false);
        }
      }
    };

    verifySubscription();
  }, [authLoading, user, subscription.subscriptionStatus, isVerifying, retryCount]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-primary-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  const planLabel = subscription.isYearly ? 'Yearly' : 'Monthly';

  // Still verifying
  if (isVerifying) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-full max-w-sm text-center">
          <div className="mb-16">
            <Link href="/">
              <Logo />
            </Link>
          </div>

          <div className="flex justify-center mb-8">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-primary-600 rounded-full animate-spin"></div>
          </div>

          <h1 className="font-heading text-2xl font-bold text-slate-900 tracking-tight mb-3">
            Activating your subscription...
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed mb-10">
            Your payment was successful. We're finalizing your {planLabel} subscription.
            This usually takes a few seconds.
          </p>
        </div>
      </div>
    );
  }

  // Verification error
  if (verificationError) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-full max-w-sm text-center">
          <div className="mb-16">
            <Link href="/">
              <Logo />
            </Link>
          </div>

          <div className="flex justify-center mb-8">
            <AlertCircle size={48} className="text-orange-500" strokeWidth={1.5} />
          </div>

          <h1 className="font-heading text-2xl font-bold text-slate-900 tracking-tight mb-3">
            Subscription Pending
          </h1>
          <p className="text-slate-600 text-sm leading-relaxed mb-8">
            {verificationError}
          </p>

          <div className="space-y-3">
            <Button
              onClick={() => window.location.reload()}
              variant="primary"
              size="lg"
              className="w-full"
            >
              Refresh and Try Again
            </Button>
            <Button
              onClick={() => router.push('/')}
              variant="ghost"
              size="lg"
              className="w-full border border-slate-200"
            >
              Go to Dashboard Anyway
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Success - subscription verified
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-sm text-center">
        {/* Logo */}
        <div className="mb-16">
          <Link href="/">
            <Logo />
          </Link>
        </div>

        {/* Success Icon */}
        <div className="flex justify-center mb-8">
          <CheckCircle2 size={48} className="text-primary-600" strokeWidth={1.5} />
        </div>

        {/* Headline */}
        <h1 className="font-heading text-2xl font-bold text-slate-900 tracking-tight mb-3">
          You're all set.
        </h1>
        <p className="text-slate-500 text-sm leading-relaxed mb-10">
          Welcome to <span className="font-bold text-primary-600">Typoscale</span> ({planLabel}).
          Your subscription is active and all features are unlocked.
        </p>

        {/* CTA */}
        <Button
          onClick={() => router.push('/')}
          variant="primary"
          size="lg"
          className="w-full gap-2"
        >
          Go to Dashboard
          <ArrowRight size={18} />
        </Button>

        {/* Footer */}
        <p className="text-xs text-slate-400 mt-8">
          Manage billing anytime from your profile.
        </p>
      </div>
    </div>
  );
}
