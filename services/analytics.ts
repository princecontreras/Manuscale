
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

// Get ID from environment variables
const GA_MEASUREMENT_ID = process.env.VITE_GA_ID;

export const initAnalytics = () => {
  if (typeof window === 'undefined') return;
  if (!GA_MEASUREMENT_ID) {
      console.log("[Analytics] No Measurement ID found (VITE_GA_ID). Analytics disabled.");
      return;
  }

  // Check if script already exists to prevent duplicates
  if (document.getElementById('ga-script')) return;

  // Inject Google Analytics Script
  const script = document.createElement('script');
  script.id = 'ga-script';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  // Initialize Data Layer
  window.dataLayer = window.dataLayer || [];
  function gtag(...args: any[]) {
    window.dataLayer.push(args);
  }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID);
  
  console.log(`[Analytics] Initialized with ID: ${GA_MEASUREMENT_ID}`);
};

// Track specific actions
export const trackEvent = (eventName: string, params?: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params);
    
    // Log to console in development for verification
    if ((import.meta as any).env && (import.meta as any).env.DEV) {
        console.log(`[Analytics Event] ${eventName}`, params);
    }
  }
};
