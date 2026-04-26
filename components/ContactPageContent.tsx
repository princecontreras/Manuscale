"use client";

import React, { useState, memo } from 'react';
import { useRouter } from 'next/navigation';
import ContactForm from './ContactForm';
import { NavigationHeader } from './NavigationHeader';
import { FeaturesPage } from './FeaturesPage';
import { AuthPage } from './AuthPage';
import { Mail, MapPin, Clock } from 'lucide-react';
import { ToastProvider } from './ToastContext';
import { useAuth } from './AuthProvider';

// Memoized Contact Info Section
const ContactInfoSection = memo(() => (
  <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 py-12">
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg mb-4">
        <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
      </div>
      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
        Email
      </h3>
      <p className="text-gray-600 dark:text-gray-400">
        We typically respond within 24 hours
      </p>
    </div>

    <div className="text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg mb-4">
        <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
      </div>
      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
        Response Time
      </h3>
      <p className="text-gray-600 dark:text-gray-400">
        Fast support during business hours
      </p>
    </div>

    <div className="text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg mb-4">
        <MapPin className="w-6 h-6 text-blue-600 dark:text-blue-400" />
      </div>
      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
        Support
      </h3>
      <p className="text-gray-600 dark:text-gray-400">
        Technical and billing support available
      </p>
    </div>
  </div>
));
ContactInfoSection.displayName = 'ContactInfoSection';

// Memoized Contact Page Content
const ContactPageContentWrapper = memo(({ 
  showAuth, 
  authIsLogin, 
  onAuthClose,
  onLogin,
  onSignup,
  onTryDemo,
  onShowFeatures
}: {
  showAuth: boolean;
  authIsLogin: boolean;
  onAuthClose: () => void;
  onLogin: () => void;
  onSignup: () => void;
  onTryDemo: () => void;
  onShowFeatures: () => void;
}) => {
  const { user: firebaseUser } = useAuth();

  return (
    <ToastProvider>
      {showAuth && !firebaseUser && (
        <AuthPage 
          defaultIsLogin={authIsLogin}
          onLogin={onAuthClose}
          onBack={onAuthClose}
        />
      )}
      {(!showAuth || firebaseUser) && (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
          <NavigationHeader 
            showFeatures={true}
            onLogin={onLogin}
            onSignup={onSignup}
            onTryDemo={onTryDemo}
            onShowFeatures={onShowFeatures}
          />
          <div className="pt-24 sm:pt-32">
            {/* Page Title */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-3">
                Contact Us
              </h1>
              <p className="text-lg text-slate-600 dark:text-gray-300">
                Have questions about Typoscale? We'd love to hear from you.
              </p>
            </div>

            {/* Main Content */}
            <div className="px-4 sm:px-6 lg:px-8 py-12">
              {/* Contact Form */}
              <div className="max-w-2xl mx-auto mb-16">
                <ContactForm />
              </div>

              {/* Additional Info */}
              <ContactInfoSection />
            </div>
          </div>
        </div>
      )}
    </ToastProvider>
  );
});
ContactPageContentWrapper.displayName = 'ContactPageContentWrapper';

export default memo(function ContactPageContent() {
  const router = useRouter();
  const [showAuth, setShowAuth] = useState(false);
  const [authIsLogin, setAuthIsLogin] = useState(true);
  const [showFeatures, setShowFeatures] = useState(false);

  const handleLogin = () => {
    setAuthIsLogin(true);
    setShowAuth(true);
  };

  const handleSignup = () => {
    setAuthIsLogin(false);
    setShowAuth(true);
  };

  const handleTryDemo = () => {
    window.location.href = '/?demo=true';
  };

  const handleAuthSuccess = () => {
    setShowAuth(false);
    // Auto-redirect to dashboard after successful login
    router.push('/?direct=dashboard');
  };

  // Features view takes priority
  if (showFeatures) {
    return (
      <ToastProvider>
        <FeaturesPage 
          onBack={() => setShowFeatures(false)}
          onLogin={handleLogin}
          onSignup={handleSignup}
          onTryDemo={handleTryDemo}
          onGoToAbout={() => window.location.href = '/about'}
          onGoToPricing={() => window.location.href = '/pricing'}
          onGoToContact={() => setShowFeatures(false)}
        />
      </ToastProvider>
    );
  }

  // Return optimized content
  return (
    <ContactPageContentWrapper
      showAuth={showAuth}
      authIsLogin={authIsLogin}
      onAuthClose={handleAuthSuccess}
      onLogin={handleLogin}
      onSignup={handleSignup}
      onTryDemo={handleTryDemo}
      onShowFeatures={() => setShowFeatures(true)}
    />
  );
});
