import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import {
  checkDbConnection,
  initializeDatabaseIfEmpty,
  fetchAllDataFromMySQL,
  upsertRecord,
  deleteRecord,
  getDbPool,
} from './server-db.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static robots.txt and sitemap.xml explicitly
app.get('/robots.txt', (_req, res) => {
  res.type('text/plain');
  res.send('User-agent: *\nAllow: /\n\nSitemap: https://iphonerepairmedan.com/sitemap.xml\n');
});

app.get('/sitemap.xml', (_req, res) => {
  res.type('application/xml');
  res.send('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>https://iphonerepairmedan.com/</loc>\n    <lastmod>2026-09-30</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n</urlset>\n');
});

// In-memory fallback persistence (avoids writing files to root directory which triggers Vite page reloads)
let inMemoryBackup: any = null;

function sanitizeUserData(data: any) {
  if (data && Array.isArray(data.users)) {
    let hasSuper = false;
    data.users = data.users.map((u: any) => {
      if (u.id === 'user-super' || u.role === 'SUPER_ADMIN') {
        hasSuper = true;
        return {
          ...u,
          role: 'SUPER_ADMIN',
          store_id: null,
          position: 'Super Administrator',
          status_peran_kerja: 'Super Administrator',
        };
      }
      return u;
    });

    if (!hasSuper) {
      data.users.unshift({
        id: 'user-super',
        name: 'Super Admin',
        nama: 'Super Admin',
        username: 'superadmin@gmail.com',
        nomor_telepon: '081234567890',
        no_hp: '081234567890',
        email: 'mhdalfinml@gmail.com',
        email_tertaut: 'mhdalfinml@gmail.com',
        is_email_verified: 1,
        password_hash: 'sha256_01d37036f28a8d3663073d10',
        role: 'SUPER_ADMIN',
        store_id: null,
        status: 'AKTIF',
        position: 'Super Administrator',
        status_peran_kerja: 'Super Administrator',
        avatar: '',
        foto_profil: '',
        must_change_password: 0,
        jam_masuk_standar: '08:30',
        jam_pulang_standar: '17:00',
        toleransi_keterlambatan_menit: 0,
        created_at: '2026-01-01',
      });
    }
  }
  return data;
}

function saveLocalBackup(data: any) {
  try {
    const sanitized = sanitizeUserData(data);
    inMemoryBackup = { ...(inMemoryBackup || {}), ...sanitized, _lastUpdated: new Date().toISOString() };
  } catch {
    // quiet
  }
}

function getLocalBackup(): any | null {
  return inMemoryBackup ? sanitizeUserData(inMemoryBackup) : null;
}

// Serve database.sql for direct browser download and phpMyAdmin import
app.get('/database.sql', (_req, res) => {
  const sqlPath = path.resolve(__dirname, 'database.sql');
  if (fs.existsSync(sqlPath)) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="iphone_repair_medan.sql"');
    fs.createReadStream(sqlPath).pipe(res);
  } else {
    res.status(404).send('File database.sql tidak ditemukan.');
  }
});

// =========================================================================
// API ROUTE: Database MySQL Status & Testing & Export
// =========================================================================

