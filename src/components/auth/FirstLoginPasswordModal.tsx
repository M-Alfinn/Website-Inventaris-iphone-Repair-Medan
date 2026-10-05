import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Lock, ShieldAlert, CheckCircle2, Eye, EyeOff, KeyRound } from 'lucide-react';

export const FirstLoginPasswordModal: React.FC = () => {
  const { isFirstLoginModalOpen, currentUser, completeFirstTimePasswordChange } = useApp();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isFirstLoginModalOpen || !currentUser) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (newPassword.length < 6) {
      setErrorMsg('Kata sandi baru minimal harus terdiri dari 6 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Konfirmasi kata sandi tidak cocok. Silakan periksa kembali.');
      return;
    }

    const success = completeFirstTimePasswordChange(newPassword);
    if (!success) {
      setErrorMsg('Gagal memperbarui kata sandi. Silakan coba lagi.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Alert */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3 border border-amber-200 shadow-xs">
            <ShieldAlert className="w-7 h-7 stroke-[1.75]" />
          </div>
          <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">
            Wajib Ganti Kata Sandi
          </h3>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            Halo <strong>{currentUser.nama || currentUser.name}</strong>, akun Anda menggunakan kata sandi awal / sementara. Untuk keamanan sistem, silakan buat kata sandi baru Anda sekarang.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-600 font-medium text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5 text-[11px]">
              Kata Sandi Baru
            </label>
            <div className="relative rounded-xl border border-slate-200 bg-[#f8fafc] focus-within:bg-white focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-100 transition-all px-3.5 py-2.5 flex items-center gap-3">
              <Lock className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full bg-transparent border-none outline-none focus:ring-0 text-xs sm:text-sm text-slate-800 placeholder-slate-400 font-medium py-0"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5 text-[11px]">
              Ulangi Kata Sandi Baru
            </label>
            <div className="relative rounded-xl border border-slate-200 bg-[#f8fafc] focus-within:bg-white focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-100 transition-all px-3.5 py-2.5 flex items-center gap-3">
              <KeyRound className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ketik ulang kata sandi baru"
                className="w-full bg-transparent border-none outline-none focus:ring-0 text-xs sm:text-sm text-slate-800 placeholder-slate-400 font-medium py-0"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-2 py-3 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4.5 h-4.5" />
            <span>Simpan Kata Sandi &amp; Lanjutkan</span>
          </button>
        </form>

      </div>
    </div>
  );
};
