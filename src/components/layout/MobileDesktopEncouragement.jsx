import { useState, useEffect } from 'react';
import { useWindow } from '../../providers/WindowProvider';
import './MobileDesktopEncouragement.scss';

export default function MobileDesktopEncouragement({ skipDelay = false }) {
  const windowContext = useWindow();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Fallback for when context is not available (e.g., in tests)
  const isMobileLayout = windowContext?.isMobileLayout || (() => {
    // Check for mobile layout using multiple methods
    if (typeof window !== 'undefined') {
      // Method 1: Check window width
      if (window.innerWidth < 768) {
        return true;
      }

      // Method 2: Check for dev tools device emulation
      if (window.matchMedia && window.matchMedia('(max-width: 767px)').matches) {
        return true;
      }

      // Method 3: Check for mobile user agent (fallback)
      if (navigator.userAgent && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        return true;
      }
    }
    return false;
  });

  useEffect(() => {
    const checkMobileAndShow = () => {
      // Debug logging for mobile detection
      console.log('MobileDesktopEncouragement debug:');
      console.log('- window.innerWidth:', window.innerWidth);
      console.log('- window.matchMedia(max-width: 767px):', window.matchMedia ? window.matchMedia('(max-width: 767px)').matches : 'not supported');
      console.log('- navigator.userAgent:', navigator.userAgent);
      console.log('- windowContext:', windowContext);
      console.log('- isMobileLayout():', isMobileLayout());
      console.log('- skipDelay:', skipDelay);

      // Check if user has previously dismissed this message
      const dismissed = localStorage.getItem('mobile-desktop-encouragement-dismissed');
      console.log('- dismissed from localStorage:', dismissed);

      if (dismissed === 'true') {
        setIsDismissed(true);
        return;
      }

      // Show message only on mobile layout
      if (isMobileLayout()) {
        console.log('✅ Mobile layout detected, showing message');
        if (skipDelay) {
          setIsVisible(true);
        } else {
          // Add a small delay to ensure the page has loaded
          const timer = setTimeout(() => {
            setIsVisible(true);
          }, 1000);
          return () => clearTimeout(timer);
        }
      } else {
        console.log('❌ Not mobile layout, not showing message');
        setIsVisible(false);
      }
    };

    // Check immediately
    checkMobileAndShow();

    // Also listen for window resize events
    const handleResize = () => {
      checkMobileAndShow();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isMobileLayout, skipDelay]);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem('mobile-desktop-encouragement-dismissed', 'true');
  };

  if (!isVisible || isDismissed) {
    return null;
  }

  return (
    <div className="mobile-desktop-encouragement">
      <div className="encouragement-content">
        <div className="encouragement-text">
          <h3>💻 Better Experience on Desktop</h3>
          <p>
            For the best MEHKO application experience with full features,
            we recommend using a desktop or laptop computer.
          </p>
          <div className="encouragement-actions">
            <button
              onClick={handleDismiss}
              className="btn-dismiss"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Continue on Mobile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
