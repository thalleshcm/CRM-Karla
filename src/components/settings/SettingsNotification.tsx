import React from 'react';
import { useToast, ToastVariant } from '../../context/ToastContext';

/**
 * Thin adapter over the app-wide toast system. Kept as its own module (rather
 * than having every settings section call useToast() directly) so the ~25
 * existing call sites didn't need touching when this moved off a
 * settings-only notification bar and onto the global toast.
 */
export const useSettingsNotification = () => {
  const { show } = useToast();
  return (message: string, variant: ToastVariant = 'success') => show(message, { variant });
};

// No longer renders anything itself — the global <ToastProvider> (mounted in
// App.tsx) owns the toast UI. Kept so SettingsView's existing wrapper doesn't
// need to change.
export const SettingsNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;
