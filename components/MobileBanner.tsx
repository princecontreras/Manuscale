"use client";

import React, { useEffect, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';

const MobileBanner: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if device is mobile/tablet
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      const screenWidth = window.innerWidth;
      
      // Consider it mobile if either user agent suggests mobile OR screen width is small
      const isMobileScreen = screenWidth < 1024;
      
      setIsMobile(isMobileDevice || isMobileScreen);
    };

    checkMobile();
    
    // Re-check on window resize
    window.addEventListener('resize', checkMobile);
    
    // Check localStorage for dismissal
    const dismissed = localStorage.getItem('mobileBannerDismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('mobileBannerDismissed', 'true');
  };

  if (!isMobile || isDismissed) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[150] bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-start justify-between gap-4 shadow-md">
      <div className="flex items-start gap-3 flex-1">
        <AlertCircle size={20} className="shrink-0 text-amber-600 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-amber-900 mb-1">Mobile Experience Limited</h3>
          <p className="text-sm text-amber-800">
            This app is optimized for desktop and big screen use. Some features may not work properly on mobile devices. 
            For the best experience, please use a desktop browser 
          </p>
        </div>
      </div>
      <button
        onClick={handleDismiss}
        className="text-amber-600 hover:text-amber-800 transition-colors p-1 shrink-0 mt-1"
        title="Dismiss"
        aria-label="Dismiss mobile warning"
      >
        <X size={18} />
      </button>
    </div>
  );
};

export default MobileBanner;
