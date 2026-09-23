'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
  children: React.ReactNode;
  onClose?: () => void;
}

/**
 * Portal component that renders dialogs directly to document.body,
 * guaranteeing that full-screen backdrops cover the entire screen (including
 * sticky headers and fixed sidebars) without being trapped by parent stacking contexts.
 * Also locks body scrolling while active and handles the Escape key.
 */
export function Portal({ children, onClose }: PortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(children, document.body);
}
