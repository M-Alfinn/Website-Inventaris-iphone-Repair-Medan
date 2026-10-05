import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import {
  User,
  Store,
  Category,
  IPhoneSeries,
  InventoryItem,
  StockTransaction,
  ReturnItem,
  ReturnStatus,
  AttendanceRecord,
  AttendanceStatus,
  ActivityLog,
  AppNotification,
  NavigationPage,
  StockTransactionType,
  UserRole,
} from '../types';
import {
  INITIAL_STORES,
  INITIAL_CATEGORIES,
  INITIAL_IPHONE_SERIES,
  INITIAL_USERS,
  INITIAL_INVENTORY,
  INITIAL_TRANSACTIONS,
  INITIAL_RETURNS,
  INITIAL_ATTENDANCE,
  INITIAL_ACTIVITY_LOGS,
  INITIAL_NOTIFICATIONS,
  calculateStockStatus,
} from '../mockData';
import { hashPasswordSync, verifyPassword } from '../utils/security';
import {
  isNonEssentialActivity,
  isEssentialActivityLog,
  sanitizeActivityLogs,
  isNonEssentialNotification,
  sanitizeNotifications,
} from '../utils/activityLogRules';
import {
  isNotificationReadByUser,
  isNotificationVisibleForUser,
  filterNotificationsForUser,
  normalizeNotification,
} from '../utils/notificationRules';
import { dispatchRealEmailOtp } from '../utils/emailService';
import {
  parseTimeToMinutes,
  evaluateShiftCheckIn,
  evaluateShiftCheckOut,
} from '../utils/dateUtils';

const STORAGE_KEYS = {
  STORES: 'iphone_pos_clean_stores_v1',
  CATEGORIES: 'iphone_pos_clean_categories_v1',
  IPHONE_SERIES: 'iphone_pos_clean_series_v1',
  USERS: 'iphone_pos_clean_users_v1',
  INVENTORY: 'iphone_pos_clean_inventory_v1',
  TRANSACTIONS: 'iphone_pos_clean_transactions_v1',
  RETURNS: 'iphone_pos_clean_returns_v1',
  ATTENDANCE: 'iphone_pos_clean_attendance_v1',
  ACTIVITY_LOGS: 'iphone_pos_clean_activity_logs_v1',
  NOTIFICATIONS: 'iphone_pos_clean_notifications_v1',
  CURRENT_USER: 'iphone_pos_clean_current_user_v1',
  ACTIVE_STORE_ID: 'iphone_pos_clean_active_store_id_v1',
  RESET_TOKENS: 'iphone_pos_clean_reset_tokens_v1',
};

// Purge legacy storage keys and clean persistent auto-login keys once on load
// This ensures that fresh browser sessions and previews always start at the Login Form
if (typeof window !== 'undefined') {
  try {
    const legacyKeys = [
      'iphone_pos_clean_current_user_v1',
      'iphone_pos_clean_active_store_id_v1',
      'iphone_pos_stores_v2',
      'iphone_pos_categories_v2',
      'iphone_pos_series_v2',
      'iphone_pos_users_v3',
      'iphone_pos_inventory_v2',
      'iphone_pos_transactions_v2',
      'iphone_pos_returns_v2',
      'iphone_pos_attendance_v2',
      'iphone_pos_activity_logs_v2',
      'iphone_pos_notifications_v6',
      'iphone_pos_current_user_v3',
      'iphone_pos_active_store_id_v2',
      'iphone_pos_reset_tokens_v2',
    ];
    legacyKeys.forEach((k) => localStorage.removeItem(k));
  } catch {}
}

function getStoredData<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`[LocalStorage] Failed to load "${key}", using fallback:`, e);
    return fallback;
  }
}

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

export interface DbStatusInfo {
  connected: boolean;
  host: string;
  port: number;
  database: string;
  user: string;
  error?: string;
  tablesCount?: number;
  tables?: Record<string, number>;
  lastChecked?: string;
}

interface AppContextType {
  currentUser: User | null;
  activeStoreId: string | null;
  activeStore: Store | null;
  currentPage: NavigationPage;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isFirstLoginModalOpen: boolean;
  setIsFirstLoginModalOpen: (open: boolean) => void;
  
  // Data collections
  stores: Store[];
  categories: Category[];
  iphoneSeries: IPhoneSeries[];
  users: User[];
  inventory: InventoryItem[];
  transactions: StockTransaction[];
  returns: ReturnItem[];
  attendance: AttendanceRecord[];
  activityLogs: ActivityLog[];
  toasts: ToastMessage[];

  // Auth & Nav
  login: (identifier: string, passwordPlain?: string, role?: UserRole, storeId?: string) => Promise<{ success: boolean; mustChangePassword?: boolean; message?: string }>;
  logout: () => void;
  selectStore: (storeId: string | null) => void;
  navigateTo: (page: NavigationPage) => void;
  updateUserProfile: (profileData: {
    nama?: string;
    name?: string;
    email?: string;
    nomor_telepon?: string;
    position?: string;
    status_peran_kerja?: string;
    avatar?: string;
    foto_profil?: string;
    password?: string;
  }) => { success: boolean; message?: string };
  completeFirstTimePasswordChange: (newPasswordPlain: string) => boolean;
  requestPasswordReset: (identifier: string) => Promise<{ success: boolean; token?: string; targetEmail?: string; message: string }>;
  validateResetOtp: (email: string, otp: string) => { success: boolean; message: string };
  resetPasswordWithToken: (token: string, newPasswordPlain: string) => { success: boolean; message: string };
  adminResetUserPassword: (userId: string, tempPasswordPlain?: string) => { success: boolean; tempPassword?: string; message: string };
  linkUserEmail: (email: string) => { success: boolean; message: string };
  unlinkUserEmail: (otpCode?: string) => { success: boolean; message: string };
  sendEmailOtp: (email: string, type?: 'verification' | 'reset' | 'unlink') => Promise<{ success: boolean; otp?: string; message: string }>;
  verifyEmailOtp: (email: string, enteredOtp: string) => { success: boolean; message: string };
  validateOtpOnly: (email: string, enteredOtp: string) => { success: boolean; message: string };
  changeVerifiedEmail: (newEmail: string) => { success: boolean; message: string };
  changePassword: (oldPasswordPlain: string, newPasswordPlain: string) => { success: boolean; message: string };

  // Inventory & Stock
  addInventoryItem: (item: Omit<InventoryItem, 'id' | 'status' | 'created_at' | 'updated_at'>) => void;
  updateInventoryItem: (id: string, item: Partial<InventoryItem>) => void;
  deleteInventoryItem: (id: string) => void;
  adjustStock: (
    inventoryId: string,
    amount: number,
    direction: '+' | '-',
    reason: string,
    notes: string,
    trxType?: StockTransactionType
  ) => boolean;

  // Seri iPhone Management
  addIphoneSeries: (seriesData: { nama_seri: string; deskripsi?: string; tahun_rilis?: number; store_id?: string }) => void;
  updateIphoneSeries: (id: string, seriesData: Partial<IPhoneSeries>) => void;
  deleteIphoneSeries: (id: string) => void;

  // Category
  addCategory: (nama: string, deskripsi: string, storeId?: string) => void;
  updateCategory: (id: string, nama: string, deskripsi: string, storeId?: string) => void;
  deleteCategory: (id: string) => void;

  // Transactions
  recordStockIn: (inventoryId: string, amount: number, supplierNotes: string) => boolean;
  recordStockOut: (inventoryId: string, amount: number, reason: string, notes: string) => boolean;
  recordDamagedItem: (inventoryId: string, amount: number, reason: string, notes: string) => boolean;

  // Returns
  createReturn: (inventoryId: string, amount: number, reason: string, notes: string) => boolean;
  createReturnRequest: (inventoryId: string, customerName: string, customerPhone: string, amount: number, reason: string) => boolean;
  processReturn: (returnId: string, decision: 'DITERIMA' | 'DITOLAK', processNotes: string) => boolean;

  // Attendance
  checkInAttendance: (keterangan?: string) => boolean;
  checkOutAttendance: (keterangan?: string) => boolean;
  recordCheckIn: (userId: string, jamMasuk?: string, keterangan?: string) => boolean;
  recordCheckOut: (userId: string, jamKeluar?: string) => boolean;
  resetTodayAttendance: (userId: string) => void;
  deleteAttendanceRecord: (id: string) => void;
  recordManualAttendance: (
    userId: string,
    storeId: string,
    date: string,
    status: AttendanceStatus,
    jamMasuk: string,
    jamKeluar: string,
    keterangan: string
  ) => void;

  // User management
  addUser: (userData: Omit<User, 'id' | 'created_at'>) => void;
  updateUser: (id: string, userData: Partial<User>) => void;
  updateUserSchedule: (
    userId: string,
    schedule: {
      jam_masuk_standar: string;
      jam_pulang_standar: string;
      toleransi_keterlambatan_menit?: number;
    }
  ) => void;
  deleteUser: (id: string) => Promise<{ success: boolean; message: string }>;
  toggleUserStatus: (id: string, explicitStatus?: 'AKTIF' | 'NONAKTIF') => void;
  resetUserPassword: (id: string) => void;

  // Store management
  addStore: (storeData: Omit<Store, 'id' | 'created_at' | 'updated_at'>) => void;
  updateStore: (id: string, storeData: Partial<Store>) => void;
  updateStoreSchedule: (
    storeId: string,
    schedule: {
      jam_masuk_standar: string;
      jam_pulang_standar: string;
      toleransi_keterlambatan_menit?: number;
    }
  ) => void;
  deleteStore: (id: string) => Promise<{ success: boolean; message: string }>;
  toggleStoreStatus: (id: string, explicitStatus?: 'AKTIF' | 'NONAKTIF') => void;

  // Notifications
  notifications: AppNotification[];
  allNotifications?: AppNotification[];
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  hasUnreadNotifications: boolean;
  addNotification: (
    judul: string,
    pesan: string,
    tipe: 'WARNING' | 'SUCCESS' | 'INFO' | 'DANGER',
    linkPage?: NavigationPage,
    targetStoreId?: string | null,
    options?: {
      targetRoles?: UserRole[];
      targetUserId?: string | null;
      creatorId?: string;
      creatorName?: string;
      kategori?: 'INVENTORY' | 'RETURN' | 'ABSENSI' | 'SISTEM' | 'AUTH';
      isGlobal?: boolean;
    }
  ) => void;

  // Activity Logs Management
  purgeNonEssentialLogs: () => void;
  deleteActivityLog: (id: string) => void;
  clearAllActivityLogs: () => void;

  // Database MySQL & phpMyAdmin Integration
  dbStatus: DbStatusInfo | null;
  isCheckingDb: boolean;
  testDbConnection: () => Promise<{ success: boolean; message: string; status?: DbStatusInfo }>;
  syncDataToMySQL: () => Promise<{ success: boolean; message: string }>;
  refreshDataFromMySQL: () => Promise<boolean>;

  // Data Reset & Persistence
  resetAllDataToDefault: () => void;
  simulateRandomActivity: () => void;

