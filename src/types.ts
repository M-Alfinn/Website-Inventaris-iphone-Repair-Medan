export type UserRole = 'SUPER_ADMIN' | 'ADMIN_TOKO' | 'KARYAWAN';

export interface User {
  id: string;
  name: string;
  nama: string;
  username?: string; // Username akun login
  nomor_telepon: string; // Nomor HP / WhatsApp
  no_hp?: string; // Alias for nomor_telepon
  email?: string;
  email_tertaut?: string; // Email pemulihan yang ditautkan di profil
  is_email_verified?: boolean; // Status verifikasi email tautan
  email_verified_at?: string; // Tanggal verifikasi email tautan
  role: UserRole;
  store_id: string | null; // null for SUPER_ADMIN who can access all
  status?: 'AKTIF' | 'NONAKTIF';
  created_at: string;
  avatar?: string; // URL / Base64 foto profil pengguna
  foto_profil?: string; // Alias untuk avatar foto profil
  position?: string; // Status peran kerja / jabatan (e.g. 'Teknisi iPhone Senior', 'Staff Frontdesk & Service')
  status_peran_kerja?: string; // Alias for position
  password?: string; // Hashed password
  password_hash?: string; // SHA-256 Hashed password
  must_change_password?: boolean; // Wajib ganti password pada login pertama atau setelah di-reset
  jam_masuk_standar?: string; // Jam masuk shift kerja pengguna (e.g. '08:30')
  jam_pulang_standar?: string; // Jam pulang shift kerja pengguna (e.g. '17:00')
  toleransi_keterlambatan_menit?: number; // Toleransi keterlambatan (e.g. 0 - 15 menit)
}

export interface Store {
  id: string;
  nama_toko: string;
  cabang: string;
  alamat: string;
  nomor_telepon: string;
  status: 'AKTIF' | 'NONAKTIF';
  pic_name: string;
  jam_operasional: string;
  jam_masuk_standar?: string; // Jam masuk kerja standar (e.g. '08:30')
  jam_pulang_standar?: string; // Jam pulang kerja standar (e.g. '17:00')
  toleransi_keterlambatan_menit?: number; // Toleransi keterlambatan (e.g. 0 - 15 menit)
  foto_profil?: string; // Foto profil / logo toko cabang (base64 or URL)
  logo?: string; // Alias untuk foto profil
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  store_id?: string | null; // Cabang toko pemilik kategori
  nama_kategori: string;
  deskripsi: string;
  created_at: string;
}

export interface IPhoneSeries {
  id: string;
  store_id?: string | null; // Cabang toko pemilik katalog seri iPhone
  nama_seri: string;
  deskripsi?: string;
  tahun_rilis?: number;
  urutan?: number;
  created_at?: string;
}

export type InventoryStatus = 'AMAN' | 'MENIPIS' | 'HABIS';

export interface InventoryItem {
  id: string;
  store_id: string;
  category_id: string;
  kode_barang: string;
  nama_barang: string;
  model_iphone: string;
  harga_beli: number;
  harga_jual: number;
  stok: number;
  stok_minimum: number;
  satuan: string; // pcs, set, unit, roll, botol
  keterangan: string;
  status: InventoryStatus;
  created_at: string;
  updated_at: string;
}

export type StockTransactionType = 'MASUK' | 'KELUAR' | 'RUSAK' | 'TAMBAH_STOK' | 'KURANGI_STOK' | 'RETURN_MASUK';

export interface StockTransaction {
  id: string;
  store_id: string;
  inventory_id: string;
  kode_barang: string;
  nama_barang: string;
  model_iphone?: string;
  harga_beli?: number;
  harga_jual?: number;
  jenis: StockTransactionType;
  direction: '+' | '-';
  jumlah: number;
  stok_sebelum: number;
  stok_sesudah: number;
  alasan: string;
  keterangan: string;
  tanggal: string; // YYYY-MM-DD
  waktu: string;   // HH:mm:ss
  user_id: string;
  user_name: string;
  created_at: string;
}

export type ReturnStatus = 'MENUNGGU' | 'DITERIMA' | 'DITOLAK';

export interface ReturnItem {
  id: string;
  store_id: string;
  inventory_id: string;
  kode_barang: string;
  nama_barang: string;
  model_iphone?: string;
  harga_beli?: number;
  harga_jual?: number;
  jumlah: number;
  tanggal_return?: string;
  tanggal_pengajuan?: string;
  customer_name?: string;
  customer_phone?: string;
  alasan?: string;
  alasan_return?: string;
  keterangan?: string;
  catatan_approval?: string;
  catatan_proses?: string;
  status: ReturnStatus;
  dibuat_oleh_id?: string;
  dibuat_oleh_name?: string;
  diproses_oleh_id?: string;
  diproses_oleh_name?: string;
  tanggal_proses?: string;
  created_at: string;
}

export type AttendanceStatus = 'HADIR' | 'TERLAMBAT' | 'IZIN' | 'SAKIT' | 'ALPA' | 'ALPHA';

export interface AttendanceRecord {
  id: string;
  user_id: string;
  user_name: string;
  store_id: string;
  store_name?: string;
  tanggal: string; // YYYY-MM-DD
  jam_masuk: string | null;
  jam_keluar?: string | null;
  jam_pulang?: string | null;
  status: AttendanceStatus;
  catatan?: string;
  keterangan?: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  user_name: string;
  role?: UserRole;
  store_id: string | null;
  store_name?: string;
  aktivitas: string;
  detail_perubahan: string;
  waktu: string;
  ip_address?: string;
  tipe?: 'INVENTORY' | 'TRANSACTION' | 'AUTH' | 'RETURN' | 'ABSENSI' | 'STORE' | 'USER' | 'SYSTEM' | string;
}

export interface AppNotification {
  id: string;
  store_id?: string | null;
  store_name?: string;
  target_roles?: UserRole[];
  target_user_id?: string | null;
  creator_id?: string;
  creator_name?: string;
  kategori?: 'INVENTORY' | 'RETURN' | 'ABSENSI' | 'SISTEM' | 'AUTH';
  judul: string;
  pesan: string;
  tipe: 'WARNING' | 'SUCCESS' | 'INFO' | 'DANGER';
  waktu: string;
  read: boolean;
  read_by?: string[];
  link_page?: NavigationPage | string;
  is_global?: boolean;
  created_at?: string;
}

export type NavigationPage = 
  | 'PILIH_TOKO'
  | 'DASHBOARD_UTAMA'
  | 'DASHBOARD_TOKO'
  | 'INVENTARIS'
  | 'KATEGORI'
  | 'BARANG_MASUK'
  | 'BARANG_KELUAR'
  | 'BARANG_RUSAK'
  | 'RETURN'
  | 'ABSENSI'
  | 'KARYAWAN'
  | 'LAPORAN'
  | 'ACTIVITY_LOG'
  | 'TOKO'
  | 'PENGATURAN'
  | 'PROFIL';
