"use client";

import React, { useState } from 'react';
import { Mail, Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from './ToastContext';

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export default function ContactForm() {
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const { showToast } = useToast();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus('idle');
    setErrorMessage('');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send message');
      }

      setStatus('success');
      setFormData({ name: '', email: '', subject: '', message: '' });
      showToast('Message sent successfully!', 'success');

      // Reset success status after 5 seconds
      setTimeout(() => setStatus('idle'), 5000);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to send message';
      setStatus('error');
      setErrorMessage(message);
      showToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8">
        <div className="flex items-center gap-3 mb-6">
          <Mail className="w-6 h-6 text-blue-500" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Get In Touch
          </h2>
        </div>

        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Have a question or feedback? We'd love to hear from you. Fill out the
          form below and we'll get back to you as soon as possible.
        </p>

        {status === 'success' && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-green-800 dark:text-green-300">
                Message sent!
              </h3>
              <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                Thank you for reaching out. We'll respond shortly.
              </p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800 dark:text-red-300">
                Error
              </h3>
              <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                {errorMessage}
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name Field */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Name *
              </label>
              <input
                id="name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={isLoading}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                  bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors"
                placeholder="Your name"
              />
            </div>

            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Email *
              </label>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={isLoading}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                  bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors"
                placeholder="your.email@example.com"
              />
            </div>
          </div>

          {/* Subject Field */}
          <div>
            <label
              htmlFor="subject"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Subject *
            </label>
            <input
              id="subject"
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              required
              disabled={isLoading}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                focus:ring-2 focus:ring-blue-500 focus:border-transparent
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors"
              placeholder="How can we help?"
            />
          </div>

          {/* Message Field */}
          <div>
            <label
              htmlFor="message"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Message *
            </label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              required
              disabled={isLoading}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                focus:ring-2 focus:ring-blue-500 focus:border-transparent
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors resize-none"
              placeholder="Tell us more about your inquiry..."
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400
              text-white font-semibold py-3 px-6 rounded-lg
              flex items-center justify-center gap-2
              transition-colors duration-200
              disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="animate-spin">
                  <Send className="w-5 h-5" />
                </div>
                Sending...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Send Message
              </>
            )}
          </button>

          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            We typically respond within 24 hours.
          </p>
        </form>
      </div>
    </div>
  );
}
