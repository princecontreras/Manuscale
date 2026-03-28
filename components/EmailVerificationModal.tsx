"use client";

import React from 'react';
import { Mail, ArrowRight, X } from 'lucide-react';
import { Button } from './Button';

interface EmailVerificationModalProps {
  email: string;
  onClose: () => void;
  onGoToLogin: () => void;
}

export const EmailVerificationModal: React.FC<EmailVerificationModalProps> = ({ 
  email, 
  onClose, 
  onGoToLogin 
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-neutral-400 hover:text-neutral-600 transition-colors"
        >
          <X size={20} />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center">
            <Mail size={32} className="text-primary-600" />
          </div>
        </div>

        {/* Content */}
        <h2 className="text-2xl font-bold text-neutral-900 text-center mb-2">
          Verify your email
        </h2>
        
        <p className="text-neutral-500 text-center mb-6">
          We've sent a verification link to <span className="font-semibold text-neutral-700">{email}</span>
        </p>

        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 mb-6 space-y-3">
          <h3 className="font-semibold text-neutral-900 text-sm">What's next?</h3>
          <ol className="text-sm text-neutral-600 space-y-2">
            <li className="flex gap-3">
              <span className="font-bold text-primary-600 w-6 flex-shrink-0">1</span>
              <span>Check your email inbox for the verification link</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-primary-600 w-6 flex-shrink-0">2</span>
              <span>Click the link to verify your email address</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-primary-600 w-6 flex-shrink-0">3</span>
              <span>Return here and sign in with your verified account</span>
            </li>
          </ol>
        </div>

        <p className="text-xs text-neutral-500 text-center mb-6">
          Check your spam folder if you don't see the email in a few minutes.
        </p>

        {/* Buttons */}
        <div className="space-y-3">
          <Button
            variant="primary"
            size="lg"
            className="w-full gap-2"
            onClick={onGoToLogin}
          >
            Go to Sign In <ArrowRight size={16} />
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="w-full"
            onClick={onClose}
          >
            Back
          </Button>
        </div>
      </div>
    </div>
  );
};
