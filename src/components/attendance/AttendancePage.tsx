import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { AttendanceStatus, User } from '../../types';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  LogIn,
  LogOut,
  Calendar,
  Filter,
  Search,
  RotateCcw,
  Building2,
  Trash2,
  Settings,
  Lock,
  X,
  PlusCircle,
  FileSpreadsheet,
  Users,
  Check,
  UserCheck,
  ChevronDown
} from 'lucide-react';
import { ConfirmationModal } from '../common/ConfirmationModal';
import {
  formatDateYMD,
  evaluateShiftCheckIn,
  evaluateShiftCheckOut,
} from '../../utils/dateUtils';

export const AttendancePage: React.FC = () => {
  const {
    activeStoreId,
    attendance,
    users,
    currentUser,
    stores,
    recordCheckIn,
    recordCheckOut,
    updateUserSchedule,
    resetTodayAttendance,
    deleteAttendanceRecord,
    recordManualAttendance,
  } = useApp();

  const isKaryawan = currentUser?.role === 'KARYAWAN';
  const isAdminToko = currentUser?.role === 'ADMIN_TOKO';
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  // Navigation tab states
  // Super Admin defaults to 'recap' or 'monitoring', Admin/Karyawan defaults to 'personal'
  const [activeTab, setActiveTab] = useState<'personal' | 'monitoring' | 'recap' | 'schedule_settings'>(
    isSuperAdmin ? 'recap' : 'personal'
  );

  const [selectedMonth, setSelectedMonth] = useState(() => formatDateYMD(new Date()).substring(0, 7));
  const [historySearch, setHistorySearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>(
    activeStoreId || (isSuperAdmin ? 'ALL' : currentUser?.store_id || 'ALL')
  );

  useEffect(() => {
    if (activeStoreId) {
      setSelectedStoreFilter(activeStoreId);
    } else if (isSuperAdmin) {
      setSelectedStoreFilter('ALL');
    }
  }, [activeStoreId, isSuperAdmin]);

  // User Shift Schedule Modal
  const [isUserScheduleModalOpen, setIsUserScheduleModalOpen] = useState(false);
  const [selectedUserForSchedule, setSelectedUserForSchedule] = useState<User | null>(null);
  const [userJamMasuk, setUserJamMasuk] = useState('08:30');
  const [userJamPulang, setUserJamPulang] = useState('17:00');
  const [userToleransi, setUserToleransi] = useState(0);

  // Manual Attendance Modal State (Only for Izin, Sakit, Alpa)
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualDate, setManualDate] = useState(() => formatDateYMD(new Date()));
  const [manualStatus, setManualStatus] = useState<AttendanceStatus>('IZIN');
  const [manualKeterangan, setManualKeterangan] = useState('');
  const [manualTargetUserId, setManualTargetUserId] = useState(currentUser?.id || '');

  // Confirm delete modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Digital Live Clock
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedLiveTime = currentTime.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const formattedLiveDate = currentTime.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const todayStr = getTodayStr();

  // Current Logged-in User Info & Schedule
  const myStoreId = currentUser?.store_id || (isSuperAdmin ? (activeStoreId || '') : '');
  const myStore = stores.find((s) => s.id === myStoreId) || null;
  const myJamMasuk = currentUser?.jam_masuk_standar || myStore?.jam_masuk_standar || '08:30';
  const myJamPulang = currentUser?.jam_pulang_standar || myStore?.jam_pulang_standar || '17:00';
  const myTolerance = currentUser?.toleransi_keterlambatan_menit ?? myStore?.toleransi_keterlambatan_menit ?? 0;

  // Real-time evaluation of shift schedule (handles both normal & overnight/cross-midnight shifts)
  const currentClockTimeStr = `${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')} WIB`;
  const liveShiftCheckInEval = useMemo(() => {
    return evaluateShiftCheckIn(myJamMasuk, myJamPulang, myTolerance, currentClockTimeStr);
  }, [myJamMasuk, myJamPulang, myTolerance, currentClockTimeStr]);

  const liveShiftCheckOutEval = useMemo(() => {
    return evaluateShiftCheckOut(myJamMasuk, myJamPulang, currentClockTimeStr);
  }, [myJamMasuk, myJamPulang, currentClockTimeStr]);

  const isCurrentTimeLate = liveShiftCheckInEval.isLate;
  const isBeforeClosingTime = liveShiftCheckOutEval.isBeforeClosing;

  // Dynamic Month Options for Filter Dropdowns
  const monthOptions = useMemo(() => {
    const list: Array<{ value: string; label: string }> = [];
    const now = new Date();
    // Include 1 month ahead, current month, and past 6 months
    for (let i = -1; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      list.push({ value: val, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    // Also include months present in existing attendance
    attendance.forEach((a) => {
      if (a.tanggal) {
        const ym = a.tanggal.substring(0, 7);
        if (ym.length === 7 && !list.some((o) => o.value === ym)) {
          const parts = ym.split('-');
          const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
          const label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
          list.push({ value: ym, label: label.charAt(0).toUpperCase() + label.slice(1) });
        }
      }
    });
    list.sort((a, b) => b.value.localeCompare(a.value));
    return list;
  }, [attendance]);

  // Current Logged-in User's Today Attendance Record
  const myTodayAttendance = useMemo(() => {
    if (!currentUser) return undefined;
    return attendance.find(
      (a) => a.user_id === currentUser.id && a.tanggal === todayStr
    );
  }, [attendance, currentUser, todayStr]);

  const myCheckOut = myTodayAttendance?.jam_pulang || myTodayAttendance?.jam_keluar;

  // Personal Attendance Records
  const myAttendanceList = useMemo(() => {
    if (!currentUser) return [];
    return attendance
      .filter((a) => a.user_id === currentUser.id)
      .filter((a) => {
        if (selectedMonth === 'ALL') return true;
        return a.tanggal.startsWith(selectedMonth);
      })
      .filter((a) => {
        if (statusFilter === 'ALL') return true;
        return a.status === statusFilter;
      })
      .filter((a) => {
        if (!historySearch.trim()) return true;
        const q = historySearch.toLowerCase();
        return (
          a.tanggal.toLowerCase().includes(q) ||
          (a.catatan && a.catatan.toLowerCase().includes(q)) ||
          (a.keterangan && a.keterangan.toLowerCase().includes(q)) ||
          a.status.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  }, [attendance, currentUser, selectedMonth, statusFilter, historySearch]);

  // Personal Summary Stats
  const personalStats = useMemo(() => {
    if (!currentUser) {
      return { total: 0, hadir: 0, terlambat: 0, izin: 0, sakit: 0, alpa: 0, rate: 0 };
    }
    const myMonthRecords = attendance
      .filter((a) => a.user_id === currentUser.id)
      .filter((a) => (selectedMonth === 'ALL' ? true : a.tanggal.startsWith(selectedMonth)));

    const total = myMonthRecords.length;
    const hadir = myMonthRecords.filter((a) => a.status === 'HADIR').length;
    const terlambat = myMonthRecords.filter((a) => a.status === 'TERLAMBAT').length;
    const izin = myMonthRecords.filter((a) => a.status === 'IZIN').length;
    const sakit = myMonthRecords.filter((a) => a.status === 'SAKIT').length;
    const alpa = myMonthRecords.filter((a) => a.status === 'ALPA' || a.status === 'ALPHA').length;

    const effectiveDays = hadir + terlambat;
    const rate = total > 0 ? Math.round((hadir / total) * 100) : 0;

    return { total, hadir, terlambat, izin, sakit, alpa, rate };
  }, [attendance, currentUser, selectedMonth]);

  // Target users to monitor / recap based on current user role
  const targetUsersForRecap = useMemo(() => {
    return users.filter((u) => {
      // Exclude Super Admins from attendance lists
      if (u.role === 'SUPER_ADMIN') return false;

      if (activeStoreId) {
        return u.store_id === activeStoreId;
      }
      if (isSuperAdmin) {
        if (selectedStoreFilter === 'ALL') return true;
        return u.store_id === selectedStoreFilter;
      }
      if (isAdminToko) {
        // Admin Toko sees employees in their store
        return u.store_id === (currentUser?.store_id || activeStoreId) && u.role === 'KARYAWAN';
      }
      return u.id === currentUser?.id;
    });
  }, [users, isSuperAdmin, isAdminToko, selectedStoreFilter, currentUser, activeStoreId]);

  // Supervised Attendance Records
  const supervisedAttendance = useMemo(() => {
    return attendance
      .filter((a) => {
        // Exclude attendance records of Super Admins
        const userObj = users.find((u) => u.id === a.user_id);
        if (userObj?.role === 'SUPER_ADMIN') return false;

        if (activeStoreId) {
          return a.store_id === activeStoreId;
        }
        if (isSuperAdmin) {
          if (selectedStoreFilter === 'ALL') return true;
          return a.store_id === selectedStoreFilter;
        }
        if (isAdminToko) {
          return a.store_id === (currentUser?.store_id || activeStoreId);
        }
        return a.user_id === currentUser?.id;
      })
      .filter((a) => {
        if (selectedMonth === 'ALL') return true;
        return a.tanggal.startsWith(selectedMonth);
      })
      .filter((a) => {
        if (statusFilter === 'ALL') return true;
        return a.status === statusFilter;
      })
      .filter((a) => {
        if (!historySearch.trim()) return true;
        const q = historySearch.toLowerCase();
        return (
          a.user_name.toLowerCase().includes(q) ||
          a.tanggal.toLowerCase().includes(q) ||
          (a.catatan && a.catatan.toLowerCase().includes(q)) ||
          a.status.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  }, [attendance, isSuperAdmin, isAdminToko, selectedStoreFilter, currentUser, activeStoreId, selectedMonth, statusFilter, historySearch, users]);

  // Team Recap by User (Aggregated Summary per User)
  const userRecapSummary = useMemo(() => {
    return targetUsersForRecap.map((user) => {
      const userRecords = attendance.filter((a) => {
        const isMatchUser = a.user_id === user.id;
        const isMatchMonth = selectedMonth === 'ALL' ? true : a.tanggal.startsWith(selectedMonth);
        return isMatchUser && isMatchMonth;
      });

      const total = userRecords.length;
      const hadirTepatWaktu = userRecords.filter((a) => a.status === 'HADIR').length;
      const terlambat = userRecords.filter((a) => a.status === 'TERLAMBAT').length;
      const izin = userRecords.filter((a) => a.status === 'IZIN').length;
      const sakit = userRecords.filter((a) => a.status === 'SAKIT').length;
      const alpa = userRecords.filter((a) => a.status === 'ALPA' || a.status === 'ALPHA').length;
      const totalHadir = hadirTepatWaktu + terlambat;
      const attendanceRate = total > 0 ? Math.round((totalHadir / total) * 100) : 0;

      const userStore = stores.find((s) => s.id === user.store_id);

      return {
        user,
        storeName: userStore?.nama_toko || (user.role === 'SUPER_ADMIN' ? 'Semua Cabang' : 'Toko Cabang'),
        total,
        hadirTepatWaktu,
        terlambat,
        izin,
        sakit,
        alpa,
        totalHadir,
        attendanceRate,
        jamMasuk: user.jam_masuk_standar || userStore?.jam_masuk_standar || '08:30',
        jamPulang: user.jam_pulang_standar || userStore?.jam_pulang_standar || '17:00',
      };
    });
  }, [targetUsersForRecap, attendance, selectedMonth, stores]);

  // Status Badge Helper (Minimalist)
  const renderStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case 'HADIR':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Hadir
          </span>
        );
      case 'TERLAMBAT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Terlambat
          </span>
        );
      case 'IZIN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Izin
          </span>
        );
      case 'SAKIT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            Sakit
          </span>
        );
      case 'ALPA':
      case 'ALPHA':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Alpa
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
            {status}
          </span>
        );
    }
  };

  // Open User Schedule Modal
  const handleOpenUserSchedule = (user: User) => {
    setSelectedUserForSchedule(user);
    const userStore = stores.find((s) => s.id === user.store_id);
    setUserJamMasuk(user.jam_masuk_standar || userStore?.jam_masuk_standar || '08:30');
    setUserJamPulang(user.jam_pulang_standar || userStore?.jam_pulang_standar || '17:00');
    setUserToleransi(user.toleransi_keterlambatan_menit ?? userStore?.toleransi_keterlambatan_menit ?? 0);
    setIsUserScheduleModalOpen(true);
  };

  const handleSaveUserSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForSchedule) return;

    updateUserSchedule(selectedUserForSchedule.id, {
      jam_masuk_standar: userJamMasuk,
      jam_pulang_standar: userJamPulang,
      toleransi_keterlambatan_menit: Number(userToleransi),
    });

    setIsUserScheduleModalOpen(false);
  };

  // Submit Manual Attendance (Only for Izin, Sakit, Alpa)
  const handleSubmitManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const targetId = isKaryawan ? currentUser.id : manualTargetUserId || currentUser.id;
    const targetUser = users.find((u) => u.id === targetId);
    const storeIdToUse = targetUser?.store_id || currentUser.store_id || (isSuperAdmin ? (activeStoreId || '') : '');

    recordManualAttendance(
      targetId,
      storeIdToUse,
      manualDate,
      manualStatus,
      '', // Jam masuk kosong untuk Izin/Sakit/Alpa
      '', // Jam keluar kosong untuk Izin/Sakit/Alpa
      manualKeterangan
    );

    setIsManualModalOpen(false);
    setManualKeterangan('');
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          {!isSuperAdmin && (
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-200/60">
                {isAdminToko
                  ? `Admin Toko • ${myStore ? `${myStore.nama_toko}${myStore.cabang && myStore.cabang !== '0' && myStore.cabang !== '()' && myStore.cabang !== '(0)' ? ` (${myStore.cabang})` : ''}` : 'Cabang Belum Ditugaskan'}`
                  : `Karyawan • ${myStore ? `${myStore.nama_toko}${myStore.cabang && myStore.cabang !== '0' && myStore.cabang !== '()' && myStore.cabang !== '(0)' ? ` (${myStore.cabang})` : ''}` : 'Cabang Belum Ditugaskan'}`}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {currentUser?.nama || currentUser?.name}
              </span>
            </div>
          )}
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1.5">
            {isSuperAdmin
              ? 'Pusat Absensi & Rekap Kehadiran'
              : isKaryawan
              ? 'Absensi & Presensi Kerja'
              : 'Manajemen Presensi Cabang'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 leading-relaxed">
            {isSuperAdmin
              ? 'Rekapitulasi absensi admin & karyawan seluruh cabang serta pengaturan jam kerja individual.'
              : isKaryawan
              ? `Jadwal shift Anda: ${myJamMasuk} - ${myJamPulang} WIB.`
              : `Kelola absensi mandiri, monitoring karyawan toko, dan rekapitulasi kehadiran staf.`}
          </p>
        </div>

        {/* Minimalist Live Clock */}
        <div className="flex items-center justify-between sm:justify-start gap-3 bg-slate-900 text-white px-4 py-2.5 rounded-xl shrink-0 shadow-xs w-full sm:w-auto">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <p className="text-[10px] text-slate-400 leading-none">{formattedLiveDate}</p>
              <p className="text-sm font-mono font-bold text-emerald-300 mt-1">
                {formattedLiveTime} <span className="text-[10px] text-slate-400 font-normal">WIB</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {!isSuperAdmin && (
          <button
            onClick={() => setActiveTab('personal')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'personal'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Absensi Saya
          </button>
        )}

        {(isSuperAdmin || isAdminToko) && (
          <>
            <button
              onClick={() => setActiveTab('monitoring')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'monitoring'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Monitoring Hari Ini
            </button>
            <button
              onClick={() => setActiveTab('recap')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'recap'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{isSuperAdmin ? 'Rekap Absen Admin & Karyawan' : 'Rekap Absen Karyawan'}</span>
            </button>
            <button
              onClick={() => setActiveTab('schedule_settings')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'schedule_settings'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Jadwal Shift Pengguna</span>
            </button>
          </>
        )}
      </div>

      {/* TAB 1: PERSONAL ATTENDANCE (Clean Minimalist View) */}
      {activeTab === 'personal' && !isSuperAdmin && (
        <div className="space-y-6">
          {/* Main Check-In / Check-Out Minimalist Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Jadwal Shift Kerja Anda
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono font-semibold text-xs">
                    {myJamMasuk} - {myJamPulang} WIB
                  </span>
                </div>

                {!myTodayAttendance?.jam_masuk &&
                myTodayAttendance?.status !== 'IZIN' &&
                myTodayAttendance?.status !== 'SAKIT' ? (
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Anda belum absen masuk hari ini.
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Silakan tekan tombol <strong>Absen Masuk</strong> untuk memulai shift.
                      {isCurrentTimeLate && (
                        <span className="block mt-1 text-amber-600 font-medium">
                          ⚠️ Waktu saat ini melewati jadwal masuk ({myJamMasuk} WIB{liveShiftCheckInEval.lateMinutes > 0 ? `, terlambat ${liveShiftCheckInEval.lateMinutes} menit` : ''}), presensi akan tercatat terlambat.
                        </span>
                      )}
                    </p>
                  </div>
                ) : myTodayAttendance?.status === 'IZIN' || myTodayAttendance?.status === 'SAKIT' ? (
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold text-slate-900">
                      Status Hari Ini: {myTodayAttendance.status}
                    </h2>
                    {renderStatusBadge(myTodayAttendance.status)}
                  </div>
                ) : !myCheckOut ? (
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-bold text-slate-900">Sedang Bekerja</h2>
                      {renderStatusBadge(myTodayAttendance?.status || 'HADIR')}
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-mono font-medium">
                        Masuk: {myTodayAttendance?.jam_masuk}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {isBeforeClosingTime ? (
                        <span className="text-amber-600 font-medium">
                          ⏳ Belum waktu pulang. Absen pulang aktif mulai pukul <strong>{myJamPulang} WIB</strong>.
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-medium">
                          ✓ Waktu shift telah selesai. Anda dapat melakukan absen pulang sekarang.
                        </span>
                      )}
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-bold text-slate-900">Shift Selesai</h2>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Masuk: {myTodayAttendance?.jam_masuk} &bull; Pulang: {myCheckOut}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-600 mt-0.5">
                      ✓ Jam masuk dan pulang hari ini telah tuntas tercatat.
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                {!myTodayAttendance?.jam_masuk &&
                  myTodayAttendance?.status !== 'IZIN' &&
                  myTodayAttendance?.status !== 'SAKIT' && (
                    <button
                      id="btn-absen-masuk"
                      onClick={() => recordCheckIn(currentUser?.id || '', undefined, 'Hadir')}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-all cursor-pointer"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Absen Masuk Sekarang</span>
                    </button>
                  )}

                {myTodayAttendance?.jam_masuk && !myCheckOut && (
                  <button
                    id="btn-absen-pulang"
                    onClick={() => recordCheckOut(currentUser?.id || '')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs shadow-xs transition-all cursor-pointer ${
                      isBeforeClosingTime
                        ? 'bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200 hover:text-slate-700'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    {isBeforeClosingTime ? <Lock className="w-3.5 h-3.5 text-amber-500" /> : <LogOut className="w-4 h-4" />}
                    <span>
                      {isBeforeClosingTime
                        ? `Absen Pulang (Terkunci s/d ${myJamPulang})`
                        : 'Absen Pulang Sekarang'}
                    </span>
                  </button>
                )}

                {myTodayAttendance && (
                  <button
                    id="btn-reset-absen-today"
                    onClick={() => {
                      setConfirmModal({
                        isOpen: true,
                        title: 'Konfirmasi Reset Absensi Hari Ini',
                        message: `Apakah Anda yakin ingin membatalkan presensi hari ini (${todayStr})? Data presensi masuk (${myTodayAttendance.jam_masuk || '-'}) dan pulang (${myTodayAttendance.jam_pulang || myTodayAttendance.jam_keluar || '-'}) akan diatur ulang dari sistem, sehingga Anda dapat melakukan presensi kembali.`,
                        onConfirm: () => {
                          resetTodayAttendance(currentUser?.id || '');
                          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                        },
                      });
                    }}
                    title="Batalkan / Reset catatan absensi hari ini"
                    className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}

                <button
                  id="btn-open-manual-absen"
                  onClick={() => {
                    setManualDate(todayStr);
                    setManualStatus('IZIN');
                    setManualTargetUserId(currentUser?.id || '');
                    setManualKeterangan('');
                    setIsManualModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Pengajuan Izin / Sakit</span>
                </button>
              </div>
            </div>
          </div>

          {/* Personal Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
              <p className="text-[11px] font-semibold text-slate-500">Total Hari Kerja</p>
              <p className="text-xl font-bold text-slate-900 mt-1">{personalStats.total}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Bulan Terpilih</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
              <p className="text-[11px] font-semibold text-slate-500">Tepat Waktu</p>
              <p className="text-xl font-bold text-emerald-600 mt-1">{personalStats.hadir}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Sesuai Jadwal</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
              <p className="text-[11px] font-semibold text-slate-500">Terlambat</p>
              <p className="text-xl font-bold text-amber-600 mt-1">{personalStats.terlambat}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Lewat {myJamMasuk} WIB</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
              <p className="text-[11px] font-semibold text-slate-500">Izin / Sakit</p>
              <p className="text-xl font-bold text-blue-600 mt-1">
                {personalStats.izin + personalStats.sakit}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Izin: {personalStats.izin} | Sakit: {personalStats.sakit}</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs col-span-2 sm:col-span-4 lg:col-span-1">
              <p className="text-[11px] font-semibold text-slate-500">Disiplin Kehadiran</p>
              <p className="text-xl font-bold text-indigo-600 mt-1">{personalStats.rate}%</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {personalStats.total === 0 ? 'Belum Ada Presensi' : `${personalStats.hadir} dari ${personalStats.total} Tepat Waktu`}
              </p>
            </div>
          </div>

          {/* Personal History Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Riwayat Absensi Mandiri
              </h3>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 focus:border-indigo-600 font-medium"
                >
                  {monthOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                  <option value="ALL">Semua Bulan</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 focus:border-indigo-600 font-medium"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="HADIR">Hadir</option>
                  <option value="TERLAMBAT">Terlambat</option>
                  <option value="IZIN">Izin</option>
                  <option value="SAKIT">Sakit</option>
                  <option value="ALPA">Alpa</option>
                </select>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Tanggal</th>
                    <th className="py-3.5 px-4 font-semibold">Jam Masuk</th>
                    <th className="py-3.5 px-4 font-semibold">Jam Pulang</th>
                    <th className="py-3.5 px-4 font-semibold">Status</th>
                    <th className="py-3.5 px-4 font-semibold">Keterangan</th>
                    <th className="py-3.5 px-4 text-right font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {myAttendanceList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        Belum ada data absensi untuk filter yang dipilih.
                      </td>
                    </tr>
                  ) : (
                    myAttendanceList.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-4 font-semibold text-slate-900 whitespace-nowrap font-mono text-[11px]">
                          {item.tanggal}
                        </td>
                        <td className="py-4 px-4 font-mono whitespace-nowrap font-semibold text-slate-800">
                          {item.jam_masuk || '-'}
                        </td>
                        <td className="py-4 px-4 font-mono whitespace-nowrap font-semibold text-slate-800">
                          {item.jam_pulang || item.jam_keluar || '-'}
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          {renderStatusBadge(item.status)}
                        </td>
                        <td className="py-4 px-4 text-slate-600 max-w-xs">
                          <p className="text-[11px] line-clamp-2">{item.catatan || item.keterangan || '-'}</p>
                        </td>
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => {
                              setConfirmModal({
                                isOpen: true,
                                title: 'Hapus Catatan Absensi',
                                message: `Hapus absensi tanggal ${item.tanggal}?`,
                                onConfirm: () => {
                                  deleteAttendanceRecord(item.id);
                                  setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                                },
                              });
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Catatan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Responsive Cards */}
            <div className="md:hidden p-3.5 sm:p-4 space-y-3.5 bg-slate-50/50">
              {myAttendanceList.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200 p-6">
                  Belum ada data absensi untuk filter yang dipilih.
                </div>
              ) : (
                myAttendanceList.map((item) => (
                  <div key={item.id} className="p-4 space-y-3 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs font-mono">{item.tanggal}</span>
                      {renderStatusBadge(item.status)}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 font-mono">
                      <div>
                        <span className="text-slate-400 block text-[10px] font-sans font-medium">Masuk:</span>
                        <span className="text-slate-800 font-bold">{item.jam_masuk || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-sans font-medium">Pulang:</span>
                        <span className="text-slate-800 font-bold">{item.jam_pulang || item.jam_keluar || '-'}</span>
                      </div>
                    </div>
                    {(item.catatan || item.keterangan) && (
                      <p className="text-[11px] text-slate-600 bg-slate-50/60 p-2.5 rounded-xl border border-slate-100">
                        {item.catatan || item.keterangan}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TODAY MONITORING (For Super Admin & Admin Toko) */}
      {activeTab === 'monitoring' && (isSuperAdmin || isAdminToko) && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="w-full md:w-auto flex-1 max-w-md">
              {activeStoreId ? (
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-indigo-50/60 px-3 py-2 rounded-xl border border-indigo-200/60 w-full min-w-0">
                  <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="shrink-0 text-slate-500">Cabang:</span>
                  <span className="font-bold text-indigo-900 truncate">
                    {stores.find((s) => s.id === activeStoreId)?.nama_toko || activeStoreId} ({stores.find((s) => s.id === activeStoreId)?.cabang || 'Cabang'})
                  </span>
                </div>
              ) : isSuperAdmin ? (
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 w-full min-w-0">
                  <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="shrink-0 text-slate-500">Filter Cabang:</span>
                  <div className="flex-1 min-w-0 relative flex items-center">
                    <select
                      value={selectedStoreFilter}
                      onChange={(e) => setSelectedStoreFilter(e.target.value)}
                      className="w-full min-w-0 bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer truncate appearance-none pr-5"
                    >
                      <option value="ALL">Semua Cabang Toko (Global)</option>
                      {stores.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nama_toko} ({s.cabang})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 absolute right-0 pointer-events-none" />
                  </div>
                </div>
              ) : null}
            </div>

            <button
              onClick={() => {
                setManualDate(todayStr);
                setManualStatus('IZIN');
                setManualTargetUserId(targetUsersForRecap[0]?.id || '');
                setManualKeterangan('');
                setIsManualModalOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors shrink-0 w-full sm:w-auto cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Catat Izin / Sakit / Alpa</span>
            </button>
          </div>

          {/* Cards Status Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {targetUsersForRecap.length === 0 ? (
              <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-200/80 p-6">
                <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600">
                  Belum ada karyawan terdaftar di cabang toko ini.
                </p>
              </div>
            ) : (
              targetUsersForRecap.map((emp) => {
                const todayRec = attendance.find(
                  (a) => a.user_id === emp.id && a.tanggal === todayStr
                );
                const hasCheckedIn = Boolean(todayRec?.jam_masuk);
                const hasCheckedOut = Boolean(todayRec?.jam_pulang || todayRec?.jam_keluar);
                const empStore = stores.find((s) => s.id === emp.store_id);

                return (
                  <div
                    key={emp.id}
                    className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-indigo-200 transition-all shadow-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-slate-200 shadow-2xs">
                        <span className="text-xs font-bold text-white uppercase select-none">
                          {(emp.nama || emp.name || 'U').substring(0, 2)}
                        </span>
                        {(emp.avatar || emp.foto_profil) && (
                          <img
                            src={emp.avatar || emp.foto_profil}
                            alt={emp.nama || emp.name}
                            className="absolute inset-0 w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900">{(emp.nama || emp.name || '').replace(/\s*\((\s*|0)\)/g, '').replace(/\s+0$/, '').trim()}</p>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-semibold">
                            {emp.role}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {empStore?.nama_toko || 'Semua Cabang'} &bull; Shift: {emp.jam_masuk_standar || empStore?.jam_masuk_standar || '08:30'} - {emp.jam_pulang_standar || empStore?.jam_pulang_standar || '17:00'}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1 font-mono">
                          {hasCheckedIn ? `Masuk: ${todayRec?.jam_masuk}` : 'Belum Absen Masuk'}
                          {hasCheckedOut && ` • Pulang: ${todayRec?.jam_pulang || todayRec?.jam_keluar}`}
                        </p>
                      </div>
                    </div>

                    <div>
                      {todayRec ? (
                        renderStatusBadge(todayRec.status)
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
                          Belum Masuk
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: REKAPITULASI ABSENSI (Super Admin & Admin Toko) */}
      {activeTab === 'recap' && (isSuperAdmin || isAdminToko) && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto flex-1">
              {isSuperAdmin && !activeStoreId && (
                <div className="flex items-center gap-2 text-xs bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 w-full min-w-0 flex-1">
                  <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="shrink-0 text-slate-500 font-semibold">Cabang:</span>
                  <div className="flex-1 min-w-0 relative flex items-center">
                    <select
                      value={selectedStoreFilter}
                      onChange={(e) => setSelectedStoreFilter(e.target.value)}
                      className="w-full min-w-0 bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer truncate appearance-none pr-5"
                    >
                      <option value="ALL">Semua Cabang Toko</option>
                      {stores.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nama_toko} ({s.cabang})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 absolute right-0 pointer-events-none" />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 w-full min-w-0 flex-1">
                <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="shrink-0 text-slate-500 font-semibold">Bulan:</span>
                <div className="flex-1 min-w-0 relative flex items-center">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full min-w-0 bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer truncate appearance-none pr-5"
                  >
                    {monthOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                    <option value="ALL">Semua Bulan</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 absolute right-0 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
              <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                {userRecapSummary.length} Pengguna Terdata
              </span>
            </div>
          </div>

          {/* Recap Summary Table per User */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                {isSuperAdmin
                  ? 'Rekapitulasi Kehadiran Admin & Karyawan'
                  : 'Rekapitulasi Kehadiran Karyawan Toko'}
              </h3>
              <span className="text-xs text-slate-400 font-medium">Periode {selectedMonth}</span>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Nama Pengguna</th>
                    <th className="py-3.5 px-4 font-semibold">Role</th>
                    <th className="py-3.5 px-4 font-semibold">Penempatan Toko</th>
                    <th className="py-3.5 px-4 font-semibold">Jadwal Shift</th>
                    <th className="py-3.5 px-4 text-center font-semibold">Total Hadir</th>
                    <th className="py-3.5 px-4 text-center font-semibold">Tepat Waktu</th>
                    <th className="py-3.5 px-4 text-center font-semibold">Terlambat</th>
                    <th className="py-3.5 px-4 text-center font-semibold">Izin / Sakit</th>
                    <th className="py-3.5 px-4 text-center font-semibold">Alpa</th>
                    <th className="py-3.5 px-4 text-center font-semibold">% Presensi</th>
                    <th className="py-3.5 px-4 text-right font-semibold">Atur Shift</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {userRecapSummary.map((item) => (
                    <tr key={item.user.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-4 font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="relative w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-slate-200 shadow-2xs">
                            <span className="text-[10px] font-bold text-white uppercase select-none">
                              {(item.user.nama || item.user.name || 'U').substring(0, 2)}
                            </span>
                            {(item.user.avatar || item.user.foto_profil) && (
                              <img
                                src={item.user.avatar || item.user.foto_profil}
                                alt={item.user.nama || item.user.name}
                                className="absolute inset-0 w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            )}
                          </div>
                          <span>{(item.user.nama || item.user.name || '').replace(/\s*\((\s*|0)\)/g, '').replace(/\s+0$/, '').trim()}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200/60">
                          {item.user.role}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-600 whitespace-nowrap">
                        {item.storeName}
                      </td>
                      <td className="py-4 px-4 font-mono text-slate-800 whitespace-nowrap">
                        {item.jamMasuk} - {item.jamPulang}
                      </td>
                      <td className="py-4 px-4 text-center font-bold text-slate-900">
                        {item.totalHadir}
                      </td>
                      <td className="py-4 px-4 text-center font-semibold text-emerald-600">
                        {item.hadirTepatWaktu}
                      </td>
                      <td className="py-4 px-4 text-center font-semibold text-amber-600">
                        {item.terlambat}
                      </td>
                      <td className="py-4 px-4 text-center text-blue-600 font-medium">
                        {item.izin + item.sakit}
                      </td>
                      <td className="py-4 px-4 text-center text-rose-600 font-medium">
                        {item.alpa}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs">
                          {item.attendanceRate}%
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleOpenUserSchedule(item.user)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer"
                          title="Ubah Jadwal Shift Pengguna Ini"
                        >
                          <Settings className="w-3.5 h-3.5 text-indigo-600" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Responsive Cards */}
            <div className="md:hidden p-3.5 sm:p-4 space-y-3.5 bg-slate-50/50">
              {userRecapSummary.map((item) => (
                <div key={item.user.id} className="p-4 space-y-3 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-bold text-slate-900 text-xs">{(item.user.nama || item.user.name || '').replace(/\s*\((\s*|0)\)/g, '').replace(/\s+0$/, '').trim()}</h4>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200/60">
                          {item.user.role}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {item.storeName} &bull; Shift: {item.jamMasuk} - {item.jamPulang}
                      </p>
                    </div>
                    <span className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs">
                      {item.attendanceRate}%
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 text-center bg-slate-50/80 p-2 rounded-xl border border-slate-100 text-[10px]">
                    <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-2xs">
                      <span className="text-slate-400 block font-medium">Hadir</span>
                      <span className="font-bold text-slate-800 text-xs">{item.totalHadir}</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-2xs">
                      <span className="text-slate-400 block font-medium">Tepat</span>
                      <span className="font-bold text-emerald-600 text-xs">{item.hadirTepatWaktu}</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-2xs">
                      <span className="text-slate-400 block font-medium">Telat</span>
                      <span className="font-bold text-amber-600 text-xs">{item.terlambat}</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-2xs">
                      <span className="text-slate-400 block font-medium">Izin/Alpa</span>
                      <span className="font-bold text-rose-600 text-xs">{item.izin + item.sakit + item.alpa}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-1 border-t border-slate-100">
                    <button
                      onClick={() => handleOpenUserSchedule(item.user)}
                      className="flex items-center gap-1.5 text-xs text-indigo-600 font-semibold px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 shadow-2xs transition-colors cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>Atur Shift</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Raw Log Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Rincian Log Presensi Harian
              </h3>

              <div className="flex items-center gap-2">
                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nama karyawan..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:border-indigo-600"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 font-medium"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="HADIR">Hadir</option>
                  <option value="TERLAMBAT">Terlambat</option>
                  <option value="IZIN">Izin</option>
                  <option value="SAKIT">Sakit</option>
                  <option value="ALPA">Alpa</option>
                </select>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Nama Karyawan</th>
                    <th className="py-3.5 px-4 font-semibold">Cabang Toko</th>
                    <th className="py-3.5 px-4 font-semibold">Tanggal</th>
                    <th className="py-3.5 px-4 font-semibold">Jam Masuk</th>
                    <th className="py-3.5 px-4 font-semibold">Jam Pulang</th>
                    <th className="py-3.5 px-4 font-semibold">Status</th>
                    <th className="py-3.5 px-4 font-semibold">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {supervisedAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        Tidak ada log presensi ditemukan.
                      </td>
                    </tr>
                  ) : (
                    supervisedAttendance.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-4 font-bold text-slate-900 whitespace-nowrap">
                          {(item.user_name || '').replace(/\s*\((\s*|0)\)/g, '').replace(/\s+0$/, '').trim()}
                        </td>
                        <td className="py-4 px-4 text-slate-600 whitespace-nowrap">
                          {item.store_name || 'Cabang Toko'}
                        </td>
                        <td className="py-4 px-4 font-mono font-medium text-slate-800 whitespace-nowrap">
                          {item.tanggal}
                        </td>
                        <td className="py-4 px-4 font-mono whitespace-nowrap font-semibold">
                          {item.jam_masuk || '-'}
                        </td>
                        <td className="py-4 px-4 font-mono whitespace-nowrap font-semibold">
                          {item.jam_pulang || item.jam_keluar || '-'}
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          {renderStatusBadge(item.status)}
                        </td>
                        <td className="py-4 px-4 text-slate-600 max-w-xs">
                          <p className="text-[11px] line-clamp-2">{item.catatan || item.keterangan || '-'}</p>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Responsive Cards */}
            <div className="md:hidden p-3.5 sm:p-4 space-y-3.5 bg-slate-50/50">
              {supervisedAttendance.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200 p-6">
                  Tidak ada log presensi ditemukan.
                </div>
              ) : (
                supervisedAttendance.map((item) => (
                  <div key={item.id} className="p-4 space-y-3 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs">{(item.user_name || '').replace(/\s*\((\s*|0)\)/g, '').replace(/\s+0$/, '').trim()}</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">{item.store_name || 'Cabang Toko'}</p>
                      </div>
                      <div className="text-right">
                        {renderStatusBadge(item.status)}
                        <span className="block text-[10px] text-slate-400 font-mono mt-1">{item.tanggal}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 font-mono">
                      <div>
                        <span className="text-slate-400 block text-[10px] font-sans font-medium">Jam Masuk:</span>
                        <span className="text-slate-800 font-bold">{item.jam_masuk || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-sans font-medium">Jam Pulang:</span>
                        <span className="text-slate-800 font-bold">{item.jam_pulang || item.jam_keluar || '-'}</span>
                      </div>
                    </div>
                    {(item.catatan || item.keterangan) && (
                      <p className="text-[11px] text-slate-600 bg-slate-50/60 px-2.5 py-1.5 rounded-xl border border-slate-100">
                        {item.catatan || item.keterangan}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PER-USER SHIFT SCHEDULE MANAGEMENT */}
      {activeTab === 'schedule_settings' && (isSuperAdmin || isAdminToko) && (
        <div className="space-y-6">
          <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs min-w-0 max-w-full overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 min-w-0 max-w-full">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-slate-900 break-words">
                  Pengaturan Jam Shift Kerja Masing-Masing Pengguna
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 break-words">
                  Tentukan jam hadir dan jam pulang secara spesifik untuk masing-masing admin dan karyawan.
                </p>
              </div>

              {isSuperAdmin && !activeStoreId && (
                <div className="relative flex items-center min-w-0 max-w-full w-full sm:w-64 border border-slate-200 bg-slate-50 px-3 py-2 rounded-xl">
                  <Building2 className="w-4 h-4 text-indigo-600 shrink-0 mr-2" />
                  <div className="min-w-0 flex-1 relative flex items-center">
                    <select
                      value={selectedStoreFilter}
                      onChange={(e) => setSelectedStoreFilter(e.target.value)}
                      className="w-full min-w-0 text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer truncate appearance-none pr-5"
                    >
                      <option value="ALL">Semua Cabang Toko</option>
                      {stores.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nama_toko}{s.cabang && s.cabang !== '0' && s.cabang !== '()' && s.cabang !== '(0)' ? ` (${s.cabang})` : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 absolute right-0 pointer-events-none" />
                  </div>
                </div>
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold">
                  <tr>
                    <th className="py-3 px-4">Nama Pengguna</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Toko Penempatan</th>
                    <th className="py-3 px-4">Jam Masuk (Hadir)</th>
                    <th className="py-3 px-4">Jam Pulang</th>
                    <th className="py-3 px-4">Toleransi</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {targetUsersForRecap.map((u) => {
                    const assignedStore = stores.find((s) => s.id === u.store_id);
                    const jamMasuk = u.jam_masuk_standar || assignedStore?.jam_masuk_standar || '08:30';
                    const jamPulang = u.jam_pulang_standar || assignedStore?.jam_pulang_standar || '17:00';
                    const toleransi = u.toleransi_keterlambatan_menit ?? assignedStore?.toleransi_keterlambatan_menit ?? 0;

                    return (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                          {(u.nama || u.name || '').replace(/\s*\((\s*|0)\)/g, '').replace(/\s+0$/, '').trim()}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-slate-100 text-slate-700">
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                          {u.role === 'SUPER_ADMIN' ? 'Semua Toko' : assignedStore?.nama_toko || '-'}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                          {jamMasuk} WIB
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                          {jamPulang} WIB
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {toleransi} Menit
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleOpenUserSchedule(u)}
                            className="flex items-center gap-1.5 ml-auto px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold transition-colors"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Atur Shift</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Responsive Cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {targetUsersForRecap.map((u) => {
                const assignedStore = stores.find((s) => s.id === u.store_id);
                const jamMasuk = u.jam_masuk_standar || assignedStore?.jam_masuk_standar || '08:30';
                const jamPulang = u.jam_pulang_standar || assignedStore?.jam_pulang_standar || '17:00';
                const toleransi = u.toleransi_keterlambatan_menit ?? assignedStore?.toleransi_keterlambatan_menit ?? 0;

                return (
                  <div key={u.id} className="p-3.5 space-y-2 bg-white hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-slate-900 text-xs">{(u.nama || u.name || '').replace(/\s*\((\s*|0)\)/g, '').replace(/\s+0$/, '').trim()}</h4>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                            {u.role}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {u.role === 'SUPER_ADMIN' ? 'Semua Toko' : assignedStore?.nama_toko || '-'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleOpenUserSchedule(u)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Shift</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2 rounded-lg font-mono">
                      <div>
                        <span className="text-slate-400 block text-[10px] font-sans">Jadwal Shift:</span>
                        <span className="text-slate-800 font-semibold">{jamMasuk} - {jamPulang}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-sans">Toleransi:</span>
                        <span className="text-slate-800 font-semibold">{toleransi} Menit</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SETTING JAM SHIFT PER USER */}
      {isUserScheduleModalOpen && selectedUserForSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-5 shadow-2xl border border-slate-100 max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Atur Shift: {selectedUserForSchedule.nama || selectedUserForSchedule.name}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {selectedUserForSchedule.role} &bull; {selectedUserForSchedule.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUserScheduleModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUserSchedule} className="space-y-3 overflow-y-auto flex-1 pr-1 py-1 text-xs">
              <div className="grid grid-cols-2 gap-3 items-start">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5 h-6 flex items-center">
                    Jam Masuk (WIB)
                  </label>
                  <input
                    type="time"
                    required
                    value={userJamMasuk}
                    onChange={(e) => setUserJamMasuk(e.target.value)}
                    className="w-full px-3 py-1.5 sm:py-2 rounded-xl border border-slate-200 font-mono font-semibold text-slate-800 focus:border-indigo-600"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 truncate">Lewat jam ini = Terlambat</p>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5 h-6 flex items-center">
                    Jam Pulang (WIB)
                  </label>
                  <input
                    type="time"
                    required
                    value={userJamPulang}
                    onChange={(e) => setUserJamPulang(e.target.value)}
                    className="w-full px-3 py-1.5 sm:py-2 rounded-xl border border-slate-200 font-mono font-semibold text-slate-800 focus:border-indigo-600"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 truncate">Selesai jam kerja</p>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Toleransi Keterlambatan (Menit)
                </label>
                <select
                  value={userToleransi}
                  onChange={(e) => setUserToleransi(Number(e.target.value))}
                  className="w-full px-3 py-1.5 sm:py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:border-indigo-600"
                >
                  <option value={0}>0 Menit (Tepat Waktu)</option>
                  <option value={5}>5 Menit</option>
                  <option value={10}>10 Menit</option>
                  <option value={15}>15 Menit</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2.5 border-t border-slate-100 shrink-0 mt-1">
                <button
                  type="button"
                  onClick={() => setIsUserScheduleModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-semibold text-white shadow-xs cursor-pointer"
                >
                  Simpan Jadwal Pengguna
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MANUAL ATTENDANCE / LEAVE */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-5 shadow-2xl border border-slate-100 max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Form Pengajuan Izin / Sakit / Alpa
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Khusus pencatatan ketidakhadiran berhalangan
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitManual} className="space-y-3 overflow-y-auto flex-1 pr-1 py-1 text-xs">
              {!isKaryawan && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Pilih Pengguna
                  </label>
                  <select
                    value={manualTargetUserId}
                    onChange={(e) => setManualTargetUserId(e.target.value)}
                    className="w-full px-3 py-1.5 sm:py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:border-indigo-600"
                  >
                    {targetUsersForRecap.map((u) => (
                      <option key={u.id} value={u.id}>
                        {(u.nama || u.name || '').replace(/\s*\((\s*|0)\)/g, '').replace(/\s+0$/, '').trim()} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Tanggal</label>
                <input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full px-3 py-1.5 sm:py-2 rounded-xl border border-slate-200 font-medium text-slate-800 focus:border-indigo-600"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Status Keterangan</label>
                <select
                  value={manualStatus}
                  onChange={(e) => setManualStatus(e.target.value as AttendanceStatus)}
                  className="w-full px-3 py-1.5 sm:py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:border-indigo-600"
                >
                  <option value="IZIN">Izin</option>
                  <option value="SAKIT">Sakit</option>
                  <option value="ALPA">Alpa</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Keterangan / Alasan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Wajib diisi: Berikan alasan pengajuan izin, keterangan sakit, atau alasan ketidakhadiran..."
                  value={manualKeterangan}
                  onChange={(e) => setManualKeterangan(e.target.value)}
                  className="w-full px-3 py-1.5 sm:py-2 rounded-xl border border-slate-200 text-slate-800 focus:border-indigo-600 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2.5 border-t border-slate-100 shrink-0 mt-1">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-semibold text-white shadow-xs cursor-pointer"
                >
                  Simpan Keterangan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        confirmVariant="danger"
        confirmText="Ya, Lanjutkan"
        cancelText="Batal"
      />
    </div>
  );
};


