import { 
  Store, 
  Category, 
  IPhoneSeries,
  User, 
  InventoryItem, 
  StockTransaction, 
  ReturnItem, 
  AttendanceRecord, 
  ActivityLog, 
  AppNotification 
} from './types';
import { hashPasswordSync } from './utils/security';

// Master data seri iPhone (Dikosongkan sesuai permintaan pengguna, siap diinput sendiri)
export const INITIAL_IPHONE_SERIES: IPhoneSeries[] = [];

export const IPHONE_MODELS: string[] = [];

export const formatRupiah = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(value)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Data Toko / Cabang (Dikosongkan - siap ditambahkan oleh Super Admin)
export const INITIAL_STORES: Store[] = [];

// Kategori Sparepart (Dikosongkan - siap ditambahkan oleh Super Admin)
export const INITIAL_CATEGORIES: Category[] = [];

// Akun Pengguna: HANYA SATU AKUN SUPERADMIN SAJA
export const INITIAL_USERS: User[] = [
  {
    id: 'user-super',
    name: 'Super Admin',
    nama: 'Super Admin',
    username: 'superadmin@gmail.com',
    nomor_telepon: '081234567890',
    no_hp: '081234567890',
    email: 'mhdalfinml@gmail.com',
    email_tertaut: 'mhdalfinml@gmail.com',
    is_email_verified: true,
    email_verified_at: '2026-01-01',
    password: hashPasswordSync('password123'),
    password_hash: hashPasswordSync('password123'),
    must_change_password: false,
    role: 'SUPER_ADMIN',
    store_id: null,
    status: 'AKTIF',
    position: 'Super Administrator',
    status_peran_kerja: 'Super Administrator',
    avatar: '',
    foto_profil: '',
    jam_masuk_standar: '08:30',
    jam_pulang_standar: '17:00',
    toleransi_keterlambatan_menit: 0,
    created_at: '2026-01-01',
  },
];

// Helper to determine status based on stock & min stock
export const calculateStockStatus = (stock: number, minStock: number) => {
  if (stock <= 0) return 'HABIS';
  if (stock <= minStock) return 'MENIPIS';
  return 'AMAN';
};

// Inventaris Sparepart (Dikosongkan)
export const INITIAL_INVENTORY: InventoryItem[] = [];

// Transaksi Stok Masuk / Keluar / Rusak (Dikosongkan)
export const INITIAL_TRANSACTIONS: StockTransaction[] = [];

// Klaim Return Garansi (Dikosongkan)
export const INITIAL_RETURNS: ReturnItem[] = [];

// Rekap Catatan Absensi Karyawan (Dikosongkan)
export const INITIAL_ATTENDANCE: AttendanceRecord[] = [];

// Log Aktivitas Sistem (Dikosongkan)
export const INITIAL_ACTIVITY_LOGS: ActivityLog[] = [];

// Notifikasi Sistem (Dikosongkan)
export const INITIAL_NOTIFICATIONS: AppNotification[] = [];
