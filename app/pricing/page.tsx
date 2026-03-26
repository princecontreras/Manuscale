'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { useUser } from '../../hooks/useUser';
import { useSubscription } from '../../hooks/useSubscription';
import { Button } from '../../components/Button';
import { Logo } from '../../components/Logo';
import { ArrowRight, Check, X } from 'lucide-react';

declare global {
  interface Window {
    Stripe?: any;
  }
}

const loadStripe = async (publishableKey: string) => {
  if (!window.Stripe) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.async = true;
      script.onload = () => {
        if (window.Stripe) {
          resolve(window.Stripe.create({ apiVersion: '2024-04-10' }));
        } else {
          reject(new Error('Stripe failed to load'));
        }
      };
      script.onerror = () => reject(new Error('Failed to load Stripe'));
      document.head.appendChild(script);
    });
  }
  return window.Stripe;
};

const PricingPage: React.FC = () => {
  const { user: firebaseUser } = useAuth();
  const { user: userProfile, isLoading } = useUser();
  const subscription = useSubscription();
  const [isCheckingOut, setIsCheckingOut] = useState<'monthly' | 'yearly' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async (priceId: string, plan: 'monthly' | 'yearly') => {
    if (!firebaseUser) {
      window.location.href = '/login';
      return;
    }

    try {
      setError(null);
      setIsCheckingOut(plan);

      const token = await (firebaseUser as any).getIdToken?.();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch('/api/billing/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ priceId }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { sessionId, error: apiError } = await response.json();
      if (apiError) throw new Error(apiError);

      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
      if (!stripe) throw new Error('Stripe failed to load');

      const result = await stripe.redirectToCheckout({ sessionId });
      if (result?.error) throw new Error(result.error.message);
    } catch (err: any) {
      console.error('Checkout error:', err);
      setError(err?.message || 'Failed to start checkout. Please try again.');
    } finally {
      setIsCheckingOut(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading pricing...</p>
        </div>
      </div>
    );
  }

  const isSubscribed = subscription.isSubscribed;
  const yearlyDiscount = Math.round(((19 * 12 - 169) / (19 * 12)) * 100);

  return (
    <div className="bg-white text-slate-900 font-sans min-h-screen overflow-x-hidden">
      {/* STICKY HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <Link href="/">
            <Logo className="scale-75 sm:scale-90" />
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/#features" className="text-slate-600 hover:text-slate-900 font-medium transition-colors">
              Features
            </Link>
            <Link href="/pricing" className="text-primary-600 font-bold">
              Pricing
            </Link>
            <div className="h-4 w-px bg-slate-200"></div>
            <Button 
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = '/login'}
            >
              Log In
            </Button>
            {!isSubscribed && (
              <Button 
                variant="primary"
                size="md"
                onClick={() => window.location.href = '/signup'}
              >
                Get Started
              </Button>
            )}
          </nav>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="pt-32 sm:pt-40 pb-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-8">
            <span>Simple Pricing</span>
          </div>
          
          <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl text-slate-900 leading-[1.1] tracking-tight mb-6">
            Scale your writing,<br/>
            <span className="text-primary-600">not your costs.</span>
          </h1>
          
          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed mb-2">
            One simple plan. All the tools you need to write, publish, and grow.
          </p>
          
          {isSubscribed && (
            <p className="text-sm text-green-600 font-semibold mb-8">
              ✓ You currently have an active subscription
            </p>
          )}
        </div>
      </section>

      {/* PRICING CARDS */}
      <section className="pb-16 px-4 sm:px-6">
        {error && (
          <div className="max-w-2xl mx-auto mb-8 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="max-w-2xl mx-auto grid md:grid-cols-2 gap-8">
          {/* Monthly Plan */}
          <div className="border-2 border-slate-200 rounded-2xl p-8 hover:border-primary-300 transition-colors duration-300 hover:shadow-lg">
            <h3 className="font-heading text-xl font-bold text-slate-900 mb-2">Monthly</h3>
            <p className="text-slate-600 text-sm mb-6">Flexible month-to-month billing</p>
            
            <div className="mb-8">
              <div className="flex items-baseline gap-2">
                <span className="font-heading text-5xl font-bold text-slate-900">$19</span>
                <span className="text-slate-600">/month</span>
              </div>
              <p className="text-sm text-slate-500 mt-2">AUD • Billed monthly</p>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3">
                <Check size={20} className="text-primary-600 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700">Unlimited book projects</span>
              </li>
              <li className="flex items-start gap-3">
                <Check size={20} className="text-primary-600 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700">AI-powered writing & research</span>
              </li>
              <li className="flex items-start gap-3">
                <Check size={20} className="text-primary-600 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700">Export to EPUB, PDF & DOCX</span>
              </li>
              <li className="flex items-start gap-3">
                <Check size={20} className="text-primary-600 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700">Publishing tools & templates</span>
              </li>
              <li className="flex items-start gap-3">
                <Check size={20} className="text-primary-600 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700">Priority email support</span>
              </li>
              <li className="flex items-start gap-3">
                <Check size={20} className="text-primary-600 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700">Cancel anytime</span>
              </li>
            </ul>

            <Button
              onClick={() =>
                handleCheckout(
                  process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID!,
                  'monthly'
                )
              }
              disabled={isCheckingOut !== null}
              variant="neutral"
              className="w-full"
            >
              {isCheckingOut === 'monthly' ? (
                'Processing...'
              ) : isSubscribed && subscription.isMonthly ? (
                'Current Plan'
              ) : (
                <>
                  Get Started
                  <ArrowRight size={16} className="ml-2" />
                </>
              )}
            </Button>
          </div>

          {/* Yearly Plan (Featured) */}
          <div className="border-2 border-primary-600 rounded-2xl p-8 bg-gradient-to-br from-primary-50 to-white shadow-xl transform md:scale-[1.02] relative">
            <div className="absolute -top-4 -right-4 bg-primary-600 text-white px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap">
              Save {yearlyDiscount}%
            </div>

            <h3 className="font-heading text-xl font-bold text-slate-900 mb-2">Yearly (Recommended)</h3>
            <p className="text-slate-600 text-sm mb-6">Best value for serious writers</p>
            
            <div className="mb-8">
              <div className="flex items-baseline gap-2">
                <span className="font-heading text-5xl font-bold text-primary-600">$169</span>
                <span className="text-slate-600">/year</span>
              </div>
              <p className="text-sm text-slate-500 mt-2">AUD • Billed annually</p>
              <p className="text-sm font-semibold text-primary-600 mt-1">Only $14.08/month</p>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3">
                <Check size={20} className="text-primary-600 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700">Unlimited book projects</span>
              </li>
              <li className="flex items-start gap-3">
                <Check size={20} className="text-primary-600 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700">AI-powered writing & research</span>
              </li>
              <li className="flex items-start gap-3">
                <Check size={20} className="text-primary-600 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700">Export to EPUB, PDF & DOCX</span>
              </li>
              <li className="flex items-start gap-3">
                <Check size={20} className="text-primary-600 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700">Publishing tools & templates</span>
              </li>
              <li className="flex items-start gap-3">
                <Check size={20} className="text-primary-600 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700">Priority email support</span>
              </li>
              <li className="flex items-start gap-3">
                <Check size={20} className="text-primary-600 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700">Cancel anytime</span>
              </li>
            </ul>

            <Button
              onClick={() =>
                handleCheckout(
                  process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID!,
                  'yearly'
                )
              }
              disabled={isCheckingOut !== null}
              variant="primary"
              className="w-full"
            >
              {isCheckingOut === 'yearly' ? (
                'Processing...'
              ) : isSubscribed && subscription.isYearly ? (
                'Current Plan'
              ) : (
                <>
                  Subscribe & Save
                  <ArrowRight size={16} className="ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="py-16 px-4 sm:px-6 border-t border-slate-100">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-heading text-3xl font-bold text-center text-slate-900 mb-12">
            Questions?
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="font-heading font-bold text-slate-900">Can I change plans?</h4>
              <p className="text-slate-600 text-sm">
                Absolutely. Upgrade or downgrade anytime. Changes take effect on your next billing date.
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="font-heading font-bold text-slate-900">What if I want to cancel?</h4>
              <p className="text-slate-600 text-sm">
                Cancel with one click. Your access continues until the end of your current billing period.
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="font-heading font-bold text-slate-900">What payment methods do you accept?</h4>
              <p className="text-slate-600 text-sm">
                All major credit and debit cards through Stripe's secure payment processing.
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="font-heading font-bold text-slate-900">Do you offer a free trial?</h4>
              <p className="text-slate-600 text-sm">
                Contact our support team to discuss trial options for your needs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* MANAGE SUBSCRIPTION CTA */}
      {isSubscribed && (
        <section className="py-12 px-4 sm:px-6 bg-slate-50 border-t border-slate-100">
          <div className="max-w-3xl mx-auto text-center">
            <h3 className="font-heading text-lg font-bold text-slate-900 mb-4">
              Manage your subscription
            </h3>
            <Button
              onClick={() => subscription.openBillingPortal()}
              variant="action"
            >
              Open Billing Portal
            </Button>
          </div>
        </section>
      )}
    </div>
  );
};

export default PricingPage;
