'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, ArrowRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/Button';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/components/AuthProvider';
import Link from 'next/link';

const SubscriptionConfirmationPage: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    // Get session_id from URL
    const params = new URLSearchParams(window.location.search);
    const sessionIdParam = params.get('session_id');
    setSessionId(sessionIdParam);

    // If no user, redirect to login
    if (!user) {
      window.location.href = '/login';
      return;
    }

    // Simulate verification delay (Stripe may take a moment to sync)
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6 font-sans">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Confirming your subscription...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-sm border border-neutral-100 overflow-hidden p-8 text-center">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        {/* Success Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-green-100 rounded-full animate-pulse"></div>
            <CheckCircle2 size={64} className="text-green-600 relative z-10" />
          </div>
        </div>

        {/* Success Message */}
        <h1 className="text-2xl font-bold text-neutral-900 mb-3">
          Subscription Confirmed!
        </h1>
        <p className="text-neutral-600 mb-2">
          Welcome to Manuscale Pro. Your subscription is now active.
        </p>
        <p className="text-sm text-neutral-500 mb-8">
          We've sent you a confirmation email with subscription details.
        </p>

        {/* What's Included */}
        <div className="bg-neutral-50 rounded-xl p-6 mb-8 text-left border border-neutral-200">
          <h3 className="font-semibold text-neutral-900 text-sm mb-4 uppercase text-xs tracking-wider text-neutral-500">
            You can now access:
          </h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="text-green-600 font-bold mt-0.5">✓</span>
              <span className="text-sm text-neutral-700">Full publishing studio with all tools</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-600 font-bold mt-0.5">✓</span>
              <span className="text-sm text-neutral-700">Unlimited project creation</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-600 font-bold mt-0.5">✓</span>
              <span className="text-sm text-neutral-700">Priority support</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-600 font-bold mt-0.5">✓</span>
              <span className="text-sm text-neutral-700">Advanced publishing features</span>
            </li>
          </ul>
        </div>

        {/* CTA Button */}
        <Link href="/dashboard" className="w-full">
          <Button variant="primary" size="lg" className="w-full gap-2">
            Go to Dashboard
            <ArrowRight size={18} />
          </Button>
        </Link>

        {/* Manage Subscription Link */}
        <p className="text-xs text-neutral-500 mt-6">
          Need to manage your subscription?{' '}
          <Link href="/profile" className="text-primary-600 hover:text-primary-700 font-semibold">
            Visit your profile
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SubscriptionConfirmationPage;
