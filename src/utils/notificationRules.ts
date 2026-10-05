import { AppNotification, User, UserRole, NavigationPage } from '../types';
import { isEssentialNotification } from './activityLogRules';

/**
 * Memeriksa apakah suatu notifikasi sudah dibaca oleh pengguna tertentu.
 * Status dibaca bersifat independen per individu (hak masing-masing user),
 * disimpan dalam array `read_by` berisi user ID yang telah membacanya.
 */
export const isNotificationReadByUser = (
  notif: AppNotification,
  userId?: string | null
): boolean => {
  if (!notif) return true;
  if (!userId) return false;
  
  const readBy = Array.isArray(notif.read_by) ? notif.read_by : [];
  return readBy.includes(userId);
};

/**
 * Filter utama notifikasi sesuai hak akses role, user_id, dan store_id pengguna.
 *
 * Aturan Bisnis:
 * 1. Super Admin:
 *    - Di Dashboard Utama (activeStoreId null): hanya menampilkan notifikasi penting secara global dari seluruh toko
 *      (notifikasi global pusat, stok kritis lintas cabang, dan rekapan penting).
 *    - Ketika masuk ke Toko A: notifikasi yang muncul KHUSUS Toko A.
 *    - Ketika pindah ke Toko B: otomatis berubah menjadi notifikasi KHUSUS Toko B.
 * 2. Admin Toko:
 *    - Notifikasi HANYA berasal dari toko yang dikelolanya (store_id === user.store_id).
 *    - Mencakup pengajuan return karyawan, laporan barang rusak, stok habis/menipis, absensi, dsb.
 *    - Tidak menampilkan notifikasi dari cabang lain atau notifikasi pribadi karyawan lain.
 * 3. Karyawan:
 *    - Notifikasi HANYA bersifat monitoring stok dan informasi pribadi:
 *      * Stok menipis / hampir habis di tokonya (untuk kesiapan teknisi & frontdesk)
 *      * Pengajuan / return miliknya yang diterima / ditolak
 *      * Informasi aktivitas dirinya sendiri (misal check-in absensi miliknya)
 *    - DILARANG menampilkan notifikasi administratif yang ditujukan untuk Admin/Super Admin
 *      (laporan karyawan lain, rekap absensi karyawan lain, approval return karyawan lain).
 */
export const isNotificationVisibleForUser = (
  notif: AppNotification,
  currentUser: User | null,
  activeStoreId: string | null | undefined
): boolean => {
  if (!currentUser) return false;

  // Kebijakan Notifikasi: Jangan tampilkan notifikasi non-operasional/trivial
  if (!isEssentialNotification(notif)) {
    return false;
  }

  // 1. Notifikasi Personal (Khusus User Tertentu)
  if (notif.target_user_id) {
    if (notif.target_user_id !== currentUser.id) {
      return false;
    }
    // Jika sedang berada di toko tertentu, jangan bocorkan notifikasi personal dari toko lain
    if (activeStoreId && notif.store_id && notif.store_id !== activeStoreId) {
      return false;
    }
    // Jika bukan Super Admin, jangan bocorkan notifikasi dari cabang berbeda
    if (
      currentUser.role !== 'SUPER_ADMIN' &&
      currentUser.store_id &&
      notif.store_id &&
      notif.store_id !== currentUser.store_id
    ) {
      return false;
    }
    return true;
  }

  // 2. Evaluasi Berdasarkan Role Pengguna
  // --- A. KARYAWAN ---
  if (currentUser.role === 'KARYAWAN') {
    // Harus sesuai toko tempat karyawan bekerja - DILARANG bocor dari cabang lain
    const empStoreId = currentUser.store_id;
    if (!notif.store_id || notif.store_id !== empStoreId) {
      return false;
    }

    // Role target harus mencakup KARYAWAN
    if (notif.target_roles && !notif.target_roles.includes('KARYAWAN')) {
      return false;
    }

    // Karyawan hanya boleh melihat:
    // a. Monitoring Stok Menipis / Habis di tokonya
    const isStockMonitoring =
      notif.kategori === 'INVENTORY' &&
      (notif.tipe === 'WARNING' || notif.tipe === 'DANGER') &&
      (notif.judul.toLowerCase().includes('stok') || notif.pesan.toLowerCase().includes('stok'));

    // b. Notifikasi personal dirinya (misal dibuat oleh dirinya)
    const isPersonalActivity = notif.creator_id === currentUser.id;

    return isStockMonitoring || isPersonalActivity;
  }

  // --- B. ADMIN TOKO ---
  if (currentUser.role === 'ADMIN_TOKO') {
    const adminStoreId = currentUser.store_id;

    // Admin Toko HANYA menerima notifikasi untuk tokonya sendiri
    if (!notif.store_id || notif.store_id !== adminStoreId) {
      return false;
    }

    // Role target harus mencakup ADMIN_TOKO jika ditentukan
    if (notif.target_roles && !notif.target_roles.includes('ADMIN_TOKO')) {
      return false;
    }

    return true;
  }

  // --- C. SUPER ADMIN ---
  if (currentUser.role === 'SUPER_ADMIN') {
    // 1. Ketika Super Admin sedang berada di dalam toko tertentu (Toko A, Toko B, dsb.)
    if (activeStoreId) {
      // Notifikasi yang muncul HARUS KHUSUS toko tersebut
      return notif.store_id === activeStoreId;
    }

    // 2. Ketika Super Admin berada di Dashboard Utama (activeStoreId null/tidak ada toko aktif):
    // "Dashboard Utama hanya menampilkan notifikasi penting secara global dari seluruh toko"
    if (notif.is_global || notif.store_id === null || notif.store_id === undefined) {
      return true;
    }

    // Notifikasi penting lintas toko:
    // - Peringatan stok kritis / habis ('DANGER' atau 'WARNING')
    // - Pengajuan return atau persetujuan ('RETURN')
    // - Laporan barang rusak penting
    if (
      notif.tipe === 'DANGER' || 
      notif.tipe === 'WARNING' || 
      notif.kategori === 'RETURN' ||
      notif.judul.toLowerCase().includes('rusak') ||
      notif.judul.toLowerCase().includes('return') ||
      notif.judul.toLowerCase().includes('stok')
    ) {
      return true;
    }

    return false;
  }

  return false;
};

/**
 * Filter kumpulan notifikasi agar hanya mengembalikan notifikasi yang berhak dilihat pengguna saat ini.
 */
export const filterNotificationsForUser = (
  notifications: AppNotification[],
  currentUser: User | null,
  activeStoreId: string | null | undefined
): AppNotification[] => {
  if (!Array.isArray(notifications) || !currentUser) return [];
  return notifications.filter((notif) =>
    isNotificationVisibleForUser(notif, currentUser, activeStoreId)
  );
};
