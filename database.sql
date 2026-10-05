-- ==================================================================================
-- DATABASE SCHEMA & INITIAL SETUP: IPHONE REPAIR MEDAN
-- Sistem Pengelolaan Inventaris, Transaksi Stok, Return, Absensi & Manajemen Toko
-- Engine: InnoDB | Charset: utf8mb4 | Collation: utf8mb4_unicode_ci
-- Kompatibel penuh dengan: MySQL 5.7+, MySQL 8.0+, MariaDB 10.3+, & phpMyAdmin
-- Catatan: Data inventaris, transaksi, absensi, retur, log dikosongkan untuk input data riil lokal/VPS.
-- Akun yang disediakan: 1 Akun Super Admin.
-- ==================================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+07:00";

-- --------------------------------------------------------
-- 1. Buat Database (Jika belum ada)
-- --------------------------------------------------------
CREATE DATABASE IF NOT EXISTS `iphone_repair_medan` 
  DEFAULT CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE `iphone_repair_medan`;

-- --------------------------------------------------------
-- 2. TABEL: stores (Manajemen Cabang Toko)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `stores`;
CREATE TABLE `stores` (
  `id` VARCHAR(50) NOT NULL,
  `nama_toko` VARCHAR(150) NOT NULL,
  `cabang` VARCHAR(150) NOT NULL,
  `alamat` TEXT NOT NULL,
  `nomor_telepon` VARCHAR(30) NOT NULL,
  `status` ENUM('AKTIF', 'NONAKTIF') NOT NULL DEFAULT 'AKTIF',
  `pic_name` VARCHAR(150) NOT NULL,
  `jam_operasional` VARCHAR(100) NOT NULL DEFAULT '08:30 - 20:00 WIB',
  `jam_masuk_standar` VARCHAR(10) NOT NULL DEFAULT '08:30',
  `jam_pulang_standar` VARCHAR(10) NOT NULL DEFAULT '17:00',
  `toleransi_keterlambatan_menit` INT NOT NULL DEFAULT 0,
  `foto_profil` LONGTEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 3. TABEL: users (Akun Pengguna Sistem)
-- Default Password Super Admin: password123 (Hash SHA-256)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` VARCHAR(50) NOT NULL,
  `nama` VARCHAR(150) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `username` VARCHAR(100) NOT NULL,
  `nomor_telepon` VARCHAR(30) NOT NULL,
  `no_hp` VARCHAR(30) NULL,
  `email` VARCHAR(150) NULL,
  `email_tertaut` VARCHAR(150) NULL,
  `is_email_verified` TINYINT(1) NOT NULL DEFAULT 0,
  `email_verified_at` DATETIME NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('SUPER_ADMIN', 'ADMIN_TOKO', 'KARYAWAN') NOT NULL,
  `store_id` VARCHAR(50) NULL,
  `status` ENUM('AKTIF', 'NONAKTIF') NOT NULL DEFAULT 'AKTIF',
  `position` VARCHAR(100) NULL,
  `status_peran_kerja` VARCHAR(100) NULL,
  `avatar` LONGTEXT NULL,
  `foto_profil` LONGTEXT NULL,
  `must_change_password` TINYINT(1) NOT NULL DEFAULT 0,
  `jam_masuk_standar` VARCHAR(10) NOT NULL DEFAULT '08:30',
  `jam_pulang_standar` VARCHAR(10) NOT NULL DEFAULT '17:00',
  `toleransi_keterlambatan_menit` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_username` (`username`),
  KEY `idx_users_store_id` (`store_id`),
  KEY `idx_users_role` (`role`),
  CONSTRAINT `fk_users_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 4. TABEL: categories (Kategori Komponen Sparepart Tiap Toko)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `categories`;
CREATE TABLE `categories` (
  `id` VARCHAR(50) NOT NULL,
  `store_id` VARCHAR(50) NOT NULL,
  `nama_kategori` VARCHAR(100) NOT NULL,
  `deskripsi` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_categories_store_id` (`store_id`),
  CONSTRAINT `fk_categories_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 5. TABEL: iphone_series (Master Seri iPhone Tiap Toko)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `iphone_series`;
CREATE TABLE `iphone_series` (
  `id` VARCHAR(50) NOT NULL,
  `store_id` VARCHAR(50) NOT NULL,
  `nama_seri` VARCHAR(100) NOT NULL,
  `deskripsi` TEXT NULL,
  `tahun_rilis` INT NULL,
  `urutan` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_iphone_series_store_id` (`store_id`),
  CONSTRAINT `fk_iphone_series_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 6. TABEL: inventory (Inventaris Sparepart Tiap Toko)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `inventory`;
CREATE TABLE `inventory` (
  `id` VARCHAR(50) NOT NULL,
  `store_id` VARCHAR(50) NOT NULL,
  `category_id` VARCHAR(50) NOT NULL,
  `kode_barang` VARCHAR(50) NOT NULL,
  `nama_barang` VARCHAR(200) NOT NULL,
  `model_iphone` VARCHAR(100) NOT NULL,
  `harga_beli` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `harga_jual` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `stok` INT NOT NULL DEFAULT 0,
  `stok_minimum` INT NOT NULL DEFAULT 5,
  `satuan` VARCHAR(20) NOT NULL DEFAULT 'pcs',
  `keterangan` TEXT NULL,
  `status` ENUM('AMAN', 'MENIPIS', 'HABIS') NOT NULL DEFAULT 'AMAN',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_store_kode` (`store_id`, `kode_barang`),
  KEY `idx_inventory_store_id` (`store_id`),
  KEY `idx_inventory_category_id` (`category_id`),
  KEY `idx_inventory_status` (`status`),
  CONSTRAINT `fk_inventory_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_inventory_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 7. TABEL: stock_transactions (Barang Masuk, Keluar, Rusak)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `stock_transactions`;
CREATE TABLE `stock_transactions` (
  `id` VARCHAR(50) NOT NULL,
  `store_id` VARCHAR(50) NOT NULL,
  `inventory_id` VARCHAR(50) NOT NULL,
  `kode_barang` VARCHAR(50) NOT NULL,
  `nama_barang` VARCHAR(200) NOT NULL,
  `model_iphone` VARCHAR(100) NULL,
  `harga_beli` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `harga_jual` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `jenis` ENUM('MASUK', 'KELUAR', 'RUSAK', 'TAMBAH_STOK', 'KURANGI_STOK', 'RETURN_MASUK') NOT NULL,
  `direction` ENUM('+', '-') NOT NULL,
  `jumlah` INT NOT NULL,
  `stok_sebelum` INT NOT NULL,
  `stok_sesudah` INT NOT NULL,
  `alasan` VARCHAR(255) NOT NULL,
  `keterangan` TEXT NULL,
  `tanggal` DATE NOT NULL,
  `waktu` TIME NOT NULL,
  `user_id` VARCHAR(50) NOT NULL,
  `user_name` VARCHAR(150) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_trx_store_id` (`store_id`),
  KEY `idx_trx_inventory_id` (`inventory_id`),
  KEY `idx_trx_tanggal` (`tanggal`),
  KEY `idx_trx_jenis` (`jenis`),
  CONSTRAINT `fk_trx_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_trx_inventory` FOREIGN KEY (`inventory_id`) REFERENCES `inventory` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 8. TABEL: returns (Klaim Return & Garansi Sparepart)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `returns`;
CREATE TABLE `returns` (
  `id` VARCHAR(50) NOT NULL,
  `store_id` VARCHAR(50) NOT NULL,
  `inventory_id` VARCHAR(50) NOT NULL,
  `kode_barang` VARCHAR(50) NOT NULL,
  `nama_barang` VARCHAR(200) NOT NULL,
  `model_iphone` VARCHAR(100) NULL,
  `harga_beli` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `harga_jual` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `jumlah` INT NOT NULL,
  `tanggal_return` DATE NOT NULL,
  `tanggal_pengajuan` DATE NOT NULL,
  `customer_name` VARCHAR(150) NULL,
  `customer_phone` VARCHAR(30) NULL,
  `alasan` TEXT NOT NULL,
  `alasan_return` TEXT NULL,
  `keterangan` TEXT NULL,
  `catatan_approval` TEXT NULL,
  `catatan_proses` TEXT NULL,
  `status` ENUM('MENUNGGU', 'DITERIMA', 'DITOLAK') NOT NULL DEFAULT 'MENUNGGU',
  `dibuat_oleh_id` VARCHAR(50) NULL,
  `dibuat_oleh_name` VARCHAR(150) NULL,
  `diproses_oleh_id` VARCHAR(50) NULL,
  `diproses_oleh_name` VARCHAR(150) NULL,
  `tanggal_proses` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_returns_store_id` (`store_id`),
  KEY `idx_returns_inventory_id` (`inventory_id`),
  KEY `idx_returns_status` (`status`),
  CONSTRAINT `fk_returns_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_returns_inventory` FOREIGN KEY (`inventory_id`) REFERENCES `inventory` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 9. TABEL: attendance (Pencatatan Absensi Karyawan & Admin Toko)
-- Kebijakan: Khusus ADMIN_TOKO & KARYAWAN. SUPER_ADMIN tidak memiliki kewajiban absensi kerja.
-- --------------------------------------------------------
DROP TABLE IF EXISTS `attendance`;
CREATE TABLE `attendance` (
  `id` VARCHAR(50) NOT NULL,
  `user_id` VARCHAR(50) NOT NULL,
  `user_name` VARCHAR(150) NOT NULL,
  `store_id` VARCHAR(50) NOT NULL,
  `store_name` VARCHAR(150) NULL,
  `tanggal` DATE NOT NULL,
  `jam_masuk` VARCHAR(20) NULL,
  `jam_keluar` VARCHAR(20) NULL,
  `jam_pulang` VARCHAR(20) NULL,
  `status` ENUM('HADIR', 'TERLAMBAT', 'IZIN', 'SAKIT', 'ALPA', 'ALPHA') NOT NULL,
  `catatan` TEXT NULL,
  `keterangan` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_att_user_id` (`user_id`),
  KEY `idx_att_store_id` (`store_id`),
  KEY `idx_att_tanggal` (`tanggal`),
  KEY `idx_att_status` (`status`),
  CONSTRAINT `fk_att_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_att_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 10. TABEL: activity_logs (Audit Trail Aktivitas Sistem)
-- Kebijakan:
-- 1. Aktivitas absensi Super Admin tidak dicatat karena Super Admin tidak memiliki absensi.
-- 2. Karyawan HANYA berwenang mencatat aktivitas Absensi ('ABSENSI') dan Profil/Sandi ('AUTH' / 'USER').
-- 3. Transaksi barang, mutasi stok, servis/perbaikan, dan return HANYA boleh dicatat oleh Admin Toko & Super Admin.
-- 4. Tipe log strictly ENUM('AUTH', 'INVENTORY', 'TRANSACTION', 'RETURN', 'ABSENSI', 'USER', 'STORE', 'SYSTEM').
-- --------------------------------------------------------
DROP TABLE IF EXISTS `activity_logs`;
CREATE TABLE `activity_logs` (
  `id` VARCHAR(50) NOT NULL,
  `user_id` VARCHAR(50) NOT NULL,
  `user_name` VARCHAR(150) NOT NULL,
  `role` ENUM('SUPER_ADMIN', 'ADMIN_TOKO', 'KARYAWAN') NULL,
  `store_id` VARCHAR(50) NULL,
  `store_name` VARCHAR(150) NULL,
  `aktivitas` VARCHAR(200) NOT NULL,
  `detail_perubahan` TEXT NOT NULL,
  `waktu` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ip_address` VARCHAR(50) NOT NULL DEFAULT '127.0.0.1',
  `tipe` ENUM('AUTH', 'INVENTORY', 'TRANSACTION', 'RETURN', 'ABSENSI', 'USER', 'STORE', 'SYSTEM') NOT NULL DEFAULT 'SYSTEM',
  PRIMARY KEY (`id`),
  KEY `idx_act_user_id` (`user_id`),
  KEY `idx_act_store_id` (`store_id`),
  KEY `idx_act_waktu` (`waktu`),
  KEY `idx_act_tipe` (`tipe`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 11. TABEL: notifications (Pusat Notifikasi Aplikasi)
-- Kebijakan: Terisolasi ketat per store_id; Super Admin di Dashboard Utama memantau secara global dengan badge cabang.
-- --------------------------------------------------------
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` VARCHAR(50) NOT NULL,
  `store_id` VARCHAR(50) NULL,
  `store_name` VARCHAR(150) NULL,
  `target_roles` VARCHAR(100) NULL,
  `target_user_id` VARCHAR(50) NULL,
  `creator_id` VARCHAR(50) NULL,
  `creator_name` VARCHAR(150) NULL,
  `kategori` ENUM('INVENTORY', 'RETURN', 'ABSENSI', 'SISTEM', 'AUTH') NOT NULL DEFAULT 'SISTEM',
  `judul` VARCHAR(200) NOT NULL,
  `pesan` TEXT NOT NULL,
  `tipe` ENUM('WARNING', 'SUCCESS', 'INFO', 'DANGER') NOT NULL DEFAULT 'INFO',
  `waktu` VARCHAR(50) NOT NULL,
  `read_status` TINYINT(1) NOT NULL DEFAULT 0,
  `read_by` TEXT NULL,
  `link_page` VARCHAR(50) NULL,
  `is_global` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notif_store_id` (`store_id`),
  KEY `idx_notif_target_user` (`target_user_id`),
  KEY `idx_notif_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 12. TABEL: password_resets (Kode OTP & Token Reset Password)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `password_resets`;
CREATE TABLE `password_resets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(150) NOT NULL,
  `otp_code` VARCHAR(10) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `used` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================================================================================
-- SEED DATA AWAL: HANYA SATU AKUN SUPER ADMIN
-- Password default: password123 (Hash SHA-256)
-- Data inventaris, transaksi, absensi, retur, log dibiarkan kosong
-- ==================================================================================

INSERT INTO `users` (
  `id`, `nama`, `name`, `username`, `nomor_telepon`, `no_hp`, 
  `email`, `email_tertaut`, `is_email_verified`, `email_verified_at`, 
  `password_hash`, `role`, `store_id`, `status`, `position`, `status_peran_kerja`, 
  `avatar`, `foto_profil`, `must_change_password`, 
  `jam_masuk_standar`, `jam_pulang_standar`, `toleransi_keterlambatan_menit`, 
  `created_at`, `updated_at`
) VALUES (
  'user-super', 'Super Admin', 'Super Admin', 'superadmin@gmail.com', '081234567890', '081234567890', 
  'mhdalfinml@gmail.com', 'mhdalfinml@gmail.com', 1, '2026-01-01 00:00:00', 
  'sha256_01d37036f28a8d3663073d10', 'SUPER_ADMIN', NULL, 'AKTIF', 'Super Administrator', 'Super Administrator', 
  NULL, NULL, 0, 
  '08:30', '17:00', 0, 
  NOW(), NOW()
);

SET FOREIGN_KEY_CHECKS = 1;
COMMIT;
