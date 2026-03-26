'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '../../hooks/useUser';
import { Button } from '../../components/Button';

declare global {
  interface Window {
    Stripe?: any;
  }
}

const loadStripe = async (publishableKey: string) => {
  // Dynamically load Stripe.js from CDN if not already loaded
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
  const { user: firebaseUser, isLoading } = useUser();
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

      // Create checkout session via your API
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

      // Dynamically load Stripe and redirect to checkout
      const stripe = await loadStripe(
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
      );

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
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-slate-400">Unlock all features with Manuscale Pro</p>
        </div>

        {error && (
          <div className="max-w-2xl mx-auto mb-8 bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
          {/* Monthly Plan */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 hover:border-indigo-500 transition-colors">
            <h3 className="text-2xl font-bold text-white mb-2">Monthly</h3>
            <div className="mb-6">
              <span className="text-4xl font-bold text-white">$9.99</span>
              <span className="text-slate-400 ml-2">/month</span>
            </div>
            <ul className="space-y-3 mb-8 text-slate-300">
              <li>✓ All features included</li>
              <li>✓ Unlimited projects</li>
              <li>✓ AI-powered writing</li>
              <li>✓ Export to EPUB & DOCX</li>
              <li>✓ Priority support</li>
              <li>✓ Cancel anytime</li>
            </ul>
            <Button
              onClick={() =>
                handleCheckout(
                  process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID!,
                  'monthly'
                )
              }
              disabled={isCheckingOut !== null}
              className="w-full"
            >
              {isCheckingOut === 'monthly' ? 'Processing...' : 'Get Started'}
            </Button>
          </div>

          {/* Yearly Plan (Recommended) */}
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 border border-indigo-500 rounded-lg p-8 relative transform md:scale-105 md:z-10">
            <div className="absolute top-4 right-4 bg-amber-400 text-black px-3 py-1 rounded-full text-sm font-bold">
              Save 17%
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Yearly</h3>
            <div className="mb-6">
              <span className="text-4xl font-bold text-white">$99.99</span>
              <span className="text-indigo-200 ml-2">/year</span>
              <div className="text-indigo-200 text-sm mt-2">
                Only $8.33/month when billed annually
              </div>
            </div>
            <ul className="space-y-3 mb-8 text-indigo-50">
              <li>✓ All features included</li>
              <li>✓ Unlimited projects</li>
              <li>✓ AI-powered writing</li>
              <li>✓ Export to EPUB & DOCX</li>
              <li>✓ Priority support</li>
              <li>✓ Cancel anytime</li>
            </ul>
            <Button
              onClick={() =>
                handleCheckout(
                  process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID!,
                  'yearly'
                )
              }
              disabled={isCheckingOut !== null}
              className="w-full bg-white hover:bg-slate-100 text-indigo-600"
            >
              {isCheckingOut === 'yearly' ? 'Processing...' : 'Subscribe & Save'}
            </Button>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">Questions?</h2>
          <div className="space-y-6">
            <div className="bg-slate-800 p-6 rounded-lg">
              <h4 className="text-white font-bold mb-2">Can I switch plans?</h4>
              <p className="text-slate-400">
                Yes, you can upgrade or downgrade anytime. Changes take effect on your next billing date.
              </p>
            </div>
            <div className="bg-slate-800 p-6 rounded-lg">
              <h4 className="text-white font-bold mb-2">What if I'm not satisfied?</h4>
              <p className="text-slate-400">
                Cancel anytime with one click. Your access continues until the end of the current billing period.
              </p>
            </div>
            <div className="bg-slate-800 p-6 rounded-lg">
              <h4 className="text-white font-bold mb-2">What payment methods do you accept?</h4>
              <p className="text-slate-400">
                We accept all major credit and debit cards through Stripe's secure payment processing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