app.get('/api/db/status', async (_req, res) => {
  try {
    const status = await checkDbConnection();
    res.json({ success: true, status });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/db/test', async (_req, res) => {
  try {
    const status = await checkDbConnection(true);
    if (status.connected) {
      await initializeDatabaseIfEmpty();
      const updatedStatus = await checkDbConnection(true);
      return res.json({
        success: true,
        message: 'Koneksi ke MySQL phpMyAdmin Berhasil! Database aktif dan siap digunakan.',
        status: updatedStatus,
      });
    } else {
      return res.json({
        success: false,
        message: `Koneksi MySQL Belum Aktif (${status.error}). Pastikan MySQL di XAMPP/phpMyAdmin/VPS sedang berjalan pada port ${status.port}.`,
        status,
      });
    }
  } catch (err: any) {
    return res.json({
      success: false,
      message: 'Tidak dapat terhubung ke MySQL pada port 8111. Menggunakan penyimpanan lokal.',
      status: { connected: false, host: 'localhost', port: 8111, error: err?.message },
    });
  }
});

app.get('/api/db/export', (_req, res) => {
  const sqlPath = path.resolve(__dirname, 'database.sql');
  if (fs.existsSync(sqlPath)) {
    const content = fs.readFileSync(sqlPath, 'utf8');
    res.json({ success: true, sql: content, filename: 'iphone_repair_medan.sql' });
  } else {
    res.status(404).json({ success: false, message: 'File database.sql tidak ditemukan.' });
  }
});

// =========================================================================
// API ROUTE: Get All System Data from MySQL or Local Persistence
// =========================================================================

app.get('/api/data', async (_req, res) => {
  try {
    const mysqlData = await fetchAllDataFromMySQL();
    if (mysqlData) {
      return res.json({
        success: true,
        source: 'mysql',
        data: sanitizeUserData(mysqlData),
      });
    }

    const localData = getLocalBackup();
    if (localData) {
      return res.json({
        success: true,
        source: 'local_storage',
        data: localData,
      });
    }

    // Jika koneksi MySQL belum tersedia
    return res.json({
      success: true,
      source: 'offline_waiting_mysql',
      data: null,
      message: 'Database MySQL sedang tidak terhubung. Aplikasi berjalan dengan sinkronisasi lokal.',
    });
  } catch {
    return res.json({
      success: true,
      source: 'offline_waiting_mysql',
      data: null,
    });
  }
});

// Bulk sync endpoint to push data from frontend to MySQL or Local Storage
app.post('/api/sync-all', async (req, res) => {
  try {
    const { stores, users, categories, iphoneSeries, inventory, transactions, returns, attendance, activityLogs, notifications } = req.body;
    
    // Always persist to local backup file for safety
    saveLocalBackup({
      stores,
      users,
      categories,
      iphoneSeries,
      inventory,
      transactions,
      returns,
      attendance,
      activityLogs,
      notifications,
    });

    const status = await checkDbConnection();
    if (!status.connected) {
      return res.json({
        success: true,
        source: 'local_storage',
        message: 'Data tersimpan di penyimpanan lokal server (MySQL offline).',
      });
    }

    const pool = getDbPool();
    const conn = await pool.getConnection();
    try {
      await conn.query('SET FOREIGN_KEY_CHECKS = 0');

      if (Array.isArray(stores)) {
        for (const s of stores) {
          await upsertRecord('stores', {
            id: s.id,
            nama_toko: s.nama_toko,
            cabang: s.cabang,
            alamat: s.alamat || '',
            nomor_telepon: s.nomor_telepon || '',
            status: s.status || 'AKTIF',
            pic_name: s.pic_name || '',
            jam_operasional: s.jam_operasional || '08:30 - 20:00 WIB',
            jam_masuk_standar: s.jam_masuk_standar || '08:30',
            jam_pulang_standar: s.jam_pulang_standar || '17:00',
            toleransi_keterlambatan_menit: s.toleransi_keterlambatan_menit || 0,
            foto_profil: s.foto_profil || null,
          });
        }
      }

      if (Array.isArray(categories)) {
        for (const c of categories) {
          await upsertRecord('categories', {
            id: c.id,
            store_id: c.store_id || null,
            nama_kategori: c.nama_kategori,
            deskripsi: c.deskripsi || '',
          });
        }
      }

      if (Array.isArray(iphoneSeries)) {
        for (const sr of iphoneSeries) {
          await upsertRecord('iphone_series', {
            id: sr.id,
            store_id: sr.store_id || null,
            nama_seri: sr.nama_seri,
            deskripsi: sr.deskripsi || '',
            tahun_rilis: sr.tahun_rilis || 2025,
            urutan: sr.urutan || 0,
          });
        }
      }

      if (Array.isArray(users)) {
        for (const u of users) {
          const isSuper = u.id === 'user-super' || u.role === 'SUPER_ADMIN';
          const resolvedRole = isSuper ? 'SUPER_ADMIN' : u.role;
          const resolvedStoreId = isSuper ? null : (u.store_id || null);
          const resolvedPosition = isSuper ? 'Super Administrator' : (u.position || u.status_peran_kerja || '');
          await upsertRecord('users', {
            id: u.id,
            nama: u.nama || u.name,
            name: u.name || u.nama,
            username: u.username || u.email,
            nomor_telepon: u.nomor_telepon || u.no_hp || '',
            no_hp: u.no_hp || u.nomor_telepon || '',
            email: u.email || null,
            email_tertaut: u.email_tertaut || null,
            is_email_verified: u.is_email_verified ? 1 : 0,
            password_hash: u.password_hash || u.password || 'sha256_01d37036f28a8d3663073d10',
            role: resolvedRole,
            store_id: resolvedStoreId,
            status: isSuper ? 'AKTIF' : (u.status || 'AKTIF'),
            position: resolvedPosition,
            status_peran_kerja: resolvedPosition,
            avatar: u.avatar || u.foto_profil || null,
            foto_profil: u.foto_profil || u.avatar || null,
            must_change_password: u.must_change_password ? 1 : 0,
            jam_masuk_standar: u.jam_masuk_standar || '08:30',
            jam_pulang_standar: u.jam_pulang_standar || '17:00',
            toleransi_keterlambatan_menit: u.toleransi_keterlambatan_menit || 0,
          });
        }
      }

      if (Array.isArray(inventory)) {
        for (const inv of inventory) {
          await upsertRecord('inventory', {
            id: inv.id,
            store_id: inv.store_id,
            category_id: inv.category_id,
            kode_barang: inv.kode_barang,
            nama_barang: inv.nama_barang,
            model_iphone: inv.model_iphone,
            harga_beli: inv.harga_beli || 0,
            harga_jual: inv.harga_jual || 0,
            stok: inv.stok || 0,
            stok_minimum: inv.stok_minimum || 5,
            satuan: inv.satuan || 'pcs',
            keterangan: inv.keterangan || '',
            status: inv.status || 'AMAN',
          });
        }
      }

      if (Array.isArray(transactions)) {
        for (const trx of transactions) {
          await upsertRecord('stock_transactions', {
            id: trx.id,
            store_id: trx.store_id,
            inventory_id: trx.inventory_id,
            kode_barang: trx.kode_barang,
            nama_barang: trx.nama_barang,
            model_iphone: trx.model_iphone || '',
            harga_beli: trx.harga_beli || 0,
            harga_jual: trx.harga_jual || 0,
            jenis: trx.jenis,
            direction: trx.direction,
            jumlah: trx.jumlah,
            stok_sebelum: trx.stok_sebelum,
            stok_sesudah: trx.stok_sesudah,
            alasan: trx.alasan,
            keterangan: trx.keterangan || '',
            tanggal: trx.tanggal,
            waktu: trx.waktu,
            user_id: trx.user_id,
            user_name: trx.user_name,
          });
        }
      }

      if (Array.isArray(returns)) {
        for (const ret of returns) {
          await upsertRecord('returns', {
            id: ret.id,
            store_id: ret.store_id,
            inventory_id: ret.inventory_id,
            kode_barang: ret.kode_barang,
            nama_barang: ret.nama_barang,
            model_iphone: ret.model_iphone || '',
            harga_beli: ret.harga_beli || 0,
            harga_jual: ret.harga_jual || 0,
            jumlah: ret.jumlah,
            tanggal_return: ret.tanggal_return || ret.tanggal_pengajuan || new Date().toISOString().slice(0, 10),
            tanggal_pengajuan: ret.tanggal_pengajuan || ret.tanggal_return || new Date().toISOString().slice(0, 10),
            customer_name: ret.customer_name || '',
            customer_phone: ret.customer_phone || '',
            alasan: ret.alasan || ret.alasan_return || '',
            alasan_return: ret.alasan_return || ret.alasan || '',
            keterangan: ret.keterangan || '',
            catatan_approval: ret.catatan_approval || ret.catatan_proses || '',
            catatan_proses: ret.catatan_proses || ret.catatan_approval || '',
            status: ret.status,
            dibuat_oleh_id: ret.dibuat_oleh_id || null,
            dibuat_oleh_name: ret.dibuat_oleh_name || null,
            diproses_oleh_id: ret.diproses_oleh_id || null,
            diproses_oleh_name: ret.diproses_oleh_name || null,
            tanggal_proses: ret.tanggal_proses || null,
          });
        }
      }

      if (Array.isArray(attendance)) {
        for (const att of attendance) {
          // Super admin tidak memiliki absensi
          if (att.user_id === 'user-super' || att.user_name?.toLowerCase().includes('super admin')) {
            continue;
          }
          await upsertRecord('attendance', {
            id: att.id,
            user_id: att.user_id,
            user_name: att.user_name,
            store_id: att.store_id,
            store_name: att.store_name || '',
            tanggal: att.tanggal,
            jam_masuk: att.jam_masuk || null,
            jam_keluar: att.jam_keluar || att.jam_pulang || null,
            jam_pulang: att.jam_pulang || att.jam_keluar || null,
            status: att.status,
            catatan: att.catatan || att.keterangan || '',
            keterangan: att.keterangan || att.catatan || '',
          });
        }
      }

      if (Array.isArray(activityLogs)) {
        for (const log of activityLogs) {
          const isSuper =
            log.role === 'SUPER_ADMIN' ||
            log.user_id === 'user-super' ||
            (log.user_name && log.user_name.toLowerCase().includes('super admin'));
          const isAbsenActivity =
            log.tipe === 'ABSENSI' ||
            (log.aktivitas && log.aktivitas.toLowerCase().includes('absen')) ||
            (log.detail_perubahan && log.detail_perubahan.toLowerCase().includes('absen'));
          if (isSuper && isAbsenActivity) {
            continue;
          }

          // 2. Karyawan hanya berwenang untuk Absensi & Akun Profil. Karyawan TIDAK BOLEH memiliki log transaksi barang/servis!
          if (log.role === 'KARYAWAN') {
            const act = (log.aktivitas || '').toLowerCase();
            const det = (log.detail_perubahan || '').toLowerCase();
            const rawType = (log.tipe || '').toUpperCase();
            const isKaryawanAllowed =
              (rawType === 'ABSENSI' || rawType === 'AUTH' || rawType === 'USER') &&
              !act.includes('perbaikan') &&
              !act.includes('layar') &&
              !act.includes('servis') &&
              !act.includes('barang') &&
              !act.includes('stok') &&
              !act.includes('return') &&
              !det.includes('perbaikan') &&
              !det.includes('servis');
            if (!isKaryawanAllowed) {
              continue;
            }
          }

          const allowedEnums = ['AUTH', 'INVENTORY', 'TRANSACTION', 'RETURN', 'ABSENSI', 'USER', 'STORE', 'SYSTEM'];
          let resolvedTipe = (log.tipe || 'SYSTEM').toUpperCase();
          if (!allowedEnums.includes(resolvedTipe)) {
            if (resolvedTipe === 'LOG') {
              const act = (log.aktivitas || '').toLowerCase();
              if (act.includes('return')) resolvedTipe = 'RETURN';
              else if (act.includes('absen') || act.includes('check')) resolvedTipe = 'ABSENSI';
              else if (act.includes('barang') || act.includes('servis')) resolvedTipe = 'TRANSACTION';
              else if (act.includes('stok') || act.includes('komponen')) resolvedTipe = 'INVENTORY';
              else resolvedTipe = 'SYSTEM';
            } else {
              resolvedTipe = 'SYSTEM';
            }
          }

          await upsertRecord('activity_logs', {
            id: log.id,
            user_id: log.user_id,
            user_name: log.user_name,
            role: log.role || 'KARYAWAN',
            store_id: log.store_id || null,
            store_name: log.store_name || '',
            aktivitas: log.aktivitas,
            detail_perubahan: log.detail_perubahan,
            waktu: log.waktu,
            ip_address: log.ip_address || '127.0.0.1',
            tipe: resolvedTipe,
          });
        }
      }

      if (Array.isArray(notifications)) {
        for (const notif of notifications) {
          await upsertRecord('notifications', {
            id: notif.id,
            store_id: notif.store_id || null,
            store_name: notif.store_name || '',
            target_roles: notif.target_roles ? JSON.stringify(notif.target_roles) : null,
            target_user_id: notif.target_user_id || null,
            creator_id: notif.creator_id || null,
            creator_name: notif.creator_name || null,
            kategori: notif.kategori || 'SISTEM',
            judul: notif.judul,
            pesan: notif.pesan,
            tipe: notif.tipe || 'INFO',
            waktu: notif.waktu,
            read_status: notif.read ? 1 : 0,
            read_by: notif.read_by ? JSON.stringify(notif.read_by) : '[]',
            link_page: notif.link_page || null,
            is_global: notif.is_global ? 1 : 0,
          });
        }
      }

      await conn.query('SET FOREIGN_KEY_CHECKS = 1');
      res.json({ success: true, message: 'Data berhasil disinkronkan ke database MySQL.' });
    } finally {
      conn.release();
    }
  } catch (err: any) {
    console.error('[Sync-All Error]:', err?.message || err);
    res.json({ success: true, source: 'local_storage', message: 'Data berhasil disimpan ke penyimpanan lokal server.' });
  }
});

// =========================================================================
// CRUD API Routes for Individual Entities (Sync to MySQL)
// =========================================================================

// Categories
app.post('/api/categories', async (req, res) => {
  const c = req.body;
  const ok = await upsertRecord('categories', {
    id: c.id,
    store_id: c.store_id || null,
    nama_kategori: c.nama_kategori,
    deskripsi: c.deskripsi || '',
  });
  res.json({ success: ok });
});

app.delete('/api/categories/:id', async (req, res) => {
  const catId = req.params.id;
  try {
    if (inMemoryBackup?.categories) {
      inMemoryBackup.categories = inMemoryBackup.categories.filter((c: any) => c.id !== catId);
    }
    const status = await checkDbConnection();
    if (!status.connected) {
      return res.json({ success: true });
    }
    const pool = getDbPool();
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');
    await pool.query('DELETE FROM categories WHERE id = ?', [catId]);
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');
    return res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Gagal menghapus kategori.' });
  }
});

// iPhone Series
app.post('/api/iphone-series', async (req, res) => {
  const s = req.body;
  const ok = await upsertRecord('iphone_series', {
    id: s.id,
    store_id: s.store_id || null,
    nama_seri: s.nama_seri,
    deskripsi: s.deskripsi || '',
    tahun_rilis: s.tahun_rilis || 2025,
    urutan: s.urutan || 0,
  });
  res.json({ success: ok });
});

app.delete('/api/iphone-series/:id', async (req, res) => {
  const seriesId = req.params.id;
  try {
    if (inMemoryBackup?.iphoneSeries) {
      inMemoryBackup.iphoneSeries = inMemoryBackup.iphoneSeries.filter((s: any) => s.id !== seriesId);
    }
    const status = await checkDbConnection();
    if (!status.connected) {
      return res.json({ success: true });
    }
    const pool = getDbPool();
    await pool.query('DELETE FROM iphone_series WHERE id = ?', [seriesId]);
    return res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Gagal menghapus seri iPhone.' });
  }
});

// Inventory
app.post('/api/inventory', async (req, res) => {
  const item = req.body;
  const ok = await upsertRecord('inventory', {
    id: item.id,
    store_id: item.store_id,
    category_id: item.category_id,
    kode_barang: item.kode_barang,
    nama_barang: item.nama_barang,
    model_iphone: item.model_iphone,
    harga_beli: item.harga_beli || 0,
    harga_jual: item.harga_jual || 0,
    stok: item.stok || 0,
    stok_minimum: item.stok_minimum || 5,
    satuan: item.satuan || 'pcs',
    keterangan: item.keterangan || '',
    status: item.status || 'AMAN',
  });
  res.json({ success: ok });
});

app.delete('/api/inventory/:id', async (req, res) => {
  const itemId = req.params.id;
  try {
    if (inMemoryBackup?.inventory) {
      inMemoryBackup.inventory = inMemoryBackup.inventory.filter((i: any) => i.id !== itemId);
    }
    const status = await checkDbConnection();
    if (!status.connected) {
      return res.json({ success: true });
    }
    const pool = getDbPool();
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');
    await pool.query('DELETE FROM inventory WHERE id = ?', [itemId]);
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');
    return res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Gagal menghapus barang.' });
  }
});

// Transactions
app.post('/api/transactions', async (req, res) => {
  const trx = req.body;
  const ok = await upsertRecord('stock_transactions', {
    id: trx.id,
    store_id: trx.store_id,
    inventory_id: trx.inventory_id,
    kode_barang: trx.kode_barang,
    nama_barang: trx.nama_barang,
    model_iphone: trx.model_iphone || '',
    harga_beli: trx.harga_beli || 0,
    harga_jual: trx.harga_jual || 0,
    jenis: trx.jenis,
    direction: trx.direction,
    jumlah: trx.jumlah,
    stok_sebelum: trx.stok_sebelum,
    stok_sesudah: trx.stok_sesudah,
    alasan: trx.alasan,
    keterangan: trx.keterangan || '',
    tanggal: trx.tanggal,
    waktu: trx.waktu,
    user_id: trx.user_id,
    user_name: trx.user_name,
  });
  res.json({ success: ok });
});

app.delete('/api/transactions/:id', async (req, res) => {
  const trxId = req.params.id;
  try {
    if (inMemoryBackup?.transactions) {
      inMemoryBackup.transactions = inMemoryBackup.transactions.filter((t: any) => t.id !== trxId);
    }
    const status = await checkDbConnection();
    if (!status.connected) {
      return res.json({ success: true });
    }
    const pool = getDbPool();
    await pool.query('DELETE FROM stock_transactions WHERE id = ?', [trxId]);
    return res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Gagal menghapus transaksi.' });
  }
});

// Returns
app.post('/api/returns', async (req, res) => {
  const ret = req.body;
  const ok = await upsertRecord('returns', {
    id: ret.id,
    store_id: ret.store_id,
    inventory_id: ret.inventory_id,
    kode_barang: ret.kode_barang,
    nama_barang: ret.nama_barang,
    model_iphone: ret.model_iphone || '',
    harga_beli: ret.harga_beli || 0,
    harga_jual: ret.harga_jual || 0,
    jumlah: ret.jumlah,
    tanggal_return: ret.tanggal_return || ret.tanggal_pengajuan,
    tanggal_pengajuan: ret.tanggal_pengajuan || ret.tanggal_return,
    customer_name: ret.customer_name || '',
    customer_phone: ret.customer_phone || '',
    alasan: ret.alasan || ret.alasan_return || '',
    alasan_return: ret.alasan_return || ret.alasan || '',
    keterangan: ret.keterangan || '',
    catatan_approval: ret.catatan_approval || ret.catatan_proses || '',
    catatan_proses: ret.catatan_proses || ret.catatan_approval || '',
    status: ret.status,
    dibuat_oleh_id: ret.dibuat_oleh_id || null,
    dibuat_oleh_name: ret.dibuat_oleh_name || null,
    diproses_oleh_id: ret.diproses_oleh_id || null,
    diproses_oleh_name: ret.diproses_oleh_name || null,
    tanggal_proses: ret.tanggal_proses || null,
  });
  res.json({ success: ok });
});

app.delete('/api/returns/:id', async (req, res) => {
  const retId = req.params.id;
  try {
    if (inMemoryBackup?.returns) {
      inMemoryBackup.returns = inMemoryBackup.returns.filter((r: any) => r.id !== retId);
    }
    const status = await checkDbConnection();
    if (!status.connected) {
      return res.json({ success: true });
    }
    const pool = getDbPool();
    await pool.query('DELETE FROM returns WHERE id = ?', [retId]);
    return res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Gagal menghapus return.' });
  }
});

// Attendance
app.post('/api/attendance', async (req, res) => {
  const att = req.body;
  if (att.user_id === 'user-super' || att.user_name?.toLowerCase().includes('super admin')) {
    return res.json({ success: true, message: 'Super admin tidak memiliki absensi' });
  }
  const ok = await upsertRecord('attendance', {
    id: att.id,
    user_id: att.user_id,
    user_name: att.user_name,
    store_id: att.store_id,
    store_name: att.store_name || '',
    tanggal: att.tanggal,
    jam_masuk: att.jam_masuk || null,
    jam_keluar: att.jam_keluar || att.jam_pulang || null,
    jam_pulang: att.jam_pulang || att.jam_keluar || null,
    status: att.status,
    catatan: att.catatan || att.keterangan || '',
    keterangan: att.keterangan || att.catatan || '',
  });
  res.json({ success: ok });
});

app.delete('/api/attendance/:id', async (req, res) => {
  const attId = req.params.id;
  try {
    if (inMemoryBackup?.attendance) {
      inMemoryBackup.attendance = inMemoryBackup.attendance.filter((a: any) => a.id !== attId);
    }
    const ok = await deleteRecord('attendance', attId);
    res.json({ success: ok });
  } catch {
    res.json({ success: true });
  }
});

// Stores
app.post('/api/stores', async (req, res) => {
  const s = req.body;
  const ok = await upsertRecord('stores', {
    id: s.id,
    nama_toko: s.nama_toko,
    cabang: s.cabang,
    alamat: s.alamat || '',
    nomor_telepon: s.nomor_telepon || '',
    status: s.status || 'AKTIF',
    pic_name: s.pic_name || '',
    jam_operasional: s.jam_operasional || '08:30 - 20:00 WIB',
    jam_masuk_standar: s.jam_masuk_standar || '08:30',
    jam_pulang_standar: s.jam_pulang_standar || '17:00',
    toleransi_keterlambatan_menit: s.toleransi_keterlambatan_menit || 0,
    foto_profil: s.foto_profil || null,
  });
  res.json({ success: ok });
});

app.delete('/api/stores/:id', async (req, res) => {
  const storeId = req.params.id;
  try {
    // 1. Check in-memory backup if users are still assigned
    if (inMemoryBackup?.users) {
      const linkedInMemory = inMemoryBackup.users.filter((u: any) => u.store_id === storeId);
      if (linkedInMemory.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Cabang toko tidak dapat dihapus karena masih ada ${linkedInMemory.length} akun Admin/Karyawan yang terhubung. Pindahkan atau atur akun-akun tersebut terlebih dahulu.`,
        });
      }
    }

    const status = await checkDbConnection();
    if (status.connected) {
      const pool = getDbPool();
      const conn = await pool.getConnection();
      try {
        // Enforce DB check: ensure no users are still connected to this store
        const [linkedDbUsers]: any = await conn.query('SELECT id, nama, role FROM users WHERE store_id = ?', [storeId]);
        if (linkedDbUsers && linkedDbUsers.length > 0) {
          return res.status(400).json({
            success: false,
            message: `Cabang toko tidak dapat dihapus karena masih ada ${linkedDbUsers.length} akun Admin/Karyawan yang terhubung di database. Pindahkan akun terlebih dahulu.`,
          });
        }

        await conn.query('SET FOREIGN_KEY_CHECKS = 0');
        // Cascade delete data tied strictly to this branch store (inventory, stock transactions, returns, attendance, notifications)
        await conn.query('DELETE FROM inventory WHERE store_id = ?', [storeId]);
        await conn.query('DELETE FROM stock_transactions WHERE store_id = ?', [storeId]);
        await conn.query('DELETE FROM returns WHERE store_id = ?', [storeId]);
        await conn.query('DELETE FROM attendance WHERE store_id = ?', [storeId]);
        await conn.query('DELETE FROM notifications WHERE store_id = ?', [storeId]);
        await conn.query('DELETE FROM stores WHERE id = ?', [storeId]);
        await conn.query('SET FOREIGN_KEY_CHECKS = 1');
      } finally {
        conn.release();
      }
    }

    // 2. Remove store and strictly tied data from in-memory backup
    if (inMemoryBackup?.stores) {
      inMemoryBackup.stores = inMemoryBackup.stores.filter((s: any) => s.id !== storeId);
      if (inMemoryBackup.inventory) inMemoryBackup.inventory = inMemoryBackup.inventory.filter((i: any) => i.store_id !== storeId);
      if (inMemoryBackup.transactions) inMemoryBackup.transactions = inMemoryBackup.transactions.filter((t: any) => t.store_id !== storeId);
      if (inMemoryBackup.returns) inMemoryBackup.returns = inMemoryBackup.returns.filter((r: any) => r.store_id !== storeId);
      if (inMemoryBackup.attendance) inMemoryBackup.attendance = inMemoryBackup.attendance.filter((a: any) => a.store_id !== storeId);
    }

    return res.json({ success: true, message: 'Cabang toko dan seluruh data terkait berhasil dihapus permanen.' });
  } catch (err: any) {
    console.error(`[Delete Store Error]:`, err?.message || err);
    res.status(500).json({ success: false, message: err?.message || 'Gagal menghapus toko.' });
  }
});

// Users
app.post('/api/users', async (req, res) => {
  const u = req.body;
  const ok = await upsertRecord('users', {
    id: u.id,
    nama: u.nama || u.name,
    name: u.name || u.nama,
    username: u.username || u.email,
    nomor_telepon: u.nomor_telepon || u.no_hp || '',
    no_hp: u.no_hp || u.nomor_telepon || '',
    email: u.email || null,
    email_tertaut: u.email_tertaut || null,
    is_email_verified: u.is_email_verified ? 1 : 0,
    password_hash: u.password_hash || u.password || 'sha256_01d37036f28a8d3663073d10',
    role: u.role,
    store_id: u.store_id || null,
    status: u.status || 'AKTIF',
    position: u.position || u.status_peran_kerja || '',
    status_peran_kerja: u.status_peran_kerja || u.position || '',
    avatar: u.avatar || u.foto_profil || null,
    foto_profil: u.foto_profil || u.avatar || null,
    must_change_password: u.must_change_password ? 1 : 0,
    jam_masuk_standar: u.jam_masuk_standar || '08:30',
    jam_pulang_standar: u.jam_pulang_standar || '17:00',
    toleransi_keterlambatan_menit: u.toleransi_keterlambatan_menit || 0,
  });
  res.json({ success: ok });
});

app.delete('/api/users/:id', async (req, res) => {
  const userId = req.params.id;
  try {
    if (inMemoryBackup?.users) {
      inMemoryBackup.users = inMemoryBackup.users.filter((u: any) => u.id !== userId);
    }

    const status = await checkDbConnection();
    if (!status.connected) {
      return res.json({ success: true, message: 'Akun berhasil dihapus dari penyimpanan lokal.' });
    }

    const pool = getDbPool();
    const conn = await pool.getConnection();
    try {
      const [target] = await conn.query<any[]>('SELECT role FROM users WHERE id = ?', [userId]);
      if (Array.isArray(target) && target[0]?.role === 'SUPER_ADMIN') {
        return res.status(400).json({ success: false, message: 'Akun Super Admin sistem tidak dapat dihapus.' });
      }

      await conn.query('SET FOREIGN_KEY_CHECKS = 0');
      await conn.query('DELETE FROM attendance WHERE user_id = ?', [userId]);
      await conn.query('DELETE FROM users WHERE id = ?', [userId]);
      await conn.query('SET FOREIGN_KEY_CHECKS = 1');
      return res.json({ success: true, message: 'Akun berhasil dihapus permanen dari MySQL.' });
    } finally {
      conn.release();
    }
  } catch (err: any) {
    console.error(`[Delete User Error]:`, err?.message || err);
    res.status(500).json({ success: false, message: err?.message || 'Gagal menghapus akun.' });
  }
});

// Reset attendance for user today
app.delete('/api/attendance/user-today/:userId', async (req, res) => {
  const userId = req.params.userId;
  const dateStr = (req.query.date as string) || new Date().toISOString().split('T')[0];
  try {
    if (inMemoryBackup?.attendance) {
      inMemoryBackup.attendance = inMemoryBackup.attendance.filter(
        (a: any) => !(a.user_id === userId && (a.tanggal === dateStr || a.tanggal?.startsWith(dateStr)))
      );
    }

    const status = await checkDbConnection();
    if (!status.connected) {
      return res.json({ success: true, message: 'Absensi hari ini berhasil direset dari penyimpanan lokal.' });
    }

    const pool = getDbPool();
    await pool.query('DELETE FROM attendance WHERE user_id = ? AND (tanggal = ? OR tanggal LIKE ?)', [
      userId,
      dateStr,
      `${dateStr}%`,
    ]);
    return res.json({ success: true, message: 'Absensi hari ini berhasil direset dari database MySQL.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Gagal mereset absensi.' });
  }
});

// Activity logs
app.post('/api/activity-logs', async (req, res) => {
  const log = req.body;
  const isSuper =
    log.role === 'SUPER_ADMIN' ||
    log.user_id === 'user-super' ||
    (log.user_name && log.user_name.toLowerCase().includes('super admin'));
  const isAbsenActivity =
    log.tipe === 'ABSENSI' ||
    (log.aktivitas && log.aktivitas.toLowerCase().includes('absen')) ||
    (log.detail_perubahan && log.detail_perubahan.toLowerCase().includes('absen'));
  if (isSuper && isAbsenActivity) {
    return res.json({ success: true, message: 'Super admin attendance logs ignored' });
  }

  // Karyawan hanya berwenang untuk Absensi & Akun Profil.
  // Karyawan TIDAK BOLEH memiliki log transaksi barang, perbaikan, servis, return, atau inventaris!
  if (log.role === 'KARYAWAN') {
    const act = (log.aktivitas || '').toLowerCase();
    const det = (log.detail_perubahan || '').toLowerCase();
    const rawType = (log.tipe || '').toUpperCase();
    const isKaryawanAllowed =
      (rawType === 'ABSENSI' || rawType === 'AUTH' || rawType === 'USER') &&
      !act.includes('perbaikan') &&
      !act.includes('layar') &&
      !act.includes('servis') &&
      !act.includes('barang') &&
      !act.includes('stok') &&
      !act.includes('return') &&
      !det.includes('perbaikan') &&
      !det.includes('servis');

    if (!isKaryawanAllowed) {
      return res.json({ success: false, message: 'Karyawan activity outside attendance/profile blocked' });
    }
  }

  // Validasi enum tipe agar tidak ada nilai 'log' atau yang tidak valid
  const allowedEnums = ['AUTH', 'INVENTORY', 'TRANSACTION', 'RETURN', 'ABSENSI', 'USER', 'STORE', 'SYSTEM'];
  let resolvedTipe = (log.tipe || 'SYSTEM').toUpperCase();
  if (!allowedEnums.includes(resolvedTipe)) {
    if (resolvedTipe === 'LOG') {
      const act = (log.aktivitas || '').toLowerCase();
      if (act.includes('return')) resolvedTipe = 'RETURN';
      else if (act.includes('absen') || act.includes('check')) resolvedTipe = 'ABSENSI';
      else if (act.includes('barang') || act.includes('servis')) resolvedTipe = 'TRANSACTION';
      else if (act.includes('stok') || act.includes('komponen')) resolvedTipe = 'INVENTORY';
      else resolvedTipe = 'SYSTEM';
    } else {
      resolvedTipe = 'SYSTEM';
    }
  }

  const ok = await upsertRecord('activity_logs', {
    id: log.id,
    user_id: log.user_id,
    user_name: log.user_name,
    role: log.role || 'KARYAWAN',
    store_id: log.store_id || null,
    store_name: log.store_name || '',
    aktivitas: log.aktivitas,
    detail_perubahan: log.detail_perubahan,
    waktu: log.waktu,
    ip_address: log.ip_address || '127.0.0.1',
    tipe: resolvedTipe,
  });
  res.json({ success: ok });
});

app.delete('/api/activity-logs/:id', async (req, res) => {
  const logId = req.params.id;
  try {
    if (inMemoryBackup?.activityLogs) {
      inMemoryBackup.activityLogs = inMemoryBackup.activityLogs.filter((l: any) => l.id !== logId);
    }
    const ok = await deleteRecord('activity_logs', logId);
    res.json({ success: ok });
  } catch {
    res.json({ success: true });
  }
});

// Notifications
app.post('/api/notifications', async (req, res) => {
  const notif = req.body;
  const ok = await upsertRecord('notifications', {
    id: notif.id,
    store_id: notif.store_id || null,
    store_name: notif.store_name || '',
    target_roles: notif.target_roles ? JSON.stringify(notif.target_roles) : null,
    target_user_id: notif.target_user_id || null,
    creator_id: notif.creator_id || null,
    creator_name: notif.creator_name || null,
    kategori: notif.kategori || 'SISTEM',
    judul: notif.judul,
    pesan: notif.pesan,
    tipe: notif.tipe || 'INFO',
    waktu: notif.waktu,
    read_status: notif.read ? 1 : 0,
    read_by: notif.read_by ? JSON.stringify(notif.read_by) : '[]',
    link_page: notif.link_page || null,
    is_global: notif.is_global ? 1 : 0,
  });
  res.json({ success: ok });
});

// =========================================================================
// API ROUTE: Send OTP (Email linking & password reset)
// =========================================================================
app.post('/api/send-otp', async (req, res) => {
  try {
    const { email, otp, name, type = 'verification' } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email dan kode OTP diperlukan.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const gmailUser = (process.env.GMAIL_USER || 'mhdalfinml@gmail.com').trim();
    const rawGmailPass = process.env.GMAIL_APP_PASSWORD || 'bvne dbbm xcuo mros';
    const gmailPass = rawGmailPass.replace(/\s+/g, '');

    const isReset = type === 'reset';
    const isUnlink = type === 'unlink';

    let emailSubject = `${otp} adalah kode verifikasi iPhone Repair Medan Anda`;
    let emailTitle = 'Verifikasi Akun';
    let emailDescription = `Berikut adalah kode verifikasi OTP resmi untuk menghubungkan akun email (<strong>${cleanEmail}</strong>) pada sistem iPhone Repair Medan:`;
    let plainDescription = `Berikut adalah kode verifikasi OTP resmi untuk menghubungkan akun email (${cleanEmail}) pada sistem iPhone Repair Medan:`;
    let emailFooter = 'Kode verifikasi ini berlaku selama 5 menit. Demi keamanan, jangan pernah membagikan kode ini kepada siapa pun.';

    if (isReset) {
      emailSubject = `${otp} adalah kode reset kata sandi akun iPhone Repair Medan Anda`;
      emailTitle = 'Reset Kata Sandi Akun';
      emailDescription = `Kami menerima permintaan untuk mengatur ulang kata sandi akun sistem Anda (<strong>${cleanEmail}</strong>). Gunakan kode verifikasi berikut:`;
      plainDescription = `Kami menerima permintaan untuk mengatur ulang kata sandi akun sistem Anda (${cleanEmail}). Gunakan kode verifikasi berikut:`;
      emailFooter = 'Kode verifikasi ini berlaku selama 15 menit. Jika Anda tidak meminta reset sandi, abaikan pesan ini dan kata sandi Anda tetap aman.';
    } else if (isUnlink) {
      emailSubject = `${otp} adalah kode konfirmasi pelepasan email iPhone Repair Medan`;
      emailTitle = 'Konfirmasi Pelepasan Email';
      emailDescription = `Kami menerima konfirmasi untuk melepaskan tautan akun email (<strong>${cleanEmail}</strong>) dari sistem inventaris:`;
      plainDescription = `Kami menerima konfirmasi untuk melepaskan tautan akun email (${cleanEmail}) dari sistem inventaris:`;
      emailFooter = 'Kode verifikasi ini berlaku selama 5 menit. Jika bukan Anda yang meminta tindakan ini, segera periksa keamanan akun Anda.';
    }

    const emailText = `Halo ${name || 'Pengguna'},\n\n${plainDescription}\n\nKODE VERIFIKASI ANDA: ${otp}\n\n${emailFooter}\n\nSalam,\nTim iPhone Repair Medan`;

    const emailHtml = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${emailTitle}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
        <div style="display: none; max-height: 0px; overflow: hidden; opacity: 0;">
          Kode verifikasi Anda adalah ${otp}. Berlaku selama 5 menit.
        </div>
        <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.04);">
          <div style="background-color: #4f46e5; padding: 20px 24px; text-align: left;">
            <h1 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: 700; letter-spacing: -0.3px;">
              iPhone Repair Medan
            </h1>
            <p style="color: #c7d2fe; margin: 4px 0 0 0; font-size: 12px;">Sistem Pengelolaan Inventaris & Kasir</p>
          </div>
          
          <div style="padding: 28px 24px;">
            <div style="display: inline-block; padding: 4px 10px; background-color: #eef2ff; color: #4338ca; border-radius: 6px; font-size: 12px; font-weight: 600; margin-bottom: 16px;">
              ${emailTitle}
            </div>
            
            <p style="color: #334155; font-size: 15px; margin: 0 0 12px 0;">Halo <strong>${name || 'Pengguna'}</strong>,</p>
            <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
              ${emailDescription}
            </p>
            
            <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 18px; border-radius: 12px; text-align: center; margin: 20px 0;">
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; margin-bottom: 6px; font-weight: 600;">Kode Verifikasi</div>
              <span style="font-size: 34px; font-weight: 800; letter-spacing: 6px; color: #1e293b; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;">${otp}</span>
            </div>
            
            <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 20px 0 0 0;">
              ${emailFooter}
            </p>
          </div>
          
          <div style="background-color: #f8fafc; border-top: 1px solid #f1f5f9; padding: 16px 24px; text-align: center;">
            <p style="color: #94a3b8; font-size: 11px; margin: 0;">
              Email otomatis dari Sistem Inventaris iPhone Repair Medan.<br>Mohon tidak membalas email ini secara langsung.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    if (!gmailUser || !gmailPass) {
      return res.status(500).json({
        success: false,
        message: 'Konfigurasi Gmail SMTP belum diatur di server.',
      });
    }

    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailPass,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });

      await transporter.sendMail({
        from: `"iPhone Repair Medan" <${gmailUser}>`,
        to: cleanEmail,
        subject: emailSubject,
        text: emailText,
        html: emailHtml,
        headers: {
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          'Importance': 'high',
          'Auto-Submitted': 'auto-generated',
          'X-Auto-Response-Suppress': 'OOF, AutoReply',
        },
      });

      return res.json({
        success: true,
        message: `Kode ${isReset ? 'reset sandi' : 'OTP'} resmi berhasil dikirim ke ${cleanEmail}. Silakan periksa inbox / spam Gmail Anda!`,
      });
    } catch (gmailErr: any) {
      console.error('Nodemailer error:', gmailErr);
      return res.status(500).json({
        success: false,
        message: `Gagal mengirim email: ${gmailErr?.message || 'Terjadi kesalahan pada layanan Gmail SMTP.'}`,
      });
    }
  } catch (error: any) {
    console.error('Error sending OTP:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server saat memproses pengiriman email.',
    });
  }
});

async function startServer() {
  // Test MySQL connection & auto-initialize tables if empty
  try {
    const dbStatus = await checkDbConnection();
    if (dbStatus.connected) {
      console.log(`[MySQL] Berhasil terhubung ke database "${dbStatus.database}" di ${dbStatus.host}:${dbStatus.port}`);
      await initializeDatabaseIfEmpty();
    } else {
      console.log(`[System Notice] Mode offline aktif (${dbStatus.error}). Menggunakan penyimpanan lokal.`);
    }
  } catch {
    // quiet boot
  }

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        watch: {
          ignored: ['**/*.json', '**/*.sql', '**/.env*'],
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`\n  ➜  Local:   http://localhost:${port}/`);
    console.log(`  ➜  Network: http://127.0.0.1:${port}/\n`);
  });
}

startServer();
