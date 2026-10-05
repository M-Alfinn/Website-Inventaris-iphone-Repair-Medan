import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Store } from '../../types';
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  MapPin,
  Phone,
  Clock,
  ArrowRight,
  ShieldCheck,
  Users,
  Package,
  Boxes,
  BadgePercent,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Power,
  PowerOff,
  CalendarCheck,
  Sparkles,
  Info,
  Camera,
  Upload,
  Image as ImageIcon,
  ArrowLeft,
  Move,
} from 'lucide-react';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { PhotoAdjustModal } from '../common/PhotoAdjustModal';
import { formatRupiah } from '../../mockData';
import { compressAndConvertToBase64 } from '../../utils/imageUtils';

export const StoresPage: React.FC = () => {
  const {
    stores,
    activeStoreId,
    activeStore,
    currentUser,
    users,
    inventory,
    addStore,
    updateStore,
    deleteStore,
    toggleStoreStatus,
    selectStore,
    showToast,
  } = useApp();

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isAdminToko = currentUser?.role === 'ADMIN_TOKO';

  // Search filter for Main Dashboard Multi-Store view
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states for Store Editing & Adding
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [operationalOpen, setOperationalOpen] = useState('09:00');
  const [operationalClose, setOperationalClose] = useState('21:00');

  const [formData, setFormData] = useState({
    nama_toko: '',
    cabang: '',
    alamat: '',
    nomor_telepon: '',
    jam_operasional: '09:00 - 21:00 WIB',
    jam_masuk_standar: '08:30',
    jam_pulang_standar: '17:00',
    toleransi_keterlambatan_menit: 0,
    pic_name: '',
    foto_profil: '',
    status: 'AKTIF' as 'AKTIF' | 'NONAKTIF',
  });

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

  const [warningModal, setWarningModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    userList?: string[];
  }>({
    isOpen: false,
    title: '',
    message: '',
  });

  // Photo Adjust Modal State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingPhotoSrc, setAdjustingPhotoSrc] = useState('');

  // Handler for uploading store photo
  const handleStorePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Gagal Memuat Foto', 'File yang dipilih harus berupa gambar (JPG, PNG, WebP).', 'error');
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

  const handleSaveAdjustedStorePhoto = (adjustedBase64: string) => {
    setFormData((prev) => ({ ...prev, foto_profil: adjustedBase64 }));
    showToast('Foto Berhasil Disesuaikan', 'Posisi dan tampilan foto cabang toko berhasil disimpan.', 'success');
  };

  const handleRemoveStorePhoto = () => {
    setFormData((prev) => ({ ...prev, foto_profil: '' }));
  };

  const renderPhotoUploadField = () => (
    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
      <label className="block text-xs font-bold text-slate-700">
        Foto Profil / Logo Cabang Toko
      </label>
      <div className="flex items-center gap-3.5">
        <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center overflow-hidden shrink-0">
          {formData.foto_profil ? (
            <img
              src={formData.foto_profil}
              alt="Preview Cabang"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-400">
              <Building2 className="w-6 h-6 text-slate-300" />
              <span className="text-[9px] font-semibold mt-0.5">Tanpa Foto</span>
            </div>
          )}
        </div>
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>{formData.foto_profil ? 'Ganti Foto' : 'Unggah Foto'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleStorePhotoChange}
                className="hidden"
              />
            </label>
            {formData.foto_profil && (
              <button
                type="button"
                onClick={handleRemoveStorePhoto}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 text-xs font-medium transition-colors cursor-pointer"
              >
                Hapus Foto
              </button>
            )}
          </div>
          <p className="text-[11px] text-slate-400">
            Format: JPG, PNG, WebP. Tampil di dashboard, header, dan daftar toko.
          </p>
        </div>
      </div>
    </div>
  );

  // Handlers for Add / Edit
  const handleOpenAdd = () => {
    setEditingStore(null);
    setOperationalOpen('09:00');
    setOperationalClose('21:00');
    setFormData({
      nama_toko: '',
      cabang: '',
      alamat: '',
      nomor_telepon: '',
      jam_operasional: '09:00 - 21:00 WIB',
      jam_masuk_standar: '08:30',
      jam_pulang_standar: '17:00',
      toleransi_keterlambatan_menit: 0,
      pic_name: '',
      foto_profil: '',
      status: 'AKTIF',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (storeToEdit: Store) => {
    setEditingStore(storeToEdit);
    const timeMatch = (storeToEdit.jam_operasional || '09:00 - 21:00').match(/(\d{2}:\d{2}).*?(\d{2}:\d{2})/);
    const openTime = timeMatch ? timeMatch[1] : '09:00';
    const closeTime = timeMatch ? timeMatch[2] : '21:00';
    setOperationalOpen(openTime);
    setOperationalClose(closeTime);
    setFormData({
      nama_toko: storeToEdit.nama_toko,
      cabang: storeToEdit.cabang,
      alamat: storeToEdit.alamat,
      nomor_telepon: (storeToEdit.nomor_telepon || '').replace(/\D/g, ''),
      jam_operasional: storeToEdit.jam_operasional || `${openTime} - ${closeTime} WIB`,
      jam_masuk_standar: storeToEdit.jam_masuk_standar || '08:30',
      jam_pulang_standar: storeToEdit.jam_pulang_standar || '17:00',
      toleransi_keterlambatan_menit: storeToEdit.toleransi_keterlambatan_menit ?? 0,
      pic_name: storeToEdit.pic_name || '',
      foto_profil: storeToEdit.foto_profil || storeToEdit.logo || '',
      status: storeToEdit.status || 'AKTIF',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama_toko.trim()) {
      showToast('Validasi Gagal', 'Nama toko wajib diisi.', 'warning');
      return;
    }

    const cleanPhone = formData.nomor_telepon.replace(/\D/g, '');

    const payload = {
      nama_toko: formData.nama_toko.trim(),
      cabang: formData.cabang.trim() || 'Pusat',
      alamat: formData.alamat.trim(),
      nomor_telepon: cleanPhone,
      jam_operasional: formData.jam_operasional.trim(),
      jam_masuk_standar: formData.jam_masuk_standar,
      jam_pulang_standar: formData.jam_pulang_standar,
      toleransi_keterlambatan_menit: Number(formData.toleransi_keterlambatan_menit) || 0,
      pic_name: formData.pic_name.trim() || 'Admin Cabang',
      foto_profil: formData.foto_profil || undefined,
      logo: formData.foto_profil || undefined,
      status: formData.status,
    };

    if (editingStore) {
      if (!isSuperAdmin && editingStore.id !== currentUser?.store_id) {
        showToast('Akses Ditolak', 'Anda hanya memiliki izin untuk mengedit profil cabang toko Anda sendiri.', 'error');
        return;
      }
      updateStore(editingStore.id, payload);
    } else {
      if (!isSuperAdmin) {
        showToast('Akses Ditolak', 'Hanya Super Admin yang berwenang menambahkan cabang baru.', 'error');
        return;
      }
      addStore(payload);
    }
    setIsModalOpen(false);
  };

  const handleToggleStatus = (store: Store) => {
    if (!isSuperAdmin) {
      showToast('Akses Ditolak', 'Hanya Super Admin yang berwenang mengubah status operasional cabang.', 'error');
      return;
    }

    if (store.status === 'AKTIF') {
      setConfirmModal({
        isOpen: true,
        title: `Nonaktifkan Cabang ${store.nama_toko}?`,
        message: `Apakah Anda yakin ingin menonaktifkan cabang "${store.nama_toko} (${store.cabang})"?\n\nToko tidak dapat digunakan dan akun Admin/Karyawan yang terhubung TIDAK DAPAT LOGIN sampai diaktifkan kembali.\n\nSeluruh data inventaris, transaksi, return, dan riwayat absensi toko tetap aman tersimpan di sistem dan dapat diaktifkan kembali oleh Super Admin kapan saja.`,
        confirmText: 'Nonaktifkan Toko',
        confirmVariant: 'danger',
        onConfirm: () => {
          toggleStoreStatus(store.id, 'NONAKTIF');
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        },
      });
    } else {
      setConfirmModal({
        isOpen: true,
        title: `Aktifkan Kembali Cabang ${store.nama_toko}?`,
        message: `Apakah Anda yakin ingin mengaktifkan kembali cabang "${store.nama_toko} (${store.cabang})"?\n\nToko akan kembali beroperasi normal dan seluruh akun Admin/Karyawan yang terhubung dapat login kembali ke sistem.`,
        confirmText: 'Aktifkan Toko',
        confirmVariant: 'success',
        onConfirm: () => {
          toggleStoreStatus(store.id, 'AKTIF');
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        },
      });
    }
  };

  const handleDeletePermanent = (store: Store) => {
    if (!isSuperAdmin) {
      showToast('Akses Ditolak', 'Hanya Super Admin yang berwenang menghapus cabang toko secara permanen.', 'error');
      return;
    }

    // 1. Cek apakah masih ada Admin atau Karyawan yang terhubung
    const connectedUsers = users.filter((u) => u.store_id === store.id);
    if (connectedUsers.length > 0) {
      setWarningModal({
        isOpen: true,
        title: 'Cabang Toko Tidak Dapat Dihapus',
        message: `Cabang "${store.nama_toko} (${store.cabang})" tidak dapat dihapus karena masih ada ${connectedUsers.length} akun Admin/Karyawan yang terhubung dengan cabang ini. Sistem melarang penghapusan cabang yang masih memiliki akun pengguna terhubung demi menjaga integritas data.`,
        userList: connectedUsers.map(
          (u) => `${(u.nama || u.name || '').replace(/\s*\((\s*|0)\)/g, '').replace(/\s+0$/, '').trim()} (${u.role === 'ADMIN_TOKO' ? 'Admin Toko' : 'Karyawan'}) • Status: ${u.status || 'AKTIF'}`
        ),
      });
      return;
    }

    // 2. Jika tidak ada akun terhubung, konfirmasi penghapusan permanen
    setConfirmModal({
      isOpen: true,
      title: `Hapus Permanen Cabang ${store.nama_toko}?`,
      message: `PERINGATAN: Tindakan penghapusan permanen ini TIDAK DAPAT DIBATALKAN!\n\nSeluruh data yang terkait langsung dengan cabang "${store.nama_toko} (${store.cabang})" seperti katalog inventaris cabang, mutasi transaksi barang masuk/keluar/rusak, klaim return, dan riwayat absensi cabang akan dihapus secara permanen dari sistem.\n\nApakah Anda benar-benar yakin ingin melanjutkan?`,
      confirmText: 'Ya, Hapus Permanen',
      confirmVariant: 'danger',
      onConfirm: async () => {
        await deleteStore(store.id);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Helper modals
  const renderWarningModal = () => {
    if (!warningModal.isOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
        <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {warningModal.title}
              </h3>
              <p className="text-[11px] text-slate-500">
                Proteksi Keamanan Relasi Akun Pengguna
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            {warningModal.message}
          </p>

          {warningModal.userList && warningModal.userList.length > 0 && (
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 max-h-48 overflow-y-auto text-xs">
              <div className="text-[11px] font-bold text-slate-700">
                Daftar Akun yang Masih Terhubung ({warningModal.userList.length}):
              </div>
              {warningModal.userList.map((usrText, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span className="truncate">{usrText}</span>
                </div>
              ))}
            </div>
          )}

          <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-[11px] text-amber-800 leading-relaxed">
            💡 <strong>Solusi:</strong> Pindahkan akun-akun di atas ke cabang lain melalui menu <strong>Data Karyawan</strong> sebelum menghapus cabang ini secara permanen.
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setWarningModal({ isOpen: false, title: '', message: '' })}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
            >
              Mengerti &amp; Tutup
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderConfirmModal = () => (
    <ConfirmationModal
      isOpen={confirmModal.isOpen}
      title={confirmModal.title}
      message={confirmModal.message}
      variant={confirmModal.confirmVariant || 'danger'}
      confirmText={confirmModal.confirmText || 'Konfirmasi'}
      onConfirm={confirmModal.onConfirm}
      onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
    />
  );

  const renderPhotoAdjustModal = () => (
    <PhotoAdjustModal
      isOpen={isAdjustModalOpen}
      onClose={() => setIsAdjustModalOpen(false)}
      imageSrc={adjustingPhotoSrc}
      cropShape="square"
      title="Atur Posisi & Tampilan Foto Cabang Toko"
      onSave={handleSaveAdjustedStorePhoto}
    />
  );

  // ==========================================
  // VIEW 1: PROFIL TOKO TUNGGAL
  // Admin Toko strictly sees their assigned store; Super Admin sees activeStore if selected
  // ==========================================
  const singleStoreTarget = isSuperAdmin
    ? (activeStore || stores.find((s) => s.id === activeStoreId))
    : (currentUser?.store_id ? stores.find((s) => s.id === currentUser.store_id) : null);

  const canEditStore = isSuperAdmin || (isAdminToko && singleStoreTarget?.id === currentUser?.store_id);

  if (!isSuperAdmin || (activeStoreId && singleStoreTarget)) {
    if (!singleStoreTarget) {
      return (
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-lg mx-auto my-12 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <Building2 className="w-7 h-7" />
            </div>
            <h2 className="text-base font-bold text-slate-800">Cabang Belum Ditugaskan / Tidak Ditemukan</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Akun Anda belum memiliki cabang toko yang ditugaskan atau cabang toko Anda sedang dinonaktifkan oleh administrator. Silakan hubungi Super Admin untuk penugasan cabang resmi.
            </p>
          </div>
          {renderWarningModal()}
          {renderConfirmModal()}
          {renderPhotoAdjustModal()}
        </div>
      );
    }

    const storeEmployees = users.filter((u) => u.store_id === singleStoreTarget.id);
    const storeInventory = inventory.filter((i) => i.store_id === singleStoreTarget.id);
    const totalUnits = storeInventory.reduce((acc, curr) => acc + (curr.stok || 0), 0);
    const totalAssetValue = storeInventory.reduce((acc, curr) => acc + (curr.stok * curr.harga_beli), 0);

    return (
      <div className="space-y-6">
        {/* Header Profil Toko */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs min-w-0 max-w-full overflow-hidden">
          <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 min-w-0 flex-1 w-full">
            <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold overflow-hidden border border-slate-200 shrink-0 shadow-xs">
              {singleStoreTarget.foto_profil || singleStoreTarget.logo ? (
                <img
                  src={singleStoreTarget.foto_profil || singleStoreTarget.logo}
                  alt={singleStoreTarget.nama_toko}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="w-8 h-8 text-indigo-500" />
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
                <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200 flex items-center gap-1.5 shrink-0">
                  <Building2 className="w-3.5 h-3.5" />
                  Profil Cabang
                </span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border shrink-0 ${
                  singleStoreTarget.status === 'AKTIF'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${singleStoreTarget.status === 'AKTIF' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  {singleStoreTarget.status === 'AKTIF' ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>
              <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight break-words mt-0.5">
                Profil {singleStoreTarget.nama_toko}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 break-words mt-0.5">
                {singleStoreTarget.cabang} &bull; {singleStoreTarget.alamat}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isSuperAdmin && (
              <>
                <button
                  onClick={() => selectStore(null)}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer shrink-0"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Semua Cabang</span>
                </button>
                <button
                  onClick={() => handleToggleStatus(singleStoreTarget)}
                  className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border text-xs font-semibold shadow-2xs transition-colors cursor-pointer shrink-0 ${
                    singleStoreTarget.status === 'AKTIF'
                      ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                  title={singleStoreTarget.status === 'AKTIF' ? 'Nonaktifkan Cabang Toko' : 'Aktifkan Kembali Cabang Toko'}
                >
                  {singleStoreTarget.status === 'AKTIF' ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                  <span>{singleStoreTarget.status === 'AKTIF' ? 'Nonaktifkan' : 'Aktifkan Cabang'}</span>
                </button>
                <button
                  onClick={() => handleDeletePermanent(singleStoreTarget)}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold shadow-2xs transition-colors cursor-pointer shrink-0"
                  title="Hapus Cabang Secara Permanen"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Permanen</span>
                </button>
              </>
            )}
            {canEditStore && (
              <button
                id="btn-edit-active-store-profile"
                onClick={() => handleOpenEdit(singleStoreTarget)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
              >
                <Edit2 className="w-4 h-4" />
                <span>Edit Profil Toko</span>
              </button>
            )}
          </div>
        </div>

        {/* Banner Peringatan jika Cabang Nonaktif */}
        {singleStoreTarget.status === 'NONAKTIF' && (
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-start gap-3 text-rose-800 text-xs">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Cabang Toko Sedang Dinonaktifkan</p>
              <p className="text-rose-700 mt-0.5 leading-relaxed">
                Cabang ini berstatus <strong>Nonaktif</strong>. Akun Admin Toko dan Karyawan yang terhubung tidak dapat login ke sistem. Seluruh data inventaris, riwayat transaksi, dan absensi tetap tersimpan aman. Super Admin dapat mengaktifkan kembali cabang ini kapan saja.
              </p>
            </div>
          </div>
        )}

        {/* Quick Stat Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total Karyawan</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{storeEmployees.length}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Teknisi & Staf Cabang</p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Jenis Sparepart</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{storeInventory.length}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Item Terkatalog</p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total Unit Stok</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Boxes className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{totalUnits.toLocaleString('id-ID')}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Unit Fisik di Toko</p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Nilai Aset Stok</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <BadgePercent className="w-4 h-4" />
              </div>
            </div>
            <p className="text-lg sm:text-xl font-bold text-slate-900 mt-2 truncate">
              {formatRupiah(totalAssetValue)}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Total Nilai Modal</p>
          </div>
        </div>

        {/* Detail Information Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: Informasi Toko & Kontak */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Informasi Cabang & Kontak</h3>
              </div>
            </div>

            <div className="space-y-3 text-xs divide-y divide-slate-100">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 py-2 first:pt-0">
                <span className="text-slate-500 font-medium sm:col-span-1">Nama Toko</span>
                <span className="font-bold text-slate-800 sm:col-span-2 text-left">{singleStoreTarget.nama_toko}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 py-2">
                <span className="text-slate-500 font-medium sm:col-span-1">Nama Cabang / Wilayah</span>
                <span className="font-bold text-slate-800 sm:col-span-2 text-left">{singleStoreTarget.cabang}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 py-2">
                <span className="text-slate-500 font-medium sm:col-span-1">Alamat Lengkap</span>
                <span className="font-medium text-slate-800 sm:col-span-2 text-left leading-relaxed">{singleStoreTarget.alamat}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 py-2 items-center">
                <span className="text-slate-500 font-medium sm:col-span-1">Nomor WhatsApp / Kontak CS</span>
                <div className="flex items-center gap-1.5 font-bold text-slate-900 sm:col-span-2 text-left">
                  <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{singleStoreTarget.nomor_telepon || '-'}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 py-2">
                <span className="text-slate-500 font-medium sm:col-span-1">Penanggung Jawab (PIC)</span>
                <span className="font-bold text-slate-800 sm:col-span-2 text-left">{singleStoreTarget.pic_name || 'Admin Toko'}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 py-2 items-center">
                <span className="text-slate-500 font-medium sm:col-span-1">Status Operasional</span>
                <div className="sm:col-span-2 text-left">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                    singleStoreTarget.status === 'AKTIF'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${singleStoreTarget.status === 'AKTIF' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    {singleStoreTarget.status === 'AKTIF' ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Jam Operasional & Standar Presensi */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Jam Operasional & Standar Kerja</h3>
              </div>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                Shift & Presensi
              </span>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between py-1 border-b border-slate-50 gap-1">
                <span className="text-slate-500 font-medium">Jam Buka Operasional Toko</span>
                <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                  {singleStoreTarget.jam_operasional}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between py-1 border-b border-slate-50 gap-1">
                <span className="text-slate-500 font-medium">Jam Masuk Standar Karyawan</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                  {singleStoreTarget.jam_masuk_standar || '08:30'} WIB
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between py-1 border-b border-slate-50 gap-1">
                <span className="text-slate-500 font-medium">Jam Pulang Standar Karyawan</span>
                <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {singleStoreTarget.jam_pulang_standar || '17:00'} WIB
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between py-1 border-b border-slate-50 gap-1">
                <span className="text-slate-500 font-medium">Toleransi Keterlambatan</span>
                <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                  {singleStoreTarget.toleransi_keterlambatan_menit ?? 0} Menit
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <span>
                  Pengaturan jam standar ini digunakan sebagai acuan validasi keterlambatan dan waktu absen pulang bagi seluruh teknisi & staf di cabang {singleStoreTarget.nama_toko}.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Daftar Staf & Teknisi di Cabang Ini */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Staf & Teknisi Bertugas ({storeEmployees.length} Orang)
              </h3>
            </div>
          </div>

          {storeEmployees.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              Belum ada karyawan yang ditugaskan di cabang ini.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {storeEmployees.map((emp) => (
                <div
                  key={emp.id}
                  className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0 overflow-hidden border border-slate-200">
                    {emp.avatar || emp.foto_profil ? (
                      <img
                        src={emp.avatar || emp.foto_profil}
                        alt={emp.nama || emp.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (emp.nama || emp.name || 'U').substring(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">{(emp.nama || emp.name || '').replace(/\s*\((\s*|0)\)/g, '').replace(/\s+0$/, '').trim()}</p>
                    <p className="text-[11px] text-slate-500 truncate">{emp.position || 'Staf / Teknisi'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">
                        {emp.role === 'ADMIN_TOKO' ? 'Admin Toko' : 'Karyawan'}
                      </span>
                      {emp.nomor_telepon && (
                        <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                          <Phone className="w-2.5 h-2.5" />
                          {emp.nomor_telepon}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Edit Store Profile Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-100 max-h-[88dvh] overflow-y-auto my-auto space-y-4">
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-700" />
                  <h3 className="text-base font-bold text-slate-900">
                    Edit Profil {singleStoreTarget.nama_toko}
                  </h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {renderPhotoUploadField()}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nama Toko <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Toko A"
                      value={formData.nama_toko}
                      onChange={(e) => setFormData({ ...formData, nama_toko: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nama Cabang / Wilayah <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Cabang Medan"
                      value={formData.cabang}
                      onChange={(e) => setFormData({ ...formData, cabang: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Alamat Lengkap <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Jl. Raya No..."
                    value={formData.alamat}
                    onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      No. WhatsApp CS <span className="text-slate-400 font-normal">(Khusus Angka)</span>
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      required
                      placeholder="Contoh: 081234567890"
                      value={formData.nomor_telepon}
                      onChange={(e) => {
                        const numericOnly = e.target.value.replace(/\D/g, '');
                        setFormData({ ...formData, nomor_telepon: numericOnly });
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Jam Operasional Toko
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="08:30 - 20:00 WIB"
                      value={formData.jam_operasional}
                      onChange={(e) => setFormData({ ...formData, jam_operasional: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Jadwal Shift & Standar Presensi Toko</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Jam Masuk</label>
                      <input
                        type="time"
                        value={formData.jam_masuk_standar}
                        onChange={(e) => setFormData({ ...formData, jam_masuk_standar: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Jam Pulang</label>
                      <input
                        type="time"
                        value={formData.jam_pulang_standar}
                        onChange={(e) => setFormData({ ...formData, jam_pulang_standar: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Toleransi (Menit)</label>
                      <input
                        type="number"
                        min="0"
                        max="60"
                        value={formData.toleransi_keterlambatan_menit}
                        onChange={(e) => setFormData({ ...formData, toleransi_keterlambatan_menit: Number(e.target.value) || 0 })}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">PIC / Penanggung Jawab</label>
                    <input
                      type="text"
                      placeholder="Nama PIC"
                      value={formData.pic_name}
                      onChange={(e) => setFormData({ ...formData, pic_name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Status Cabang</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 focus:outline-none bg-white"
                    >
                      <option value="AKTIF">AKTIF</option>
                      <option value="NONAKTIF">NONAKTIF</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
                  >
                    Simpan Perubahan Profil
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {renderWarningModal()}
        {renderConfirmModal()}
        {renderPhotoAdjustModal()}
      </div>
    );
  }

  // ==========================================
  // VIEW 2: MANAJEMEN CABANG TOKO (Super Admin di Dashboard Utama)
  // ==========================================
  const filteredStores = stores.filter(
    (s) =>
      s.nama_toko.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.cabang.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.alamat.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Manajemen Cabang Toko */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Total: {stores.length} Cabang</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1.5">
            Manajemen Cabang Toko
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Kelola data cabang, alamat, kontak WhatsApp, jam operasional, dan buka dashboard masing-masing toko.
          </p>
        </div>

        {isSuperAdmin && (
          <button
            id="btn-add-store"
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Cabang Baru</span>
          </button>
        )}
      </div>

      {/* Search Filter Bar */}
      <div className="flex items-center bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama toko, nama cabang, atau alamat..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs border border-transparent rounded-xl focus:border-slate-200 focus:outline-none"
          />
        </div>
      </div>

      {/* Grid of Stores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredStores.map((store) => {
          const storeEmployeeCount = users.filter((u) => u.store_id === store.id).length;
          const storeInventoryCount = inventory.filter((i) => i.store_id === store.id).length;

          return (
            <div
              key={store.id}
              className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3 gap-2">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold overflow-hidden border border-slate-200 shrink-0 shadow-2xs">
                      {store.foto_profil || store.logo ? (
                        <img
                          src={store.foto_profil || store.logo}
                          alt={store.nama_toko}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Building2 className="w-6 h-6 text-indigo-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-bold text-slate-900 truncate">{store.nama_toko}</h3>
                      <p className="text-xs font-semibold text-slate-400 truncate">{store.cabang}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 shrink-0 ${
                    store.status === 'AKTIF'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${store.status === 'AKTIF' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    {store.status === 'AKTIF' ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-600 my-4 pt-3 border-t border-slate-100">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{store.alamat}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{store.nomor_telepon || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{store.jam_operasional}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500 py-2 border-t border-slate-100">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    {storeEmployeeCount} Karyawan
                  </span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1">
                    <Package className="w-3.5 h-3.5 text-slate-400" />
                    {storeInventoryCount} Sparepart
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                <button
                  onClick={() => selectStore(store.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  <span>Buka Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleToggleStatus(store)}
                  className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                    store.status === 'AKTIF'
                      ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                  title={store.status === 'AKTIF' ? 'Nonaktifkan Cabang' : 'Aktifkan Kembali Cabang'}
                >
                  {store.status === 'AKTIF' ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleOpenEdit(store)}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer border border-transparent"
                  title="Edit Cabang"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeletePermanent(store)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer border border-transparent"
                  title="Hapus Permanen Cabang"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Add / Edit Store (Main Dashboard View) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 py-6 sm:py-8 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl border border-slate-100 max-h-[85vh] overflow-y-auto my-auto space-y-4">
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingStore ? `Edit Cabang: ${editingStore.nama_toko}` : 'Tambah Cabang Toko Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {renderPhotoUploadField()}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Toko</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Toko F"
                    value={formData.nama_toko}
                    onChange={(e) => setFormData({ ...formData, nama_toko: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Cabang / Wilayah</label>
                  <input
                    type="text"
                    required
                    placeholder="Cabang Kemang"
                    value={formData.cabang}
                    onChange={(e) => setFormData({ ...formData, cabang: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Alamat Lengkap</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Jl. Raya No..."
                  value={formData.alamat}
                  onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    No. WhatsApp / Telepon
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    placeholder="081234567890"
                    value={formData.nomor_telepon}
                    onChange={(e) => {
                      const numericOnly = e.target.value.replace(/\D/g, '');
                      setFormData({ ...formData, nomor_telepon: numericOnly });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jam Operasional Toko</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="time"
                      value={operationalOpen}
                      onChange={(e) => {
                        const val = e.target.value;
                        setOperationalOpen(val);
                        setFormData((prev) => ({
                          ...prev,
                          jam_operasional: `${val} - ${operationalClose} WIB`,
                        }));
                      }}
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:border-indigo-600 focus:outline-none font-medium"
                    />
                    <span className="text-xs text-slate-400 font-semibold px-0.5">s/d</span>
                    <input
                      type="time"
                      value={operationalClose}
                      onChange={(e) => {
                        const val = e.target.value;
                        setOperationalClose(val);
                        setFormData((prev) => ({
                          ...prev,
                          jam_operasional: `${operationalOpen} - ${val} WIB`,
                        }));
                      }}
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:border-indigo-600 focus:outline-none font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Jadwal Shift & Standar Presensi Cabang</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Jam Masuk</label>
                    <input
                      type="time"
                      value={formData.jam_masuk_standar}
                      onChange={(e) => setFormData({ ...formData, jam_masuk_standar: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Jam Pulang</label>
                    <input
                      type="time"
                      value={formData.jam_pulang_standar}
                      onChange={(e) => setFormData({ ...formData, jam_pulang_standar: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Toleransi (Menit)</label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={formData.toleransi_keterlambatan_menit}
                      onChange={(e) => setFormData({ ...formData, toleransi_keterlambatan_menit: Number(e.target.value) || 0 })}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">PIC / Penanggung Jawab</label>
                  <input
                    type="text"
                    placeholder="Nama PIC"
                    value={formData.pic_name}
                    onChange={(e) => setFormData({ ...formData, pic_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status Cabang</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 focus:outline-none bg-white"
                  >
                    <option value="AKTIF">AKTIF</option>
                    <option value="NONAKTIF">NONAKTIF</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
                >
                  Simpan Cabang Toko
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {renderWarningModal()}
      {renderConfirmModal()}
      {renderPhotoAdjustModal()}
    </div>
  );
};
