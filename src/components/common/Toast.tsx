import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div
      aria-live="polite"
      className="fixed top-4 right-4 left-4 sm:left-auto z-50 flex flex-col gap-2 w-auto sm:w-full sm:max-w-sm pointer-events-none"
    >
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-2xl shadow-2xl border backdrop-blur-xl ${
              toast.type === 'success'
                ? 'bg-[#0D1220]/95 border-[#22C55E]/40 text-[#F1F5F9]'
                : toast.type === 'error'
                ? 'bg-[#0D1220]/95 border-[#F87171]/40 text-[#F1F5F9]'
                : 'bg-[#0D1220]/95 border-[#8B5CF6]/40 text-[#F1F5F9]'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {toast.type === 'success' && (
                <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0" />
              )}
              {toast.type === 'error' && (
                <AlertCircle className="w-4 h-4 text-[#F87171] shrink-0" />
              )}
              {toast.type === 'info' && (
                <Info className="w-4 h-4 text-[#22D3EE] shrink-0" />
              )}
              <p className="text-xs font-semibold leading-snug">{toast.message}</p>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="p-1 rounded-lg text-[#94A3B8] hover:text-white hover:bg-white/10 transition-colors ml-2 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
