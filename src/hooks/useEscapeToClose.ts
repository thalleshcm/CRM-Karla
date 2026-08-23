import { useEffect } from 'react';

/**
 * Closes the calling modal when Escape is pressed. Pass `isOpen: true`
 * (or omit it) for modals that only mount while open; pass the real
 * open-state for modals that stay mounted and toggle visibility internally.
 */
export function useEscapeToClose(onClose: () => void, isOpen: boolean = true) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
}
