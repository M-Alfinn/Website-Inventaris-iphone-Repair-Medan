import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface DbStatus {
  connected: boolean;
  host: string;
  port: number;
  database: string;
  user: string;
  error?: string;
  tablesCount?: number;
  tables?: Record<string, number>;
  lastChecked: string;
}

export function getDbConfig() {
  return {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '8111', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'iphone_repair_medan',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 5000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    dateStrings: true,
  };
}

let pool: mysql.Pool | null = null;
let lastCheckTimestamp = 0;
let currentStatus: DbStatus = {
  connected: false,
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '8111', 10),
  database: process.env.DB_NAME || 'iphone_repair_medan',
  user: process.env.DB_USER || 'root',
  error: 'Belum diuji',
  lastChecked: new Date().toISOString(),
};

export function getDbPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool(getDbConfig());
  }
  return pool;
}

export async function checkDbConnection(force = false): Promise<DbStatus> {
  const now = Date.now();
  if (!force && now - lastCheckTimestamp < 5000 && currentStatus.lastChecked && currentStatus.connected) {
    return currentStatus;
  }
  lastCheckTimestamp = now;

  const cfg = getDbConfig();

  // Test 1: Try with primary host
  const hostsToTry = [cfg.host];
  if (cfg.host === 'localhost' && !hostsToTry.includes('127.0.0.1')) {
    hostsToTry.push('127.0.0.1');
  } else if (cfg.host === '127.0.0.1' && !hostsToTry.includes('localhost')) {
    hostsToTry.push('localhost');
  }

  let lastError: any = null;

  for (const hostCandidate of hostsToTry) {
    try {
      const testConn = await mysql.createConnection({
        ...cfg,
        host: hostCandidate,
      });

      const [tableRows] = await testConn.query<any[]>('SHOW TABLES');
      const tableNames: string[] = tableRows.map((r: any) => Object.values(r)[0] as string);
      
      const counts: Record<string, number> = {};
      for (const t of tableNames) {
        try {
          const [cntRows] = await testConn.query<any[]>(`SELECT COUNT(*) as count FROM \`${t}\``);
          counts[t] = Number(cntRows[0]?.count || 0);
        } catch {
          counts[t] = 0;
        }
      }

      await testConn.end();

      // If successful with a candidate host, update pool to use it
      if (hostCandidate !== cfg.host) {
        if (pool) await pool.end().catch(() => {});
        pool = mysql.createPool({ ...cfg, host: hostCandidate });
      }

      currentStatus = {
        connected: true,
        host: hostCandidate,
        port: cfg.port,
        database: cfg.database,
        user: cfg.user,
        tablesCount: tableNames.length,
        tables: counts,
        lastChecked: new Date().toISOString(),
      };
      return currentStatus;
    } catch (err: any) {
      lastError = err;
    }
  }

  // Provide clear troubleshooting guidance
  let errorMsg = lastError?.message || 'Koneksi ke MySQL gagal.';
  if (lastError?.code === 'ECONNREFUSED') {
    errorMsg = `Layanan MySQL tidak merespons di port ${cfg.port}. Pastikan modul MySQL di XAMPP dalam status START hijau.`;
  } else if (lastError?.code === 'ER_ACCESS_DENIED_ERROR') {
    errorMsg = `Akses ditolak untuk user '${cfg.user}' (password salah atau user belum diizinkan). Periksa DB_PASSWORD di .env atau tab Hak Akses di phpMyAdmin.`;
  }

  currentStatus = {
    connected: false,
    host: cfg.host,
    port: cfg.port,
    database: cfg.database,
    user: cfg.user,
    error: errorMsg,
    lastChecked: new Date().toISOString(),
  };
  return currentStatus;
}

/**
 * Otomatis inisialisasi tabel dari schema database.sql jika database MySQL kosong
 */
