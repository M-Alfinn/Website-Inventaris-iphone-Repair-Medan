import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div
      id="toast-container"
      className="fixed bottom-4 sm:bottom-6 right-3 sm:right-6 left-3 sm:left-auto z-50 flex flex-col gap-2 pointer-events-none sm:max-w-sm max-w-full"
    >
      {toasts.map((toast) => {
        let bgColor = 'bg-white border-slate-200 text-slate-800 shadow-slate-900/10';
        let icon = <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />;

        if (toast.type === 'success') {
          bgColor = 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-emerald-950/10';
          icon = <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />;
        } else if (toast.type === 'error') {
          bgColor = 'bg-rose-50 border-rose-300 text-rose-950 shadow-rose-950/10';
          icon = <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />;
        } else if (toast.type === 'warning') {
          bgColor = 'bg-amber-50 border-amber-300 text-amber-950 shadow-amber-950/10';
          icon = <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />;
        }

        return (
          <div
            key={toast.id}
            id={toast.id}
            className={`pointer-events-auto flex items-start gap-2.5 px-3.5 py-3 rounded-xl border shadow-lg transition-all animate-in fade-in slide-in-from-bottom-3 duration-200 ${bgColor}`}
          >
            {icon}
            <div className="flex-1 min-w-0 pr-1">
              <h4 className="text-xs font-bold tracking-tight leading-tight">{toast.title}</h4>
              <p className="text-[11px] text-slate-700 mt-0.5 leading-snug break-words">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-700 p-1 -mr-1 -mt-1 rounded-lg transition-colors cursor-pointer shrink-0"
              aria-label="Tutup Notifikasi"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};


