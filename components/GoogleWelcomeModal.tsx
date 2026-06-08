"use client";

import React from 'react';
import { CheckCircle, ArrowRight, X } from 'lucide-react';
import { Button } from './Button';

interface GoogleWelcomeModalProps {
  email: string;
  onClose: () => void;
  onGoToLogin: () => void;
}

export const GoogleWelcomeModal: React.FC<GoogleWelcomeModalProps> = ({ 
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
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center">
            <CheckCircle size={32} className="text-green-600" />
          </div>
        </div>

        {/* Content */}
        <h2 className="text-2xl font-bold text-neutral-900 text-center mb-2">
          Welcome aboard!
        </h2>
        
        <p className="text-neutral-500 text-center mb-6">
          Your account has been created successfully with <span className="font-semibold text-neutral-700">{email}</span>
        </p>

        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-green-900">
            ✓ Your email is verified and ready to go. You can now sign in and start using Typoscale.
          </p>
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <Button
            variant="primary"
            size="lg"
            className="w-full gap-2"
            onClick={onGoToLogin}
          >
            Sign In Now <ArrowRight size={16} />
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