  // Toasts
  showToast: (title: string, message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Session starts from sessionStorage within the active tab, ensuring fresh visits & preview start at Login Page
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const sessionRaw = sessionStorage.getItem('iphone_pos_session_user_v1');
      if (!sessionRaw) return null;
      const stored = JSON.parse(sessionRaw);
      if (!stored) return null;
      if (stored.id === 'user-super' || stored.role === 'SUPER_ADMIN') {
        return {
          ...stored,
          role: 'SUPER_ADMIN',
          store_id: null,
          position: 'Super Administrator',
          status_peran_kerja: 'Super Administrator',
        };
      }
      return stored;
    } catch {
      return null;
    }
  });

  const isRemoteSyncRef = useRef(false);

  const [activeStoreId, setActiveStoreId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = sessionStorage.getItem('iphone_pos_session_store_id_v1');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [currentPage, setCurrentPage] = useState<NavigationPage>(() => {
    if (typeof window === 'undefined') return 'DASHBOARD_TOKO';
    try {
      const savedPage = sessionStorage.getItem('iphone_pos_active_page_v1') as NavigationPage | null;
      const sessionRaw = sessionStorage.getItem('iphone_pos_session_user_v1');
      if (sessionRaw) {
        const stored = JSON.parse(sessionRaw);
        if (savedPage) {
          if (stored?.role === 'KARYAWAN') {
            const forbidden: NavigationPage[] = ['DASHBOARD_UTAMA', 'PILIH_TOKO', 'KARYAWAN', 'LAPORAN'];
            if (!forbidden.includes(savedPage)) {
              return savedPage;
            }
          } else if (stored?.role === 'ADMIN_TOKO') {
            const forbidden: NavigationPage[] = ['DASHBOARD_UTAMA', 'PILIH_TOKO'];
            if (!forbidden.includes(savedPage)) {
              return savedPage;
            }
          } else if (stored?.role === 'SUPER_ADMIN') {
            return savedPage;
          }
        }
        if (stored?.role === 'SUPER_ADMIN') return 'DASHBOARD_UTAMA';
      }
    } catch {}
    return 'DASHBOARD_TOKO';
  });
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // Database MySQL & phpMyAdmin connection status state
  const [dbStatus, setDbStatus] = useState<DbStatusInfo | null>(null);
  const [isCheckingDb, setIsCheckingDb] = useState<boolean>(false);

  // Data states with automatic LocalStorage recovery
  const [stores, setStores] = useState<Store[]>(() =>
    getStoredData<Store[]>(STORAGE_KEYS.STORES, INITIAL_STORES)
  );
  const [categories, setCategories] = useState<Category[]>(() => {
    const raw = getStoredData<Category[]>(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    const storedStores = getStoredData<Store[]>(STORAGE_KEYS.STORES, INITIAL_STORES);
    const defaultStoreId = storedStores[0]?.id || null;
    return raw.map((c) => ({
      ...c,
      store_id: c.store_id || defaultStoreId,
    }));
  });
  const [iphoneSeries, setIphoneSeries] = useState<IPhoneSeries[]>(() => {
    const raw = getStoredData<IPhoneSeries[]>(STORAGE_KEYS.IPHONE_SERIES, INITIAL_IPHONE_SERIES);
    const storedStores = getStoredData<Store[]>(STORAGE_KEYS.STORES, INITIAL_STORES);
    const defaultStoreId = storedStores[0]?.id || null;
    return raw.map((s) => ({
      ...s,
      store_id: s.store_id || defaultStoreId,
    }));
  });
  const [users, setUsers] = useState<User[]>(() => {
    const rawUsers = getStoredData<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    let hasSuperAdmin = false;
    const healedSuperUsers = rawUsers.map((u) => {
      if (u.id === 'user-super' || u.role === 'SUPER_ADMIN') {
        hasSuperAdmin = true;
        return {
          ...u,
          role: 'SUPER_ADMIN' as UserRole,
          store_id: null,
          position: 'Super Administrator',
          status_peran_kerja: 'Super Administrator',
        };
      }
      return u;
    });

    if (!hasSuperAdmin) {
      healedSuperUsers.unshift(INITIAL_USERS[0]);
    }

    // Database integrity: Enforce that every user has a UNIQUE email & email_tertaut
    const seenEmails = new Set<string>();
    return healedSuperUsers.map((user) => {
      let currentEmail = user.email ? user.email.trim().toLowerCase() : '';
      let currentTertaut = user.email_tertaut ? user.email_tertaut.trim().toLowerCase() : undefined;
      let isVerified = user.is_email_verified;

      if (currentEmail && seenEmails.has(currentEmail)) {
        // Duplicate email found in database! Restore to initial unique default email for this user
        const originalUser = INITIAL_USERS.find((u) => u.id === user.id);
        currentEmail = originalUser?.email?.toLowerCase() || `${user.username || 'user'}_${user.id}@gmail.com`;
        currentTertaut = undefined;
        isVerified = false;
      } else if (currentEmail) {
        seenEmails.add(currentEmail);
      }

      if (currentTertaut && seenEmails.has(currentTertaut)) {
        currentTertaut = undefined;
        isVerified = false;
      } else if (currentTertaut) {
        seenEmails.add(currentTertaut);
      }

      let positionVal = user.position || user.status_peran_kerja;
      if (!positionVal) {
        const orig = INITIAL_USERS.find((u) => u.id === user.id);
        positionVal = orig?.position || (user.role === 'ADMIN_TOKO' ? 'Kepala Toko' : user.role === 'SUPER_ADMIN' ? 'Admin Sistem' : 'Staf / Teknisi');
      }

      return {
        ...user,
        email: currentEmail,
        email_tertaut: currentTertaut,
        is_email_verified: isVerified,
        position: positionVal,
        status_peran_kerja: positionVal,
      };
    });
  });
  const [inventory, setInventory] = useState<InventoryItem[]>(() =>
    getStoredData<InventoryItem[]>(STORAGE_KEYS.INVENTORY, INITIAL_INVENTORY)
  );
  const [transactions, setTransactions] = useState<StockTransaction[]>(() =>
    getStoredData<StockTransaction[]>(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS)
  );
  const [returns, setReturns] = useState<ReturnItem[]>(() =>
    getStoredData<ReturnItem[]>(STORAGE_KEYS.RETURNS, INITIAL_RETURNS)
  );
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => {
    const raw = getStoredData<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, INITIAL_ATTENDANCE);
    // Super Admin tidak ada absensi - bersihkan riwayat absensi yang mungkin tercatat untuk super admin
    const cleaned = raw.filter(
      (a) => a.user_id !== 'user-super' && !a.user_name?.toLowerCase().includes('super admin')
    );
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(cleaned));
      }
    } catch {}
    return cleaned;
  });
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => {
    const raw = getStoredData<ActivityLog[]>(STORAGE_KEYS.ACTIVITY_LOGS, INITIAL_ACTIVITY_LOGS);
    const sanitized = sanitizeActivityLogs(raw);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify(sanitized));
      }
    } catch (e) {
      console.warn('Gagal sinkronisasi activity logs ke localStorage:', e);
    }
    return sanitized;
  });
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const raw = getStoredData<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    const sanitized = sanitizeNotifications(raw);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(sanitized));
      }
    } catch (e) {
      console.warn('Gagal sinkronisasi notifications ke localStorage:', e);
    }
    return sanitized;
  });
  const [resetTokens, setResetTokens] = useState<Array<{ token: string; otp?: string; userId: string; email: string; createdAt: number; expiresAt: number }>>(() =>
    getStoredData(STORAGE_KEYS.RESET_TOKENS, [])
  );
  const [isFirstLoginModalOpen, setIsFirstLoginModalOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [emailOtps, setEmailOtps] = useState<Array<{ email: string; otp: string; expiresAt: number }>>([]);

  // Persistent storage synchronizers
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.STORES, JSON.stringify(stores)); } catch (e) { console.warn(e); }
  }, [stores]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.RESET_TOKENS, JSON.stringify(resetTokens)); } catch (e) { console.warn(e); }
  }, [resetTokens]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories)); } catch (e) { console.warn(e); }
  }, [categories]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.IPHONE_SERIES, JSON.stringify(iphoneSeries)); } catch (e) { console.warn(e); }
  }, [iphoneSeries]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users)); } catch (e) { console.warn(e); }
  }, [users]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inventory)); } catch (e) { console.warn(e); }
  }, [inventory]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions)); } catch (e) { console.warn(e); }
  }, [transactions]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.RETURNS, JSON.stringify(returns)); } catch (e) { console.warn(e); }
  }, [returns]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendance)); } catch (e) { console.warn(e); }
  }, [attendance]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify(activityLogs)); } catch (e) { console.warn(e); }
  }, [activityLogs]);

  useEffect(() => {
    try {
      const sanitized = sanitizeNotifications(notifications);
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(sanitized));
    } catch (e) {
      console.warn(e);
    }
  }, [notifications]);

  // Keep currentUser & activeStoreId synchronized in sessionStorage so tab refresh keeps session, but fresh preview/windows open at Login Form
  useEffect(() => {
    try {
      if (currentUser) {
        sessionStorage.setItem('iphone_pos_session_user_v1', JSON.stringify(currentUser));
      } else {
        sessionStorage.removeItem('iphone_pos_session_user_v1');
      }
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    } catch (e) {
      console.warn('Failed saving currentUser to sessionStorage:', e);
    }
  }, [currentUser]);

  useEffect(() => {
    try {
      if (activeStoreId) {
        sessionStorage.setItem('iphone_pos_session_store_id_v1', JSON.stringify(activeStoreId));
      } else {
        sessionStorage.removeItem('iphone_pos_session_store_id_v1');
      }
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_STORE_ID);
    } catch (e) {
      console.warn('Failed saving activeStoreId to sessionStorage:', e);
    }
  }, [activeStoreId]);

  // Auto-sync all data changes to MySQL backend automatically (real-time sync)
  useEffect(() => {
    if (!currentUser) return; // Never auto-sync while user is not logged in / on login screen
    if (isRemoteSyncRef.current) {
      isRemoteSyncRef.current = false;
      return; // Skip auto-sync because this state change was fetched from server
    }

    const timer = setTimeout(async () => {
      try {
        // Only Super Admin can push the full users collection to MySQL
        const usersToSync = currentUser.role === 'SUPER_ADMIN' ? users : undefined;
        const res = await fetch('/api/sync-all', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stores,
            users: usersToSync,
            categories,
            iphoneSeries,
            inventory,
            transactions,
            returns,
            attendance,
            activityLogs,
            notifications,
            callerRole: currentUser.role,
            callerUserId: currentUser.id,
          }),
        });

        if (res.status === 403) {
          const errJson = await res.json().catch(() => ({}));
          if (errJson?.code === 'USER_DELETED') {
            forceLogoutInactiveUser('DELETED');
            return;
          }
        }

        if (res.ok) {
          const resJson = await res.json();
          if (resJson.success) {
            const stRes = await fetch('/api/db/status');
            if (stRes.ok) {
              const stJson = await stRes.json();
              if (stJson.success && stJson.status) setDbStatus(stJson.status);
            }
          }
        }
      } catch {
        // Quiet fallback to local persistence
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [currentUser, stores, users, categories, iphoneSeries, inventory, transactions, returns, attendance, activityLogs, notifications]);

  // Keep currentUser synchronized with latest changes in users collection, or immediately kick out if deleted/deactivated
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role !== 'SUPER_ADMIN') {
        const liveUser = users.find((u) => u.id === currentUser.id);
        if (!liveUser) {
          forceLogoutInactiveUser('DELETED');
          return;
        }
        if (liveUser.status === 'NONAKTIF') {
          forceLogoutInactiveUser('NONAKTIF');
          return;
        }
        if (
          liveUser.position !== currentUser.position ||
          liveUser.status_peran_kerja !== currentUser.status_peran_kerja ||
          liveUser.nama !== currentUser.nama ||
          liveUser.email !== currentUser.email ||
          liveUser.email_tertaut !== currentUser.email_tertaut ||
          liveUser.is_email_verified !== currentUser.is_email_verified ||
          liveUser.nomor_telepon !== currentUser.nomor_telepon ||
          liveUser.role !== currentUser.role ||
          liveUser.store_id !== currentUser.store_id ||
          liveUser.avatar !== currentUser.avatar ||
          liveUser.foto_profil !== currentUser.foto_profil
        ) {
          setCurrentUser(liveUser);
        }
      }
    }
  }, [users, currentUser]);

  // Initial load: Check MySQL connection & load live MySQL data if available
  useEffect(() => {
    const initDatabaseCheck = async () => {
      setIsCheckingDb(true);
      try {
        const resStatus = await fetch('/api/db/status');
        if (resStatus.ok) {
          const statusJson = await resStatus.json();
          if (statusJson.success && statusJson.status) {
            setDbStatus(statusJson.status);
          }
        }

        const resData = await fetch('/api/data');
        if (resData.ok) {
          const dataJson = await resData.json();
          if (dataJson.success && dataJson.data) {
          const d = dataJson.data;
          if (Array.isArray(d.stores)) setStores(d.stores);
          const firstStoreId = (d.stores && d.stores[0]?.id) || null;
          if (Array.isArray(d.users) && d.users.length > 0) {
            setUsers(d.users.map((u: any) => ({
              ...u,
              nama: (u.nama || u.name || '').replace(/\s*\((\s*|0)\)/g, '').replace(/\s+0$/, '').trim(),
              name: (u.name || u.nama || '').replace(/\s*\((\s*|0)\)/g, '').replace(/\s+0$/, '').trim(),
            })));
          }
          if (Array.isArray(d.categories)) {
            setCategories(d.categories.map((c: any) => ({
              ...c,
              store_id: c.store_id || firstStoreId,
            })));
          }
          if (Array.isArray(d.iphoneSeries)) {
            setIphoneSeries(d.iphoneSeries.map((s: any) => ({
              ...s,
              store_id: s.store_id || firstStoreId,
            })));
          }
          if (Array.isArray(d.inventory)) setInventory(d.inventory);
          if (Array.isArray(d.transactions)) setTransactions(d.transactions);
          if (Array.isArray(d.returns)) {
            setReturns(d.returns.map((r: any) => ({
              ...r,
              catatan_approval: r.catatan_approval ? r.catatan_approval.replace(/\s*\(Disetujui\)/gi, '').trim() : r.catatan_approval,
              catatan_proses: r.catatan_proses ? r.catatan_proses.replace(/\s*\(Disetujui\)/gi, '').trim() : r.catatan_proses,
            })));
          }
          if (Array.isArray(d.attendance)) {
            setAttendance(
              d.attendance.filter((a: any) => a.user_id !== 'user-super' && !a.user_name?.toLowerCase().includes('super admin'))
            );
          }
          if (Array.isArray(d.activityLogs)) setActivityLogs(sanitizeActivityLogs(d.activityLogs));
          if (Array.isArray(d.notifications)) {
            const normalized = d.notifications.map((n: any) => normalizeNotification(n, currentUser?.id));
            setNotifications(sanitizeNotifications(normalized));
          }
        }
      }
    } catch {
        // Mode offline aktif, menggunakan data tersimpan di localStorage
      } finally {
        setIsCheckingDb(false);
      }
    };

    initDatabaseCheck();
  }, []);

  // Cross-device real-time sync (HP <-> Laptop sync & Login screen real-time sync)
  useEffect(() => {
    // 1. Silent background polling every 2.5 seconds to sync data across devices (runs both when logged in and on login screen)
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden) {
        fetchDataFromMySQL().catch(() => {});
      }
    }, 2500);

    // 2. Fetch immediately when user focuses the tab or returns to the window
    const handleFocus = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        fetchDataFromMySQL().catch(() => {});
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, []);

  const activeStore = useMemo(() => {
    if (currentUser && currentUser.role !== 'SUPER_ADMIN') {
      return stores.find((s) => s.id === currentUser.store_id) || null;
    }
    return stores.find((s) => s.id === activeStoreId) || null;
  }, [currentUser, stores, activeStoreId]);

  // Keep non-superadmin activeStoreId locked to their assigned store_id
  useEffect(() => {
    if (currentUser && currentUser.role !== 'SUPER_ADMIN') {
      const assigned = currentUser.store_id || null;
      if (activeStoreId !== assigned) {
        setActiveStoreId(assigned);
      }
    }
  }, [currentUser, activeStoreId]);

  const showToast = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Immediate kick-out for deleted or deactivated users across active browser tabs
  const forceLogoutInactiveUser = (reason: 'DELETED' | 'NONAKTIF') => {
    setCurrentUser(null);
    setActiveStoreId(null);
    try {
      sessionStorage.removeItem('iphone_pos_session_user_v1');
      sessionStorage.removeItem('iphone_pos_session_store_id_v1');
      sessionStorage.removeItem('iphone_pos_active_page_v1');
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_STORE_ID);
    } catch {}
    setSidebarOpen(false);
    setIsFirstLoginModalOpen(false);
    setCurrentPage('DASHBOARD_TOKO');
    showToast(
      'Sesi Diakhiri',
      reason === 'DELETED'
        ? 'Akun Anda telah dihapus oleh administrator. Sesi telah diakhiri dan akses ditutup.'
        : 'Akun Anda telah dinonaktifkan oleh administrator. Silakan hubungi Super Admin.',
      'error'
    );
  };

  const ensureUserSessionValid = (): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'SUPER_ADMIN') return true;
    const live = users.find((u) => u.id === currentUser.id);
    if (!live) {
      forceLogoutInactiveUser('DELETED');
      return false;
    }
    if (live.status === 'NONAKTIF') {
      forceLogoutInactiveUser('NONAKTIF');
      return false;
    }
    return true;
  };

  const logActivity = (
    aktivitas: string,
    detail: string,
    tipe: 'INVENTORY' | 'AUTH' | 'RETURN' | 'ABSENSI' | 'STORE' | 'USER',
    targetStoreId?: string | null
  ) => {
    if (!currentUser) return;

    // Strict guard: Jangan pernah memasukkan log aktivitas non-operasional/trivial
    // seperti: logout, pilih toko, ganti password wajib, akses dashboard, navigasi menu, login, dll.
    if (isNonEssentialActivity(aktivitas, detail)) {
      return;
    }

    // Role guard: Karyawan HANYA berwenang mencatat aktivitas ABSENSI, AUTH, dan USER (Profil).
    // DILARANG mencatat mutasi barang, transaksi, perbaikan/servis, atau return atas nama Karyawan.
    if (currentUser.role === 'KARYAWAN') {
      const allowedKaryawanTypes = ['ABSENSI', 'AUTH', 'USER'];
      if (!allowedKaryawanTypes.includes(tipe)) {
        return;
      }
      const actLower = (aktivitas || '').toLowerCase();
      const detLower = (detail || '').toLowerCase();
      if (
        actLower.includes('barang') ||
        actLower.includes('perbaikan') ||
        actLower.includes('layar') ||
        actLower.includes('servis') ||
        actLower.includes('stok') ||
        actLower.includes('return') ||
        detLower.includes('perbaikan') ||
        detLower.includes('layar') ||
        detLower.includes('servis')
      ) {
        return;
      }
    }

    const effectiveStoreId = (targetStoreId && targetStoreId.trim())
      ? targetStoreId.trim()
      : (currentUser.role !== 'SUPER_ADMIN' ? (currentUser.store_id || null) : (activeStoreId || null));
    const storeObj = stores.find((s) => s.id === effectiveStoreId);
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(
      2,
      '0'
    )}:${String(now.getSeconds()).padStart(2, '0')}`;

    const newLog: ActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      user_id: currentUser.id,
      user_name: currentUser.nama || currentUser.name,
      role: currentUser.role,
      store_id: effectiveStoreId || null,
      store_name: storeObj ? `${storeObj.nama_toko} (${storeObj.cabang})` : (effectiveStoreId ? 'Toko Cabang' : 'Pusat / Semua Cabang'),
      aktivitas,
      detail_perubahan: detail,
      waktu: formattedDate,
      tipe,
    };
    setActivityLogs((prev) => [newLog, ...sanitizeActivityLogs(prev)]);
  };

  const addNotification = (
    judul: string,
    pesan: string,
    tipe: 'WARNING' | 'SUCCESS' | 'INFO' | 'DANGER',
    linkPage?: NavigationPage,
    targetStoreId?: string | null,
    options?: {
      targetRoles?: UserRole[];
      targetUserId?: string | null;
      creatorId?: string;
      creatorName?: string;
      kategori?: 'INVENTORY' | 'RETURN' | 'ABSENSI' | 'SISTEM' | 'AUTH';
      isGlobal?: boolean;
    }
  ) => {
    // Kebijakan: Jangan pernah memasukkan notifikasi non-operasional/trivial
    if (isNonEssentialNotification(judul, pesan, options?.kategori)) {
      return;
    }
    const resolvedStoreId = (targetStoreId && targetStoreId.trim())
      ? targetStoreId.trim()
      : (currentUser?.role !== 'SUPER_ADMIN' ? (currentUser?.store_id ?? null) : (activeStoreId ?? null));
    const storeObj = stores.find((s) => s.id === resolvedStoreId);
    const defaultRoles: UserRole[] =
      currentUser?.role === 'KARYAWAN'
        ? ['SUPER_ADMIN', 'ADMIN_TOKO']
        : ['SUPER_ADMIN', 'ADMIN_TOKO', 'KARYAWAN'];

    const newNotif: AppNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      store_id: resolvedStoreId,
      store_name: storeObj ? `${storeObj.nama_toko} (${storeObj.cabang})` : (resolvedStoreId ? 'Toko Cabang' : 'Seluruh Toko'),
      creator_id: options?.creatorId ?? currentUser?.id,
      creator_name: options?.creatorName ?? (currentUser ? (currentUser.nama || currentUser.name) : undefined),
      target_roles: options?.targetRoles ?? defaultRoles,
      target_user_id: options?.targetUserId ?? null,
      kategori: options?.kategori ?? 'INVENTORY',
      judul,
      pesan,
      tipe,
      waktu: 'Baru saja',
      read: false,
      read_by: [],
      link_page: linkPage,
      is_global: options?.isGlobal ?? false,
      created_at: new Date().toISOString(),
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  // Auth Functions
  const login = async (
    identifier: string,
    passwordPlain?: string,
    role?: UserRole,
    storeId?: string
  ): Promise<{ success: boolean; mustChangePassword?: boolean; message?: string }> => {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPhone = identifier.replace(/\D/g, '');

    const findMatch = (userList: User[]) => {
      return userList.find((u) => {
        const matchEmail = u.email && u.email.toLowerCase() === cleanId;
        const matchLinkedEmail = u.email_tertaut && u.email_tertaut.toLowerCase() === cleanId;
        const matchUsername = u.username && u.username.toLowerCase() === cleanId;
        const matchSuper = (cleanId === 'superadmin' || cleanId === 'super admin' || cleanId === 'superadmin@gmail.com') && u.role === 'SUPER_ADMIN';
        const matchPhone = cleanPhone && ((u.nomor_telepon && u.nomor_telepon.replace(/\D/g, '') === cleanPhone) || (u.no_hp && u.no_hp.replace(/\D/g, '') === cleanPhone));
        return matchEmail || matchLinkedEmail || matchUsername || matchSuper || matchPhone;
      });
    };

    let foundUser = findMatch(users);

    // Real-Time Sync: Jika akun tidak ditemukan di memori browser saat ini (misal akun Joko baru dibuat di browser/perangkat lain),
    // lakukan query langsung ke database secara instan tanpa perlu user me-refresh halaman!
    if (!foundUser) {
      try {
        const res = await fetch('/api/data');
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data && Array.isArray(json.data.users)) {
            const freshUsers: User[] = json.data.users;
            setUsers(freshUsers);
            foundUser = findMatch(freshUsers);
          }
        }
      } catch (err) {
        console.warn('Real-time auth fetch error:', err);
      }
    }

    if (!foundUser && role) {
      foundUser = users.find((u) => u.role === role);
    }
    if (!foundUser) {
      return {
        success: false,
        message: 'Akun dengan email ini tidak ditemukan. Pastikan alamat email yang Anda masukkan sudah benar.',
      };
    }

    // 1. Verifikasi Kata Sandi terlebih dahulu sebelum memeriksa status akun atau cabang toko
    if (passwordPlain !== undefined && passwordPlain !== '••••••••') {
      const storedHash = foundUser.password || foundUser.password_hash || '';
      const isMatch = verifyPassword(passwordPlain, storedHash);
      if (!isMatch) {
        showToast('Kata Sandi Salah', 'Kata sandi yang Anda masukkan tidak sesuai.', 'error');
        return { success: false, message: 'Kata sandi tidak sesuai. Silakan periksa kembali atau gunakan Lupa Password.' };
      }
    }

    // 2. Cek status akun setelah kata sandi benar
    if (foundUser.status === 'NONAKTIF') {
      showToast('Akun Dinonaktifkan', 'Akun Anda sedang dinonaktifkan oleh administrator. Silakan hubungi Super Admin atau Admin yang berwenang.', 'error');
      return { success: false, message: 'Akun Anda sedang dinonaktifkan oleh administrator. Silakan hubungi Super Admin atau Admin yang berwenang.' };
    }

    // 3. Cek penugasan cabang dan status cabang toko (jika bukan Super Admin)
    if (foundUser.role !== 'SUPER_ADMIN') {
      if (!foundUser.store_id) {
        showToast(
          'Cabang Belum Ditugaskan',
          'Akun Anda belum memiliki cabang toko yang ditugaskan. Silakan hubungi Super Admin.',
          'error'
        );
        return {
          success: false,
          message: 'Akun Anda belum memiliki cabang toko yang ditugaskan. Silakan hubungi Super Admin.',
        };
      }

      const userStore = stores.find((s) => s.id === foundUser.store_id);
      if (!userStore) {
        showToast(
          'Cabang Tidak Ditemukan',
          'Cabang toko tempat akun Anda ditugaskan tidak ditemukan atau telah dihapus. Silakan hubungi Super Admin.',
          'error'
        );
        return {
          success: false,
          message: 'Cabang toko tempat akun Anda ditugaskan tidak ditemukan atau telah dihapus. Silakan hubungi Super Admin.',
        };
      }

      if (userStore.status === 'NONAKTIF') {
        showToast(
          'Cabang Toko Nonaktif',
          `Cabang toko Anda (${userStore.nama_toko}) sedang dinonaktifkan oleh Super Admin. Anda tidak dapat login ke sistem.`,
          'error'
        );
        return {
          success: false,
          message: `Cabang toko Anda (${userStore.nama_toko}) sedang dinonaktifkan oleh Super Admin. Anda tidak dapat login ke sistem. Silakan hubungi Super Admin untuk mengaktifkannya kembali.`,
        };
      }
    }

    setCurrentUser(foundUser);
    try {
      sessionStorage.setItem('iphone_pos_session_user_v1', JSON.stringify(foundUser));
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    } catch {}
    setSidebarOpen(false);
    showToast('Login Berhasil', `Selamat datang kembali, ${foundUser.nama || foundUser.name}!`, 'success');

    // Record login activity log
    const storeObj = stores.find((s) => s.id === foundUser.store_id);
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(
      2,
      '0'
    )}:${String(now.getSeconds()).padStart(2, '0')}`;
    const loginLog: ActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      user_id: foundUser.id,
      user_name: foundUser.nama || foundUser.name,
      role: foundUser.role,
      store_id: foundUser.store_id || null,
      store_name: storeObj ? `${storeObj.nama_toko} (${storeObj.cabang})` : 'Pusat / Semua Cabang',
      aktivitas: 'Login ke Sistem',
      detail_perubahan: `Pengguna berhasil login sebagai ${foundUser.role}`,
      waktu: formattedDate,
      tipe: 'AUTH',
    };
    setActivityLogs((prev) => [loginLog, ...prev]);

    // Multi-Store Access Control Rules:
    // Super Admin: goes directly to DASHBOARD_UTAMA (Global overview)
    // Admin Toko & Karyawan: strictly locked to assigned store_id and straight to Dashboard Toko
    if (foundUser.role === 'SUPER_ADMIN') {
      setActiveStoreId(null);
      setCurrentPage('DASHBOARD_UTAMA');
      try {
        sessionStorage.setItem('iphone_pos_active_page_v1', 'DASHBOARD_UTAMA');
      } catch {}
    } else {
      const assignedStoreId = foundUser.store_id || null;
      setActiveStoreId(assignedStoreId);
      setCurrentPage('DASHBOARD_TOKO');
      try {
        sessionStorage.setItem('iphone_pos_active_page_v1', 'DASHBOARD_TOKO');
      } catch {}
    }

    if (foundUser.must_change_password) {
      setIsFirstLoginModalOpen(true);
    }

    return { success: true, mustChangePassword: foundUser.must_change_password };
  };

  const completeFirstTimePasswordChange = (newPasswordPlain: string): boolean => {
    if (!currentUser) return false;
    if (newPasswordPlain.length < 6) {
      showToast('Sandi Terlalu Pendek', 'Kata sandi baru minimal harus 6 karakter.', 'warning');
      return false;
    }
    const hashed = hashPasswordSync(newPasswordPlain);
    const updated: User = {
      ...currentUser,
      password: hashed,
      password_hash: hashed,
      must_change_password: false,
    };
    setCurrentUser(updated);
    setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? updated : u)));
    setIsFirstLoginModalOpen(false);
    showToast('Kata Sandi Diperbarui', 'Kata sandi baru berhasil disimpan. Akun Anda kini aman.', 'success');
    return true;
  };

  const requestPasswordReset = async (
    identifier: string
  ): Promise<{ success: boolean; token?: string; targetEmail?: string; message: string }> => {
    const clean = identifier.trim().toLowerCase();
    const cleanPhone = identifier.replace(/\D/g, '');

    const targetUser = users.find((u) => {
      const matchEmail = u.email && u.email.toLowerCase() === clean;
      const matchLinkedEmail = u.email_tertaut && u.email_tertaut.toLowerCase() === clean;
      const matchUsername = u.username && u.username.toLowerCase() === clean;
      const matchPhone = cleanPhone && ((u.nomor_telepon && u.nomor_telepon.replace(/\D/g, '') === cleanPhone) || (u.no_hp && u.no_hp.replace(/\D/g, '') === cleanPhone));
      return matchEmail || matchLinkedEmail || matchUsername || matchPhone;
    });

    if (!targetUser) {
      return {
        success: false,
        message: 'Akun dengan email ini tidak ditemukan. Pastikan alamat email telah terdaftar.',
      };
    }

    const targetEmail = targetUser.email_tertaut || targetUser.email || '';
    if (!targetEmail) {
      return {
        success: false,
        message: 'Akun ini belum memiliki email pemulihan tertaut. Silakan hubungi Super Admin atau Admin Toko untuk melakukan reset password.',
      };
    }

    // Generate real 6-digit OTP code for password reset
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const newTokenObj = {
      token: otpCode,
      otp: otpCode,
      userId: targetUser.id,
      email: targetEmail,
      createdAt: Date.now(),
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
    };

    setResetTokens((prev) => [...prev.filter((t) => t.userId !== targetUser.id), newTokenObj]);

    // Send real email via Google SMTP (or Resend fallback)
    const dispatchResult = await dispatchRealEmailOtp(targetEmail, otpCode, targetUser.nama, 'reset');

    if (dispatchResult.success) {
      showToast(
        'Kode OTP Reset Terkirim ke Gmail',
        `Kode verifikasi 6 digit pemulihan sandi telah dikirim ke ${targetEmail}. Silakan periksa inbox / spam Gmail Anda!`,
        'success'
      );
    } else {
      showToast('Perhatian Pengiriman Email', dispatchResult.message, 'warning');
    }

    return {
      success: true,
      token: otpCode,
      targetEmail,
      message: dispatchResult.message,
    };
  };

  const validateResetOtp = (
    email: string,
    otp: string
  ): { success: boolean; message: string } => {
    const cleanOtp = otp.trim();
    const cleanEmail = email.trim().toLowerCase();

    const tokenObj = resetTokens.find(
      (t) => (t.token === cleanOtp || t.otp === cleanOtp) && t.email.toLowerCase() === cleanEmail
    );

    if (!tokenObj) {
      return { success: false, message: 'Kode OTP verifikasi tidak valid atau salah. Periksa kembali email Anda.' };
    }
    if (Date.now() > tokenObj.expiresAt) {
      setResetTokens((prev) => prev.filter((t) => t.token !== tokenObj.token));
      return { success: false, message: 'Kode OTP telah kadaluarsa (berlaku 15 menit). Silakan minta kode baru.' };
    }

    return { success: true, message: 'Kode OTP valid.' };
  };

  const resetPasswordWithToken = (
    tokenOrOtp: string,
    newPasswordPlain: string
  ): { success: boolean; message: string } => {
    const cleanInput = tokenOrOtp.trim();
    const tokenObj = resetTokens.find((t) => t.token === cleanInput || t.otp === cleanInput);
    if (!tokenObj) {
      return { success: false, message: 'Kode OTP verifikasi tidak valid atau salah. Silakan periksa kembali email Anda.' };
    }
    if (Date.now() > tokenObj.expiresAt) {
      setResetTokens((prev) => prev.filter((t) => t.token !== tokenObj.token));
      return { success: false, message: 'Kode OTP telah kadaluarsa (berlaku 15 menit). Silakan minta kode baru.' };
    }

    const targetUser = users.find((u) => u.id === tokenObj.userId);
    if (!targetUser) {
      return { success: false, message: 'Pengguna tidak ditemukan.' };
    }

    if (newPasswordPlain.length < 6) {
      return { success: false, message: 'Kata sandi baru minimal harus 6 karakter.' };
    }

    const hashed = hashPasswordSync(newPasswordPlain);
    setUsers((prev) =>
      prev.map((u) =>
        u.id === targetUser.id
          ? {
              ...u,
              password: hashed,
              password_hash: hashed,
              must_change_password: false,
            }
          : u
      )
    );

    setResetTokens((prev) => prev.filter((t) => t.token !== tokenObj.token));
    showToast('Reset Password Sukses', 'Kata sandi Anda telah berhasil diperbarui. Silakan login dengan kata sandi baru.', 'success');
    return { success: true, message: 'Kata sandi berhasil diperbarui.' };
  };

  const adminResetUserPassword = (
    userId: string,
    tempPasswordPlain?: string
  ): { success: boolean; tempPassword?: string; message: string } => {
    if (!currentUser) {
      return { success: false, message: 'Sesi Anda telah berakhir.' };
    }

    const target = users.find((u) => u.id === userId);
    if (!target) {
      return { success: false, message: 'Pengguna tidak ditemukan.' };
    }

    // Role restrictions:
    // Super Admin: can reset all users
    // Admin Toko: can only reset Karyawan in their store
    if (currentUser.role === 'ADMIN_TOKO') {
      if (target.role !== 'KARYAWAN' || target.store_id !== currentUser.store_id) {
        showToast('Akses Ditolak', 'Admin Toko hanya dapat mereset password akun Karyawan di cabangnya sendiri.', 'error');
        return { success: false, message: 'Admin Toko hanya dapat mereset akun Karyawan di cabangnya sendiri.' };
      }
    } else if (currentUser.role !== 'SUPER_ADMIN') {
      showToast('Akses Ditolak', 'Hanya Admin atau Super Admin yang berwenang mereset kata sandi pengguna.', 'error');
      return { success: false, message: 'Anda tidak memiliki hak akses untuk mereset akun ini.' };
    }

    const tempPassword = tempPasswordPlain && tempPasswordPlain.trim() ? tempPasswordPlain.trim() : 'Pass123!';
    const hashed = hashPasswordSync(tempPassword);

    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              password: hashed,
              password_hash: hashed,
              must_change_password: true, // Wajib ganti saat login berikutnya!
            }
          : u
      )
    );

    logActivity(
      'Reset Password Pengguna (Admin)',
      `Reset password untuk ${target.nama} (${target.role}) dengan password sementara`,
      'USER',
      target.store_id
    );

    showToast(
      'Password Direset',
      `Password untuk ${target.nama} telah direset. Pengguna wajib mengganti password saat login berikutnya.`,
      'success'
    );

    return {
      success: true,
      tempPassword,
      message: `Password sementara untuk ${target.nama} berhasil disetel ke: "${tempPassword}". Pengguna wajib mengganti password saat login berikutnya.`,
    };
  };

  const linkUserEmail = (email: string): { success: boolean; message: string } => {
    if (!currentUser) return { success: false, message: 'Tidak ada sesi login aktif.' };
    const clean = email.trim().toLowerCase();
    if (!clean.includes('@') || !clean.includes('.')) {
      showToast('Format Email Salah', 'Masukkan alamat email yang valid.', 'warning');
      return { success: false, message: 'Format email tidak valid.' };
    }

    // STRICT CHECK: Ensure this email is not already used or linked by ANY other user
    const conflictUser = users.find(
      (u) =>
        u.id !== currentUser.id &&
        ((u.email && u.email.trim().toLowerCase() === clean) ||
          (u.email_tertaut && u.email_tertaut.trim().toLowerCase() === clean))
    );

    if (conflictUser) {
      showToast(
        'Email Sudah Digunakan',
        `Alamat email ${clean} sudah digunakan/tertaut. Silakan gunakan email Gmail lain.`,
        'error'
      );
      return {
        success: false,
        message: `Alamat email ${clean} sudah digunakan/tertaut. Silakan gunakan email Gmail lain.`,
      };
    }

    const updatedUser: User = {
      ...currentUser,
      email: clean,
      email_tertaut: clean,
      is_email_verified: true,
      email_verified_at: new Date().toISOString(),
    };

    setCurrentUser(updatedUser);
    setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? updatedUser : u)));
    logActivity('Tautkan Email Gmail', `Menautkan akun Gmail: ${clean}`, 'USER');
    showToast('Email Gmail Terverifikasi', `Akun Gmail ${clean} berhasil ditautkan dan terverifikasi.`, 'success');
    return { success: true, message: `Akun Gmail ${clean} berhasil ditautkan.` };
  };

  const unlinkUserEmail = (otpCode?: string): { success: boolean; message: string } => {
    if (!currentUser) return { success: false, message: 'Tidak ada sesi login aktif.' };

    const emailToUnlink = (currentUser.email_tertaut || currentUser.email || '').trim().toLowerCase();

    // If user's email is currently verified, strict OTP verification is required to prevent unauthorized unlinking!
    if (currentUser.is_email_verified) {
      if (!otpCode || otpCode.trim().length < 6) {
        showToast('Kode OTP Diperlukan', 'Masukkan 6 digit kode OTP verifikasi untuk memutuskan tautan email.', 'warning');
        return { success: false, message: 'Kode OTP verifikasi diperlukan untuk memutuskan tautan email.' };
      }

      const cleanCode = otpCode.trim();
      const record = emailOtps.find((o) => o.email === emailToUnlink);

      if (!record) {
        showToast('Kode OTP Tidak Ditemukan', 'Silakan kirim kode OTP verifikasi ke email Anda terlebih dahulu.', 'error');
        return { success: false, message: 'Silakan minta dan masukkan kode OTP verifikasi.' };
      }

      if (Date.now() > record.expiresAt) {
        setEmailOtps((prev) => prev.filter((o) => o.email !== emailToUnlink));
        showToast('Kode OTP Kadaluarsa', 'Kode OTP telah kadaluarsa (lebih dari 5 menit). Silakan kirim ulang kode baru.', 'error');
        return { success: false, message: 'Kode OTP telah kadaluarsa. Silakan kirim ulang kode baru.' };
      }

      if (record.otp !== cleanCode) {
        showToast('Kode OTP Salah', 'Kode OTP yang Anda masukkan salah. Periksa kembali kotak masuk Gmail Anda.', 'error');
        return { success: false, message: 'Kode OTP yang dimasukkan tidak sesuai.' };
      }

      // Validated OTP, clear OTP record
      setEmailOtps((prev) => prev.filter((o) => o.email !== emailToUnlink));
    }

    const updatedUser: User = {
      ...currentUser,
      email_tertaut: undefined,
      is_email_verified: false,
      email_verified_at: undefined,
    };

    setCurrentUser(updatedUser);
    setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? updatedUser : u)));
    logActivity('Putus Tautan Email Gmail', `Memutuskan tautan akun Gmail ${emailToUnlink}`, 'USER');

    showToast('Tautan Berhasil Diputus', 'Tautan email akun telah berhasil diputuskan setelah verifikasi keamanan OTP.', 'success');
    return { success: true, message: 'Tautan email telah berhasil diputus.' };
  };

  const sendEmailOtp = async (
    email: string,
    type: 'verification' | 'reset' | 'unlink' = 'verification'
  ): Promise<{ success: boolean; otp?: string; message: string }> => {
    const clean = email.trim().toLowerCase();
    if (!clean || !clean.includes('@') || !clean.includes('.')) {
      showToast('Format Email Tidak Valid', 'Masukkan format email yang benar (contoh: user@gmail.com).', 'warning');
      return { success: false, message: 'Format email tidak valid.' };
    }

    // STRICT CHECK: Verify email is not taken by another user when verifying a new email
    if (type === 'verification') {
      const conflictUser = users.find(
        (u) =>
          u.id !== currentUser?.id &&
          ((u.email && u.email.trim().toLowerCase() === clean) ||
            (u.email_tertaut && u.email_tertaut.trim().toLowerCase() === clean))
      );

      if (conflictUser) {
        showToast(
          'Email Sudah Digunakan',
          `Alamat email ${clean} sudah digunakan/tertaut. Silakan gunakan email Gmail lain.`,
          'error'
        );
        return {
          success: false,
          message: `Alamat email ${clean} sudah digunakan/tertaut. Silakan gunakan email Gmail lain.`,
        };
      }
    }

    // Generate a 6-digit random numeric code
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    setEmailOtps((prev) => [
      ...prev.filter((o) => o.email !== clean),
      { email: clean, otp: generatedOtp, expiresAt }
    ]);

    // Dispatch real email via mail service asynchronously
    const dispatchResult = await dispatchRealEmailOtp(
      clean,
      generatedOtp,
      currentUser?.nama || currentUser?.name || 'Pengguna',
      type
    );

    if (dispatchResult.success) {
      const actionDesc = type === 'unlink'
        ? 'Kode OTP verifikasi putus tautan'
        : (type === 'reset' ? 'Kode OTP reset kata sandi' : 'Kode OTP verifikasi tautan');
      showToast(
        'Kode OTP Terkirim ke Gmail',
        `${actionDesc} 6 digit telah dikirim ke ${clean}. Silakan cek inbox / spam Gmail Anda!`,
        'success'
      );
    } else {
      showToast(
        'Perhatian Pengiriman Email',
        dispatchResult.message,
        'warning'
      );
    }

    return {
      success: true,
      otp: generatedOtp,
      message: dispatchResult.message,
    };
  };

  const verifyEmailOtp = (email: string, enteredOtp: string): { success: boolean; message: string } => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = enteredOtp.trim();

    if (!cleanCode || cleanCode.length < 6) {
      showToast('Kode OTP Tidak Lengkap', 'Masukkan 6 digit kode OTP yang diterima.', 'warning');
      return { success: false, message: 'Kode OTP harus berupa 6 digit angka.' };
    }

    const record = emailOtps.find((o) => o.email === cleanEmail);
    if (!record) {
      showToast('Kode OTP Tidak Ditemukan', 'Silakan kirim ulang kode OTP verifikasi ke email Anda.', 'error');
      return { success: false, message: 'Silakan kirim ulang kode OTP verifikasi.' };
    }

    if (Date.now() > record.expiresAt) {
      setEmailOtps((prev) => prev.filter((o) => o.email !== cleanEmail));
      showToast('Kode OTP Kadaluarsa', 'Kode OTP telah kadaluarsa (lebih dari 5 menit). Silakan kirim ulang.', 'error');
      return { success: false, message: 'Kode OTP telah kadaluarsa. Silakan kirim ulang.' };
    }

    if (record.otp !== cleanCode) {
      showToast('Kode OTP Salah', 'Kode OTP yang Anda masukkan tidak sesuai. Periksa kembali kotak masuk Gmail Anda.', 'error');
      return { success: false, message: 'Kode OTP yang dimasukkan tidak sesuai.' };
    }

    // OTP is valid! Link the email officially
    setEmailOtps((prev) => prev.filter((o) => o.email !== cleanEmail));
    return linkUserEmail(cleanEmail);
  };

  const validateOtpOnly = (email: string, enteredOtp: string): { success: boolean; message: string } => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = enteredOtp.trim();

    if (!cleanCode || cleanCode.length < 6) {
      showToast('Kode OTP Tidak Lengkap', 'Masukkan 6 digit kode OTP yang diterima.', 'warning');
      return { success: false, message: 'Kode OTP harus berupa 6 digit angka.' };
    }

    const record = emailOtps.find((o) => o.email === cleanEmail);
    if (!record) {
      showToast('Kode OTP Tidak Ditemukan', 'Silakan kirim ulang kode OTP verifikasi ke email Anda.', 'error');
      return { success: false, message: 'Silakan kirim ulang kode OTP verifikasi.' };
    }

    if (Date.now() > record.expiresAt) {
      setEmailOtps((prev) => prev.filter((o) => o.email !== cleanEmail));
      showToast('Kode OTP Kadaluarsa', 'Kode OTP telah kadaluarsa (lebih dari 5 menit). Silakan kirim ulang.', 'error');
      return { success: false, message: 'Kode OTP telah kadaluarsa. Silakan kirim ulang.' };
    }

    if (record.otp !== cleanCode) {
      showToast('Kode OTP Salah', 'Kode OTP yang Anda masukkan tidak sesuai. Periksa kembali kotak masuk Gmail Anda.', 'error');
      return { success: false, message: 'Kode OTP yang dimasukkan tidak sesuai.' };
    }

    // OTP is valid! Consume it
    setEmailOtps((prev) => prev.filter((o) => o.email !== cleanEmail));
    return { success: true, message: 'Kode OTP valid.' };
  };

  const changeVerifiedEmail = (newEmail: string): { success: boolean; message: string } => {
    if (!currentUser) return { success: false, message: 'Tidak ada sesi login aktif.' };

    const clean = newEmail.trim().toLowerCase();
    if (!clean || !clean.includes('@') || !clean.includes('.')) {
      showToast('Format Email Salah', 'Masukkan alamat email yang valid.', 'warning');
      return { success: false, message: 'Format email tidak valid.' };
    }

    // Enforce uniqueness across all other accounts
    const conflictUser = users.find(
      (u) =>
        u.id !== currentUser.id &&
        ((u.email && u.email.trim().toLowerCase() === clean) ||
          (u.email_tertaut && u.email_tertaut.trim().toLowerCase() === clean))
    );

    if (conflictUser) {
      showToast(
        'Email Sudah Digunakan',
        `Alamat email ${clean} sudah digunakan/tertaut. Silakan gunakan email Gmail lain.`,
        'error'
      );
      return {
        success: false,
        message: `Alamat email ${clean} sudah digunakan/tertaut. Silakan gunakan email Gmail lain.`,
      };
    }

    const updatedUser: User = {
      ...currentUser,
      email: clean,
      username: clean,
      email_tertaut: undefined,
      is_email_verified: false,
      email_verified_at: undefined,
    };

    setCurrentUser(updatedUser);
    setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? updatedUser : u)));
    logActivity('Ganti Email Akun', `Memperbarui alamat email menjadi: ${clean}`, 'USER');
    showToast('Email Berhasil Diubah', `Alamat email berhasil diubah menjadi ${clean}. Silakan klik 'Kirim Kode OTP' jika ingin menautkannya.`, 'success');
    return { success: true, message: 'Email berhasil diubah.' };
  };

  const changePassword = (oldPasswordPlain: string, newPasswordPlain: string): { success: boolean; message: string } => {
    if (!currentUser) return { success: false, message: 'Tidak ada sesi login aktif.' };

    const currentHash = currentUser.password || currentUser.password_hash || '';
    if (currentHash && !verifyPassword(oldPasswordPlain, currentHash)) {
      showToast('Kata Sandi Saat Ini Salah', 'Kata sandi lama yang Anda masukkan tidak sesuai.', 'error');
      return { success: false, message: 'Kata sandi saat ini tidak cocok.' };
    }

    if (newPasswordPlain.length < 6) {
      showToast('Kata Sandi Terlalu Pendek', 'Kata sandi baru minimal harus 6 karakter.', 'warning');
      return { success: false, message: 'Kata sandi baru minimal 6 karakter.' };
    }

    const newHash = hashPasswordSync(newPasswordPlain);
    const updatedUser: User = {
      ...currentUser,
      password: newHash,
      password_hash: newHash,
      must_change_password: false,
    };

    setCurrentUser(updatedUser);
    setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? updatedUser : u)));
    logActivity('Ganti Kata Sandi', 'Pengguna berhasil memperbarui kata sandi akun', 'AUTH');
    showToast('Kata Sandi Berhasil Diganti', 'Kata sandi akun Anda berhasil diperbarui.', 'success');
    return { success: true, message: 'Kata sandi berhasil diganti.' };
  };

  const logout = () => {
    setCurrentUser(null);
    setActiveStoreId(null);
    try {
      sessionStorage.removeItem('iphone_pos_session_user_v1');
      sessionStorage.removeItem('iphone_pos_session_store_id_v1');
      sessionStorage.removeItem('iphone_pos_active_page_v1');
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_STORE_ID);
    } catch {}
    setSidebarOpen(false);
    setIsFirstLoginModalOpen(false);
    setCurrentPage('DASHBOARD_TOKO');
    showToast('Logout Berhasil', 'Anda telah keluar dari aplikasi.', 'info');
  };

  const selectStore = (storeId: string | null) => {
    // Only Super Admin can select store or open Dashboard Utama
    if (currentUser?.role !== 'SUPER_ADMIN') {
      showToast('Akses Dibatasi', 'Anda hanya memiliki izin akses untuk cabang toko Anda sendiri.', 'warning');
      return;
    }

    setSidebarOpen(false);
    if (storeId === null) {
      setActiveStoreId(null);
      setCurrentPage('DASHBOARD_UTAMA');
      try {
        sessionStorage.setItem('iphone_pos_active_page_v1', 'DASHBOARD_UTAMA');
      } catch {}
    } else {
      setActiveStoreId(storeId);
      setCurrentPage('DASHBOARD_TOKO');
      try {
        sessionStorage.setItem('iphone_pos_active_page_v1', 'DASHBOARD_TOKO');
      } catch {}
    }
  };

  const navigateTo = (page: NavigationPage) => {
    // Access Control Enforcements:
    if (currentUser?.role === 'KARYAWAN') {
      const forbiddenForKaryawan: NavigationPage[] = [
        'DASHBOARD_UTAMA',
        'PILIH_TOKO',
        'KARYAWAN',
        'LAPORAN',
      ];
      if (forbiddenForKaryawan.includes(page)) {
        showToast('Akses Ditolak', 'Akun Karyawan tidak memiliki hak akses ke halaman administratif ini.', 'error');
        setCurrentPage('DASHBOARD_TOKO');
        try {
          sessionStorage.setItem('iphone_pos_active_page_v1', 'DASHBOARD_TOKO');
        } catch {}
        return;
      }
    } else if (currentUser?.role === 'ADMIN_TOKO') {
      const forbiddenForAdminToko: NavigationPage[] = [
        'DASHBOARD_UTAMA',
        'PILIH_TOKO',
      ];
      if (forbiddenForAdminToko.includes(page)) {
        showToast('Akses Ditolak', 'Fitur ini khusus dikelola oleh Super Admin.', 'warning');
        setCurrentPage('DASHBOARD_TOKO');
        try {
          sessionStorage.setItem('iphone_pos_active_page_v1', 'DASHBOARD_TOKO');
        } catch {}
        return;
      }
    }

    // Default active store if navigating to branch-specific pages
    const globalSupportedPages: NavigationPage[] = [
      'DASHBOARD_UTAMA',
      'PILIH_TOKO',
      'TOKO',
      'ABSENSI',
      'KARYAWAN',
      'LAPORAN',
      'ACTIVITY_LOG',
      'PENGATURAN',
      'PROFIL'
    ];

    if (!globalSupportedPages.includes(page) && !activeStoreId) {
      if (currentUser?.store_id) {
        setActiveStoreId(currentUser.store_id);
      } else if (currentUser?.role === 'SUPER_ADMIN') {
        setActiveStoreId(stores.length > 0 ? stores[0].id : null);
      }
    }

    setCurrentPage(page);
    try {
      sessionStorage.setItem('iphone_pos_active_page_v1', page);
    } catch {}

    // Instantly fetch latest server data when navigating between menus (e.g. from Dashboard to Log/Pengaturan)
    fetchDataFromMySQL().catch(() => {});
  };

  const updateUserProfile = (profileData: {
    nama?: string;
    name?: string;
    email?: string;
    nomor_telepon?: string;
    position?: string;
    status_peran_kerja?: string;
    avatar?: string;
    foto_profil?: string;
    password?: string;
  }): { success: boolean; message?: string } => {
    if (!currentUser) return { success: false, message: 'Tidak ada sesi aktif.' };

    let isEmailChanged = false;
    let newEmail = currentUser.email;

    if (profileData.email) {
      const cleanEmail = profileData.email.trim().toLowerCase();
      if (cleanEmail !== (currentUser.email || '').trim().toLowerCase()) {
        // If email is already verified, it cannot be changed directly without OTP verification UNLESS it is SUPER_ADMIN
        if (currentUser.is_email_verified && currentUser.role !== 'SUPER_ADMIN') {
          showToast(
            'Verifikasi OTP Diperlukan',
            'Email akun yang sudah terverifikasi hanya dapat diganti melalui verifikasi kode OTP.',
            'warning'
          );
          return {
            success: false,
            message: 'Email terverifikasi hanya dapat diubah melalui verifikasi kode OTP.',
          };
        }

        // Enforce email uniqueness across all other accounts
        const conflictUser = users.find(
          (u) =>
            u.id !== currentUser.id &&
            ((u.email && u.email.trim().toLowerCase() === cleanEmail) ||
              (u.email_tertaut && u.email_tertaut.trim().toLowerCase() === cleanEmail))
        );

        if (conflictUser) {
          showToast(
            'Email Sudah Digunakan',
            `Alamat email ${cleanEmail} sudah digunakan/tertaut. Silakan gunakan email Gmail lain.`,
            'error'
          );
          return {
            success: false,
            message: `Alamat email ${cleanEmail} sudah digunakan/tertaut. Silakan gunakan email Gmail lain.`,
          };
        }

        isEmailChanged = true;
        newEmail = cleanEmail;
      }
    }

    const resolvedName = profileData.nama || profileData.name || currentUser.nama || currentUser.name;
    const resolvedPosition =
      profileData.position !== undefined
        ? profileData.position.trim()
        : profileData.status_peran_kerja !== undefined
        ? profileData.status_peran_kerja.trim()
        : currentUser.position;

    const hashedPassword = profileData.password ? hashPasswordSync(profileData.password) : (currentUser.password || currentUser.password_hash);
    const isSuper = currentUser.role === 'SUPER_ADMIN' || currentUser.id === 'user-super';

    const updatedUser: User = {
      ...currentUser,
      nama: resolvedName,
      name: resolvedName,
      position: resolvedPosition,
      status_peran_kerja: resolvedPosition,
      username: isSuper && newEmail ? newEmail : currentUser.username,
      email: newEmail,
      email_tertaut: isSuper ? newEmail : (isEmailChanged ? undefined : currentUser.email_tertaut),
      is_email_verified: isSuper ? true : (isEmailChanged ? false : currentUser.is_email_verified),
      email_verified_at: isSuper ? new Date().toISOString() : (isEmailChanged ? undefined : currentUser.email_verified_at),
      nomor_telepon: profileData.nomor_telepon !== undefined ? profileData.nomor_telepon : currentUser.nomor_telepon,
      avatar: profileData.avatar !== undefined ? profileData.avatar : (profileData.foto_profil !== undefined ? profileData.foto_profil : currentUser.avatar),
      foto_profil: profileData.avatar !== undefined ? profileData.avatar : (profileData.foto_profil !== undefined ? profileData.foto_profil : currentUser.foto_profil || currentUser.avatar),
      password: hashedPassword,
      password_hash: hashedPassword,
      must_change_password: false,
    };

    setCurrentUser(updatedUser);
    setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? updatedUser : u)));
    try {
      sessionStorage.setItem('iphone_pos_session_user_v1', JSON.stringify(updatedUser));
    } catch {}

    // Instant real-time persist to MySQL database
    try {
      fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUser),
      }).catch(() => {});
    } catch {}

    logActivity('Perbarui Profil', `Memperbarui data profil: ${resolvedName} (${newEmail || '-'})`, 'USER');
    showToast('Profil Diperbarui', isEmailChanged ? `Email berhasil diubah menjadi ${newEmail}.` : 'Data profil Anda telah berhasil disimpan.', 'success');
    return { success: true };
  };

  // Stock Adjustment Core Logic
  const adjustStock = (
    inventoryId: string,
    amount: number,
    direction: '+' | '-',
    reason: string,
    notes: string,
    trxType?: StockTransactionType
  ): boolean => {
    if (!currentUser) return false;
    if (!ensureUserSessionValid()) return false;
    if (currentUser.role === 'KARYAWAN') {
      showToast('Akses Ditolak', 'Role Karyawan hanya memiliki hak untuk melihat riwayat stok, bukan melakukan mutasi atau penyesuaian stok langsung.', 'error');
      return false;
    }
    const item = inventory.find((i) => i.id === inventoryId);
    if (!item) {
      showToast('Error', 'Barang tidak ditemukan dalam database.', 'error');
      return false;
    }

    const currentStock = item.stok;
    let newStock = currentStock;

    if (direction === '+') {
      newStock = currentStock + amount;
    } else {
      if (currentStock < amount) {
        showToast('Stok Tidak Cukup', `Stok saat ini (${currentStock} ${item.satuan}) tidak mencukupi untuk pengurangan ${amount} ${item.satuan}.`, 'error');
        return false;
      }
      newStock = currentStock - amount;
    }

    const newStatus = calculateStockStatus(newStock, item.stok_minimum);
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(
      2,
      '0'
    )}:${String(now.getSeconds()).padStart(2, '0')}`;

    // Update Inventory
    setInventory((prev) =>
      prev.map((it) =>
        it.id === inventoryId
          ? {
              ...it,
              stok: newStock,
              status: newStatus,
              updated_at: dateStr,
            }
          : it
      )
    );

    // Transaction Type
    const computedTrxType: StockTransactionType =
      trxType || (direction === '+' ? 'TAMBAH_STOK' : 'KURANGI_STOK');

    // Create Transaction Record
    const newTrx: StockTransaction = {
      id: `trx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      store_id: item.store_id,
      inventory_id: item.id,
      kode_barang: item.kode_barang,
      nama_barang: item.nama_barang,
      model_iphone: item.model_iphone,
      harga_beli: item.harga_beli,
      harga_jual: item.harga_jual,
      jenis: computedTrxType,
      direction,
      jumlah: amount,
      stok_sebelum: currentStock,
      stok_sesudah: newStock,
      alasan: reason,
      keterangan: notes,
      tanggal: dateStr,
      waktu: timeStr,
      user_id: currentUser.id,
      user_name: currentUser.nama || currentUser.name,
      created_at: `${dateStr} ${timeStr}`,
    };
    setTransactions((prev) => [newTrx, ...prev]);

    // Log Activity with contextual activity title and detailed message
    let activityTitle = direction === '+' ? 'Tambah Stok Barang' : 'Kurangi Stok Barang';
    let detailMsg = `${item.kode_barang} (${item.nama_barang}) [${item.model_iphone}]: ${direction}${amount} ${item.satuan} (Stok: ${currentStock} → ${newStock}) [Alasan: ${reason}]`;

    if (computedTrxType === 'RUSAK') {
      activityTitle = 'Lapor Barang Rusak';
      detailMsg = `Komponen Rusak/Defect: ${item.kode_barang} - ${item.nama_barang} (${item.model_iphone || 'iPhone'}) sebanyak ${amount} ${item.satuan}. Alasan: ${reason}. Catatan: ${notes || '-'}. (Stok: ${currentStock} → ${newStock} ${item.satuan})`;
    } else if (computedTrxType === 'MASUK') {
      activityTitle = 'Barang Masuk / Restock';
      detailMsg = `Restock Komponen: ${item.kode_barang} - ${item.nama_barang} (${item.model_iphone || 'iPhone'}) bertambah +${amount} ${item.satuan} [Supplier/Catatan: ${notes || reason}]. (Stok: ${currentStock} → ${newStock} ${item.satuan})`;
    } else if (computedTrxType === 'KELUAR') {
      activityTitle = 'Barang Keluar';
      detailMsg = `Pengeluaran Komponen: ${item.kode_barang} - ${item.nama_barang} (${item.model_iphone || 'iPhone'}) berkurang -${amount} ${item.satuan} [Alasan: ${reason}]. (Stok: ${currentStock} → ${newStock} ${item.satuan})`;
    }

    logActivity(
      activityTitle,
      detailMsg,
      'INVENTORY',
      item.store_id
    );

    // Contextual Notifications
    if (computedTrxType === 'RUSAK') {
      addNotification(
        `Laporan Barang Rusak: ${item.nama_barang}`,
        `${currentUser.nama || currentUser.name} melaporkan ${amount} ${item.satuan} ${item.nama_barang} (${item.model_iphone || 'iPhone'}) rusak/cacat. Alasan: ${reason}. Sisa stok: ${newStock} ${item.satuan}.`,
        'WARNING',
        'BARANG_RUSAK',
        item.store_id,
        {
          targetRoles: ['SUPER_ADMIN', 'ADMIN_TOKO'],
          kategori: 'INVENTORY',
        }
      );
    } else if (computedTrxType === 'MASUK') {
      addNotification(
        `Barang Masuk: ${item.nama_barang}`,
        `Restock ${amount} ${item.satuan} ${item.nama_barang} (${item.model_iphone || 'iPhone'}) berhasil dicatat oleh ${currentUser.nama || currentUser.name}. Total stok: ${newStock} ${item.satuan}.`,
        'SUCCESS',
        'BARANG_MASUK',
        item.store_id,
        {
          targetRoles: ['SUPER_ADMIN', 'ADMIN_TOKO'],
          kategori: 'INVENTORY',
        }
      );
    } else if (computedTrxType === 'KELUAR') {
      addNotification(
        `Barang Keluar: ${item.nama_barang}`,
        `${currentUser.nama || currentUser.name} mengeluarkan ${amount} ${item.satuan} ${item.nama_barang} (${item.model_iphone || 'iPhone'}) untuk ${reason}. Sisa stok: ${newStock} ${item.satuan}.`,
        'INFO',
        'BARANG_KELUAR',
        item.store_id,
        {
          targetRoles: ['SUPER_ADMIN', 'ADMIN_TOKO'],
          kategori: 'INVENTORY',
        }
      );
    }

    // Critical low / out of stock alerts (Accessible to Technicians/Karyawan in that store as well!)
    if (newStatus === 'HABIS') {
      addNotification(
        `Stok Habis: ${item.nama_barang}`,
        `Stok ${item.kode_barang} (${item.model_iphone}) sekarang 0 ${item.satuan}. Segera lakukan pemesanan ulang.`,
        'DANGER',
        'INVENTARIS',
        item.store_id,
        {
          targetRoles: ['SUPER_ADMIN', 'ADMIN_TOKO', 'KARYAWAN'],
          kategori: 'INVENTORY',
        }
      );
    } else if (newStatus === 'MENIPIS') {
      addNotification(
        `Stok Menipis: ${item.nama_barang}`,
        `Sisa stok ${item.kode_barang} (${item.model_iphone}) tersisa ${newStock} ${item.satuan} (Minimum: ${item.stok_minimum} ${item.satuan}).`,
        'WARNING',
        'INVENTARIS',
        item.store_id,
        {
          targetRoles: ['SUPER_ADMIN', 'ADMIN_TOKO', 'KARYAWAN'],
          kategori: 'INVENTORY',
        }
      );
    }

    // Feedback Toast
    if (computedTrxType === 'RUSAK') {
      showToast(
        'Laporan Barang Rusak Berhasil',
        `Berhasil mencatat ${amount} ${item.satuan} ${item.nama_barang} rusak. Stok berkurang menjadi ${newStock} ${item.satuan}.`,
        'warning'
      );
    } else if (computedTrxType === 'MASUK') {
      showToast(
        'Barang Masuk Berhasil',
        `Berhasil menambah +${amount} ${item.satuan} ${item.nama_barang}. Total stok: ${newStock} ${item.satuan}.`,
        'success'
      );
    } else if (computedTrxType === 'KELUAR') {
      showToast(
        'Barang Keluar Berhasil',
        `Berhasil mengeluarkan -${amount} ${item.satuan} ${item.nama_barang}. Sisa stok: ${newStock} ${item.satuan}.`,
        'success'
      );
    } else {
      showToast(
        'Stok Diperbarui',
        `Berhasil memperbarui stok ${item.nama_barang}: ${currentStock} → ${newStock} ${item.satuan}.`,
        'success'
      );
    }
    return true;
  };

  // Inventory CRUD
  const addInventoryItem = (data: Omit<InventoryItem, 'id' | 'status' | 'created_at' | 'updated_at'>) => {
    if (!ensureUserSessionValid()) return;
    if (currentUser?.role === 'KARYAWAN') {
      showToast('Akses Ditolak', 'Role Karyawan tidak memiliki hak untuk menambahkan master komponen baru.', 'error');
      return;
    }
    const id = `inv-${Date.now()}`;
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;
    const status = calculateStockStatus(data.stok, data.stok_minimum);

    const newItem: InventoryItem = {
      ...data,
      id,
      status,
      created_at: dateStr,
      updated_at: dateStr,
    };

    setInventory((prev) => [newItem, ...prev]);

    // If initial stock > 0, create transaction
    if (data.stok > 0 && currentUser) {
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      const initTrx: StockTransaction = {
        id: `trx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        store_id: data.store_id,
        inventory_id: id,
        kode_barang: data.kode_barang,
        nama_barang: data.nama_barang,
        model_iphone: data.model_iphone,
        harga_beli: data.harga_beli,
        harga_jual: data.harga_jual,
        jenis: 'MASUK',
        direction: '+',
        jumlah: data.stok,
        stok_sebelum: 0,
        stok_sesudah: data.stok,
        alasan: 'Stok Awal Input Komponen iPhone Baru',
        keterangan: data.keterangan || 'Inisialisasi Master Barang',
        tanggal: dateStr,
        waktu: timeStr,
        user_id: currentUser.id,
        user_name: currentUser.nama || currentUser.name,
        created_at: `${dateStr} ${timeStr}`,
      };
      setTransactions((prev) => [initTrx, ...prev]);
    }

    logActivity('Tambah Komponen iPhone', `Menambahkan ${newItem.kode_barang} - ${newItem.nama_barang} (${newItem.model_iphone}) [Stok: ${newItem.stok}]`, 'INVENTORY', data.store_id);
    showToast('Barang Berhasil Ditambahkan', `${newItem.nama_barang} (${newItem.model_iphone}) siap digunakan.`, 'success');
  };

  const updateInventoryItem = (id: string, data: Partial<InventoryItem>) => {
    if (!ensureUserSessionValid()) return;
    if (currentUser?.role === 'KARYAWAN') {
      showToast('Akses Ditolak', 'Role Karyawan tidak memiliki hak untuk mengedit data master komponen.', 'error');
      return;
    }
    setInventory((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, ...data, updated_at: new Date().toISOString().split('T')[0] };
          if (data.stok !== undefined || data.stok_minimum !== undefined) {
            updated.status = calculateStockStatus(updated.stok, updated.stok_minimum);
          }
          return updated;
        }
        return item;
      })
    );
    const targetItem = inventory.find((i) => i.id === id);
    logActivity('Edit Komponen iPhone', `Mengubah data komponen iPhone: ${targetItem?.nama_barang || 'Komponen'}`, 'INVENTORY', targetItem?.store_id);
    showToast('Perubahan Disimpan', 'Data komponen iPhone berhasil diupdate.', 'success');
  };

  const deleteInventoryItem = async (id: string) => {
    if (!ensureUserSessionValid()) return;
    if (currentUser?.role === 'KARYAWAN') {
      showToast('Akses Ditolak', 'Role Karyawan tidak memiliki hak untuk menghapus data master komponen.', 'error');
      return;
    }
    const item = inventory.find((i) => i.id === id);
    if (!item) return;

    try {
      await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
    } catch {}

    setInventory((prev) => prev.filter((i) => i.id !== id));
    logActivity('Hapus Barang', `Menghapus ${item.kode_barang} - ${item.nama_barang} (${item.model_iphone})`, 'INVENTORY', item.store_id);
    showToast('Barang Dihapus', `${item.nama_barang} telah dihapus dari inventaris dan database.`, 'info');
  };

  // Categories
  const addCategory = (nama: string, deskripsi: string, storeId?: string) => {
    const targetStoreId = storeId || activeStoreId || (stores.length > 0 ? stores[0].id : null);
    if (!targetStoreId) {
      showToast('Pilih Cabang Terlebih Dahulu', 'Kategori sparepart harus dikaitkan dengan toko cabang.', 'warning');
      return;
    }
    const newCat: Category = {
      id: `cat-${Date.now()}`,
      store_id: targetStoreId,
      nama_kategori: nama,
      deskripsi,
      created_at: new Date().toISOString().split('T')[0],
    };
    setCategories((prev) => [...prev, newCat]);

    // Send immediately to backend API and MySQL database
    fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCat),
    }).catch(() => {});

    logActivity('Tambah Kategori', `Menambah kategori baru: ${nama}`, 'INVENTORY', targetStoreId || undefined);
    showToast('Kategori Ditambahkan', `Kategori ${nama} berhasil disimpan.`, 'success');
  };

  const updateCategory = (id: string, nama: string, deskripsi: string, storeId?: string) => {
    const existing = categories.find((c) => c.id === id);
    const targetStoreId = storeId !== undefined ? storeId : (existing?.store_id || activeStoreId || (stores.length > 0 ? stores[0].id : null));
    const updated = {
      ...(existing || {}),
      id,
      store_id: targetStoreId,
      nama_kategori: nama,
      deskripsi,
      created_at: existing?.created_at || new Date().toISOString().split('T')[0],
    };
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updated } : c))
    );

    // Send immediately to backend API and MySQL database
    fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(() => {});

    logActivity('Edit Kategori', `Mengubah kategori: ${nama}`, 'INVENTORY', updated.store_id || undefined);
    showToast('Kategori Diperbarui', 'Data kategori berhasil diupdate.', 'success');
  };

  const deleteCategory = async (id: string) => {
    const cat = categories.find((c) => c.id === id);
    if (!cat) return;

    try {
      await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    } catch {}

    setCategories((prev) => prev.filter((c) => c.id !== id));
    logActivity('Hapus Kategori', `Menghapus kategori ${cat.nama_kategori}`, 'INVENTORY', cat.store_id || undefined);
    showToast('Kategori Dihapus', `Kategori ${cat.nama_kategori} telah dihapus dari sistem dan database.`, 'info');
  };

  // Seri iPhone Management
  const addIphoneSeries = (seriesData: { nama_seri: string; deskripsi?: string; tahun_rilis?: number; store_id?: string }) => {
    if (currentUser?.role === 'KARYAWAN') {
      showToast('Akses Ditolak', 'Role Karyawan tidak memiliki hak untuk menambah seri iPhone.', 'error');
      return;
    }
    const targetStoreId = seriesData.store_id || activeStoreId || (stores.length > 0 ? stores[0].id : null);
    if (!targetStoreId) {
      showToast('Pilih Cabang Terlebih Dahulu', 'Katalog seri iPhone harus dikaitkan dengan toko cabang.', 'warning');
      return;
    }
    const newSeries: IPhoneSeries = {
      id: `series-${Date.now()}`,
      store_id: targetStoreId,
      nama_seri: seriesData.nama_seri.trim(),
      deskripsi: seriesData.deskripsi || '',
      tahun_rilis: seriesData.tahun_rilis || new Date().getFullYear(),
      urutan: iphoneSeries.filter((s) => s.store_id === targetStoreId).length + 1,
      created_at: new Date().toISOString().split('T')[0],
    };
    setIphoneSeries((prev) => [...prev, newSeries]);

    // Send immediately to backend API and MySQL database
    fetch('/api/iphone-series', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSeries),
    }).catch(() => {});

    logActivity('Tambah Seri iPhone', `Menambah seri iPhone baru: ${newSeries.nama_seri}`, 'INVENTORY', targetStoreId || undefined);
    showToast('Seri iPhone Ditambahkan', `Seri ${newSeries.nama_seri} berhasil dibuat.`, 'success');
  };

  const updateIphoneSeries = (id: string, seriesData: Partial<IPhoneSeries>) => {
    if (currentUser?.role === 'KARYAWAN') {
      showToast('Akses Ditolak', 'Role Karyawan tidak memiliki hak untuk mengedit data seri iPhone.', 'error');
      return;
    }
    const oldSeries = iphoneSeries.find((s) => s.id === id);
    const targetStoreId = seriesData.store_id !== undefined ? seriesData.store_id : (oldSeries?.store_id || activeStoreId || (stores.length > 0 ? stores[0].id : null));
    const updatedSeries = {
      ...(oldSeries || {}),
      ...seriesData,
      id,
      store_id: targetStoreId,
    };
    setIphoneSeries((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updatedSeries } : s))
    );

    // Send immediately to backend API and MySQL database
    fetch('/api/iphone-series', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedSeries),
    }).catch(() => {});

    // If series name changed, cascade update inventory items model_iphone
    if (oldSeries && seriesData.nama_seri && oldSeries.nama_seri !== seriesData.nama_seri) {
      setInventory((prev) =>
        prev.map((item) =>
          item.model_iphone === oldSeries.nama_seri
            ? { ...item, model_iphone: seriesData.nama_seri! }
            : item
        )
      );
    }

    logActivity('Edit Seri iPhone', `Memperbarui seri iPhone: ${updatedSeries.nama_seri || 'Seri iPhone'}`, 'INVENTORY', updatedSeries.store_id || undefined);
    showToast('Seri iPhone Diperbarui', 'Data seri iPhone berhasil diupdate.', 'success');
  };

  const deleteIphoneSeries = async (id: string) => {
    if (currentUser?.role === 'KARYAWAN') {
      showToast('Akses Ditolak', 'Role Karyawan tidak memiliki hak untuk menghapus seri iPhone.', 'error');
      return;
    }
    const target = iphoneSeries.find((s) => s.id === id);
    if (!target) return;

    try {
      await fetch(`/api/iphone-series/${id}`, { method: 'DELETE' });
    } catch {}

    setIphoneSeries((prev) => prev.filter((s) => s.id !== id));
    logActivity('Hapus Seri iPhone', `Menghapus seri iPhone: ${target.nama_seri}`, 'INVENTORY');
    showToast('Seri iPhone Dihapus', `Seri ${target.nama_seri} telah dihapus dari sistem dan database.`, 'info');
  };

  // Specific Transactions
  const recordStockIn = (inventoryId: string, amount: number, supplierNotes: string): boolean => {
    return adjustStock(inventoryId, amount, '+', 'Barang Masuk / Restock Supplier', supplierNotes, 'MASUK');
  };

  const recordStockOut = (inventoryId: string, amount: number, reason: string, notes: string): boolean => {
    return adjustStock(inventoryId, amount, '-', reason || 'Barang Keluar / Terjual', notes, 'KELUAR');
  };

  const recordDamagedItem = (inventoryId: string, amount: number, reason: string, notes: string): boolean => {
    return adjustStock(inventoryId, amount, '-', `Barang Rusak: ${reason}`, notes, 'RUSAK');
  };

  // Returns
  const createReturn = (inventoryId: string, amount: number, reason: string, notes: string): boolean => {
    if (!currentUser) return false;
    if (!ensureUserSessionValid()) return false;
    const item = inventory.find((i) => i.id === inventoryId);
    if (!item) return false;

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const newReturn: ReturnItem = {
      id: `ret-${Date.now()}`,
      store_id: item.store_id,
      inventory_id: item.id,
      kode_barang: item.kode_barang,
      nama_barang: item.nama_barang,
      model_iphone: item.model_iphone,
      harga_beli: item.harga_beli,
      harga_jual: item.harga_jual,
      jumlah: amount,
      tanggal_return: dateStr,
      tanggal_pengajuan: dateStr,
      alasan: reason,
      alasan_return: reason,
      keterangan: notes,
      status: 'MENUNGGU',
      dibuat_oleh_id: currentUser.id,
      dibuat_oleh_name: currentUser.nama || currentUser.name,
      created_at: new Date().toLocaleString(),
    };

    setReturns((prev) => [newReturn, ...prev]);
    logActivity('Buat Return Barang', `Mengajukan return ${amount} pcs ${item.nama_barang} (${item.model_iphone}) [${reason}]`, 'RETURN', item.store_id);
    
    // Notification for Admins needing approval
    addNotification(
      'Pengajuan Return Menunggu Approval',
      `${currentUser.nama || currentUser.name} mengajukan return ${amount} pcs ${item.nama_barang} (${item.model_iphone || 'iPhone'}).`,
      'INFO',
      'RETURN',
      item.store_id,
      {
        targetRoles: ['SUPER_ADMIN', 'ADMIN_TOKO'],
        kategori: 'RETURN',
      }
    );

    // Personal notification for submitting employee
    addNotification(
      'Pengajuan Return Terkirim',
      `Pengajuan return ${amount} pcs ${item.nama_barang} Anda telah diajukan dan sedang menunggu verifikasi admin.`,
      'INFO',
      'RETURN',
      item.store_id,
      {
        targetRoles: ['KARYAWAN'],
        targetUserId: currentUser.id,
        kategori: 'RETURN',
      }
    );

    showToast('Return Diajukan', 'Pengajuan return sedang MENUNGGU verifikasi admin.', 'info');
    return true;
  };

  const createReturnRequest = (
    inventoryId: string,
    customerName: string,
    customerPhone: string,
    amount: number,
    reason: string
  ): boolean => {
    if (!currentUser) return false;
    if (!ensureUserSessionValid()) return false;
    const item = inventory.find((i) => i.id === inventoryId);
    if (!item) return false;

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const isSuper = currentUser.role === 'SUPER_ADMIN';
    const status: ReturnStatus = isSuper ? 'DITERIMA' : 'MENUNGGU';

    const newReturn: ReturnItem = {
      id: `ret-${Date.now()}`,
      store_id: item.store_id,
      inventory_id: item.id,
      kode_barang: item.kode_barang,
      nama_barang: item.nama_barang,
      model_iphone: item.model_iphone,
      harga_beli: item.harga_beli,
      harga_jual: item.harga_jual,
      jumlah: amount,
      customer_name: customerName,
      customer_phone: customerPhone,
      tanggal_return: dateStr,
      tanggal_pengajuan: dateStr,
      alasan: reason,
      alasan_return: reason,
      keterangan: `Customer: ${customerName} (${customerPhone})`,
      status,
      dibuat_oleh_id: currentUser.id,
      dibuat_oleh_name: currentUser.nama || currentUser.name,
      diproses_oleh_id: isSuper ? currentUser.id : undefined,
      diproses_oleh_name: isSuper ? (currentUser.nama || currentUser.name) : undefined,
      tanggal_proses: isSuper ? dateStr : undefined,
      catatan_proses: isSuper ? 'Dicatat langsung oleh Super Admin' : undefined,
      catatan_approval: isSuper ? 'Dicatat langsung oleh Super Admin' : undefined,
      created_at: new Date().toLocaleString(),
    };

    if (isSuper) {
      adjustStock(
        item.id,
        amount,
        '+',
        `Return Super Admin (${reason})`,
        `Barang return dicatat langsung oleh Super Admin dan dikembalikan ke stok.`,
        'RETURN_MASUK'
      );
      setReturns((prev) => [newReturn, ...prev]);
      logActivity('Catat Return', `Super Admin mencatat return ${amount} pcs ${item.nama_barang} (Selesai)`, 'RETURN', item.store_id);
      showToast('Return Dicatat', 'Data return berhasil dicatat dan stok telah otomatis bertambah.', 'success');
      return true;
    }

    setReturns((prev) => [newReturn, ...prev]);
    logActivity('Pengajuan Return', `Klaim return ${amount} pcs ${item.nama_barang} dari ${customerName}`, 'RETURN', item.store_id);
    addNotification(
      'Klaim Return Menunggu Approval Super Admin',
      `${customerName} mengajukan return ${amount} pcs ${item.nama_barang} (${item.model_iphone || 'iPhone'}).`,
      'INFO',
      'RETURN',
      item.store_id,
      {
        targetRoles: ['SUPER_ADMIN'],
        kategori: 'RETURN',
      }
    );
    showToast('Pengajuan Terkirim', 'Klaim return berhasil diajukan dan sedang MENUNGGU persetujuan Super Admin.', 'info');
    return true;
  };

  const processReturn = (returnId: string, decision: 'DITERIMA' | 'DITOLAK', processNotes: string): boolean => {
    if (!currentUser) return false;
    const ret = returns.find((r) => r.id === returnId);
    if (!ret) return false;

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    if (decision === 'DITERIMA') {
      adjustStock(
        ret.inventory_id,
        ret.jumlah,
        '+',
        `Return Disetujui (${ret.alasan})`,
        `Barang return diterima dan dikembalikan ke stok. ${processNotes}`,
        'RETURN_MASUK'
      );
    }

    setReturns((prev) =>
      prev.map((r) =>
        r.id === returnId
          ? {
              ...r,
              status: decision,
              diproses_oleh_id: currentUser.id,
              diproses_oleh_name: currentUser.nama || currentUser.name,
              tanggal_proses: dateStr,
              catatan_proses: processNotes,
              catatan_approval: processNotes,
            }
          : r
      )
    );

    logActivity(
      decision === 'DITERIMA' ? 'Terima Return Barang' : 'Tolak Return Barang',
      `Return ${ret.kode_barang} (${ret.jumlah} pcs): ${decision}. Catatan: ${processNotes || '-'}`,
      'RETURN',
      ret.store_id
    );

    // Personal notification for the employee who submitted the return!
    if (ret.dibuat_oleh_id) {
      addNotification(
        `Pengajuan Return Anda ${decision === 'DITERIMA' ? 'Disetujui' : 'Ditolak'}`,
        `Pengajuan return ${ret.jumlah} pcs ${ret.nama_barang} (${ret.kode_barang}) Anda telah ${decision} oleh ${currentUser.nama || currentUser.name}. Catatan: ${processNotes || '-'}`,
        decision === 'DITERIMA' ? 'SUCCESS' : 'WARNING',
        'RETURN',
        ret.store_id,
        {
          targetRoles: ['KARYAWAN'],
          targetUserId: ret.dibuat_oleh_id,
          kategori: 'RETURN',
        }
      );
    }

    // Notification for Admins
    addNotification(
      `Return ${decision === 'DITERIMA' ? 'Diterima' : 'Ditolak'}: ${ret.nama_barang}`,
      `Pengajuan return ${ret.jumlah} pcs ${ret.nama_barang} (${ret.kode_barang}) telah diproses: ${decision} oleh ${currentUser.nama || currentUser.name}.`,
      decision === 'DITERIMA' ? 'SUCCESS' : 'INFO',
      'RETURN',
      ret.store_id,
      {
        targetRoles: ['SUPER_ADMIN', 'ADMIN_TOKO'],
        kategori: 'RETURN',
      }
    );

    showToast(
      decision === 'DITERIMA' ? 'Return Diterima' : 'Return Ditolak',
      `Status return ${ret.kode_barang} berhasil diubah menjadi ${decision}.`,
      decision === 'DITERIMA' ? 'success' : 'warning'
    );
    return true;
  };

  // Attendance (Khusus Admin Toko dan Karyawan; Super Admin tidak memiliki absensi)
  const checkInAttendance = (keterangan?: string): boolean => {
    if (!currentUser || currentUser.role === 'SUPER_ADMIN' || !activeStoreId) return false;
    return recordCheckIn(currentUser.id, undefined, keterangan);
  };

  const checkOutAttendance = (keterangan?: string): boolean => {
    if (!currentUser || currentUser.role === 'SUPER_ADMIN') return false;
    return recordCheckOut(currentUser.id);
  };

  // Reconcile attendance records dynamically based on shift schedules (bidirectional: HADIR <-> TERLAMBAT, update late minutes / schedule notes)
  const reconcileAttendanceRecords = (
    records: AttendanceRecord[],
    usersList: User[],
    storesList: Store[]
  ): { updated: AttendanceRecord[]; hasChanges: boolean } => {
    let hasChanges = false;
    const updated = records.map((att) => {
      // Don't modify records without a check-in time or manual leave statuses (IZIN, SAKIT, ALPA)
      if (
        !att.jam_masuk ||
        att.status === 'IZIN' ||
        att.status === 'SAKIT' ||
        att.status === 'ALPA' ||
        att.status === 'ALPHA'
      ) {
        return att;
      }
      const usr = usersList.find((u) => u.id === att.user_id);
      const str = storesList.find((s) => s.id === (att.store_id || usr?.store_id));
      const userJamMasuk = usr?.jam_masuk_standar || str?.jam_masuk_standar || '08:30';
      const userJamPulang = usr?.jam_pulang_standar || str?.jam_pulang_standar || '17:00';
      const tolerance = usr?.toleransi_keterlambatan_menit !== undefined
        ? usr.toleransi_keterlambatan_menit
        : (str?.toleransi_keterlambatan_menit || 0);

      const checkInEval = evaluateShiftCheckIn(userJamMasuk, userJamPulang, tolerance, att.jam_masuk);

      if (checkInEval.isLate) {
        const lateKet = `Terlambat ${checkInEval.lateMinutes} mnt (Jadwal: ${userJamMasuk} WIB)`;
        const isStatusChange = att.status !== 'TERLAMBAT';
        // Auto-generated keterangan if empty, 'Hadir', or already starts with 'Terlambat'
        const isAutoKet = !att.keterangan || att.keterangan === 'Hadir' || att.keterangan.startsWith('Terlambat');
        const isKetChange = isAutoKet && att.keterangan !== lateKet;

        if (isStatusChange || isKetChange) {
          hasChanges = true;
          return {
            ...att,
            status: 'TERLAMBAT' as AttendanceStatus,
            keterangan: isAutoKet ? lateKet : att.keterangan,
            catatan: (!att.catatan || att.catatan === 'Hadir' || att.catatan.startsWith('Terlambat')) ? lateKet : att.catatan,
          };
        }
      } else {
        // Not late: If currently TERLAMBAT or has an outdated Terlambat note, switch back to HADIR!
        const isStatusChange = att.status === 'TERLAMBAT';
        const isAutoKet = !att.keterangan || att.keterangan.startsWith('Terlambat');
        const isAutoCatatan = !att.catatan || att.catatan.startsWith('Terlambat');

        if (isStatusChange || isAutoKet || isAutoCatatan) {
          hasChanges = true;
          return {
            ...att,
            status: 'HADIR' as AttendanceStatus,
            keterangan: isAutoKet ? 'Hadir' : att.keterangan,
            catatan: isAutoCatatan ? 'Hadir' : att.catatan,
          };
        }
      }

      return att;
    });
    return { updated, hasChanges };
  };

  // Auto-reconcile attendance records whenever users or stores change
  useEffect(() => {
    if (attendance.length > 0 && users.length > 0) {
      const { updated, hasChanges } = reconcileAttendanceRecords(attendance, users, stores);
      if (hasChanges) {
        setAttendance(updated);
      }
    }
  }, [users, stores]);

  const recordCheckIn = (userId: string, jamMasuk?: string, keterangan?: string): boolean => {
    const targetUser = users.find((u) => u.id === userId) || currentUser;
    if (!targetUser) return false;

    // Super Admin tidak memiliki absensi
    if (targetUser.role === 'SUPER_ADMIN' || targetUser.id === 'user-super') {
      showToast('Informasi', 'Super Admin tidak memiliki kewajiban absensi kerja.', 'info');
      return false;
    }

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;
    const timeStr = jamMasuk || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} WIB`;

    const userStoreId = targetUser.store_id || (currentUser?.role !== 'SUPER_ADMIN' ? (currentUser?.store_id || '') : (activeStoreId || ''));
    const st = stores.find((s) => s.id === userStoreId);

    const existing = attendance.find(
      (a) => a.user_id === userId && a.tanggal === dateStr
    );

    if (existing && existing.jam_masuk) {
      showToast('Peringatan', `${targetUser.nama || targetUser.name} sudah check in hari ini (${existing.jam_masuk}).`, 'warning');
      return false;
    }

    // Schedule Lateness Check - Prioritize individual user schedule, then store schedule
    const userJamMasuk = targetUser.jam_masuk_standar || st?.jam_masuk_standar || '08:30';
    const userJamPulang = targetUser.jam_pulang_standar || st?.jam_pulang_standar || '17:00';
    const tolerance = targetUser.toleransi_keterlambatan_menit !== undefined
      ? targetUser.toleransi_keterlambatan_menit
      : (st?.toleransi_keterlambatan_menit || 0);

    const checkInEval = evaluateShiftCheckIn(userJamMasuk, userJamPulang, tolerance, timeStr);
    const isLate = checkInEval.isLate;
    const computedStatus: AttendanceStatus = isLate ? 'TERLAMBAT' : 'HADIR';
    const computedKet = keterangan || (isLate ? `Terlambat ${checkInEval.lateMinutes} mnt (Jadwal: ${userJamMasuk} WIB)` : 'Hadir');

    if (existing) {
      setAttendance((prev) =>
        prev.map((a) =>
          a.id === existing.id
            ? {
                ...a,
                jam_masuk: timeStr,
                status: computedStatus,
                keterangan: computedKet,
                catatan: computedKet,
              }
            : a
        )
      );
    } else {
      const newAtt: AttendanceRecord = {
        id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        user_id: userId,
        user_name: targetUser.nama || targetUser.name,
        store_id: userStoreId,
        store_name: st ? `${st.nama_toko}${st.cabang && st.cabang !== '0' && st.cabang !== '()' && st.cabang !== '(0)' ? ` (${st.cabang})` : ''}` : 'Toko Cabang',
        tanggal: dateStr,
        jam_masuk: timeStr,
        jam_keluar: null,
        jam_pulang: null,
        status: computedStatus,
        keterangan: computedKet,
        catatan: computedKet,
        created_at: new Date().toLocaleString(),
      };
      setAttendance((prev) => [newAtt, ...prev]);
    }

    if (isLate) {
      logActivity('Check In Absensi (TERLAMBAT)', `${targetUser.nama || targetUser.name} absen masuk pukul ${timeStr} (Jadwal: ${userJamMasuk} WIB)`, 'ABSENSI', userStoreId);
      
      // Admin notification for lateness
      addNotification(
        `Keterlambatan Absensi: ${targetUser.nama || targetUser.name}`,
        `${targetUser.nama || targetUser.name} check in pada ${timeStr} (Terlambat ${checkInEval.lateMinutes} mnt dari jadwal ${userJamMasuk} WIB di ${st?.nama_toko || 'toko'}).`,
        'WARNING',
        'ABSENSI',
        userStoreId,
        {
          targetRoles: ['SUPER_ADMIN', 'ADMIN_TOKO'],
          kategori: 'ABSENSI',
        }
      );

      // Personal notification for the employee
      addNotification(
        'Absensi Masuk Tercatat (Terlambat)',
        `Check in kehadiran Anda tercatat pukul ${timeStr}. Status: Terlambat ${checkInEval.lateMinutes} menit dari jadwal resmi (${userJamMasuk} WIB).`,
        'WARNING',
        'ABSENSI',
        userStoreId,
        {
          targetRoles: ['KARYAWAN'],
          targetUserId: targetUser.id,
          kategori: 'ABSENSI',
        }
      );

      showToast('Check In Tercatat (TERLAMBAT)', `Absensi masuk ${targetUser.nama || targetUser.name} tercatat ${timeStr}. Melebihi jam masuk resmi (${userJamMasuk} WIB).`, 'warning');
    } else {
      logActivity('Check In Absensi', `${targetUser.nama || targetUser.name} absen masuk tepat waktu pukul ${timeStr}`, 'ABSENSI', userStoreId);
      
      // Personal notification for the employee
      addNotification(
        'Absensi Masuk Berhasil',
        `Check in kehadiran Anda tercatat tepat waktu pukul ${timeStr}. Selamat bekerja!`,
        'SUCCESS',
        'ABSENSI',
        userStoreId,
        {
          targetRoles: ['KARYAWAN'],
          targetUserId: targetUser.id,
          kategori: 'ABSENSI',
        }
      );

      showToast('Check In Berhasil', `Absensi masuk ${targetUser.nama || targetUser.name} tercatat tepat waktu (${timeStr}).`, 'success');
    }

    return true;
  };

  const recordCheckOut = (userId: string, jamKeluar?: string, forceEarly?: boolean): boolean => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return false;

    // Super Admin tidak memiliki absensi
    if (targetUser.role === 'SUPER_ADMIN' || targetUser.id === 'user-super') {
      showToast('Informasi', 'Super Admin tidak memiliki kewajiban absensi kerja.', 'info');
      return false;
    }
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;
    const timeStr = jamKeluar || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} WIB`;

    const existing = attendance.find(
      (a) => a.user_id === userId && a.tanggal === dateStr
    );

    if (!existing) {
      showToast('Error', `${targetUser?.nama || targetUser?.name || 'Karyawan'} belum check in hari ini.`, 'error');
      return false;
    }

    if (existing.jam_keluar || existing.jam_pulang) {
      showToast('Peringatan', `${targetUser?.nama || targetUser?.name || 'Karyawan'} sudah check out hari ini (${existing.jam_keluar || existing.jam_pulang}).`, 'warning');
      return false;
    }

    // Schedule Check Out Time Validation - Prioritize individual user schedule, then store schedule
    const userStoreId = existing.store_id || targetUser?.store_id || (currentUser?.role !== 'SUPER_ADMIN' ? (currentUser?.store_id || '') : (activeStoreId || ''));
    const st = stores.find((s) => s.id === userStoreId);
    const userJamMasuk = targetUser?.jam_masuk_standar || st?.jam_masuk_standar || '08:30';
    const userJamPulang = targetUser?.jam_pulang_standar || st?.jam_pulang_standar || '17:00';
    
    const checkOutEval = evaluateShiftCheckOut(userJamMasuk, userJamPulang, timeStr);

    if (checkOutEval.isBeforeClosing && !forceEarly) {
      showToast(
        'Belum Waktu Pulang',
        `Belum waktu absen pulang! Jadwal pulang ${targetUser?.nama || 'Anda'} adalah ${userJamPulang} WIB (Waktu saat ini: ${timeStr.replace(' WIB', '')}). Absen pulang belum dapat dilakukan sebelum ${userJamPulang} WIB.`,
        'error'
      );
      return false;
    }

    setAttendance((prev) =>
      prev.map((a) =>
        a.id === existing.id
          ? {
              ...a,
              jam_keluar: timeStr,
              jam_pulang: timeStr,
            }
          : a
      )
    );

    logActivity('Check Out Absensi', `${targetUser?.nama || targetUser?.name || 'Karyawan'} absen pulang pukul ${timeStr}`, 'ABSENSI', existing.store_id);

    addNotification(
      'Absensi Pulang Berhasil',
      `Check out kepulangan Anda tercatat pukul ${timeStr}. Terima kasih atas kerja keras Anda hari ini!`,
      'SUCCESS',
      'ABSENSI',
      existing.store_id,
      {
        targetRoles: ['KARYAWAN'],
        targetUserId: targetUser?.id,
        kategori: 'ABSENSI',
      }
    );

    showToast('Check Out Berhasil', `Absensi pulang tercatat (${timeStr}). Selamat beristirahat!`, 'success');
    return true;
  };

  const recordManualAttendance = (
    userId: string,
    storeId: string,
    date: string,
    status: AttendanceStatus,
    jamMasuk: string,
    jamKeluar: string,
    keterangan: string
  ) => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser || targetUser.role === 'SUPER_ADMIN' || targetUser.id === 'user-super') {
      showToast('Peringatan', 'Super Admin tidak memiliki kewajiban dan catatan absensi.', 'warning');
      return;
    }
    const targetStore = stores.find((s) => s.id === storeId);
    const existingIndex = attendance.findIndex(
      (a) => a.user_id === userId && a.tanggal === date
    );

    const recordData: AttendanceRecord = {
      id: existingIndex >= 0 ? attendance[existingIndex].id : `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      user_id: userId,
      user_name: targetUser?.nama || targetUser?.name || 'Karyawan',
      store_id: storeId,
      store_name: targetStore ? `${targetStore.nama_toko}${targetStore.cabang && targetStore.cabang !== '0' && targetStore.cabang !== '()' && targetStore.cabang !== '(0)' ? ` (${targetStore.cabang})` : ''}` : 'Toko Cabang',
      tanggal: date,
      jam_masuk: jamMasuk ? (jamMasuk.includes('WIB') ? jamMasuk : `${jamMasuk} WIB`) : null,
      jam_keluar: jamKeluar ? (jamKeluar.includes('WIB') ? jamKeluar : `${jamKeluar} WIB`) : null,
      jam_pulang: jamKeluar ? (jamKeluar.includes('WIB') ? jamKeluar : `${jamKeluar} WIB`) : null,
      status,
      keterangan: keterangan || (status === 'HADIR' ? 'Hadir' : status),
      catatan: keterangan || (status === 'HADIR' ? 'Hadir' : status),
      created_at: new Date().toLocaleString(),
    };

    if (existingIndex >= 0) {
      setAttendance((prev) =>
        prev.map((a, idx) => (idx === existingIndex ? recordData : a))
      );
    } else {
      setAttendance((prev) => [recordData, ...prev]);
    }

    logActivity(
      'Input Absensi Mandiri / Manual',
      `Mencatat absensi ${targetUser?.nama || targetUser?.name} (${status}) tanggal ${date}${keterangan ? `: ${keterangan}` : ''}`,
      'ABSENSI',
      storeId
    );
    showToast(
      'Absensi Disimpan',
      `Absensi untuk ${targetUser?.nama || targetUser?.name} (${status}) berhasil dicatat.`,
      'success'
    );
  };

  const resetTodayAttendance = async (userId: string) => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;
    try {
      await fetch(`/api/attendance/user-today/${userId}?date=${dateStr}`, { method: 'DELETE' });
    } catch {}

    setAttendance((prev) =>
      prev.filter((a) => !(a.user_id === userId && (a.tanggal === dateStr || (a.tanggal && a.tanggal.startsWith(dateStr)))))
    );
    showToast('Reset Absensi', 'Status absensi hari ini berhasil direset.', 'info');
  };

  const deleteAttendanceRecord = async (id: string) => {
    try {
      await fetch(`/api/attendance/${id}`, { method: 'DELETE' });
    } catch {}
    setAttendance((prev) => prev.filter((a) => a.id !== id));
    showToast('Hapus Absensi', 'Data catatan absensi berhasil dihapus.', 'info');
  };

  // User Management
  const addUser = (userData: Omit<User, 'id' | 'created_at'> & { initialPassword?: string }): boolean => {
    if (!currentUser) return false;

    // RBAC check:
    // Super Admin: can create ADMIN_TOKO and KARYAWAN
    // Admin Toko: can ONLY create KARYAWAN for their own store
    let targetRole: UserRole = userData.role;
    let targetStoreId = userData.store_id;

    if (currentUser.role === 'ADMIN_TOKO') {
      targetRole = 'KARYAWAN';
      targetStoreId = currentUser.store_id || (stores.length > 0 ? stores[0].id : '');
    } else if (currentUser.role === 'KARYAWAN') {
      showToast('Akses Ditolak', 'Karyawan tidak memiliki izin untuk membuat akun baru.', 'error');
      return false;
    }

    const rawPassword = userData.initialPassword && userData.initialPassword.trim() ? userData.initialPassword.trim() : 'Pass123!';
    const hashedPassword = hashPasswordSync(rawPassword);

    const emailVal = userData.email?.trim().toLowerCase() || `${userData.nama.toLowerCase().replace(/\s+/g, '.') || 'user'}@gmail.com`;
    const conflict = users.find(
      (u) =>
        (u.email && u.email.trim().toLowerCase() === emailVal) ||
        (u.email_tertaut && u.email_tertaut.trim().toLowerCase() === emailVal)
    );
    if (conflict) {
      showToast(
        'Email Sudah Digunakan',
        `Alamat email ${emailVal} sudah digunakan/tertaut. Silakan gunakan email Gmail lain.`,
        'error'
      );
      return false;
    }
    const usernameVal = emailVal;

    const positionVal =
      userData.position?.trim() ||
      userData.status_peran_kerja?.trim() ||
      (targetRole === 'ADMIN_TOKO' ? 'Kepala Toko' : targetRole === 'SUPER_ADMIN' ? 'Admin Sistem' : 'Staf / Teknisi');

    const cleanNameStr = (userData.nama || userData.name || '').replace(/\s*\((\s*|0)\)/g, '').replace(/\s+0$/, '').trim();

    const newUser: User = {
      ...userData,
      nama: cleanNameStr,
      name: cleanNameStr,
      id: `user-${Date.now()}`,
      role: targetRole,
      store_id: targetRole === 'SUPER_ADMIN' ? null : targetStoreId,
      position: positionVal,
      status_peran_kerja: positionVal,
      username: usernameVal,
      email: emailVal,
      email_tertaut: undefined,
      is_email_verified: false,
      password: hashedPassword,
      password_hash: hashedPassword,
      must_change_password: true, // Wajib ganti password saat login pertama kali!
      created_at: new Date().toISOString().split('T')[0],
    };

    setUsers((prev) => [...prev, newUser]);

    // Instant real-time push to MySQL backend so newly created account is recognized immediately without refresh
    try {
      fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      }).catch(() => {});
    } catch {}

    logActivity(
      'Buat Akun Karyawan',
      `Mendaftarkan akun baru ${newUser.nama} (${newUser.role} - ${newUser.position}) di cabang ${newUser.store_id || 'Pusat'}`,
      'USER',
      newUser.store_id
    );
    showToast(
      'Akun Berhasil Dibuat',
      `Akun ${newUser.nama} (${newUser.position || newUser.role}) berhasil dibuat. Password awal: "${rawPassword}". Pengguna wajib mengganti password saat login pertama.`,
      'success'
    );
    return true;
  };

  const updateUser = (id: string, userData: Partial<User>) => {
    const target = users.find((u) => u.id === id);
    if (!target) return;

    // Strict Safeguard: Super Admin cannot be demoted, cannot be assigned to a branch store, cannot have employee shifts
    if (target.role === 'SUPER_ADMIN' || id === 'user-super') {
      if (userData.role && userData.role !== 'SUPER_ADMIN') {
        showToast('Akses Ditolak', 'Akun Super Admin sistem tidak dapat diubah perannya.', 'error');
        return;
      }
      userData.role = 'SUPER_ADMIN';
      userData.store_id = null;
    }

    if (userData.email) {
      const cleanEmail = userData.email.trim().toLowerCase();
      const conflict = users.find(
        (u) =>
          u.id !== id &&
          ((u.email && u.email.trim().toLowerCase() === cleanEmail) ||
            (u.email_tertaut && u.email_tertaut.trim().toLowerCase() === cleanEmail))
      );
      if (conflict) {
        showToast(
          'Email Sudah Digunakan',
          `Alamat email ${cleanEmail} sudah digunakan/tertaut. Silakan gunakan email Gmail lain.`,
          'error'
        );
        return;
      }
    }
    const finalData = { ...userData };
    if (userData.nama || userData.name) {
      const cleanNameStr = (userData.nama || userData.name || '').replace(/\s*\((\s*|0)\)/g, '').replace(/\s+0$/, '').trim();
      finalData.nama = cleanNameStr;
      finalData.name = cleanNameStr;
    }
    if (target.role === 'SUPER_ADMIN' || id === 'user-super') {
      finalData.role = 'SUPER_ADMIN';
      finalData.store_id = null;
    }
    if (userData.position || userData.status_peran_kerja) {
      const p = (userData.position || userData.status_peran_kerja)?.trim();
      finalData.position = p;
      finalData.status_peran_kerja = p;
    }
    const updatedUserObj = { ...target, ...finalData };
    const updatedUsers = users.map((u) => (u.id === id ? updatedUserObj : u));
    setUsers(updatedUsers);
    if (currentUser?.id === id) {
      setCurrentUser((prev) => (prev ? { ...prev, ...finalData } : prev));
    }

    // Direct push to database
    try {
      fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUserObj),
      }).catch(() => {});
    } catch {}

    const { updated: reconciledAtt, hasChanges } = reconcileAttendanceRecords(attendance, updatedUsers, stores);
    if (hasChanges) {
      setAttendance(reconciledAtt);
    }
    const targetUser = users.find((u) => u.id === id);
    logActivity('Edit Akun Pengguna', `Memperbarui data pengguna: ${targetUser?.nama || targetUser?.name || 'Pengguna'}`, 'USER', targetUser?.store_id);
    showToast('Data Diperbarui', 'Data pengguna berhasil diubah.', 'success');
  };

  const deleteUser = async (id: string): Promise<{ success: boolean; message: string }> => {
    const target = users.find((u) => u.id === id);
    if (!target) return { success: false, message: 'Pengguna tidak ditemukan.' };
    if (target.role === 'SUPER_ADMIN') {
      showToast('Akses Ditolak', 'Akun Super Admin sistem tidak dapat dihapus.', 'error');
      return { success: false, message: 'Akun Super Admin sistem tidak dapat dihapus.' };
    }

    try {
      await fetch(`/api/users/${id}`, { method: 'DELETE' });
    } catch {
      // Local fallback
    }

    setUsers((prev) => prev.filter((u) => u.id !== id));
    if (currentUser?.id === id) {
      forceLogoutInactiveUser('DELETED');
    }
    logActivity('Hapus Pengguna Permanen', `Menghapus akun ${target.nama || target.name} (${target.email || target.username}) secara permanen`, 'USER', target.store_id);
    showToast('Akun Dihapus', `Akun ${target.nama || target.name} berhasil dihapus permanen.`, 'info');
    return { success: true, message: `Akun ${target.nama || target.name} berhasil dihapus permanen.` };
  };

  const toggleUserStatus = (id: string, explicitStatus?: 'AKTIF' | 'NONAKTIF') => {
    const target = users.find((u) => u.id === id);
    if (!target) return;

    if (currentUser?.role === 'ADMIN_TOKO') {
      if (target.role !== 'KARYAWAN' || target.store_id !== currentUser.store_id) {
        showToast('Akses Ditolak', 'Admin Toko hanya dapat mengelola status akun Karyawan di cabangnya sendiri.', 'error');
        return;
      }
    } else if (currentUser?.role !== 'SUPER_ADMIN') {
      showToast('Akses Ditolak', 'Anda tidak memiliki hak akses untuk mengubah status akun.', 'error');
      return;
    }

    if (target.role === 'SUPER_ADMIN' && currentUser?.id === target.id) {
      showToast('Akses Ditolak', 'Akun Super Admin sistem tidak dapat dinonaktifkan.', 'error');
      return;
    }

    const nextStatus: 'AKTIF' | 'NONAKTIF' = explicitStatus || (target.status === 'AKTIF' ? 'NONAKTIF' : 'AKTIF');
    const updatedUser: User = { ...target, status: nextStatus };

    setUsers((prev) => prev.map((u) => (u.id === id ? updatedUser : u)));

    // Direct push to database
    fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedUser),
    }).catch(() => {});

    logActivity(
      nextStatus === 'AKTIF' ? 'Aktifkan Akun' : 'Nonaktifkan Akun',
      `Mengubah status akun ${target.nama || target.name} (${target.role}) menjadi ${nextStatus}`,
      'USER',
      target.store_id
    );

    showToast(
      nextStatus === 'AKTIF' ? 'Akun Diaktifkan' : 'Akun Dinonaktifkan',
      nextStatus === 'AKTIF'
        ? `Akun ${target.nama || target.name} berhasil diaktifkan kembali. Pengguna dapat login dan bertugas.`
        : `Akun ${target.nama || target.name} telah dinonaktifkan. Pengguna tidak dapat login sampai diaktifkan kembali.`,
      nextStatus === 'AKTIF' ? 'success' : 'warning'
    );
  };

  const resetUserPassword = (id: string) => {
    adminResetUserPassword(id, 'Pass123!');
  };

  const updateUserSchedule = (
    userId: string,
    schedule: {
      jam_masuk_standar: string;
      jam_pulang_standar: string;
      toleransi_keterlambatan_menit?: number;
    }
  ) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;

    const updatedUsers = users.map((u) =>
      u.id === userId
        ? {
            ...u,
            jam_masuk_standar: schedule.jam_masuk_standar,
            jam_pulang_standar: schedule.jam_pulang_standar,
            toleransi_keterlambatan_menit:
              schedule.toleransi_keterlambatan_menit !== undefined
                ? schedule.toleransi_keterlambatan_menit
                : u.toleransi_keterlambatan_menit ?? 0,
          }
        : u
    );
    setUsers(updatedUsers);

    if (currentUser?.id === userId) {
      setCurrentUser((prev) =>
        prev
          ? {
              ...prev,
              jam_masuk_standar: schedule.jam_masuk_standar,
              jam_pulang_standar: schedule.jam_pulang_standar,
              toleransi_keterlambatan_menit:
                schedule.toleransi_keterlambatan_menit !== undefined
                  ? schedule.toleransi_keterlambatan_menit
                  : prev.toleransi_keterlambatan_menit ?? 0,
            }
          : prev
      );
    }

    const { updated: reconciledAtt, hasChanges } = reconcileAttendanceRecords(attendance, updatedUsers, stores);
    if (hasChanges) {
      setAttendance(reconciledAtt);
    }

    logActivity(
      'Atur Jadwal Shift Pengguna',
      `Jadwal kerja ${target.nama || target.name} diubah: Masuk ${schedule.jam_masuk_standar} WIB, Pulang ${schedule.jam_pulang_standar} WIB`,
      'ABSENSI',
      target.store_id
    );

    showToast(
      'Jadwal Shift Diperbarui',
      `Jadwal kerja untuk ${target.nama || target.name} berhasil disimpan (${schedule.jam_masuk_standar} - ${schedule.jam_pulang_standar} WIB).`,
      'success'
    );
  };

  // Store Management
  const addStore = (storeData: Omit<Store, 'id' | 'created_at' | 'updated_at'>) => {
    const now = new Date().toISOString().split('T')[0];
    const newStore: Store = {
      ...storeData,
      id: `store-${Date.now()}`,
      created_at: now,
      updated_at: now,
    };
    setStores((prev) => [...prev, newStore]);
    logActivity('Tambah Cabang Toko', `Membuka cabang baru: ${newStore.nama_toko} (${newStore.cabang})`, 'STORE');
    showToast('Toko Ditambahkan', `Cabang ${newStore.nama_toko} berhasil terdaftar.`, 'success');
  };

  const updateStore = (id: string, storeData: Partial<Store>) => {
    const now = new Date().toISOString().split('T')[0];
    setStores((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...storeData, updated_at: now } : s))
    );
    const targetStore = stores.find((s) => s.id === id);
    logActivity('Edit Toko', `Memperbarui info cabang toko: ${storeData.nama_toko || targetStore?.nama_toko || 'Cabang'}`, 'STORE', id);
    showToast('Toko Diperbarui', 'Informasi cabang berhasil disimpan.', 'success');
  };

  const updateStoreSchedule = (
    storeId: string,
    schedule: {
      jam_masuk_standar: string;
      jam_pulang_standar: string;
      toleransi_keterlambatan_menit?: number;
    }
  ) => {
    const now = new Date().toISOString().split('T')[0];
    const updatedStores = stores.map((s) =>
      s.id === storeId
        ? {
            ...s,
            jam_masuk_standar: schedule.jam_masuk_standar,
            jam_pulang_standar: schedule.jam_pulang_standar,
            toleransi_keterlambatan_menit:
              schedule.toleransi_keterlambatan_menit !== undefined
                ? schedule.toleransi_keterlambatan_menit
                : s.toleransi_keterlambatan_menit ?? 0,
            updated_at: now,
          }
        : s
    );
    setStores(updatedStores);

    const { updated: reconciledAtt, hasChanges } = reconcileAttendanceRecords(attendance, users, updatedStores);
    if (hasChanges) {
      setAttendance(reconciledAtt);
    }
    const targetStore = stores.find((s) => s.id === storeId);
    logActivity(
      'Ubah Pengaturan Jam Kerja Shift',
      `Menetapkan jam masuk (${schedule.jam_masuk_standar} WIB) dan jam pulang (${schedule.jam_pulang_standar} WIB) untuk ${targetStore?.nama_toko || 'Toko'}`,
      'STORE',
      storeId
    );
    showToast(
      'Jadwal Shift Disimpan',
      `Pengaturan jam kerja ${targetStore?.nama_toko || 'Toko'} berhasil diperbarui.`,
      'success'
    );
  };

  const deleteStore = async (id: string): Promise<{ success: boolean; message: string }> => {
    if (currentUser?.role !== 'SUPER_ADMIN') {
      showToast('Akses Ditolak', 'Hanya Super Admin yang berwenang menghapus cabang toko.', 'error');
      return { success: false, message: 'Hanya Super Admin yang berwenang menghapus cabang toko.' };
    }

    const target = stores.find((s) => s.id === id);
    if (!target) return { success: false, message: 'Cabang toko tidak ditemukan.' };

    // Pengecekan ketat: Apakah masih ada Admin atau Karyawan yang terhubung dengan cabang ini?
    const connectedUsers = users.filter((u) => u.store_id === id);
    if (connectedUsers.length > 0) {
      const userListStr = connectedUsers
        .map((u) => `${u.nama || u.name} (${u.role === 'ADMIN_TOKO' ? 'Admin Toko' : 'Karyawan'})`)
        .join(', ');
      const msg = `Cabang "${target.nama_toko}" tidak dapat dihapus karena masih ada ${connectedUsers.length} akun yang terhubung (${userListStr}). Pindahkan akun ke cabang lain atau putuskan hubungan akun terlebih dahulu.`;
      showToast('Gagal Hapus Cabang', msg, 'error');
      return { success: false, message: msg };
    }

    try {
      const res = await fetch(`/api/stores/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) {
        showToast('Gagal Hapus Toko', data.message || 'Gagal menghapus cabang toko.', 'error');
        return { success: false, message: data.message };
      }
    } catch {
      // Local fallback
    }

    // Cascade delete data yang terkait langsung dengan cabang toko tersebut dari state
    // Catatan: Akun pengguna tidak dihapus karena sudah tidak ada akun yang terhubung (atau sudah dipindahkan ke cabang lain)
    setStores((prev) => prev.filter((s) => s.id !== id));
    setInventory((prev) => prev.filter((i) => i.store_id !== id));
    setTransactions((prev) => prev.filter((t) => t.store_id !== id));
    setReturns((prev) => prev.filter((r) => r.store_id !== id));
    setAttendance((prev) => prev.filter((a) => a.store_id !== id));
    setNotifications((prev) => prev.filter((n) => n.store_id !== id));

    if (activeStoreId === id) {
      setActiveStoreId(null);
      setCurrentPage('DASHBOARD_UTAMA');
    }

    logActivity('Hapus Cabang Permanen', `Menghapus cabang ${target.nama_toko} (${target.cabang}) beserta data inventaris & transaksi terkait secara permanen`, 'STORE');
    showToast('Toko Dihapus Permanen', `Cabang ${target.nama_toko} berhasil dihapus permanen dari sistem dan database.`, 'info');
    return { success: true, message: `Cabang ${target.nama_toko} berhasil dihapus permanen.` };
  };

  const toggleStoreStatus = (id: string, explicitStatus?: 'AKTIF' | 'NONAKTIF') => {
    if (currentUser?.role !== 'SUPER_ADMIN') {
      showToast('Akses Ditolak', 'Hanya Super Admin yang berwenang mengubah status operasional cabang toko.', 'error');
      return;
    }

    const targetStore = stores.find((s) => s.id === id);
    if (!targetStore) return;

    const nextStatus: 'AKTIF' | 'NONAKTIF' = explicitStatus || (targetStore.status === 'AKTIF' ? 'NONAKTIF' : 'AKTIF');
    const updatedStore: Store = { ...targetStore, status: nextStatus, updated_at: new Date().toISOString().split('T')[0] };

    setStores((prev) => prev.map((s) => (s.id === id ? updatedStore : s)));

    fetch('/api/stores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedStore),
    }).catch(() => {});

    logActivity(
      nextStatus === 'AKTIF' ? 'Aktifkan Cabang Toko' : 'Nonaktifkan Cabang Toko',
      `Mengubah status operasional cabang ${targetStore.nama_toko} (${targetStore.cabang}) menjadi ${nextStatus}`,
      'STORE',
      id
    );

    showToast(
      nextStatus === 'AKTIF' ? 'Cabang Toko Diaktifkan' : 'Cabang Toko Dinonaktifkan',
      nextStatus === 'AKTIF'
        ? `Cabang ${targetStore.nama_toko} berhasil diaktifkan. Admin dan Karyawan cabang dapat login kembali.`
        : `Cabang ${targetStore.nama_toko} telah dinonaktifkan. Seluruh data tetap tersimpan aman, staf cabang tidak dapat login hingga diaktifkan kembali.`,
      nextStatus === 'AKTIF' ? 'success' : 'warning'
    );
  };

  // Notifications - Strictly Scoped to Role, User ID, and Store
  const visibleNotifications = useMemo(() => {
    return filterNotificationsForUser(notifications, currentUser, activeStoreId);
  }, [notifications, currentUser, activeStoreId]);

  const hasUnreadNotifications = useMemo(() => {
    if (!currentUser) return false;
    return visibleNotifications.some((n) => !isNotificationReadByUser(n, currentUser.id));
  }, [visibleNotifications, currentUser]);

  const markNotificationAsRead = (id: string) => {
    if (!currentUser) return;
    const isSuperAdmin = currentUser.role === 'SUPER_ADMIN' || currentUser.id === 'user-super';

    setNotifications((prev) => {
      const updated = prev.map((n) => {
        if (n.id === id) {
          const currentReadBy = Array.isArray(n.read_by) ? n.read_by : [];
          const newReadBy = new Set(currentReadBy);
          newReadBy.add(currentUser.id);
          if (isSuperAdmin) newReadBy.add('user-super');

          return {
            ...n,
            read: true,
            read_status: 1,
            read_by: Array.from(newReadBy),
          };
        }
        return n;
      });

      try {
        localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // Send immediate API request so backend & other devices recognize read status right away
    fetch(`/api/notifications/${id}/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, role: currentUser.role }),
    }).catch(() => {});
  };

  const markAllNotificationsAsRead = () => {
    if (!currentUser) return;
    const isSuperAdmin = currentUser.role === 'SUPER_ADMIN' || currentUser.id === 'user-super';
    const visibleIds = new Set(visibleNotifications.map((n) => n.id));
    const visibleIdList = Array.from(visibleIds);

    setNotifications((prev) => {
      const updated = prev.map((n) => {
        if (visibleIds.has(n.id)) {
          const currentReadBy = Array.isArray(n.read_by) ? n.read_by : [];
          const newReadBy = new Set(currentReadBy);
          newReadBy.add(currentUser.id);
          if (isSuperAdmin) newReadBy.add('user-super');

          return {
            ...n,
            read: true,
            read_status: 1,
            read_by: Array.from(newReadBy),
          };
        }
        return n;
      });

      try {
        localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // Send instant API request to backend so subsequent polling from this or any other device sees them as read
    fetch('/api/notifications/mark-all-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.id,
        role: currentUser.role,
        visibleIds: visibleIdList,
      }),
    }).catch(() => {});

    showToast('Notifikasi', 'Semua notifikasi dalam lingkup saat ini telah ditandai dibaca.', 'info');
  };

  // Activity Logs Management & Database Sanitization
  const purgeNonEssentialLogs = () => {
    setActivityLogs((prev) => {
      const sanitized = sanitizeActivityLogs(prev);
      try {
        localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify(sanitized));
      } catch (e) {
        console.warn('Gagal menyimpan sanitasi log ke localStorage:', e);
      }
      return sanitized;
    });
    showToast(
      'Database Log Disesuaikan',
      'Seluruh log aktivitas tidak penting (logout, pilih toko, ganti password wajib, dsb.) telah dibersihkan dari database.',
      'success'
    );
  };

  const deleteActivityLog = async (id: string) => {
    try {
      await fetch(`/api/activity-logs/${id}`, { method: 'DELETE' });
    } catch {}

    setActivityLogs((prev) => {
      const updated = prev.filter((l) => l.id !== id);
      try {
        localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify(updated));
      } catch (e) {
        console.warn('Gagal menyimpan log setelah penghapusan:', e);
      }
      return updated;
    });
    showToast('Log Dihapus', 'Catatan aktivitas berhasil dihapus dari database.', 'info');
  };

  const clearAllActivityLogs = () => {
    setActivityLogs([]);
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify([]));
    } catch (e) {
      console.warn('Gagal mengosongkan log aktivitas di localStorage:', e);
    }
    showToast('Log Dikosongkan', 'Seluruh riwayat catatan log aktivitas telah dibersihkan.', 'info');
  };

  // Database MySQL Operations & Synchronization
  const fetchDataFromMySQL = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/data');
      if (!res.ok) return false;
      const json = await res.json();
      if (json.success && json.data) {
        isRemoteSyncRef.current = true;
        const d = json.data;
        if (Array.isArray(d.stores) && d.stores.length > 0) setStores(d.stores);
        const firstStoreId = (d.stores && d.stores[0]?.id) || (stores.length > 0 ? stores[0].id : null);
        if (Array.isArray(d.users) && d.users.length > 0) {
          setUsers(d.users);
          if (currentUser) {
            if (currentUser.role !== 'SUPER_ADMIN') {
              const liveUser = d.users.find((u: any) => u.id === currentUser.id);
              if (!liveUser) {
                forceLogoutInactiveUser('DELETED');
                return true;
              }
              if (liveUser.status === 'NONAKTIF') {
                forceLogoutInactiveUser('NONAKTIF');
                return true;
              }
              setCurrentUser((prev) => {
                if (!prev) return null;
                if (
                  liveUser.email !== prev.email ||
                  liveUser.nama !== prev.nama ||
                  liveUser.name !== prev.name ||
                  liveUser.position !== prev.position ||
                  liveUser.status_peran_kerja !== prev.status_peran_kerja ||
                  liveUser.avatar !== prev.avatar ||
                  liveUser.foto_profil !== prev.foto_profil ||
                  liveUser.nomor_telepon !== prev.nomor_telepon
                ) {
                  const updated = { ...prev, ...liveUser };
                  try {
                    sessionStorage.setItem('iphone_pos_session_user_v1', JSON.stringify(updated));
                  } catch {}
                  return updated;
                }
                return prev;
              });
            } else {
              const liveSuper = d.users.find((u: any) => u.id === currentUser.id || u.role === 'SUPER_ADMIN');
              if (liveSuper) {
                setCurrentUser((prev) => {
                  if (!prev) return null;
                  if (liveSuper.email !== prev.email || liveSuper.nama !== prev.nama || liveSuper.avatar !== prev.avatar) {
                    const updated = { ...prev, ...liveSuper };
                    try {
                      sessionStorage.setItem('iphone_pos_session_user_v1', JSON.stringify(updated));
                    } catch {}
                    return updated;
                  }
                  return prev;
                });
              }
            }
          }
        }
        if (Array.isArray(d.categories)) {
          setCategories(d.categories.map((c: any) => ({
            ...c,
            store_id: c.store_id || firstStoreId,
          })));
        }
        if (Array.isArray(d.iphoneSeries)) {
          setIphoneSeries(d.iphoneSeries.map((s: any) => ({
            ...s,
            store_id: s.store_id || firstStoreId,
          })));
        }
        if (Array.isArray(d.inventory)) setInventory(d.inventory);
        if (Array.isArray(d.transactions)) setTransactions(d.transactions);
        if (Array.isArray(d.returns)) setReturns(d.returns);
        if (Array.isArray(d.attendance)) setAttendance(d.attendance);
        if (Array.isArray(d.activityLogs)) {
          setActivityLogs(sanitizeActivityLogs(d.activityLogs));
          try {
            localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify(sanitizeActivityLogs(d.activityLogs)));
          } catch {}
        }
        if (Array.isArray(d.notifications)) {
          const normalized = d.notifications.map((n: any) => normalizeNotification(n, currentUser?.id));
          setNotifications(sanitizeNotifications(normalized));
          try {
            localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(sanitizeNotifications(normalized)));
          } catch {}
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const syncDataToMySQL = async (): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch('/api/sync-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Sinkronisasi Berhasil', 'Seluruh data berhasil disimpan ke database MySQL.', 'success');
        const stRes = await fetch('/api/db/status');
        const stJson = await stRes.json();
        if (stJson.success && stJson.status) setDbStatus(stJson.status);
        return { success: true, message: 'Data berhasil disinkronkan ke MySQL.' };
      } else {
        showToast('Gagal Sinkronisasi', json.message || 'Gagal menyimpan ke MySQL.', 'error');
        return { success: false, message: json.message };
      }
    } catch (err: any) {
      showToast('Koneksi Gagal', 'Tidak dapat menghubungi server MySQL. Pastikan MySQL di XAMPP aktif.', 'error');
      return { success: false, message: err?.message || 'Koneksi gagal' };
    }
  };

  const testDbConnection = async (): Promise<{ success: boolean; message: string; status?: DbStatusInfo }> => {
    setIsCheckingDb(true);
    try {
      const res = await fetch('/api/db/test', { method: 'POST' });
      const json = await res.json();
      if (json.status) {
        setDbStatus(json.status);
      }
      if (json.success) {
        showToast('MySQL Terhubung', json.message, 'success');
        await fetchDataFromMySQL();
      } else {
        showToast('MySQL Belum Terhubung', json.message, 'warning');
      }
      return json;
    } catch (err: any) {
      const errorMsg = err?.message || 'Gagal menguji koneksi MySQL.';
      showToast('Error Koneksi', errorMsg, 'error');
      return { success: false, message: errorMsg };
    } finally {
      setIsCheckingDb(false);
    }
  };

  // Reset Master Data to Baseline
  const resetAllDataToDefault = () => {
    try {
      Object.values(STORAGE_KEYS).forEach((k) => {
        localStorage.removeItem(k);
      });
    } catch (e) {
      console.warn('Error clearing localStorage keys:', e);
    }
    setStores(INITIAL_STORES);
    setCategories(INITIAL_CATEGORIES);
    setIphoneSeries(INITIAL_IPHONE_SERIES);
    setUsers(INITIAL_USERS);
    setInventory(INITIAL_INVENTORY);
    setTransactions(INITIAL_TRANSACTIONS);
    setReturns(INITIAL_RETURNS);
    setAttendance(INITIAL_ATTENDANCE);
    setActivityLogs(sanitizeActivityLogs(INITIAL_ACTIVITY_LOGS));
    setNotifications(INITIAL_NOTIFICATIONS);
    setCurrentUser(null);
    setActiveStoreId(null);
    try {
      sessionStorage.removeItem('iphone_pos_session_user_v1');
      sessionStorage.removeItem('iphone_pos_session_store_id_v1');
    } catch {}
    setCurrentPage('DASHBOARD_TOKO');
    showToast(
      'Master Data Direset',
      'Seluruh master data inventaris, absensi, transaksi, dan notifikasi telah dikembalikan ke data awal sistem.',
      'success'
    );
  };

  // Refresh & synchronize data
  const simulateRandomActivity = () => {
    fetchDataFromMySQL();
    showToast('Sinkronisasi', 'Data sistem telah disinkronkan.', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        activeStoreId,
        activeStore,
        currentPage,
        sidebarOpen,
        setSidebarOpen,
        isFirstLoginModalOpen,
        setIsFirstLoginModalOpen,
        stores,
        categories,
        iphoneSeries,
        users,
        inventory,
        transactions,
        returns,
        attendance,
        activityLogs,
        notifications: visibleNotifications,
        allNotifications: notifications,
        addNotification,
        toasts,
        login,
        logout,
        selectStore,
        navigateTo,
        updateUserProfile,
        completeFirstTimePasswordChange,
        requestPasswordReset,
        validateResetOtp,
        resetPasswordWithToken,
        adminResetUserPassword,
        linkUserEmail,
        unlinkUserEmail,
        sendEmailOtp,
        verifyEmailOtp,
        validateOtpOnly,
        changeVerifiedEmail,
        changePassword,
        addInventoryItem,
        updateInventoryItem,
        deleteInventoryItem,
        adjustStock,
        addIphoneSeries,
        updateIphoneSeries,
        deleteIphoneSeries,
        addCategory,
        updateCategory,
        deleteCategory,
        recordStockIn,
        recordStockOut,
        recordDamagedItem,
        createReturn,
        createReturnRequest,
        processReturn,
        checkInAttendance,
        checkOutAttendance,
        recordCheckIn,
        recordCheckOut,
        resetTodayAttendance,
        deleteAttendanceRecord,
        recordManualAttendance,
        addUser,
        updateUser,
        updateUserSchedule,
        deleteUser,
        toggleUserStatus,
        resetUserPassword,
        addStore,
        updateStore,
        updateStoreSchedule,
        deleteStore,
        toggleStoreStatus,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        hasUnreadNotifications,
        purgeNonEssentialLogs,
        deleteActivityLog,
        clearAllActivityLogs,
        dbStatus,
        isCheckingDb,
        testDbConnection,
        syncDataToMySQL,
        refreshDataFromMySQL: fetchDataFromMySQL,
        resetAllDataToDefault,
        simulateRandomActivity,
        showToast,
        removeToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
