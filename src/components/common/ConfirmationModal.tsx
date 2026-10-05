import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger' | 'success';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  let confirmBtnClasses = 'bg-indigo-600 hover:bg-indigo-700 text-white';
  if (confirmVariant === 'danger') {
    confirmBtnClasses = 'bg-rose-600 hover:bg-rose-700 text-white';
  } else if (confirmVariant === 'success') {
    confirmBtnClasses = 'bg-emerald-600 hover:bg-emerald-700 text-white';
  }

  return (
    <div id="confirmation-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs">
      <div
        id="confirmation-modal-content"
        className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center gap-3 mb-2.5 sm:mb-3">
          <div className={`p-2 sm:p-2.5 rounded-xl shrink-0 ${confirmVariant === 'danger' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
            <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-snug">{title}</h3>
        </div>

        <p className="text-xs sm:text-sm text-slate-600 mb-4 sm:mb-6 leading-relaxed">{message}</p>

        <div className="flex items-center justify-end gap-2.5 sm:gap-3 pt-2">
          <button
            id="modal-btn-cancel"
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            id="modal-btn-confirm"
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-all cursor-pointer ${confirmBtnClasses}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
