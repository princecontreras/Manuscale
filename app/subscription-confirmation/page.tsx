'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ArrowRight } from 'lucide-react';
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-primary-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  const planLabel = subscription.isYearly ? 'Yearly' : 'Monthly';

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
