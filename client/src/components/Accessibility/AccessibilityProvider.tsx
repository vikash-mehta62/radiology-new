import React, { createContext, useContext, useState, useEffect } from 'react';

interface AccessibilityContextType {
  highContrast: boolean;
  reducedMotion: boolean;
  fontSize: 'small' | 'medium' | 'large';
  focusVisible: boolean;
  screenReaderAnnouncements: string[];
  toggleHighContrast: () => void;
  toggleReducedMotion: () => void;
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
  announceToScreenReader: (message: string) => void;
  clearAnnouncements: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};

interface AccessibilityProviderProps {
  children: React.ReactNode;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const [highContrast, setHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [focusVisible, setFocusVisible] = useState(false);
  const [screenReaderAnnouncements, setScreenReaderAnnouncements] = useState<string[]>([]);

  // Detect system preferences
  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Detect keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setFocusVisible(true);
      }
    };

    const handleMouseDown = () => {
      setFocusVisible(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  // Apply accessibility styles to document
  useEffect(() => {
    const root = document.documentElement;
    
    if (highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    if (reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }

    if (focusVisible) {
      root.classList.add('focus-visible');
    } else {
      root.classList.remove('focus-visible');
    }

    root.setAttribute('data-font-size', fontSize);
  }, [highContrast, reducedMotion, focusVisible, fontSize]);

  const toggleHighContrast = () => {
    setHighContrast(!highContrast);
    announceToScreenReader(`High contrast mode ${!highContrast ? 'enabled' : 'disabled'}`);
  };

  const toggleReducedMotion = () => {
    setReducedMotion(!reducedMotion);
    announceToScreenReader(`Reduced motion ${!reducedMotion ? 'enabled' : 'disabled'}`);
  };

  const handleSetFontSize = (size: 'small' | 'medium' | 'large') => {
    setFontSize(size);
    announceToScreenReader(`Font size changed to ${size}`);
  };

  const announceToScreenReader = (message: string) => {
    setScreenReaderAnnouncements(prev => [...prev, message]);
    // Clear announcement after a delay to prevent accumulation
    setTimeout(() => {
      setScreenReaderAnnouncements(prev => prev.filter(msg => msg !== message));
    }, 1000);
  };

  const clearAnnouncements = () => {
    setScreenReaderAnnouncements([]);
  };

  const value: AccessibilityContextType = {
    highContrast,
    reducedMotion,
    fontSize,
    focusVisible,
    screenReaderAnnouncements,
    toggleHighContrast,
    toggleReducedMotion,
    setFontSize: handleSetFontSize,
    announceToScreenReader,
    clearAnnouncements,
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
      {/* Screen reader announcements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'absolute',
          left: '-10000px',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        }}
      >
        {screenReaderAnnouncements.map((announcement, index) => (
          <div key={index}>{announcement}</div>
        ))}
      </div>
    </AccessibilityContext.Provider>
  );
};