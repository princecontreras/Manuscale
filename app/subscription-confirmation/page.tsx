'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Sparkles, ArrowRight, Home } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/Button';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';

export default function SubscriptionConfirmationPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    if (user) {
      setIsLoading(false);
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-12">
          <Link href="/">
            <Logo className="scale-90" />
          </Link>
        </div>

        {/* Success Container */}
        <div className="bg-white rounded-3xl shadow-xl border border-emerald-100 p-8 sm:p-10 text-center space-y-6">
          {/* Success Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-100 rounded-full blur-2xl animate-pulse"></div>
              <CheckCircle2 size={80} className="text-emerald-500 relative z-10" strokeWidth={1.5} />
            </div>
          </div>

          {/* Headline */}
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">
              Thank you!
            </h1>
            <p className="text-slate-600 text-lg">
              Your subscription is now active.
            </p>
          </div>

          {/* Details */}
          <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-2xl p-6 border border-emerald-100">
            <div className="space-y-3">
              <p className="text-slate-700 text-sm leading-relaxed">
                Welcome to <span className="font-bold text-emerald-600">Manuscale Pro</span>! 
                You now have access to all premium features including:
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <Sparkles size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>Unlimited book projects</span>
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>AI-powered writing & research tools</span>
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>Export to EPUB, PDF & DOCX</span>
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>Publishing tools & templates</span>
                </li>
              </ul>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="space-y-3 pt-4">
            <Button
              onClick={() => router.push('/')}
              variant="primary"
              size="lg"
              className="w-full gap-2"
            >
              <Home size={18} />
              Go to Dashboard
              <ArrowRight size={18} />
            </Button>
            <Link href="/">
              <Button
                variant="ghost"
                size="lg"
                className="w-full"
              >
                Back to Home
              </Button>
            </Link>
          </div>

          {/* Footer Message */}
          <div className="pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-500">
              Your subscription details and billing information are available in your profile.
            </p>
          </div>
        </div>

        {/* Support Message */}
        <div className="text-center mt-8">
          <p className="text-sm text-slate-600">
            Questions? <a href="/support" className="text-emerald-600 font-semibold hover:text-emerald-700 transition-colors">Contact support</a>
          </p>
        </div>
      </div>
    </div>
  );
}
