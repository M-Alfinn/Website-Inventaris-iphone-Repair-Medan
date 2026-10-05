import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { User, UserRole } from '../../types';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  ShieldCheck,
  Phone,
  Store as StoreIcon,
  Clock,
  Building2,
  X,
  Filter,
  Layers,
  KeyRound,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Power,
  PowerOff,
  ChevronDown
} from 'lucide-react';
import { ConfirmationModal } from '../common/ConfirmationModal';

export const EmployeesPage: React.FC = () => {
  const {
    users,
    stores,
    activeStoreId,
    addUser,
    updateUser,
    updateUserSchedule,
    deleteUser,
    toggleUserStatus,
    adminResetUserPassword,
    currentUser,
    showToast,
  } = useApp();

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isAdminToko = currentUser?.role === 'ADMIN_TOKO';
  const userStoreId = currentUser?.store_id || activeStoreId;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>(activeStoreId || 'ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Sync selectedStoreFilter whenever activeStoreId changes
  React.useEffect(() => {
    setSelectedStoreFilter(activeStoreId || 'ALL');
  }, [activeStoreId]);

  // Shift Schedule Modal State
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [targetShiftUser, setTargetShiftUser] = useState<User | null>(null);
  const [shiftJamMasuk, setShiftJamMasuk] = useState('08:30');
  const [shiftJamPulang, setShiftJamPulang] = useState('17:00');
  const [shiftToleransi, setShiftToleransi] = useState(0);

  // Admin Reset Password Modal State
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [targetResetUser, setTargetResetUser] = useState<User | null>(null);
  const [tempPasswordInput, setTempPasswordInput] = useState('Pass123!');
  const [showTempPassword, setShowTempPassword] = useState(false);

  // Add/Edit User Form State
  const [formData, setFormData] = useState<{
    nama: string;
    username: string;
    email: string;
    nomor_telepon: string;
    position: string;
    initialPassword?: string;
    role: UserRole;
    store_id: string;
    jam_masuk_standar: string;
    jam_pulang_standar: string;
    toleransi_keterlambatan_menit: number;
  }>({
    nama: '',
    username: '',
    email: '',
    nomor_telepon: '',
    position: '',
    initialPassword: 'password123',
    role: 'KARYAWAN',
    store_id: activeStoreId || (stores.length > 0 ? stores[0].id : ''),
    jam_masuk_standar: '08:30',
    jam_pulang_standar: '17:00',
    toleransi_keterlambatan_menit: 0,
  });

  const [showInitialPass, setShowInitialPass] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    confirmVariant?: 'primary' | 'danger' | 'success';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Konfirmasi',
    confirmVariant: 'danger',
    onConfirm: () => {},
  });

  // Base scope based on role and activeStoreId
  // Super Admin is root system administrator, NOT a branch employee. Data Karyawan is strictly for branch staff (Admin Toko & Karyawan).
  const accessibleUsers = useMemo(() => {
    const branchEmployees = users.filter((u) => u.role !== 'SUPER_ADMIN' && u.id !== 'user-super');

    if (activeStoreId) {
      return branchEmployees.filter((u) => u.store_id === activeStoreId);
    }
    if (isSuperAdmin) {
      if (selectedStoreFilter === 'ALL') return branchEmployees;
      return branchEmployees.filter((u) => u.store_id === selectedStoreFilter);
    }
    // Admin Toko strictly sees their own store, and NEVER sees SUPER_ADMIN
    if (!userStoreId) return [];
    return branchEmployees.filter((u) => u.store_id === userStoreId);
  }, [users, isSuperAdmin, selectedStoreFilter, userStoreId, activeStoreId]);

  // Search filter
  const filteredUsers = useMemo(() => {
    return accessibleUsers.filter((u) => {
      const phone = u.nomor_telepon || u.no_hp || '';
      const email = u.email || '';
      const uname = u.username || '';
      return (
        u.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        phone.includes(searchTerm) ||
        email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        uname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.role.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [accessibleUsers, searchTerm]);

  // Grouped by stores
  const storeGroups = useMemo(() => {
    if (activeStoreId) {
      const currentSelectedStore = stores.find((s) => s.id === activeStoreId);
      return [
        {
          store: currentSelectedStore || { id: activeStoreId, nama_toko: 'Cabang Toko', cabang: '' },
          users: filteredUsers,
        },
      ];
    }

    if (!isSuperAdmin) {
      const myStore = stores.find((s) => s.id === userStoreId);
      return [
        {
          store: myStore || { id: userStoreId || 'my-store', nama_toko: 'Cabang Toko Anda', cabang: '' },
          users: filteredUsers,
        },
      ];
    }

    const groups: { store: any; users: User[] }[] = [];

    // Per Store (Admin Toko & Karyawan only)
    stores.forEach((s) => {
      if (selectedStoreFilter === 'ALL' || selectedStoreFilter === s.id) {
        const storeUsers = filteredUsers.filter((u) => u.store_id === s.id);
        if (storeUsers.length > 0 || selectedStoreFilter === s.id) {
          groups.push({
            store: s,
            users: storeUsers,
          });
        }
      }
    });

    // Unassigned branch staff (if any)
    if (isSuperAdmin && selectedStoreFilter === 'ALL') {
      const unassignedUsers = filteredUsers.filter(
        (u) => u.role !== 'SUPER_ADMIN' && (!u.store_id || !stores.some((s) => s.id === u.store_id))
      );
      if (unassignedUsers.length > 0) {
        groups.push({
          store: {
            id: 'UNASSIGNED',
            nama_toko: 'Akun Belum Ditugaskan / Cabang Terhapus',
            cabang: 'Perlu Penugasan Toko',
          },
          users: unassignedUsers,
        });
      }
    }

    return groups;
  }, [isSuperAdmin, stores, filteredUsers, selectedStoreFilter, userStoreId, activeStoreId]);

  const handleOpenAdd = () => {
    setEditingUser(null);
    const fallbackStoreId = activeStoreId || userStoreId || (stores.length > 0 ? stores[0].id : '');
    const assignedStore = stores.find((s) => s.id === fallbackStoreId);
    setFormData({
      nama: '',
      username: '',
      email: '',
      nomor_telepon: '',
      position: '',
      initialPassword: 'password123',
      role: isSuperAdmin ? 'ADMIN_TOKO' : 'KARYAWAN',
      store_id: isSuperAdmin ? (activeStoreId || (stores.length > 0 ? stores[0].id : '')) : (userStoreId || (stores.length > 0 ? stores[0].id : '')),
      jam_masuk_standar: assignedStore?.jam_masuk_standar || '08:30',
      jam_pulang_standar: assignedStore?.jam_pulang_standar || '17:00',
      toleransi_keterlambatan_menit: assignedStore?.toleransi_keterlambatan_menit || 0,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    if (user.role === 'SUPER_ADMIN' || user.id === 'user-super') {
      showToast('Akses Ditolak', 'Akun Super Admin sistem tidak dapat diedit sebagai karyawan toko.', 'warning');
      return;
    }
    if (isAdminToko && (user.role !== 'KARYAWAN' || user.store_id !== userStoreId)) {
      showToast('Akses Ditolak', 'Admin Toko hanya dapat mengedit akun Karyawan di cabangnya sendiri.', 'error');
      return;
    }

    setEditingUser(user);
    const assignedStore = stores.find((s) => s.id === user.store_id);
    setFormData({
      nama: user.nama,
      username: user.username || user.nama.toLowerCase().replace(/\s+/g, '.'),
      email: user.email || '',
      nomor_telepon: user.nomor_telepon || user.no_hp || '',
      position: user.position || (user.role === 'ADMIN_TOKO' ? 'Kepala Toko' : 'Staf / Teknisi'),
      role: user.role,
      store_id: user.store_id || (stores.length > 0 ? stores[0].id : ''),
      jam_masuk_standar: user.jam_masuk_standar || assignedStore?.jam_masuk_standar || '08:30',
      jam_pulang_standar: user.jam_pulang_standar || assignedStore?.jam_pulang_standar || '17:00',
      toleransi_keterlambatan_menit: user.toleransi_keterlambatan_menit ?? assignedStore?.toleransi_keterlambatan_menit ?? 0,
    });
    setIsModalOpen(true);
  };

  const handleOpenShiftModal = (user: User) => {
    if (user.role === 'SUPER_ADMIN' || user.id === 'user-super') {
      showToast('Akses Ditolak', 'Super Admin tidak memiliki jadwal shift kerja toko.', 'warning');
      return;
    }
    setTargetShiftUser(user);
    const assignedStore = stores.find((s) => s.id === user.store_id);
    setShiftJamMasuk(user.jam_masuk_standar || assignedStore?.jam_masuk_standar || '08:30');
    setShiftJamPulang(user.jam_pulang_standar || assignedStore?.jam_pulang_standar || '17:00');
    setShiftToleransi(user.toleransi_keterlambatan_menit ?? assignedStore?.toleransi_keterlambatan_menit ?? 0);
    setIsShiftModalOpen(true);
  };

  const handleOpenResetPasswordModal = (user: User) => {
    setTargetResetUser(user);
    setTempPasswordInput('password123');
    setIsResetPasswordModalOpen(true);
  };

  const handleSaveShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetShiftUser) return;
    updateUserSchedule(targetShiftUser.id, {
      jam_masuk_standar: shiftJamMasuk,
      jam_pulang_standar: shiftJamPulang,
      toleransi_keterlambatan_menit: Number(shiftToleransi),
    });
    setIsShiftModalOpen(false);
  };

  const handleExecuteResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetResetUser) return;
    adminResetUserPassword(targetResetUser.id, tempPasswordInput);
    setIsResetPasswordModalOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama.trim() || !formData.nomor_telepon.trim()) return;

    const finalPosition = formData.position.trim() || (formData.role === 'ADMIN_TOKO' ? 'Kepala Toko' : 'Staf / Teknisi');
    const finalRole: UserRole = isSuperAdmin ? (formData.role === 'SUPER_ADMIN' ? 'ADMIN_TOKO' : formData.role) : 'KARYAWAN';
    const finalStoreId = formData.store_id || (stores.length > 0 ? stores[0].id : '');

    if (editingUser) {
      if (editingUser.role === 'SUPER_ADMIN' || editingUser.id === 'user-super') {
        showToast('Akses Ditolak', 'Akun Super Admin sistem tidak dapat diedit dari menu Data Karyawan.', 'error');
        return;
      }
      updateUser(editingUser.id, {
        nama: formData.nama.trim(),
        name: formData.nama.trim(),
        username: formData.email.trim().toLowerCase(),
        email: formData.email.trim().toLowerCase(),
        nomor_telepon: formData.nomor_telepon.replace(/\D/g, ''),
        no_hp: formData.nomor_telepon.replace(/\D/g, ''),
        position: finalPosition,
        status_peran_kerja: finalPosition,
        role: finalRole,
        store_id: finalStoreId,
        jam_masuk_standar: formData.jam_masuk_standar,
        jam_pulang_standar: formData.jam_pulang_standar,
        toleransi_keterlambatan_menit: Number(formData.toleransi_keterlambatan_menit),
      });
    } else {
      addUser({
        nama: formData.nama.trim(),
        name: formData.nama.trim(),
        username: formData.email.trim().toLowerCase(),
        email: formData.email.trim().toLowerCase(),
        nomor_telepon: formData.nomor_telepon.replace(/\D/g, ''),
        no_hp: formData.nomor_telepon.replace(/\D/g, ''),
        position: finalPosition,
        status_peran_kerja: finalPosition,
        role: finalRole,
        store_id: finalStoreId,
        status: 'AKTIF',
        jam_masuk_standar: formData.jam_masuk_standar,
        jam_pulang_standar: formData.jam_pulang_standar,
        toleransi_keterlambatan_menit: Number(formData.toleransi_keterlambatan_menit),
        initialPassword: formData.initialPassword || 'password123',
      });
    }
    setIsModalOpen(false);
  };

  const handleToggleStatus = (targetUser: User) => {
    if (targetUser.role === 'SUPER_ADMIN' || targetUser.id === 'user-super') {
      showToast('Akses Ditolak', 'Akun Super Admin sistem tidak dapat dinonaktifkan.', 'error');
      return;
    }

    if (isAdminToko) {
      if (targetUser.role !== 'KARYAWAN' || targetUser.store_id !== userStoreId) {
        showToast('Akses Ditolak', 'Admin Toko hanya dapat mengelola status akun Karyawan di cabangnya sendiri.', 'error');
        return;
      }
    } else if (!isSuperAdmin) {
      showToast('Akses Ditolak', 'Anda tidak memiliki hak akses untuk mengubah status akun.', 'error');
      return;
    }

    const willDeactivate = targetUser.status === 'AKTIF';
    setConfirmModal({
      isOpen: true,
      title: willDeactivate ? `Nonaktifkan Akun ${targetUser.nama}?` : `Aktifkan Kembali Akun ${targetUser.nama}?`,
      message: willDeactivate
        ? `Apakah Anda yakin ingin menonaktifkan akun "${targetUser.nama}" (${targetUser.role === 'ADMIN_TOKO' ? 'Admin Toko' : 'Karyawan'})?\n\nPengguna TIDAK AKAN DAPAT LOGIN ke sistem sampai diaktifkan kembali oleh administrator.\n\nCatatan: Seluruh data akun, riwayat absensi, transaksi, return, dan riwayat aktivitas TETAP TERSIMPAN AMAN di sistem dan tidak akan terhapus.`
        : `Apakah Anda yakin ingin mengaktifkan kembali akun "${targetUser.nama}"?\n\nPengguna akan dapat login kembali dan langsung masuk bertugas di cabang toko yang telah ditetapkan.`,
      confirmText: willDeactivate ? 'Nonaktifkan Akun' : 'Aktifkan Akun',
      confirmVariant: willDeactivate ? 'danger' : 'success',
      onConfirm: () => {
        toggleUserStatus(targetUser.id, willDeactivate ? 'NONAKTIF' : 'AKTIF');
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleDelete = (user: User) => {
    if (user.role === 'SUPER_ADMIN' || user.id === 'user-super') {
      showToast('Akses Ditolak', 'Akun Super Admin sistem tidak dapat dihapus.', 'error');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Hapus Akun Karyawan',
      message: `Apakah Anda yakin ingin menghapus akun "${user.nama}" (${user.nomor_telepon || user.email})?`,
      onConfirm: () => {
        deleteUser(user.id);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Manajemen Akun Karyawan &amp; Hak Akses
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {isSuperAdmin
              ? 'Super Admin dapat membuat akun Admin Toko maupun Karyawan ke seluruh cabang, atur shift, serta reset kata sandi.'
              : 'Admin Toko dapat mendaftarkan akun Karyawan untuk cabang toko sendiri, atur shift kerja, serta mereset kata sandi staf.'}
          </p>
        </div>

        <button
          id="btn-add-employee"
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Akun Baru</span>
        </button>
      </div>

      {/* Search & Branch Selection in 1 Unified Body */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 min-w-0 max-w-full">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 min-w-0">
          <div className="relative w-full sm:w-72 min-w-0">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama, email (Gmail), no HP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-600 font-medium"
            />
          </div>

          {isSuperAdmin && !activeStoreId && (
            <div className="relative flex items-center min-w-0 w-full sm:w-64 border border-slate-200 bg-slate-50 px-3 py-2 rounded-xl">
              <Building2 className="w-4 h-4 text-indigo-600 shrink-0 mr-2" />
              <div className="min-w-0 flex-1 relative flex items-center">
                <select
                  value={selectedStoreFilter}
                  onChange={(e) => setSelectedStoreFilter(e.target.value)}
                  className="w-full min-w-0 text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer truncate appearance-none pr-6"
                >
                  <option value="ALL">Semua Cabang Toko ({users.filter((u) => u.role !== 'SUPER_ADMIN' && u.id !== 'user-super').length})</option>
                  {stores.map((s) => {
                    const count = users.filter((u) => u.role !== 'SUPER_ADMIN' && u.id !== 'user-super' && u.store_id === s.id).length;
                    const cabangText = s.cabang && s.cabang !== '0' && s.cabang !== '()' && s.cabang !== '(0)' ? ` (${s.cabang})` : '';
                    return (
                      <option key={s.id} value={s.id}>
                        {s.nama_toko}{cabangText} ({count})
                      </option>
                    );
                  })}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 absolute right-0 pointer-events-none" />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
            {filteredUsers.length} Pengguna Terdaftar
          </span>
        </div>
      </div>

      {/* Grouped View by Store */}
      <div className="space-y-6">
        {storeGroups.map((group) => {
          const storeInfo = group.store;
          const userList = group.users;

          return (
            <div
              key={storeInfo.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden"
            >
              {/* Store Header Banner */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {storeInfo.nama_toko} {storeInfo.cabang && storeInfo.cabang !== '0' && storeInfo.cabang !== '()' && storeInfo.cabang !== '(0)' ? `(${storeInfo.cabang})` : ''}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {userList.length} personil terdaftar di cabang ini
                    </p>
                  </div>
                </div>
              </div>

              {/* Table of staff in this store (Desktop) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/60 border-b border-slate-200 text-slate-600 uppercase font-bold">
                    <tr>
                      <th className="py-3 px-4">Nama &amp; Email Akun</th>
                      <th className="py-3 px-4">No. WhatsApp</th>
                      <th className="py-3 px-4">Role Akses</th>
                      <th className="py-3 px-4">Status Akun</th>
                      <th className="py-3 px-4">Jadwal Shift</th>
                      <th className="py-3 px-4 text-right">Aksi &amp; Keamanan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {userList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400">
                          Tidak ada pengguna terdaftar pada cabang ini.
                        </td>
                      </tr>
                    ) : (
                      userList.map((u) => {
                        const assignedStore = stores.find((s) => s.id === u.store_id);
                        const jamMasuk = u.jam_masuk_standar || assignedStore?.jam_masuk_standar || '08:30';
                        const jamPulang = u.jam_pulang_standar || assignedStore?.jam_pulang_standar || '17:00';
                        const toleransi = u.toleransi_keterlambatan_menit ?? assignedStore?.toleransi_keterlambatan_menit ?? 0;
                        const phoneNum = u.nomor_telepon || u.no_hp || '-';

                        const canToggleStatus = isSuperAdmin
                          ? u.role !== 'SUPER_ADMIN'
                          : (isAdminToko && u.role === 'KARYAWAN' && u.store_id === userStoreId);
                        const canEditSchedule = isSuperAdmin || (isAdminToko && u.role === 'KARYAWAN');
                        const canResetPassword = isSuperAdmin || (isAdminToko && u.role === 'KARYAWAN' && u.store_id === userStoreId);
                        const canEditUser = isSuperAdmin || (isAdminToko && u.role === 'KARYAWAN' && u.store_id === userStoreId);
                        const canDeleteUser = isSuperAdmin && u.role !== 'SUPER_ADMIN';

                        return (
                          <tr key={u.id} className="hover:bg-slate-50">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs border border-slate-200 shrink-0 overflow-hidden shadow-2xs">
                                  {u.avatar || u.foto_profil ? (
                                    <img
                                      src={u.avatar || u.foto_profil}
                                      alt={u.nama}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    u.nama.charAt(0)
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-900">{u.nama.replace(/\s*\((\s*|0)\)/g, '').replace(/\s+0$/, '').trim()}</span>
                                    {u.must_change_password && (
                                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                        Wajib Ganti Sandi
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] font-semibold text-indigo-600 mt-0.5">
                                    {u.position || (u.role === 'ADMIN_TOKO' ? 'Kepala Toko' : 'Staf / Teknisi')}
                                  </p>
                                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                    <span className="text-[10px] text-slate-500 font-mono">{u.email || '-'}</span>
                                    {u.is_email_verified ? (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        Gmail Tertaut
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                        Belum Tertaut
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 font-mono text-slate-700 font-semibold">
                                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                                <span>{phoneNum}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                  u.role === 'SUPER_ADMIN'
                                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                    : u.role === 'ADMIN_TOKO'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                                }`}
                              >
                                {u.role === 'SUPER_ADMIN' ? 'SUPER ADMIN' : u.role === 'ADMIN_TOKO' ? 'ADMIN TOKO' : 'KARYAWAN'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] border ${
                                  u.status === 'AKTIF'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'AKTIF' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                {u.status === 'AKTIF' ? 'Aktif' : 'Nonaktif'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                <span className="font-mono font-semibold text-slate-800">
                                  {jamMasuk} - {jamPulang}
                                </span>
                                {toleransi > 0 && (
                                  <span className="text-[10px] text-slate-400 font-normal">
                                    (+{toleransi}m)
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {canToggleStatus && (
                                  <button
                                    onClick={() => handleToggleStatus(u)}
                                    className={`p-1.5 rounded-lg transition-colors cursor-pointer border ${
                                      u.status === 'AKTIF'
                                        ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                                        : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                    }`}
                                    title={u.status === 'AKTIF' ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                                  >
                                    {u.status === 'AKTIF' ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                                  </button>
                                )}
                                {canResetPassword && (
                                  <button
                                    onClick={() => handleOpenResetPasswordModal(u)}
                                    className="flex items-center gap-1 px-2.5 py-1 text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer border border-amber-200 text-[11px] font-semibold"
                                    title="Reset Password Akun"
                                  >
                                    <KeyRound className="w-3.5 h-3.5" />
                                    <span>Reset Sandi</span>
                                  </button>
                                )}
                                {canEditSchedule && (
                                  <button
                                    onClick={() => handleOpenShiftModal(u)}
                                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                    title="Atur Jam Shift Kerja"
                                  >
                                    <Clock className="w-4 h-4" />
                                  </button>
                                )}
                                {canEditUser && (
                                  <button
                                    onClick={() => handleOpenEdit(u)}
                                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                    title="Edit Pengguna"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                )}
                                {canDeleteUser && (
                                  <button
                                    onClick={() => handleDelete(u)}
                                    className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                    title="Hapus Pengguna"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Responsive Cards */}
              <div className="md:hidden p-3.5 space-y-3 bg-slate-50/60">
                {userList.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200/80 p-4">
                    Tidak ada pengguna terdaftar pada cabang ini.
                  </div>
                ) : (
                  userList.map((u) => {
                    const assignedStore = stores.find((s) => s.id === u.store_id);
                    const jamMasuk = u.jam_masuk_standar || assignedStore?.jam_masuk_standar || '08:30';
                    const jamPulang = u.jam_pulang_standar || assignedStore?.jam_pulang_standar || '17:00';
                    const toleransi = u.toleransi_keterlambatan_menit ?? assignedStore?.toleransi_keterlambatan_menit ?? 0;
                    const phoneNum = u.nomor_telepon || u.no_hp || '-';
                    const canToggleStatus = isSuperAdmin
                      ? u.role !== 'SUPER_ADMIN'
                      : (isAdminToko && u.role === 'KARYAWAN' && u.store_id === userStoreId);
                    const canEditSchedule = isSuperAdmin || (isAdminToko && u.role === 'KARYAWAN');
                    const canResetPassword = isSuperAdmin || (isAdminToko && u.role === 'KARYAWAN' && u.store_id === userStoreId);
                    const canEditUser = isSuperAdmin || (isAdminToko && u.role === 'KARYAWAN' && u.store_id === userStoreId);
                    const canDeleteUser = isSuperAdmin && u.role !== 'SUPER_ADMIN';

                    return (
                      <div key={u.id} className="p-4 space-y-3 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all overflow-hidden">
                        {/* Top Row: Role & Status Badges */}
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wide shrink-0 whitespace-nowrap ${
                                u.role === 'SUPER_ADMIN'
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : u.role === 'ADMIN_TOKO'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {u.role === 'SUPER_ADMIN' ? 'SUPER ADMIN' : u.role === 'ADMIN_TOKO' ? 'ADMIN TOKO' : 'KARYAWAN'}
                            </span>
                          </div>

                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 whitespace-nowrap ${
                              u.status === 'AKTIF'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${u.status === 'AKTIF' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            {u.status === 'AKTIF' ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </div>

                        {/* Middle: Avatar & Profile Info */}
                        <div className="flex items-start gap-3">
                          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm border border-slate-200 shrink-0 overflow-hidden shadow-2xs">
                            {u.avatar || u.foto_profil ? (
                              <img
                                src={u.avatar || u.foto_profil}
                                alt={u.nama}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              u.nama.charAt(0)
                            )}
                          </div>
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <h4 className="font-bold text-slate-900 text-sm leading-snug truncate">{u.nama.replace(/\s*\((\s*|0)\)/g, '').replace(/\s+0$/, '').trim()}</h4>
                            <p className="text-xs font-semibold text-indigo-600">
                              {u.position || (u.role === 'ADMIN_TOKO' ? 'Kepala Toko' : 'Staf / Teknisi')}
                            </p>
                            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                              <span className="text-[11px] text-slate-600 font-mono break-all">{u.email || '-'}</span>
                              {u.is_email_verified ? (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                                  Gmail Tertaut
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                                  Belum Tertaut
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 font-mono text-slate-600 text-[11px] pt-0.5">
                              <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>{phoneNum}</span>
                            </div>
                          </div>
                        </div>

                        {/* Shift Info */}
                        <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span className="font-mono text-slate-700 font-medium">
                              Shift: {jamMasuk} - {jamPulang}
                            </span>
                            {toleransi > 0 && (
                              <span className="text-[10px] text-slate-400">
                                (+{toleransi}m)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons: Clean Responsive Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 pt-1.5 border-t border-slate-100">
                          {canToggleStatus && (
                            <button
                              onClick={() => handleToggleStatus(u)}
                              className={`py-1.5 px-2 rounded-xl border transition-colors cursor-pointer text-xs flex items-center justify-center gap-1.5 ${
                                u.status === 'AKTIF'
                                  ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              }`}
                              title={u.status === 'AKTIF' ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                            >
                              {u.status === 'AKTIF' ? <PowerOff className="w-3.5 h-3.5 shrink-0" /> : <Power className="w-3.5 h-3.5 shrink-0" />}
                              <span className="text-[11px] font-semibold">{u.status === 'AKTIF' ? 'Nonaktifkan' : 'Aktifkan'}</span>
                            </button>
                          )}
                          {canResetPassword && (
                            <button
                              onClick={() => handleOpenResetPasswordModal(u)}
                              className="py-1.5 px-2 rounded-xl bg-amber-50 text-amber-700 font-semibold text-xs hover:bg-amber-100 border border-amber-200 cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <KeyRound className="w-3.5 h-3.5 shrink-0" />
                              <span className="text-[11px]">Reset Sandi</span>
                            </button>
                          )}
                          {canEditSchedule && (
                            <button
                              onClick={() => handleOpenShiftModal(u)}
                              className="py-1.5 px-2 rounded-xl bg-indigo-50 text-indigo-700 font-semibold text-xs hover:bg-indigo-100 border border-indigo-200/60 cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <Clock className="w-3.5 h-3.5 shrink-0" />
                              <span className="text-[11px]">Shift</span>
                            </button>
                          )}
                          {canEditUser && (
                            <button
                              onClick={() => handleOpenEdit(u)}
                              className="py-1.5 px-2 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200 border border-slate-200 cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <Edit2 className="w-3.5 h-3.5 shrink-0" />
                              <span className="text-[11px]">Edit</span>
                            </button>
                          )}
                          {canDeleteUser && (
                            <button
                              onClick={() => handleDelete(u)}
                              className="py-1.5 px-2 rounded-xl bg-rose-50 text-rose-700 font-semibold text-xs hover:bg-rose-100 border border-rose-200 cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <Trash2 className="w-3.5 h-3.5 shrink-0" />
                              <span className="text-[11px]">Hapus</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Admin Reset Password */}
      {isResetPasswordModalOpen && targetResetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-7 shadow-2xl border border-slate-100 max-h-[92dvh] flex flex-col my-auto overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shrink-0">
                  <KeyRound className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Reset Password Pengguna
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {targetResetUser.nama} ({targetResetUser.role})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsResetPasswordModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteResetPassword} className="space-y-4 text-xs">
              <div className="p-3 bg-amber-50 text-amber-800 rounded-xl border border-amber-200 text-[11px] leading-relaxed">
                Pengguna akan diberikan <strong>password sementara</strong> dan diwajibkan mengganti password saat login berikutnya.
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Password Sementara Baru <span className="text-rose-500">*</span>
                </label>
                <div className="relative rounded-xl border border-slate-200 bg-[#f8fafc] focus-within:bg-white focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-100 transition-all px-3.5 py-2.5 flex items-center gap-3">
                  <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type={showTempPassword ? 'text' : 'password'}
                    required
                    value={tempPasswordInput}
                    onChange={(e) => setTempPasswordInput(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full bg-transparent border-none outline-none focus:ring-0 text-xs sm:text-sm text-slate-800 placeholder-slate-400 font-medium py-0"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTempPassword(!showTempPassword)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showTempPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsResetPasswordModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-xs cursor-pointer"
                >
                  Terapkan Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Quick Shift Setting per User */}
      {isShiftModalOpen && targetShiftUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-100 max-h-[92dvh] flex flex-col my-auto overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600 shrink-0" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Atur Shift: {targetShiftUser.nama}
                  </h3>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <span className="font-semibold">{targetShiftUser.role}</span> &bull;
                    <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>{targetShiftUser.nomor_telepon || targetShiftUser.no_hp}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsShiftModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveShift} className="space-y-4 text-xs mt-3">
              <div className="grid grid-cols-2 gap-3 items-start">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5 h-8 flex items-center leading-tight">
                    Jam Hadir / Masuk (WIB)
                  </label>
                  <input
                    type="time"
                    required
                    value={shiftJamMasuk}
                    onChange={(e) => setShiftJamMasuk(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-semibold text-slate-800 focus:border-indigo-600"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Lewat jam ini = Terlambat</p>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5 h-8 flex items-center leading-tight">
                    Jam Pulang (WIB)
                  </label>
                  <input
                    type="time"
                    required
                    value={shiftJamPulang}
                    onChange={(e) => setShiftJamPulang(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-semibold text-slate-800 focus:border-indigo-600"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Selesai jam kerja</p>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Toleransi Keterlambatan (Menit)
                </label>
                <select
                  value={shiftToleransi}
                  onChange={(e) => setShiftToleransi(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:border-indigo-600"
                >
                  <option value={0}>0 Menit (Tepat Waktu)</option>
                  <option value={5}>5 Menit</option>
                  <option value={10}>10 Menit</option>
                  <option value={15}>15 Menit</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsShiftModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs cursor-pointer"
                >
                  Simpan Jadwal Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add / Edit User */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl border border-slate-100 max-h-[92dvh] flex flex-col my-auto">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingUser ? 'Edit Data Karyawan / Staf Toko' : 'Tambah Akun Karyawan / Admin Toko'}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {isSuperAdmin
                    ? 'Super Admin dapat mendaftarkan akun Admin Toko atau Karyawan ke cabang toko'
                    : 'Admin Toko hanya dapat mendaftarkan akun Karyawan untuk cabang toko sendiri'}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 overflow-y-auto flex-1 pr-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Rian Pratama"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email (Gmail)
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="nama.karyawan@gmail.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase(), username: e.target.value.toLowerCase() })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 font-medium"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    ID akun dibuat menggunakan alamat Gmail pemilik akun (status awal: Belum Terverifikasi / Belum Tertaut).
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    No. Handphone / WA
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="081234567890"
                    value={formData.nomor_telepon}
                    onChange={(e) => setFormData({ ...formData, nomor_telepon: e.target.value.replace(/\D/g, '') })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 font-mono font-medium"
                  />
                </div>
              </div>

              {/* Initial Password (for new user only) */}
              {!editingUser && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password Awal Akun
                  </label>
                  <div className="relative rounded-xl border border-slate-200 bg-[#f8fafc] focus-within:bg-white focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-100 transition-all px-3 py-2 flex items-center gap-2.5">
                    <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type={showInitialPass ? 'text' : 'password'}
                      required
                      value={formData.initialPassword || ''}
                      onChange={(e) => setFormData({ ...formData, initialPassword: e.target.value })}
                      placeholder="Minimal 6 karakter (default: password123)"
                      className="w-full bg-transparent border-none outline-none focus:ring-0 text-xs text-slate-800 font-medium py-0"
                    />
                    <button
                      type="button"
                      onClick={() => setShowInitialPass(!showInitialPass)}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showInitialPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Password akan otomatis dienkripsi hash dan pengguna <strong>wajib mengganti password</strong> saat login pertama.
                  </p>
                </div>
              )}

              {/* Status Peran Kerja / Jabatan Spesifik */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status Peran Kerja / Jabatan
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Teknisi iPhone Senior, Staff Frontdesk & Service"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Role Akses</label>
                  {isSuperAdmin ? (
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 bg-white font-medium"
                    >
                      <option value="ADMIN_TOKO">ADMIN TOKO</option>
                      <option value="KARYAWAN">KARYAWAN</option>
                    </select>
                  ) : (
                    <div className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-100 font-bold text-slate-700">
                      KARYAWAN
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Penempatan Toko</label>
                  {isSuperAdmin ? (
                    <select
                      value={formData.store_id}
                      onChange={(e) => setFormData({ ...formData, store_id: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 bg-white font-medium"
                    >
                      {stores.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nama_toko} ({s.cabang})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-100 font-bold text-slate-700 truncate">
                      {stores.find((s) => s.id === userStoreId)?.nama_toko || 'Cabang Toko Anda'}
                    </div>
                  )}
                </div>
              </div>

              {/* Individual Shift Settings */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <p className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  Jadwal Waktu Kerja Pengguna Ini
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">Jam Masuk (WIB)</label>
                    <input
                      type="time"
                      value={formData.jam_masuk_standar}
                      onChange={(e) => setFormData({ ...formData, jam_masuk_standar: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white font-mono font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">Jam Pulang (WIB)</label>
                    <input
                      type="time"
                      value={formData.jam_pulang_standar}
                      onChange={(e) => setFormData({ ...formData, jam_pulang_standar: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white font-mono font-semibold"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 shrink-0 mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
                >
                  Simpan Pengguna
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmVariant={confirmModal.confirmVariant || 'danger'}
        confirmText={confirmModal.confirmText || 'Konfirmasi'}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

