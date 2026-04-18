"use client";

import React from 'react';
import ContactForm from './ContactForm';
import PageHeader from './PageHeader';
import { Mail, MapPin, Clock } from 'lucide-react';
import { ToastProvider } from './ToastContext';

export default function ContactPageContent() {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <PageHeader 
          title="Contact Us"
          description="Have questions about Typoscale? We'd love to hear from you."
          breadcrumbs={[{ label: 'Contact', href: '/contact' }]}
        />

        {/* Main Content */}
        <div className="px-4 sm:px-6 lg:px-8 py-12">
          {/* Contact Form */}
          <div className="max-w-2xl mx-auto mb-16">
            <ContactForm />
          </div>

          {/* Additional Info */}
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
        </div>
      </div>
    </ToastProvider>
  );
}
