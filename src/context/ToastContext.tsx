import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  variant?: ToastVariant;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** ms before auto-dismiss; defaults scale with message length. Pass 0 to require manual close. */
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: string;
  message: string;
}

interface ToastContextValue {
  show: (message: string, options?: ToastOptions) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  show: () => {
    console.warn('useToast() called outside of <ToastProvider> — toast was not shown.');
    return '';
  },
  dismiss: () => {}
});

export const useToast = () => useContext(ToastContext);

const VARIANT_STYLES: Record<ToastVariant, { icon: React.ReactNode; bar: string }> = {
  success: { icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />, bar: 'border-emerald-200' },
  error: { icon: <XCircle className="w-5 h-5 text-rose-600" />, bar: 'border-rose-200' },
  warning: { icon: <AlertTriangle className="w-5 h-5 text-amber-600" />, bar: 'border-amber-200' },
  info: { icon: <Info className="w-5 h-5 text-sky-600" />, bar: 'border-sky-200' }
};

// Auto-dismiss duration scales with message length so longer text has time to be read,
// clamped to a sane range; callers can still override via options.duration.
const durationFor = (message: string, description?: string) => {
  const length = message.length + (description?.length || 0);
  return Math.min(8000, Math.max(2500, length * 60));
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const show = useCallback(
    (message: string, options: ToastOptions = {}) => {
      // Avoid stacking an identical toast that's already visible (prevents
      // "flicker" when two actions fire the same message in quick succession).
      const dupe = toasts.find(t => t.message === message && t.variant === (options.variant || 'success'));
      if (dupe) {
        if (timers.current[dupe.id]) clearTimeout(timers.current[dupe.id]);
        const duration = options.duration ?? durationFor(message, options.description);
        if (duration > 0) {
          timers.current[dupe.id] = setTimeout(() => dismiss(dupe.id), duration);
        }
        return dupe.id;
      }

      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const item: ToastItem = { id, message, variant: 'success', ...options };
      setToasts(prev => [...prev, item]);

      const duration = options.duration ?? durationFor(message, options.description);
      if (duration > 0) {
        timers.current[id] = setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss, toasts]
  );

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-4 right-4 z-100 flex flex-col gap-2 w-[min(22rem,calc(100vw-2rem))] pointer-events-none"
      >
        {toasts.map(t => {
          const style = VARIANT_STYLES[t.variant || 'success'];
          return (
            <div
              key={t.id}
              className={`pointer-events-auto bg-white border ${style.bar} rounded-2xl shadow-lg p-3.5 flex items-start gap-2.5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-reduce:animate-none`}
            >
              <div className="shrink-0 mt-0.5">{style.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#344E41] leading-snug">{t.message}</p>
                {t.description && (
                  <p className="text-[11px] text-[#3A403A]/60 mt-0.5 leading-snug">{t.description}</p>
                )}
                {t.actionLabel && t.onAction && (
                  <button
                    onClick={() => {
                      t.onAction?.();
                      dismiss(t.id);
                    }}
                    className="text-[11px] font-bold text-[#588157] hover:text-[#344E41] mt-1.5 underline underline-offset-2"
                  >
                    {t.actionLabel}
                  </button>
                )}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 p-0.5 text-[#3A403A]/40 hover:text-[#3A403A] transition-colors"
                aria-label="Fechar notificação"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
