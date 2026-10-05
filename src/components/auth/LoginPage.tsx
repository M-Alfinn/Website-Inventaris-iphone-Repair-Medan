import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Wrench,
  Package,
  Calendar,
  Lock, 
  Mail, 
  CheckCircle2,
  ArrowRight,
  Eye,
  EyeOff,
  RefreshCw,
  X
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, requestPasswordReset, validateResetOtp, resetPasswordWithToken } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Forgot password modal state (Sequential: Email -> Verify OTP -> New Password)
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState<'INPUT' | 'VERIFY_OTP' | 'NEW_PASSWORD'>('INPUT');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [isSendingForgotOtp, setIsSendingForgotOtp] = useState(false);
  const [isValidatingOtp, setIsValidatingOtp] = useState(false);
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Resend OTP countdown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const res = await login(email, password);
      setIsLoading(false);
      if (!res.success) {
        setErrorMsg(res.message || 'Email atau kata sandi tidak sesuai. Silakan coba kembali.');
      }
    } catch {
      setIsLoading(false);
      setErrorMsg('Gagal memproses login. Silakan coba sesaat lagi.');
    }
  };

  // STEP 1: Send OTP to email
  const handleRequestForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    if (!forgotEmail.trim()) return;

    setIsSendingForgotOtp(true);
    try {
      const res = await requestPasswordReset(forgotEmail.trim());
      setIsSendingForgotOtp(false);
      if (res.success) {
        setForgotStatus('VERIFY_OTP');
        setResetOtp('');
        setResendCooldown(60);
      } else {
        setForgotError(res.message);
      }
    } catch (err) {
      setIsSendingForgotOtp(false);
      setForgotError('Terjadi kesalahan saat mengirim kode verifikasi ke email.');
    }
  };

  // Resend OTP
  const handleResendForgotCode = async () => {
    if (isSendingForgotOtp || resendCooldown > 0 || !forgotEmail.trim()) return;
    setIsSendingForgotOtp(true);
    setForgotError('');
    try {
      const res = await requestPasswordReset(forgotEmail.trim());
      setIsSendingForgotOtp(false);
      if (res.success) {
        setResendCooldown(60);
      } else {
        setForgotError(res.message);
      }
    } catch (err) {
      setIsSendingForgotOtp(false);
      setForgotError('Gagal mengirim ulang kode OTP ke Gmail.');
    }
  };

  // STEP 2: Verify OTP first (independent step)
  const handleVerifyOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');

    const cleanOtp = resetOtp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setForgotError('Masukkan 6 digit kode OTP yang diterima di Gmail.');
      return;
    }

    setIsValidatingOtp(true);
    setTimeout(() => {
      setIsValidatingOtp(false);
      const res = validateResetOtp(forgotEmail, cleanOtp);
      if (res.success) {
        setForgotStatus('NEW_PASSWORD');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setForgotError(res.message);
      }
    }, 250);
  };

  // STEP 3: Save new password (after OTP verified)
  const handleSavePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');

    const cleanOtp = resetOtp.trim();
    if (newPassword.length < 6) {
      setForgotError('Kata sandi baru minimal harus 6 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setForgotError('Konfirmasi kata sandi tidak cocok. Silakan periksa kembali.');
      return;
    }

    setIsSubmittingReset(true);
    setTimeout(() => {
      const res = resetPasswordWithToken(cleanOtp, newPassword);
      setIsSubmittingReset(false);
      if (res.success) {
        // Close modal immediately
        handleCloseForgotModal();
        // Clear login inputs so credentials are NOT auto-filled
        setEmail('');
        setPassword('');
      } else {
        setForgotError(res.message);
      }
    }, 300);
  };

  const handleCloseForgotModal = () => {
    setShowForgotModal(false);
    setForgotStatus('INPUT');
    setForgotEmail('');
    setResetOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setForgotError('');
    setIsSendingForgotOtp(false);
    setIsValidatingOtp(false);
    setIsSubmittingReset(false);
  };

  return (
    <div className="min-h-screen w-full bg-[#f4f7fe] flex items-center justify-center p-3 sm:p-6 md:p-10 relative overflow-hidden font-sans select-none">
      
      {/* ========================================================================= */}
      {/* BACKGROUND GRAPHICS: Fluid Organic Waves, Dot Matrices, & Line Art        */}
      {/* ========================================================================= */}
      
      {/* 1. Top Right - Large Smooth Pastel Fluid Blob & Sweeping Curved Arc */}
      <div className="absolute -top-12 -right-12 w-[460px] h-[460px] pointer-events-none z-0">
        <svg viewBox="0 0 460 460" fill="none" className="w-full h-full">
          <defs>
            <radialGradient id="topRightBlob" cx="65%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.55" />
              <stop offset="50%" stopColor="#ddd6fe" stopOpacity="0.3" />
              <stop offset="80%" stopColor="#e0e7ff" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#f4f7fe" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="300" cy="160" r="220" fill="url(#topRightBlob)" />
          {/* Sweeping thin contour arc */}
          <path
            d="M460,110 C360,160 280,240 180,360 C120,430 80,450 0,460"
            stroke="#c4b5fd"
            strokeWidth="1.5"
            strokeOpacity="0.35"
            fill="none"
          />
        </svg>
      </div>
      
      {/* 2. Bottom Left - Multi-Layered Fluid Organic Waves */}
      <div className="absolute -bottom-10 -left-10 w-[520px] h-[460px] pointer-events-none z-0">
        <svg viewBox="0 0 520 460" fill="none" className="w-full h-full">
          <defs>
            <linearGradient id="bgWaveLayer1" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#a5b4fc" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#e0e7ff" stopOpacity="0.08" />
            </linearGradient>
            <linearGradient id="bgWaveLayer2" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#93c5fd" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#c7d2fe" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="bgWaveLayer3" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.35" />
              <stop offset="70%" stopColor="#c4b5fd" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Layer 1: Outermost wide fluid wave */}
          <path
            d="M-20,460 C60,430 100,340 170,300 C240,260 270,370 350,340 C420,310 460,230 520,180 L520,500 L-20,500 Z"
            fill="url(#bgWaveLayer1)"
          />
          {/* Layer 2: Middle fluid organic curve */}
          <path
            d="M-20,460 C40,370 80,280 150,260 C220,240 230,350 310,320 C380,290 405,210 460,165 L460,500 L-20,500 Z"
            fill="url(#bgWaveLayer2)"
          />
          {/* Layer 3: Rising inner fluid curve */}
          <path
            d="M-20,460 C20,330 55,250 120,225 C180,200 190,300 260,275 C320,250 340,180 390,140 L390,500 L-20,500 Z"
            fill="url(#bgWaveLayer3)"
          />
          {/* Graceful contour arc line */}
          <path
            d="M-20,400 C60,300 140,220 240,190 C340,160 390,200 480,150"
            stroke="#818cf8"
            strokeWidth="1.5"
            strokeOpacity="0.35"
            fill="none"
          />
        </svg>
      </div>
      
      {/* 3. Bottom Right - Ascending Fluid Wave Accent behind phone frame */}
      <div className="absolute -bottom-8 right-0 w-80 h-72 pointer-events-none z-0">
        <svg viewBox="0 0 320 290" fill="none" className="w-full h-full">
          <defs>
            <linearGradient id="bgWaveRight" x1="100%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#c4b5fd" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#e0e7ff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M320,290 L160,290 C130,230 160,170 200,120 C240,70 280,50 320,20 Z"
            fill="url(#bgWaveRight)"
          />
        </svg>
      </div>

      {/* 4. Top Left Card Outline Line-Art */}
      <div className="absolute top-10 left-10 w-24 h-28 rounded-2xl border border-slate-300/60 pointer-events-none p-2.5 hidden lg:flex flex-col justify-between">
        <div className="w-5 h-5 rounded-full border border-slate-300/70" />
        <div className="w-5 h-5 rounded-full border border-slate-300/70 self-end" />
      </div>

      {/* 5. Top Left Dot Grid Matrix (4x3) */}
      <div className="absolute top-10 left-44 grid grid-cols-4 gap-2 opacity-35 pointer-events-none hidden md:grid">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={`dot-tl-${i}`} className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
        ))}
      </div>

      {/* 6. Bottom Left Dot Grid Matrix (4x3) under card */}
      <div className="absolute bottom-20 left-48 grid grid-cols-4 gap-2 opacity-35 pointer-events-none hidden md:grid">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={`dot-bl-${i}`} className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
        ))}
      </div>

      {/* 7. Bottom Right Dot Grid Matrix (4x3) */}
      <div className="absolute bottom-10 right-64 grid grid-cols-4 gap-2 opacity-35 pointer-events-none hidden md:grid">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={`dot-br-${i}`} className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
        ))}
      </div>

      {/* 8. Bottom Right iPhone Silhouette with Dynamic Island */}
      <div className="absolute bottom-8 right-10 w-26 h-48 rounded-[28px] border-2 border-slate-300/60 pointer-events-none p-2.5 hidden lg:flex flex-col justify-between items-center z-10">
        {/* Dynamic Island pill notch */}
        <div className="w-7 h-2 rounded-full bg-slate-300/80" />
        {/* Home bar line */}
        <div className="w-9 h-1 rounded-full bg-slate-300/80" />
      </div>

      {/* ========================================================================= */}
      {/* MAIN LOGIN CARD                                                           */}
      {/* ========================================================================= */}
      <div
        id="login-card"
        className="w-full max-w-[920px] bg-white rounded-[28px] sm:rounded-[32px] shadow-[0_20px_60px_-15px_rgba(79,70,229,0.1),0_8px_25px_-8px_rgba(15,23,42,0.05)] border border-white/90 overflow-hidden grid grid-cols-1 md:grid-cols-2 relative z-10 my-auto"
      >
        
        {/* ======================================================================= */}
        {/* LEFT PANEL: Schematic Orbit & Brand Graphic with Waves                  */}
        {/* ======================================================================= */}
        <div className="hidden md:flex p-8 lg:p-10 flex-col justify-between bg-gradient-to-br from-[#f8faff] via-[#f4f7fe] to-[#edf2fc] border-r border-slate-100 relative overflow-hidden">
          
          {/* Wave 1: Top-Right Fluid Curve inside left panel */}
          <div className="absolute -top-2 -right-2 w-48 h-48 pointer-events-none z-0">
            <svg viewBox="0 0 200 200" fill="none" className="w-full h-full">
              <defs>
                <linearGradient id="cardTopWave" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#818cf8" stopOpacity="0.38" />
                  <stop offset="60%" stopColor="#a5b4fc" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M200,0 L60,0 C85,35 105,70 140,105 C170,135 185,155 200,175 Z"
                fill="url(#cardTopWave)"
              />
            </svg>
          </div>

          {/* Wave 2: Bottom-Left Layered Fluid Curve inside left panel */}
          <div className="absolute -bottom-2 -left-2 w-56 h-56 pointer-events-none z-0">
            <svg viewBox="0 0 240 240" fill="none" className="w-full h-full">
              <defs>
                <linearGradient id="cardBottomWave1" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.4" />
                  <stop offset="60%" stopColor="#a5b4fc" stopOpacity="0.24" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="cardBottomWave2" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#818cf8" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0,240 L0,70 C35,85 75,120 105,160 C125,190 145,210 180,240 Z"
                fill="url(#cardBottomWave1)"
              />
              <path
                d="M0,240 L0,120 C25,130 55,155 80,185 C100,205 115,220 145,240 Z"
                fill="url(#cardBottomWave2)"
              />
              <path
                d="M0,60 C40,80 85,120 120,170 C150,210 170,225 195,240"
                stroke="#818cf8"
                strokeWidth="1.5"
                strokeOpacity="0.3"
                fill="none"
              />
            </svg>
          </div>

          {/* Top Brand Header */}
          <div className="relative z-10 flex items-center gap-3.5">
            {/* Stylized Apple & Tech Gradient Badge */}
            {/* ========================================================================= */}
            {/* [LOGO TOKO DARI FOLDER /public/images/logo.png]                           */}
            {/* Ganti file di /public/images/logo.png untuk mengubah logo aplikasi       */}
            {/* ========================================================================= */}
            <div className="w-12 h-12 rounded-2xl bg-white shadow-md shadow-blue-500/10 border border-slate-100 flex items-center justify-center relative overflow-hidden shrink-0">
              <img
                src="/images/logo.svg"
                alt="Logo iPhone Repair Medan"
                className="w-full h-full object-contain scale-[1.25]"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = '/images/logo.png';
                }}
              />
            </div>
            {/* ========================================================================= */}
            <div>
              <h1 className="text-lg lg:text-xl font-extrabold text-[#0f172a] tracking-wide font-sans">
                IPHONE REPAIR MEDAN
              </h1>
              <p className="text-[10px] lg:text-[11px] font-bold text-slate-600 uppercase tracking-[0.15em] mt-0.5">
                SISTEM PENGELOLAAN INVENTARIS
              </p>
            </div>
          </div>

          {/* Central Orbital Schematic Illustration */}
          <div className="relative w-64 h-64 mx-auto my-auto flex items-center justify-center" aria-hidden="true">
            
            {/* Sparkle star on left */}
            <div className="absolute left-1 top-24 text-indigo-400 pointer-events-none">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 opacity-80" aria-hidden="true">
                <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
              </svg>
            </div>

            {/* Outer Dashed Orbit Circle */}
            <div className="absolute w-56 h-56 rounded-full border border-dashed border-blue-200/80" />
            
            {/* Inner Solid Orbit Circle */}
            <div className="absolute w-44 h-44 rounded-full border border-blue-100" />
            
            {/* Soft Central Blue Aura */}
            <div className="absolute w-28 h-28 rounded-full bg-blue-100/50 blur-md" />

            {/* Central Node: iPhone Device Hub */}
            <div className="relative z-10 w-20 h-20 rounded-full bg-gradient-to-b from-blue-50 to-blue-100/70 border-2 border-white shadow-lg shadow-blue-500/10 flex items-center justify-center">
              <div className="w-10 h-16 rounded-xl border-2 border-slate-800 bg-white/90 p-1 flex flex-col justify-between items-center shadow-xs">
                {/* Speaker slit */}
                <div className="w-3 h-0.5 rounded-full bg-slate-400 mt-0.5" />
                {/* Home indicator */}
                <div className="w-3.5 h-0.5 rounded-full bg-slate-800 mb-0.5" />
              </div>
            </div>

            {/* Satellite Nodes (4 corners along orbit) */}
            
            {/* Top-Left: Wrench (Service & Sparepart) */}
            <div className="absolute top-4 left-6 w-10 h-10 rounded-full bg-white shadow-md shadow-slate-900/5 border border-slate-100 flex items-center justify-center text-slate-700 hover:scale-110 transition-transform duration-200">
              <Wrench className="w-4.5 h-4.5 stroke-[1.75]" />
            </div>

            {/* Top-Right: 3D Box (Inventory Stock) */}
            <div className="absolute top-4 right-6 w-10 h-10 rounded-full bg-white shadow-md shadow-slate-900/5 border border-slate-100 flex items-center justify-center text-slate-700 hover:scale-110 transition-transform duration-200">
              <Package className="w-4.5 h-4.5 stroke-[1.75]" />
            </div>

            {/* Bottom-Left: Verified Check (QC & Audit) */}
            <div className="absolute bottom-4 left-6 w-10 h-10 rounded-full bg-white shadow-md shadow-emerald-500/10 border-2 border-emerald-200/90 flex items-center justify-center text-emerald-600 hover:scale-110 transition-transform duration-200">
              <CheckCircle2 className="w-5 h-5 stroke-[2.25]" />
            </div>

            {/* Bottom-Right: Calendar (Attendance & Shift) */}
            <div className="absolute bottom-4 right-6 w-10 h-10 rounded-full bg-white shadow-md shadow-slate-900/5 border border-slate-100 flex items-center justify-center text-slate-700 hover:scale-110 transition-transform duration-200">
              <Calendar className="w-4.5 h-4.5 stroke-[1.75]" />
            </div>

          </div>

        </div>

        {/* ======================================================================= */}
        {/* RIGHT PANEL: Member Login Form                                          */}
        {/* ======================================================================= */}
        <div className="p-7 sm:p-9 lg:p-10 flex flex-col justify-between bg-white relative z-20">
          
          <div className="w-full max-w-sm mx-auto my-auto space-y-6">
            
            {/* Mobile Branding Header */}
            <div className="md:hidden text-center mb-6 pb-4 border-b border-slate-100">
              <div className="inline-flex items-center justify-center gap-2.5 mb-1.5">
                <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center overflow-hidden">
                  <img
                    src="/images/logo.svg"
                    alt="Logo Toko"
                    className="w-full h-full object-contain scale-[1.25]"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = '/images/logo.png';
                    }}
                  />
                </div>
                <h1 className="text-base sm:text-lg font-extrabold text-[#0f172a] tracking-wide">
                  IPHONE REPAIR MEDAN
                </h1>
              </div>
              <p className="text-[11px] text-slate-600 font-semibold tracking-wider uppercase">
                SISTEM PENGELOLAAN INVENTARIS
              </p>
            </div>

            {/* Title Row with Top Right Indicator Pill */}
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-lg lg:text-xl font-extrabold text-[#0f172a] tracking-wider uppercase">
                  LOGIN PENGGUNA
                </h2>
                {/* Blue-to-purple indicator pill + dot */}
                <div className="flex items-center gap-1.5" aria-hidden="true">
                  <div className="h-1.5 w-8 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600" />
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                </div>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
                Masuk untuk mengelola data inventaris
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold text-center animate-shake" role="alert">
                {errorMsg}
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleFormSubmit} className="space-y-4">
              
              {/* Field 1: Email Akun (Gmail) */}
              <div>
                <label htmlFor="input-login-email" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  ALAMAT EMAIL
                </label>
                <div className="relative rounded-xl border border-slate-300 bg-[#f8fafc] focus-within:bg-white focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 transition-all px-3.5 py-2.5 flex items-center gap-3">
                  <Mail className="w-4.5 h-4.5 text-slate-500 shrink-0 stroke-[1.75]" aria-hidden="true" />
                  <input
                    id="input-login-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@gmail.com"
                    className="w-full bg-transparent border-none outline-none focus:ring-0 text-sm text-slate-900 placeholder-slate-500 font-medium py-0"
                  />
                </div>
              </div>

              {/* Field 2: Kata Sandi */}
              <div>
                <label htmlFor="input-login-password" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  KATA SANDI
                </label>
                <div className="relative rounded-xl border border-slate-300 bg-[#f8fafc] focus-within:bg-white focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 transition-all px-3.5 py-2.5 flex items-center gap-3">
                  <Lock className="w-4.5 h-4.5 text-slate-500 shrink-0 stroke-[1.75]" aria-hidden="true" />
                  <input
                    id="input-login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-transparent border-none outline-none focus:ring-0 text-sm text-slate-900 placeholder-slate-500 font-medium py-0"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-500 hover:text-slate-700 transition-colors p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center -mr-1.5 rounded-lg cursor-pointer"
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4.5 h-4.5 stroke-[1.75]" />
                    ) : (
                      <Eye className="w-4.5 h-4.5 stroke-[1.75]" />
                    )}
                  </button>
                </div>
              </div>

              {/* Options Row: Ingat Saya & Lupa Password with min-h-[48px] tap area */}
              <div className="flex items-center justify-between text-xs min-h-[48px] py-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-800 hover:text-slate-950 font-semibold transition-colors min-h-[44px] py-1">
                  <input
                    id="check-remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    aria-label="Ingat Saya"
                    className="w-4.5 h-4.5 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>Ingat Saya</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="min-h-[44px] py-1 px-1 flex items-center text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline cursor-pointer"
                >
                  Lupa kata sandi?
                </button>
              </div>

              {/* Main Submit CTA: Gradient Button with Wave inside */}
              <button
                id="btn-submit-login"
                type="submit"
                disabled={isLoading}
                aria-label="Login ke Sistem"
                className="relative overflow-hidden w-full mt-2 min-h-[48px] py-3.5 px-5 rounded-xl bg-gradient-to-r from-[#0d3ea8] via-[#1246c2] to-[#1d4ed8] hover:brightness-105 active:scale-[0.99] text-white font-bold text-xs sm:text-sm tracking-wider uppercase shadow-lg shadow-blue-700/25 hover:shadow-blue-700/35 transition-all cursor-pointer flex items-center justify-center gap-2.5"
              >
                {/* Internal fluid wave on the right side */}
                <div className="absolute right-0 top-0 bottom-0 w-44 pointer-events-none" aria-hidden="true">
                  <svg viewBox="0 0 160 50" preserveAspectRatio="none" fill="none" className="w-full h-full">
                    <defs>
                      <linearGradient id="btnWaveGrad" x1="0%" y1="50%" x2="100%" y2="50%">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0" />
                        <stop offset="25%" stopColor="#6d28d9" stopOpacity="0.45" />
                        <stop offset="70%" stopColor="#7c3aed" stopOpacity="0.85" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.95" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M35,0 C65,15 85,25 50,50 L160,50 L160,0 Z"
                      fill="url(#btnWaveGrad)"
                    />
                  </svg>
                </div>
                <span className="relative z-10">{isLoading ? 'MEMPROSES MASUK...' : 'LOGIN KE SISTEM'}</span>
                <ArrowRight className="w-4.5 h-4.5 relative z-10" aria-hidden="true" />
              </button>
            </form>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* FORGOT PASSWORD MODAL (COMPACT, SEQUENTIAL STEPS)                         */}
      {/* ========================================================================= */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm sm:max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-100 relative my-auto animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={handleCloseForgotModal}
              className="absolute top-3.5 right-3.5 text-slate-500 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Tutup jendela pemulihan kata sandi"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header Icon & Title */}
            <div className="text-center mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center mx-auto mb-2 border border-indigo-200 shadow-xs" aria-hidden="true">
                <Lock className="w-5 h-5 stroke-[1.75]" />
              </div>
              <h2 className="text-base font-extrabold text-slate-900">
                {forgotStatus === 'INPUT' && 'Pemulihan Kata Sandi'}
                {forgotStatus === 'VERIFY_OTP' && 'Verifikasi Kode OTP'}
                {forgotStatus === 'NEW_PASSWORD' && 'Buat Kata Sandi Baru'}
              </h2>
              <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto leading-relaxed font-medium">
                {forgotStatus === 'INPUT' && 'Masukkan email akun atau email Gmail yang telah ditautkan.'}
                {forgotStatus === 'VERIFY_OTP' && (
                  <span>
                    Kode 6 digit telah dikirim ke <strong className="text-indigo-700 break-all">{forgotEmail}</strong>
                  </span>
                )}
                {forgotStatus === 'NEW_PASSWORD' && 'Masukkan kata sandi baru (minimal 6 karakter).'}
              </p>
            </div>

            {forgotError && (
              <div className="p-2.5 mb-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold text-center" role="alert">
                {forgotError}
              </div>
            )}

            {/* STEP 1: Input Email */}
            {forgotStatus === 'INPUT' && (
              <form onSubmit={handleRequestForgot} className="space-y-3.5">
                <div>
                  <label htmlFor="input-forgot-email" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Email Akun / Email Gmail
                  </label>
                  <div className="relative rounded-xl border border-slate-300 bg-[#f8fafc] focus-within:bg-white focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-100 transition-all px-3 py-2 flex items-center gap-2.5">
                    <Mail className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
                    <input
                      id="input-forgot-email"
                      type="email"
                      required
                      autoFocus
                      autoComplete="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="contoh: akunanda@gmail.com"
                      className="w-full bg-transparent border-none outline-none focus:ring-0 text-xs text-slate-900 placeholder-slate-500 font-medium py-0"
                    />
                  </div>
                </div>

                <div className="pt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCloseForgotModal}
                    className="w-1/3 min-h-[44px] py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingForgotOtp || !forgotEmail.trim()}
                    className="w-2/3 min-h-[44px] py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center"
                  >
                    {isSendingForgotOtp ? 'Mengirim ke Gmail...' : 'Kirim Kode OTP'}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: Input & Verifikasi Kode OTP DAHULU */}
            {forgotStatus === 'VERIFY_OTP' && (
              <form onSubmit={handleVerifyOtpSubmit} className="space-y-3.5">
                <div>
                  <label htmlFor="input-forgot-otp" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 text-center">
                    Masukkan 6 Digit Kode OTP dari Gmail
                  </label>
                  <div className="rounded-xl border border-slate-300 bg-[#f8fafc] focus-within:bg-white focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-100 transition-all p-2 flex items-center justify-center">
                    <input
                      id="input-forgot-otp"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      pattern="[0-9]*"
                      required
                      autoFocus
                      value={resetOtp}
                      onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="• • • • • •"
                      className="w-full bg-transparent border-none outline-none focus:ring-0 text-center font-mono font-bold tracking-[0.3em] text-lg text-slate-900 placeholder-slate-400 py-0"
                    />
                  </div>
                </div>

                <div className="pt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotStatus('INPUT');
                      setForgotError('');
                    }}
                    className="w-1/3 min-h-[44px] py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center"
                  >
                    Ganti Email
                  </button>
                  <button
                    type="submit"
                    disabled={isValidatingOtp || resetOtp.length !== 6}
                    className="w-2/3 min-h-[44px] py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center"
                  >
                    {isValidatingOtp ? 'Memverifikasi...' : 'Verifikasi OTP'}
                  </button>
                </div>

                <div className="text-center pt-0.5">
                  <button
                    type="button"
                    onClick={handleResendForgotCode}
                    disabled={isSendingForgotOtp || resendCooldown > 0}
                    className="inline-flex items-center justify-center min-h-[44px] py-2 px-3 gap-1.5 text-xs text-indigo-700 hover:text-indigo-900 font-bold cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSendingForgotOtp ? 'animate-spin' : ''}`} aria-hidden="true" />
                    <span>
                      {resendCooldown > 0 ? `Kirim ulang (${resendCooldown}s)` : 'Kirim Ulang Kode OTP ke Gmail'}
                    </span>
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Buat Kata Sandi Baru (HANYA MUNCUL SETELAH OTP VALID) */}
            {forgotStatus === 'NEW_PASSWORD' && (
              <form onSubmit={handleSavePasswordSubmit} className="space-y-3">
                <div>
                  <label htmlFor="input-forgot-new-pwd" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Kata Sandi Baru
                  </label>
                  <div className="relative rounded-xl border border-slate-300 bg-[#f8fafc] focus-within:bg-white focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-100 transition-all px-3 py-2 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
                    <input
                      id="input-forgot-new-pwd"
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      autoFocus
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      className="w-full bg-transparent border-none outline-none focus:ring-0 text-xs text-slate-900 placeholder-slate-500 font-medium py-0"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="text-slate-500 hover:text-slate-700 cursor-pointer p-2 min-w-[36px] min-h-[36px] flex items-center justify-center"
                      aria-label={showNewPassword ? 'Sembunyikan kata sandi baru' : 'Tampilkan kata sandi baru'}
                    >
                      {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="input-forgot-confirm-pwd" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Konfirmasi Kata Sandi Baru
                  </label>
                  <div className="relative rounded-xl border border-slate-300 bg-[#f8fafc] focus-within:bg-white focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-100 transition-all px-3 py-2 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
                    <input
                      id="input-forgot-confirm-pwd"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ulangi kata sandi baru"
                      className="w-full bg-transparent border-none outline-none focus:ring-0 text-xs text-slate-900 placeholder-slate-500 font-medium py-0"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="text-slate-500 hover:text-slate-700 cursor-pointer p-2 min-w-[36px] min-h-[36px] flex items-center justify-center"
                      aria-label={showConfirmPassword ? 'Sembunyikan konfirmasi kata sandi' : 'Tampilkan konfirmasi kata sandi'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="pt-1.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCloseForgotModal}
                    className="w-1/3 min-h-[44px] py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReset || newPassword.length < 6}
                    className="w-2/3 min-h-[44px] py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center"
                  >
                    {isSubmittingReset ? 'Menyimpan...' : 'Simpan Sandi Baru'}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

