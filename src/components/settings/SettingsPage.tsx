import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Mail,
  CheckCircle2,
  KeyRound,
  Building2,
  AlertCircle,
  Lock,
  Eye,
  EyeOff,
  Edit3,
  Unlink,
  Clock,
  X,
  Send,
  RefreshCw,
  Smartphone,
  Check,
  ShieldAlert,
  User,
  Shield,
  Briefcase,
  Camera,
  Upload,
  Trash2,
  Move,
} from 'lucide-react';
import { compressAndConvertToBase64 } from '../../utils/imageUtils';
import { PhotoAdjustModal } from '../common/PhotoAdjustModal';

export const SettingsPage: React.FC = () => {
  const {
    stores,
    activeStore,
    currentUser,
    categories,
    iphoneSeries,
    users,
    inventory,
    transactions,
    returns,
    attendance,
    activityLogs,
    notifications,
    updateUserProfile,
    changePassword,
    unlinkUserEmail,
    sendEmailOtp,
    verifyEmailOtp,
    validateOtpOnly,
    changeVerifiedEmail,
    showToast,
  } = useApp();

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Unlink Email with OTP verification state
  const [isUnlinkModalOpen, setIsUnlinkModalOpen] = useState(false);
  const [unlinkStep, setUnlinkStep] = useState<'CONFIRM_SEND' | 'ENTER_OTP'>('CONFIRM_SEND');
  const [unlinkOtp, setUnlinkOtp] = useState('');
  const [unlinkError, setUnlinkError] = useState('');
  const [isSendingUnlinkOtp, setIsSendingUnlinkOtp] = useState(false);
  const [isVerifyingUnlink, setIsVerifyingUnlink] = useState(false);
  const [unlinkCooldown, setUnlinkCooldown] = useState(0);

  // Edit Profile Form State
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPosition, setEditPosition] = useState('');
  const [editAvatarPreview, setEditAvatarPreview] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = React.useRef<HTMLInputElement>(null);
  const editModalAvatarInputRef = React.useRef<HTMLInputElement>(null);

  // Photo Adjust Modal State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingPhotoSrc, setAdjustingPhotoSrc] = useState('');

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Gagal Mengunggah', 'File yang dipilih harus berupa gambar (JPG, PNG, WebP).', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      if (src) {
        setAdjustingPhotoSrc(src);
        setIsAdjustModalOpen(true);
      }
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = '';
  };

  const handleSaveAdjustedAvatar = (adjustedBase64: string) => {
    setEditAvatarPreview(adjustedBase64);
    updateUserProfile({ avatar: adjustedBase64, foto_profil: adjustedBase64 });
    showToast('Foto Profil Diperbarui', 'Posisi dan tampilan foto profil berhasil disimpan.', 'success');
  };

  const handleRemoveAvatar = () => {
    setEditAvatarPreview('');
    updateUserProfile({ avatar: '', foto_profil: '' });
    showToast('Foto Profil Dihapus', 'Foto profil Anda telah dikembalikan ke inisial nama.', 'info');
  };

  // Password Change Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Real OTP Email Linking State (Flat, Zero Simulation Elements)
  const [isOtpInputOpen, setIsOtpInputOpen] = useState(false);
  const [targetEmail, setTargetEmail] = useState('');
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Verified email change workflow states
  const [isChangingVerifiedEmail, setIsChangingVerifiedEmail] = useState(false);
  const [verifiedEmailStep, setVerifiedEmailStep] = useState<'SEND_OTP' | 'VERIFY_OTP' | 'NEW_EMAIL'>('SEND_OTP');
  const [newEmailToSave, setNewEmailToSave] = useState('');

  // Sync state with current user
  useEffect(() => {
    if (currentUser) {
      setEditName(currentUser.nama || currentUser.name || '');
      setEditPhone((currentUser.nomor_telepon || currentUser.no_hp || '').replace(/\D/g, ''));
      setEditPosition(currentUser.position || currentUser.status_peran_kerja || '');
      setTargetEmail(currentUser.email || '');
    }
  }, [currentUser]);

  // Resend OTP Countdown Timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Unlink OTP Countdown Timer
  useEffect(() => {
    if (unlinkCooldown > 0) {
      const timer = setTimeout(() => setUnlinkCooldown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [unlinkCooldown]);

  // Handle Edit Profile Submission
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      showToast('Gagal', 'Nama lengkap tidak boleh kosong.', 'error');
      return;
    }
    const cleanPhone = editPhone.replace(/\D/g, '');
    if (!cleanPhone) {
      showToast('Gagal', 'Nomor WhatsApp wajib diisi.', 'error');
      return;
    }

    updateUserProfile({
      nama: editName.trim(),
      name: editName.trim(),
      nomor_telepon: cleanPhone,
      position: editPosition.trim(),
      status_peran_kerja: editPosition.trim(),
    });

    setIsEditModalOpen(false);
  };

  // Handle Password Change Submission
  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (!currentPassword) {
      setPasswordError('Masukkan kata sandi saat ini.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Kata sandi baru minimal 6 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }

    setIsChangingPassword(true);
    setTimeout(() => {
      const res = changePassword(currentPassword, newPassword);
      setIsChangingPassword(false);
      if (res.success) {
        setIsPasswordModalOpen(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordError(res.message);
      }
    }, 300);
  };

  // Save Email Address (Separate from OTP verification flow)
  const handleSaveEmailAddress = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = targetEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      showToast('Format Email Salah', 'Masukkan alamat Gmail yang valid.', 'warning');
      return;
    }

    if (cleanEmail === (userEmail || '').trim().toLowerCase()) {
      setIsEditingEmail(false);
      return;
    }

    const res = updateUserProfile({ email: cleanEmail });
    if (res && res.success) {
      setIsEditingEmail(false);
      setIsOtpInputOpen(false);
      setTargetEmail(cleanEmail);
    }
  };

  // Verified email change workflow handlers
  const handleStartChangeVerifiedEmail = () => {
    setIsChangingVerifiedEmail(true);
    setVerifiedEmailStep('SEND_OTP');
    setEnteredOtp('');
    setOtpError('');
    setNewEmailToSave('');
    setIsOtpInputOpen(false);
    setIsEditingEmail(false);
  };

  const handleCancelChangeEmail = () => {
    setIsChangingVerifiedEmail(false);
    setVerifiedEmailStep('SEND_OTP');
    setEnteredOtp('');
    setOtpError('');
    setNewEmailToSave('');
  };

  const handleSendCurrentEmailOtp = async () => {
    if (!userEmail || !userEmail.includes('@')) {
      showToast('Format Email Salah', 'Alamat email saat ini tidak valid.', 'error');
      return;
    }
    setIsSendingOtp(true);
    setOtpError('');
    try {
      const res = await sendEmailOtp(userEmail);
      setIsSendingOtp(false);
      if (res.success) {
        setVerifiedEmailStep('VERIFY_OTP');
        setEnteredOtp('');
        setResendCooldown(60);
      }
    } catch {
      setIsSendingOtp(false);
      showToast('Gagal Mengirim', 'Terjadi kesalahan saat mengirim OTP ke email.', 'error');
    }
  };

  const handleVerifyCurrentEmailOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');
    if (enteredOtp.trim().length !== 6) {
      setOtpError('Masukkan 6 digit kode OTP verifikasi.');
      return;
    }
    setIsVerifyingOtp(true);
    setTimeout(() => {
      const res = validateOtpOnly(userEmail, enteredOtp.trim());
      setIsVerifyingOtp(false);
      if (res.success) {
        setVerifiedEmailStep('NEW_EMAIL');
        setEnteredOtp('');
        setOtpError('');
        showToast('Verifikasi Berhasil', 'Email saat ini terverifikasi. Silakan masukkan alamat email baru Anda.', 'success');
      } else {
        setOtpError(res.message);
      }
    }, 300);
  };

  const handleSaveNewVerifiedEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNewEmail = newEmailToSave.trim().toLowerCase();
    if (!cleanNewEmail || !cleanNewEmail.includes('@') || !cleanNewEmail.includes('.')) {
      showToast('Format Email Salah', 'Masukkan alamat email baru yang valid.', 'warning');
      return;
    }
    if (cleanNewEmail === (userEmail || '').trim().toLowerCase()) {
      showToast('Email Sama', 'Alamat email baru tidak boleh sama dengan email saat ini.', 'warning');
      return;
    }
    const res = changeVerifiedEmail(cleanNewEmail);
    if (res.success) {
      setIsChangingVerifiedEmail(false);
      setVerifiedEmailStep('SEND_OTP');
      setNewEmailToSave('');
    }
  };

  // Send Real OTP to Gmail via Resend
  const handleSendOtp = async (emailInput?: string) => {
    const emailToSend = (emailInput || targetEmail || currentUser?.email || '').trim();
    if (!emailToSend || !emailToSend.includes('@') || !emailToSend.includes('.')) {
      showToast('Format Email Salah', 'Masukkan alamat Gmail yang valid.', 'warning');
      return;
    }

    setIsSendingOtp(true);
    setOtpError('');

    try {
      const res = await sendEmailOtp(emailToSend);
      setIsSendingOtp(false);
      if (res.success) {
        setTargetEmail(emailToSend);
        setIsOtpInputOpen(true);
        setIsEditingEmail(false);
        setEnteredOtp('');
        setResendCooldown(60);
      }
    } catch (err) {
      setIsSendingOtp(false);
      showToast('Gagal Mengirim', 'Terjadi kesalahan saat mengirim OTP ke email.', 'error');
    }
  };

  // Verify OTP Code
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');

    if (enteredOtp.trim().length !== 6) {
      setOtpError('Masukkan 6 digit kode OTP verifikasi.');
      return;
    }

    setIsVerifyingOtp(true);
    setTimeout(() => {
      const res = verifyEmailOtp(targetEmail, enteredOtp.trim());
      setIsVerifyingOtp(false);
      if (res.success) {
        setIsOtpInputOpen(false);
        setEnteredOtp('');
      } else {
        setOtpError(res.message);
      }
    }, 300);
  };

  // Unlink Email Verification with OTP Handlers
  const handleOpenUnlinkModal = () => {
    setIsUnlinkModalOpen(true);
    setUnlinkStep('CONFIRM_SEND');
    setUnlinkOtp('');
    setUnlinkError('');
    setIsSendingUnlinkOtp(false);
    setIsVerifyingUnlink(false);
  };

  const handleCloseUnlinkModal = () => {
    setIsUnlinkModalOpen(false);
    setUnlinkStep('CONFIRM_SEND');
    setUnlinkOtp('');
    setUnlinkError('');
    setIsSendingUnlinkOtp(false);
    setIsVerifyingUnlink(false);
  };

  const handleSendUnlinkOtp = async () => {
    if (!userEmail || !userEmail.includes('@')) {
      showToast('Format Email Salah', 'Alamat email tidak valid.', 'error');
      return;
    }

    setIsSendingUnlinkOtp(true);
    setUnlinkError('');
    try {
      const res = await sendEmailOtp(userEmail, 'unlink');
      setIsSendingUnlinkOtp(false);
      if (res.success) {
        setUnlinkStep('ENTER_OTP');
        setUnlinkOtp('');
        setUnlinkCooldown(60);
      } else {
        setUnlinkError(res.message);
      }
    } catch {
      setIsSendingUnlinkOtp(false);
      setUnlinkError('Terjadi kesalahan saat mengirim kode OTP verifikasi.');
    }
  };

  const handleConfirmUnlinkWithOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setUnlinkError('');

    const cleanOtp = unlinkOtp.trim();
    if (cleanOtp.length !== 6) {
      setUnlinkError('Masukkan 6 digit kode OTP verifikasi.');
      return;
    }

    setIsVerifyingUnlink(true);
    setTimeout(() => {
      const res = unlinkUserEmail(cleanOtp);
      setIsVerifyingUnlink(false);
      if (res.success) {
        setIsUnlinkModalOpen(false);
        setUnlinkStep('CONFIRM_SEND');
        setUnlinkOtp('');
      } else {
        setUnlinkError(res.message);
      }
    }, 300);
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const clean = name.trim();
    const parts = clean.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return clean.substring(0, 2).toUpperCase();
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'Admin Sistem';
      case 'ADMIN_TOKO':
        return 'Admin Toko';
      case 'KARYAWAN':
        return 'Karyawan';
      default:
        return 'Staf Toko';
    }
  };

  const formattedPhone = currentUser?.nomor_telepon
    ? currentUser.nomor_telepon.replace(/(\d{4})(\d{4})(\d+)/, '$1-$2-$3')
    : '-';

  const assignedStore = stores.find((s) => s.id === currentUser?.store_id);
  const assignedStoreName = currentUser?.role === 'SUPER_ADMIN'
    ? 'Semua Cabang (Pusat)'
    : (assignedStore ? `${assignedStore.nama_toko} (${assignedStore.cabang})` : 'Cabang Utama');

  const isEmailVerified = currentUser?.is_email_verified;
  const userEmail = currentUser?.email || '-';

  return (
    <div className="max-w-5xl mx-auto py-4 pb-20 font-sans">
      
      {/* ========================================================================= */}
      {/* SINGLE UNIFIED WHITE CARD (SESUAI GAMBAR REFERENSI DESAIN)               */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_4px_25px_-4px_rgba(0,0,0,0.05)] overflow-hidden">
        
        {/* BAGIAN ATAS: AVATAR BESAR, NAMA & ROLE DENGAN ELEMEN DESAIN DEKORATIF */}
        <div className="p-5 sm:p-9 relative bg-gradient-to-r from-white via-indigo-50/20 to-blue-50/40 overflow-hidden">
          
          {/* ===================================================================== */}
          {/* BACKGROUND DESIGN ELEMENTS (FLUID WAVES, ARCS, DOT MATRIX, LINE-ART)  */}
          {/* ===================================================================== */}
          
          {/* 1. Diagonal Fluid Organic Waves & Contour Arc Line */}
          <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
            <svg viewBox="0 0 900 200" fill="none" preserveAspectRatio="none" className="w-full h-full">
              <defs>
                <linearGradient id="settWave1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#818cf8" stopOpacity="0.18" />
                  <stop offset="50%" stopColor="#93c5fd" stopOpacity="0.14" />
                  <stop offset="100%" stopColor="#c7d2fe" stopOpacity="0.05" />
                </linearGradient>
                <linearGradient id="settWave2" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.22" />
                  <stop offset="60%" stopColor="#c4b5fd" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#e0e7ff" stopOpacity="0" />
                </linearGradient>
              </defs>
              
              {/* Layer 1: Sweeping diagonal fluid band */}
              <path
                d="M350,0 C480,45 620,30 750,90 C830,125 870,165 920,200 L920,0 Z"
                fill="url(#settWave1)"
              />
              
              {/* Layer 2: Soft inner curve accent */}
              <path
                d="M480,0 C570,35 680,20 780,75 C850,115 890,150 920,180 L920,0 Z"
                fill="url(#settWave2)"
              />
              
              {/* Sweeping Thin Contour Arc Line */}
              <path
                d="M320,0 C450,55 590,40 730,100 C810,135 860,175 920,200"
                stroke="#818cf8"
                strokeWidth="1.2"
                strokeOpacity="0.25"
                fill="none"
              />
            </svg>
          </div>

          {/* 2. Floating Document / Card Line-Art Graphic (Sesuai Referensi Gambar) */}
          <div className="absolute right-8 sm:right-14 top-1/2 -translate-y-1/2 pointer-events-none opacity-45 hidden md:block z-0">
            <div className="relative">
              {/* Layer Belakang (Tilted Card) */}
              <div className="absolute -left-3.5 -top-2.5 w-24 h-28 rounded-2xl border-2 border-indigo-200/70 bg-white/30 -rotate-6 shadow-2xs" />
              {/* Layer Depan (Card dengan Icon Lingkaran & Baris Dokumen) */}
              <div className="w-24 h-28 rounded-2xl border-2 border-indigo-300/80 bg-white/60 backdrop-blur-2xs p-3.5 rotate-3 shadow-xs flex flex-col justify-between">
                <div className="w-6 h-6 rounded-full border-2 border-indigo-300 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-indigo-400" />
                </div>
                <div className="space-y-1.5 pb-0.5">
                  <div className="w-13 h-1.5 rounded-full bg-indigo-200" />
                  <div className="w-8 h-1.5 rounded-full bg-indigo-150" />
                </div>
              </div>
            </div>
          </div>

          {/* 3. Dot Matrix Grid Pattern (4x2 dots) */}
          <div className="absolute top-5 right-52 sm:right-64 grid grid-cols-4 gap-2 opacity-25 pointer-events-none hidden lg:grid z-0">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={`sett-dot-${i}`} className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            ))}
          </div>

          {/* Profile Content */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6 relative z-10">
            {/* Avatar Bulat dengan Foto atau Inisial */}
            <div className="relative group shrink-0 self-start sm:self-auto">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#7584FF] text-white flex items-center justify-center font-bold text-2xl sm:text-3xl shrink-0 shadow-md ring-4 ring-white/90 overflow-hidden border border-slate-200">
                {currentUser?.avatar || currentUser?.foto_profil ? (
                  <img
                    src={currentUser.avatar || currentUser.foto_profil}
                    alt={currentUser.nama || currentUser.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  getInitials(currentUser?.nama || currentUser?.name)
                )}
              </div>

              {/* Quick Camera Overlay Badge */}
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute bottom-0 right-0 p-2 rounded-full bg-slate-900 hover:bg-indigo-600 text-white shadow-md border-2 border-white transition-all cursor-pointer hover:scale-105"
                title="Unggah / Ganti Foto Profil"
                aria-label="Unggah / Ganti Foto Profil"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>
            
            {/* Nama, Role & Action Buttons */}
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
                    {currentUser?.nama || currentUser?.name || 'Dimas Prasetyo'}
                  </h1>
                  <div className="flex items-center gap-2 flex-wrap text-sm mt-1">
                    {(currentUser?.position || currentUser?.status_peran_kerja) && (
                      <span className="font-semibold text-indigo-600">
                        {currentUser.position || currentUser.status_peran_kerja}
                      </span>
                    )}
                    {(currentUser?.position || currentUser?.status_peran_kerja) && (
                      <span className="text-slate-300">•</span>
                    )}
                    <span className="font-normal text-slate-500">
                      {getRoleLabel(currentUser?.role)}
                    </span>
                  </div>
                </div>

                {/* Upload & Remove Photo Action Buttons */}
                <div className="flex items-center gap-2 mt-2 sm:mt-0 flex-wrap">
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={isUploadingAvatar}
                    onClick={() => avatarInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200/90 shadow-2xs hover:border-indigo-300 transition-all cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-indigo-600" />
                    <span>
                      {isUploadingAvatar
                        ? 'Memproses...'
                        : currentUser?.avatar || currentUser?.foto_profil
                        ? 'Ganti Foto'
                        : 'Unggah Foto'}
                    </span>
                  </button>
                  {(currentUser?.avatar || currentUser?.foto_profil) && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200/90 bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 text-xs font-medium shadow-2xs transition-colors cursor-pointer"
                      title="Hapus Foto Profil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Hapus</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* GARIS PEMBATAS HALUS SESUAI GAMBAR */}
        <div className="border-t border-slate-100" />

        {/* BAGIAN BAWAH: INFORMASI AKUN & GRID 2 KOLOM */}
        <div className="p-4 sm:p-8 space-y-7">
          
          {/* Header Bar: Ikon User + Judul 'Informasi Akun' + Tombol 'Edit Profil' */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100/70">
            <div className="flex items-center gap-2.5">
              <div className="text-blue-500">
                <User className="w-5 h-5 stroke-[2.2]" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">
                Informasi Akun
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-blue-200/90 text-blue-600 hover:bg-blue-50/50 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Profil</span>
            </button>
          </div>

          {/* Grid Informasi Akun (2 Kolom Bersih Sesuai Gambar) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-7">
            
            {/* KOLOM KIRI - BARIS 1: EMAIL */}
            <div className="space-y-2">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl bg-[#EBF3FF] flex items-center justify-center text-[#2563EB] shrink-0 mt-0.5">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-slate-400 font-normal">Email</span>
                    {isEmailVerified ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Terverifikasi
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-600 border border-amber-100">
                        <AlertCircle className="w-3 h-3 text-amber-600" />
                        Belum Terverifikasi
                      </span>
                    )}
                  </div>

                  {!isEditingEmail && !isChangingVerifiedEmail && (
                    <p className="text-sm text-slate-700 font-normal mt-0.5 break-all">
                      {userEmail}
                    </p>
                  )}

                  {/* Tombol Aksi Email Sesuai Permintaan:
                      - Jika Belum Terverifikasi: ada 'Ubah' dan 'Kirim Kode OTP'
                      - Jika Terverifikasi: ada 'Ganti Email' dan 'Putus Tautan'
                  */}
                  {!isOtpInputOpen && !isEditingEmail && !isChangingVerifiedEmail && (
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {isEmailVerified ? (
                        <>
                          <button
                            type="button"
                            onClick={handleStartChangeVerifiedEmail}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                          >
                            Ganti Email
                          </button>
                          <span className="text-slate-300">•</span>
                          <button
                            type="button"
                            onClick={handleOpenUnlinkModal}
                            className="text-xs font-semibold text-rose-500 hover:text-rose-600 cursor-pointer"
                          >
                            Putus Tautan
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditingEmail(true);
                              setTargetEmail(userEmail);
                            }}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                          >
                            Ubah
                          </button>
                          <span className="text-slate-300">•</span>
                          <button
                            type="button"
                            disabled={isSendingOtp}
                            onClick={() => handleSendOtp(userEmail)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer disabled:opacity-50"
                          >
                            <Send className="w-3 h-3" />
                            <span>{isSendingOtp ? 'Mengirim...' : 'Kirim Kode OTP'}</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Workflow Ganti Email Yang Sudah Terverifikasi: OTP Wajib Dikirim ke Email Saat Ini */}
              {isChangingVerifiedEmail && isEmailVerified && (
                <div className="mt-3 p-3.5 sm:p-4 bg-slate-50/95 rounded-2xl border border-slate-200/90 sm:ml-15 max-w-md space-y-3 shadow-2xs">
                  {verifiedEmailStep === 'SEND_OTP' && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-indigo-600" />
                          Verifikasi Keamanan Ganti Email
                        </span>
                        <button
                          type="button"
                          onClick={handleCancelChangeEmail}
                          className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer p-1"
                        >
                          ✕
                        </button>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Untuk mengubah email akun, kirim kode OTP ke email saat ini: <strong className="font-mono text-indigo-700 break-all">{userEmail}</strong>
                      </p>
                      <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                        <button
                          type="button"
                          disabled={isSendingOtp}
                          onClick={handleSendCurrentEmailOtp}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{isSendingOtp ? 'Mengirim...' : 'Kirim Kode OTP'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelChangeEmail}
                          className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-100 cursor-pointer"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  )}

                  {verifiedEmailStep === 'VERIFY_OTP' && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">
                          Masukkan Kode OTP
                        </span>
                        <button
                          type="button"
                          onClick={handleCancelChangeEmail}
                          className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer p-1"
                        >
                          ✕
                        </button>
                      </div>
                      <p className="text-xs text-slate-600">
                        Kode 6 digit telah dikirim ke <strong className="font-mono text-indigo-700 break-all">{userEmail}</strong>. Periksa inbox atau spam Gmail Anda.
                      </p>
                      {otpError && (
                        <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-600 font-medium">
                          {otpError}
                        </div>
                      )}
                      <form onSubmit={handleVerifyCurrentEmailOtp} className="space-y-2.5">
                        <div className="w-full flex items-center gap-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            pattern="[0-9]*"
                            autoFocus
                            value={enteredOtp}
                            onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="6 Digit OTP"
                            className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-300 bg-white text-center text-sm font-mono font-bold tracking-[0.2em] sm:tracking-[0.25em] text-slate-900 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 focus:outline-none shadow-2xs"
                          />
                          <button
                            type="submit"
                            disabled={isVerifyingOtp || enteredOtp.length !== 6}
                            className="shrink-0 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50 whitespace-nowrap"
                          >
                            {isVerifyingOtp ? 'Memverifikasi...' : 'Verifikasi OTP'}
                          </button>
                        </div>
                        <div className="flex items-center gap-2 pt-0.5 flex-wrap text-xs">
                          <button
                            type="button"
                            disabled={resendCooldown > 0 || isSendingOtp}
                            onClick={handleSendCurrentEmailOtp}
                            className="text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer disabled:opacity-50"
                          >
                            {resendCooldown > 0 ? `Kirim Ulang (${resendCooldown}s)` : 'Kirim Ulang OTP'}
                          </button>
                          <span className="text-slate-300">•</span>
                          <button
                            type="button"
                            onClick={handleCancelChangeEmail}
                            className="text-slate-500 hover:text-slate-700 cursor-pointer"
                          >
                            Batal
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {verifiedEmailStep === 'NEW_EMAIL' && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Verifikasi Berhasil • Masukkan Email Baru
                        </span>
                        <button
                          type="button"
                          onClick={handleCancelChangeEmail}
                          className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer p-1"
                        >
                          ✕
                        </button>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Identitas terverifikasi. Masukkan alamat email Gmail baru untuk akun Anda:
                      </p>
                      <form onSubmit={handleSaveNewVerifiedEmail} className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="email"
                          required
                          autoFocus
                          value={newEmailToSave}
                          onChange={(e) => setNewEmailToSave(e.target.value)}
                          placeholder="contoh: akunbaru@gmail.com"
                          className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-mono text-slate-900 focus:border-indigo-600 focus:outline-none shadow-2xs"
                        />
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={handleCancelChangeEmail}
                            className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-100 cursor-pointer"
                          >
                            Batal
                          </button>
                          <button
                            type="submit"
                            disabled={!newEmailToSave.trim() || newEmailToSave.trim().toLowerCase() === (userEmail || '').trim().toLowerCase()}
                            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50 whitespace-nowrap"
                          >
                            Simpan Email Baru
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              )}

              {/* Inline Edit Email Address (Ketika Email Belum Terverifikasi) */}
              {isEditingEmail && !isEmailVerified && !isOtpInputOpen && (
                <div className="mt-3 p-3.5 sm:p-4 bg-slate-50/95 rounded-2xl border border-slate-200/90 sm:ml-15 max-w-md space-y-2 shadow-2xs">
                  <form onSubmit={handleSaveEmailAddress} className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="email"
                      required
                      autoFocus
                      value={targetEmail}
                      onChange={(e) => setTargetEmail(e.target.value)}
                      placeholder="contoh: akunanda@gmail.com"
                      className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-mono text-slate-900 focus:border-indigo-600 focus:outline-none shadow-2xs"
                    />
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingEmail(false);
                          setTargetEmail(userEmail);
                        }}
                        className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-100 cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs whitespace-nowrap"
                      >
                        Simpan Email
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Form Verifikasi OTP Riil Untuk Email Belum Terverifikasi */}
              {isOtpInputOpen && !isEmailVerified && (
                <div className="mt-3 p-3.5 sm:p-4 bg-slate-50/95 rounded-2xl border border-slate-200/90 sm:ml-15 max-w-md space-y-3 shadow-2xs">
                  <div className="flex items-start justify-between gap-2 text-xs text-slate-700">
                    <span className="leading-relaxed">
                      Kode OTP telah dikirim ke: <strong className="font-mono text-indigo-700 font-semibold break-all">{targetEmail}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsOtpInputOpen(false)}
                      className="text-slate-400 hover:text-slate-600 p-1 -mr-1 -mt-1 cursor-pointer text-xs shrink-0"
                      title="Tutup"
                    >
                      ✕
                    </button>
                  </div>

                  {otpError && (
                    <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-600 font-medium">
                      {otpError}
                    </div>
                  )}

                  <form onSubmit={handleVerifyOtp} className="w-full flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      pattern="[0-9]*"
                      value={enteredOtp}
                      onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="6 Digit OTP"
                      autoFocus
                      className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-300 bg-white text-center font-mono font-bold tracking-[0.2em] sm:tracking-[0.25em] text-sm text-slate-900 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 focus:outline-none shadow-2xs"
                    />
                    <button
                      type="submit"
                      disabled={isVerifyingOtp || enteredOtp.length !== 6}
                      className="shrink-0 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50 whitespace-nowrap"
                    >
                      {isVerifyingOtp ? 'Memproses...' : 'Verifikasi'}
                    </button>
                  </form>

                  <div className="flex items-center justify-between gap-2 flex-wrap text-xs text-slate-500 pt-0.5">
                    <button
                      type="button"
                      onClick={() => handleSendOtp(targetEmail)}
                      disabled={isSendingOtp || resendCooldown > 0}
                      className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${isSendingOtp ? 'animate-spin' : ''}`} />
                      <span>{resendCooldown > 0 ? `Kirim Ulang (${resendCooldown}s)` : 'Kirim Ulang OTP'}</span>
                    </button>
                    <span className="text-[11px] text-slate-400">
                      Cek inbox / spam Gmail
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* KOLOM KANAN - BARIS 1: KATA SANDI */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-[#EFF2FE] flex items-center justify-center text-[#4F46E5] shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-normal block">
                    Kata Sandi
                  </span>
                  <p className="text-sm text-slate-600 font-mono tracking-widest mt-0.5">
                    ••••••••
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(true)}
                className="text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
              >
                Ubah
              </button>
            </div>

            {/* KOLOM KIRI - BARIS 2: NOMOR WHATSAPP */}
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-[#E8FAF0] flex items-center justify-center text-[#10B981] shrink-0">
                {/* SVG Ikon WhatsApp Resmi Sesuai Gambar */}
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                </svg>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-normal block">
                  Nomor WhatsApp
                </span>
                <p className="text-sm text-slate-700 font-normal mt-0.5">
                  {formattedPhone}
                </p>
              </div>
            </div>

            {/* KOLOM KANAN - BARIS 2: STATUS PERAN KERJA */}
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-[#EEF2FF] flex items-center justify-center text-indigo-600 shrink-0">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-normal block">
                  Status Peran Kerja / Jabatan
                </span>
                <p className="text-sm text-slate-800 font-semibold mt-0.5">
                  {currentUser?.position || currentUser?.status_peran_kerja || (currentUser?.role === 'ADMIN_TOKO' ? 'Kepala Toko' : currentUser?.role === 'SUPER_ADMIN' ? 'Admin Sistem' : 'Staf / Teknisi')}
                </p>
              </div>
            </div>

            {/* KOLOM KIRI - BARIS 3: ROLE */}
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-[#F5EDFD] flex items-center justify-center text-[#8B5CF6] shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-normal block">
                  Role
                </span>
                <p className="text-sm text-slate-700 font-normal mt-0.5">
                  {getRoleLabel(currentUser?.role)}
                </p>
              </div>
            </div>

            {/* KOLOM KANAN - BARIS 3: CABANG PENEMPATAN TOKO */}
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-[#F0FDF4] flex items-center justify-center text-emerald-600 shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-normal block">
                  Penempatan Cabang
                </span>
                <p className="text-sm text-slate-700 font-normal mt-0.5">
                  {assignedStoreName}
                </p>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODAL: EDIT PROFIL (NAMA & WHATSAPP & JABATAN)                             */}
      {/* ========================================================================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 relative text-slate-900 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Edit Profil</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="w-14 h-14 rounded-full bg-[#7584FF] text-white flex items-center justify-center font-bold text-lg shrink-0 overflow-hidden border border-slate-200">
                  {currentUser?.avatar || currentUser?.foto_profil ? (
                    <img
                      src={currentUser.avatar || currentUser.foto_profil}
                      alt={currentUser.nama || currentUser.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    getInitials(currentUser?.nama || currentUser?.name)
                  )}
                </div>
                <div className="space-y-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800">Foto Profil Akun</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => editModalAvatarInputRef.current?.click()}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs hover:bg-slate-50 cursor-pointer"
                    >
                      {currentUser?.avatar || currentUser?.foto_profil ? 'Ganti Foto' : 'Unggah Foto'}
                    </button>
                    {(currentUser?.avatar || currentUser?.foto_profil) && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-2xs hover:bg-rose-50 cursor-pointer"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                  <input
                    ref={editModalAvatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Status Peran Kerja / Jabatan
                </label>
                <input
                  type="text"
                  value={editPosition}
                  onChange={(e) => setEditPosition(e.target.value)}
                  placeholder="Contoh: Teknisi, Staff Frontdesk & Service"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nomor WhatsApp
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="081234567890"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-mono text-slate-900 focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: GANTI KATA SANDI                                                   */}
      {/* ========================================================================= */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 relative text-slate-900 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Ganti Kata Sandi</h3>
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {passwordError && (
              <div className="p-2.5 mb-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {passwordError}
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Sandi Saat Ini
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3.5 py-2 pr-9 rounded-lg border border-slate-300 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Sandi Baru (Min 6 Karakter)
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2 pr-9 rounded-lg border border-slate-300 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Konfirmasi Sandi Baru
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2 pr-9 rounded-lg border border-slate-300 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isChangingPassword ? 'Menyimpan...' : 'Ganti Sandi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VERIFIKASI KEAMANAN PUTUS TAUTAN DENGAN OTP                        */}
      {/* ========================================================================= */}
      {isUnlinkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 relative text-slate-900 animate-in zoom-in-95 duration-150 space-y-4">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200 shrink-0">
                  <ShieldAlert className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Verifikasi Putus Tautan Email
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Perlindungan keamanan akun & verifikasi pemilik
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseUnlinkModal}
                className="text-slate-400 hover:text-slate-600 p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step 1: Confirmation Notice & Send OTP */}
            {unlinkStep === 'CONFIRM_SEND' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-rose-800 leading-relaxed">
                      <p className="font-bold mb-0.5">Konfirmasi Keamanan Diperlukan</p>
                      <p className="text-[11px] text-rose-700">
                        Untuk mencegah pihak tidak bertanggung jawab memutuskan atau memindahkan tautan email akun tanpa izin, sistem wajib memverifikasi kode OTP ke email Anda sebelum tautan dilepas.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">
                    Alamat Email Terverifikasi:
                  </span>
                  <p className="text-sm font-bold text-slate-900 font-mono mt-0.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-indigo-600" />
                    {userEmail}
                  </p>
                </div>

                {unlinkError && (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                    {unlinkError}
                  </div>
                )}

                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleCloseUnlinkModal}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer text-center"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={isSendingUnlinkOtp}
                    onClick={handleSendUnlinkOtp}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSendingUnlinkOtp ? 'Mengirim OTP...' : 'Kirim Kode OTP Verifikasi'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Enter 6-Digit OTP Code */}
            {unlinkStep === 'ENTER_OTP' && (
              <form onSubmit={handleConfirmUnlinkWithOtp} className="space-y-4">
                <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-200">
                  <p className="text-xs text-indigo-900 leading-relaxed">
                    Kode verifikasi 6 digit telah dikirim ke: <strong className="font-mono text-indigo-700">{userEmail}</strong>. Periksa kotak masuk atau spam Gmail Anda.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Masukkan 6 Digit Kode OTP
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    pattern="[0-9]*"
                    autoFocus
                    value={unlinkOtp}
                    onChange={(e) => setUnlinkOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Contoh: 123456"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-center font-mono font-bold tracking-widest text-base text-slate-900 focus:border-rose-600 focus:outline-none"
                  />
                </div>

                {unlinkError && (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                    {unlinkError}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <button
                    type="button"
                    disabled={isSendingUnlinkOtp || unlinkCooldown > 0}
                    onClick={handleSendUnlinkOtp}
                    className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSendingUnlinkOtp ? 'animate-spin' : ''}`} />
                    <span>{unlinkCooldown > 0 ? `Kirim Ulang (${unlinkCooldown}s)` : 'Kirim Ulang OTP'}</span>
                  </button>
                  <span className="text-[11px] text-slate-400">
                    Berlaku 5 menit
                  </span>
                </div>

                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleCloseUnlinkModal}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer text-center"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isVerifyingUnlink || unlinkOtp.trim().length !== 6}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    <span>{isVerifyingUnlink ? 'Memproses...' : 'Verifikasi & Putus Tautan'}</span>
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* Modal Pengaturan Posisi & Tampilan Foto Profil */}
      <PhotoAdjustModal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        imageSrc={adjustingPhotoSrc}
        cropShape="circle"
        title="Atur Posisi & Tampilan Foto Profil"
        onSave={handleSaveAdjustedAvatar}
      />

    </div>
  );
};
