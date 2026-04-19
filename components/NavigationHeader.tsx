"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { Logo } from './Logo';
import { Button } from './Button';
import { useAuth } from './AuthProvider';
import { useDemo } from './DemoContext';
import { useRouter } from 'next/navigation';

interface NavigationHeaderProps {
  onEnterApp?: () => void;
  showFeatures?: boolean;
  onTryDemo?: () => void;
  onLogin?: () => void;
  onSignup?: () => void;
  onShowFeatures?: () => void;
  onGoToAbout?: () => void;
  onGoToPricing?: () => void;
  onGoToContact?: () => void;
}

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  onEnterApp,
  showFeatures = true,
  onTryDemo,
  onLogin,
  onSignup,
  onShowFeatures,
  onGoToAbout,
  onGoToPricing,
  onGoToContact
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user: firebaseUser, loading: authLoading } = useAuth();
  const { hasUsedDemoBefore, isDemoMode } = useDemo();
  const router = useRouter();

  const isLoggedIn = !!firebaseUser && !authLoading;

  const handleTryDemo = () => {
    if (onTryDemo) {
      onTryDemo();
      return;
    }
    if (hasUsedDemoBefore && !isDemoMode) {
      // User has already used their free demo
      router.push('/?auth=signup');
      return;
    }
    router.push('/?demo=true');
  };

  const handleGoToAuth = (isLogin: boolean = true) => {
    if (isLogin && onLogin) {
      onLogin();
      return;
    }
    if (!isLogin && onSignup) {
      onSignup();
      return;
    }
    router.push(isLogin ? '/?auth=login' : '/?auth=signup');
  };

  const handleGoToFeatures = () => {
    if (onShowFeatures) {
      onShowFeatures();
      return;
    }
    router.push('/?features=true');
  };

  const handleGoToAbout = () => {
    if (onGoToAbout) {
      onGoToAbout();
      return;
    }
    router.push('/about');
  };

  const handleGoToPricing = () => {
    if (onGoToPricing) {
      onGoToPricing();
      return;
    }
    router.push('/pricing');
  };

  const handleGoToContact = () => {
    if (onGoToContact) {
      onGoToContact();
      return;
    }
    router.push('/contact');
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <>
      {/* Navigation Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-50/80 backdrop-blur-md border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
            <Logo className="scale-75 sm:scale-90" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {showFeatures && (
              <button 
                onClick={handleGoToFeatures}
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Features
              </button>
            )}
            <button 
              onClick={handleGoToAbout}
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              About
            </button>
            <button 
              onClick={handleGoToPricing}
              className="text-sm font-bold text-primary-600 hover:text-primary-700 transition-colors"
            >
              Pricing
            </button>
            <button 
              onClick={handleGoToContact}
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Contact Us
            </button>
            <div className="h-4 w-px bg-slate-300"></div>
            {isLoggedIn ? (
              <Button 
                variant="primary" 
                size="sm" 
                onClick={onEnterApp} 
                className="shadow-sm"
              >
                Go to Dashboard
              </Button>
            ) : (
              <div className="flex gap-3">
                <Button variant="ghost" size="sm" onClick={handleTryDemo}>
                  Try Demo
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleGoToAuth(true)}>
                  Log in
                </Button>
                <Button variant="primary" size="sm" onClick={() => handleGoToAuth(false)} className="shadow-sm">
                  Sign up
                </Button>
              </div>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={24} className="text-slate-700" />
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col pt-20 px-6 animate-in slide-in-from-top-2">
          <button 
            className="absolute top-6 right-6 p-2"
            onClick={closeMobileMenu}
            aria-label="Close menu"
          >
            <X size={24} className="text-slate-700" />
          </button>
          <nav className="flex flex-col gap-6 text-lg">
            {showFeatures && (
              <button 
                onClick={() => {
                  closeMobileMenu();
                  handleGoToFeatures();
                }}
                className="text-left font-semibold text-slate-800"
              >
                Features
              </button>
            )}
            <button 
              onClick={() => {
                closeMobileMenu();
                handleGoToAbout();
              }}
              className="text-left font-semibold text-slate-800"
            >
              About
            </button>
            <button 
              onClick={() => {
                closeMobileMenu();
                handleGoToPricing();
              }}
              className="text-left font-semibold text-slate-800"
            >
              Pricing
            </button>
            <button 
              onClick={() => {
                closeMobileMenu();
                handleGoToContact();
              }}
              className="text-left font-semibold text-slate-800"
            >
              Contact Us
            </button>
            <hr className="border-slate-200" />
            {isLoggedIn ? (
              <Button 
                variant="primary" 
                onClick={() => {
                  closeMobileMenu();
                  onEnterApp?.();
                }}
              >
                Go to Dashboard
              </Button>
            ) : (
              <div className="flex flex-col gap-4">
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    closeMobileMenu();
                    handleGoToAuth(true);
                  }}
                >
                  Log in
                </Button>
                <Button 
                  variant="primary" 
                  onClick={() => {
                    closeMobileMenu();
                    handleGoToAuth(false);
                  }}
                >
                  Sign up
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    closeMobileMenu();
                    handleTryDemo();
                  }}
                  className="border border-slate-300"
                >
                  Try Free Demo
                </Button>
              </div>
            )}
          </nav>
        </div>
      )}
    </>
  );
};