export async function initializeDatabaseIfEmpty(): Promise<boolean> {
  try {
    const status = await checkDbConnection();
    if (!status.connected) return false;

    if (status.tablesCount === 0 || !status.tables?.['inventory']) {
      const sqlPath = path.resolve(__dirname, 'database.sql');
      if (fs.existsSync(sqlPath)) {
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        const statements = sqlContent
          .split(/;\s*[\r\n]+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

        const currentPool = getDbPool();
        const conn = await currentPool.getConnection();
        try {
          await conn.query('SET FOREIGN_KEY_CHECKS = 0');
          for (const statement of statements) {
            try {
              await conn.query(statement);
            } catch {
              // Abaikan duplicate entry atau minor warning
            }
          }
          await conn.query('SET FOREIGN_KEY_CHECKS = 1');
          await checkDbConnection(true);
          return true;
        } finally {
          conn.release();
        }
      }
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Mengambil semua data sistem dari database MySQL
 */
export async function fetchAllDataFromMySQL(): Promise<any | null> {
  try {
    const status = await checkDbConnection();
    if (!status.connected) {
      return null;
    }

    const currentPool = getDbPool();
    const conn = await currentPool.getConnection();
    try {
      const [stores] = await conn.query('SELECT * FROM stores ORDER BY id ASC');
      const [users] = await conn.query('SELECT * FROM users ORDER BY role ASC, id ASC');
      const [categories] = await conn.query('SELECT * FROM categories ORDER BY id ASC');
      const [iphoneSeries] = await conn.query('SELECT * FROM iphone_series ORDER BY urutan ASC, id ASC');
      const [inventory] = await conn.query('SELECT * FROM inventory ORDER BY store_id ASC, category_id ASC, kode_barang ASC');
      const [transactions] = await conn.query('SELECT * FROM stock_transactions ORDER BY tanggal DESC, waktu DESC, id DESC LIMIT 500');
      const [returnsData] = await conn.query('SELECT * FROM returns ORDER BY tanggal_pengajuan DESC, id DESC');
      const [attendance] = await conn.query('SELECT * FROM attendance ORDER BY tanggal DESC, jam_masuk DESC, id DESC LIMIT 500');
      // Pembersihan otomatis: Hapus log anomali mutasi barang/perbaikan atas nama Karyawan dan perbaiki tipe 'log'
      try {
        await conn.query(`
          DELETE FROM activity_logs 
          WHERE role = 'KARYAWAN' 
            AND (tipe NOT IN ('ABSENSI', 'AUTH', 'USER') 
                 OR aktivitas LIKE '%perbaikan%' 
                 OR detail_perubahan LIKE '%perbaikan%'
                 OR aktivitas LIKE '%layar%'
                 OR detail_perubahan LIKE '%layar%'
                 OR tipe = 'log' OR tipe = 'LOG')
        `);
        await conn.query(`UPDATE activity_logs SET tipe = 'SYSTEM' WHERE tipe = 'log' OR tipe = 'LOG'`);
      } catch {
        // Abaikan jika tabel belum ada atau koneksi terbatas
      }

      const [activityLogs] = await conn.query(`
        SELECT * FROM activity_logs 
        WHERE NOT (role = 'KARYAWAN' AND (tipe NOT IN ('ABSENSI', 'AUTH', 'USER') OR aktivitas LIKE '%perbaikan%' OR detail_perubahan LIKE '%perbaikan%'))
        ORDER BY waktu DESC, id DESC LIMIT 500
      `);
      const [notifications] = await conn.query('SELECT * FROM notifications ORDER BY created_at DESC, id DESC LIMIT 200');

      return {
        stores,
        users,
        categories,
        iphoneSeries,
        inventory,
        transactions,
        returns: returnsData,
        attendance,
        activityLogs,
        notifications,
      };
    } finally {
      conn.release();
    }
  } catch {
    return null;
  }
}

/**
 * Menyimpan data perubahan ke MySQL
 */
export async function upsertRecord(table: string, data: Record<string, any>, primaryKey = 'id'): Promise<boolean> {
  try {
    const status = await checkDbConnection();
    if (!status.connected) {
      return false;
    }

    const currentPool = getDbPool();
    const keys = Object.keys(data);
    const values = keys.map((k) => (data[k] === undefined ? null : data[k]));
    const placeholders = keys.map(() => '?').join(', ');
    const updateClauses = keys.map((k) => `\`${k}\` = VALUES(\`${k}\`)`).join(', ');

    const query = `
      INSERT INTO \`${table}\` (${keys.map((k) => `\`${k}\``).join(', ')})
      VALUES (${placeholders})
      ON DUPLICATE KEY UPDATE ${updateClauses}
    `;

    await currentPool.query(query, values);
    return true;
  } catch (err: any) {
    console.error(`[MySQL Upsert Error on "${table}"]:`, err?.message || err);
    return false;
  }
}

export async function deleteRecord(table: string, id: string, primaryKey = 'id'): Promise<boolean> {
  try {
    const status = await checkDbConnection();
    if (!status.connected) {
      return false;
    }

    const currentPool = getDbPool();
    await currentPool.query(`DELETE FROM \`${table}\` WHERE \`${primaryKey}\` = ?`, [id]);
    return true;
  } catch (err: any) {
    console.error(`[MySQL Delete Error on "${table}" id=${id}]:`, err?.message || err);
    return false;
  }
}
