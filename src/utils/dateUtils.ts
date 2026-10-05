// Date calculation and formatting utilities in Indonesian locale
// Fully dynamic and reactive to real-time clock (never hardcoded)

const INDO_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const INDO_MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

const INDO_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const INDO_DAYS_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

/**
 * Format Date object to YYYY-MM-DD string
 */
export function formatDateYMD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD or ISO date string into a Date object safely
 */
export function parseDate(dateInput: Date | string): Date {
  if (dateInput instanceof Date) return dateInput;
  if (!dateInput) return new Date();
  const cleanStr = dateInput.includes(' ') ? dateInput.split(' ')[0] : dateInput;
  const parts = cleanStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  const parsed = new Date(dateInput);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Format date to e.g. "06 September 2026"
 */
export function formatDateIndo(dateInput: Date | string): string {
  const d = parseDate(dateInput);
  const day = String(d.getDate()).padStart(2, '0');
  const month = INDO_MONTHS[d.getMonth()] || '';
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Format date to e.g. "Minggu, 06 September 2026"
 */
export function formatDateWithDayIndo(dateInput: Date | string): string {
  const d = parseDate(dateInput);
  const dayName = INDO_DAYS[d.getDay()];
  const formattedDate = formatDateIndo(d);
  return `${dayName}, ${formattedDate}`;
}

/**
 * Format date to e.g. "06 Sep"
 */
export function formatDateShortIndo(dateInput: Date | string): string {
  const d = parseDate(dateInput);
  const day = String(d.getDate()).padStart(2, '0');
  const month = INDO_MONTHS_SHORT[d.getMonth()] || '';
  return `${day} ${month}`;
}

/**
 * Format to e.g. "September 2026"
 */
export function formatMonthYearIndo(dateInput: Date | string): string {
  const d = parseDate(dateInput);
  const month = INDO_MONTHS[d.getMonth()] || '';
  const year = d.getFullYear();
  return `${month} ${year}`;
}

/**
 * Get full day name in Indonesian (0 = Minggu, 1 = Senin, ...)
 */
export function getDayNameIndo(dayIndex: number): string {
  return INDO_DAYS[dayIndex % 7];
}

/**
 * Get short day name in Indonesian (0 = Min, 1 = Sen, ...)
 */
export function getShortDayNameIndo(dayIndex: number): string {
  return INDO_DAYS_SHORT[dayIndex % 7];
}

/**
 * Compute Today's Dynamic Time Boundaries & Slots
 */
export function getTodayPeriodInfo(refDate: Date = new Date()) {
  const todayStr = formatDateYMD(refDate);
  const formattedToday = formatDateIndo(refDate);

  const slots = [
    { name: '08-10', fullDay: '08:00 - 10:00 WIB', startH: 8, endH: 10, masuk: 0, keluar: 0, rusak: 0 },
    { name: '10-12', fullDay: '10:00 - 12:00 WIB', startH: 10, endH: 12, masuk: 0, keluar: 0, rusak: 0 },
    { name: '12-14', fullDay: '12:00 - 14:00 WIB', startH: 12, endH: 14, masuk: 0, keluar: 0, rusak: 0 },
    { name: '14-16', fullDay: '14:00 - 16:00 WIB', startH: 14, endH: 16, masuk: 0, keluar: 0, rusak: 0 },
    { name: '16-18', fullDay: '16:00 - 18:00 WIB', startH: 16, endH: 18, masuk: 0, keluar: 0, rusak: 0 },
    { name: '18-20', fullDay: '18:00 - 20:00 WIB', startH: 18, endH: 20, masuk: 0, keluar: 0, rusak: 0 },
  ];

  return {
    startDate: todayStr,
    endDate: todayStr,
    title: `Hari Ini (${formattedToday})`,
    chartSub: 'Distribusi mutasi per jam operasional hari ini',
    periodLabel: 'hari ini',
    slots,
  };
}

/**
 * Compute Current Week's Dynamic Boundaries (Monday -> Sunday) & Days
 */
export function getWeekPeriodInfo(refDate: Date = new Date()) {
  const dayOfWeek = refDate.getDay(); // 0 is Sunday, 1 is Monday...
  const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(refDate);
  monday.setDate(refDate.getDate() + distanceToMonday);

  const days: Array<{ name: string; fullDay: string; date: string; masuk: number; keluar: number; rusak: number }> = [];

  for (let i = 0; i < 7; i++) {
    const currentDay = new Date(monday);
    currentDay.setDate(monday.getDate() + i);

    const dStr = formatDateYMD(currentDay);
    const dayName = INDO_DAYS[currentDay.getDay()];
    const dayShort = INDO_DAYS_SHORT[currentDay.getDay()];
    const shortFormatted = formatDateShortIndo(currentDay);

    days.push({
      name: dayShort,
      fullDay: `${dayName}, ${shortFormatted}`,
      date: dStr,
      masuk: 0,
      keluar: 0,
      rusak: 0,
    });
  }

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const startDate = formatDateYMD(monday);
  const endDate = formatDateYMD(sunday);

  const startLabel = formatDateShortIndo(monday);
  const endLabel = formatDateIndo(sunday);

  return {
    startDate,
    endDate,
    title: `Minggu Ini (${startLabel} - ${endLabel})`,
    chartSub: 'Tren mutasi harian selama minggu berjalan (Senin - Minggu)',
    periodLabel: 'minggu ini',
    days,
  };
}

/**
 * Compute Current Month's Dynamic Boundaries & Weekly Buckets
 */
export function getMonthPeriodInfo(refDate: Date = new Date()) {
  const year = refDate.getFullYear();
  const month = refDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0); // Last day of month

  const startDate = formatDateYMD(firstDay);
  const endDate = formatDateYMD(lastDay);

  const monthShort = INDO_MONTHS_SHORT[month];
  const lastDateNum = lastDay.getDate();

  // Dynamically partition the month into week buckets
  const weeks: Array<{ name: string; fullDay: string; startD: string; endD: string; masuk: number; keluar: number; rusak: number }> = [
    {
      name: 'Mg 1',
      fullDay: `Minggu 1 (01 - 07 ${monthShort})`,
      startD: `${year}-${String(month + 1).padStart(2, '0')}-01`,
      endD: `${year}-${String(month + 1).padStart(2, '0')}-07`,
      masuk: 0,
      keluar: 0,
      rusak: 0,
    },
    {
      name: 'Mg 2',
      fullDay: `Minggu 2 (08 - 14 ${monthShort})`,
      startD: `${year}-${String(month + 1).padStart(2, '0')}-08`,
      endD: `${year}-${String(month + 1).padStart(2, '0')}-14`,
      masuk: 0,
      keluar: 0,
      rusak: 0,
    },
    {
      name: 'Mg 3',
      fullDay: `Minggu 3 (15 - 21 ${monthShort})`,
      startD: `${year}-${String(month + 1).padStart(2, '0')}-15`,
      endD: `${year}-${String(month + 1).padStart(2, '0')}-21`,
      masuk: 0,
      keluar: 0,
      rusak: 0,
    },
    {
      name: 'Mg 4',
      fullDay: `Minggu 4 (22 - 28 ${monthShort})`,
      startD: `${year}-${String(month + 1).padStart(2, '0')}-22`,
      endD: `${year}-${String(month + 1).padStart(2, '0')}-28`,
      masuk: 0,
      keluar: 0,
      rusak: 0,
    },
  ];

  if (lastDateNum > 28) {
    weeks.push({
      name: 'Mg 5',
      fullDay: `Minggu 5 (29 - ${lastDateNum} ${monthShort})`,
      startD: `${year}-${String(month + 1).padStart(2, '0')}-29`,
      endD: `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDateNum).padStart(2, '0')}`,
      masuk: 0,
      keluar: 0,
      rusak: 0,
    });
  }

  const monthYearFormatted = formatMonthYearIndo(firstDay);

  return {
    startDate,
    endDate,
    title: `Bulan Ini (${monthYearFormatted})`,
    chartSub: 'Tren mutasi per minggu dalam bulan berjalan',
    periodLabel: 'bulan ini',
    weeks,
  };
}

/**
 * Compute Current Year's Dynamic Boundaries & 12 Month Buckets
 */
export function getYearPeriodInfo(refDate: Date = new Date()) {
  const year = refDate.getFullYear();
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const months: Array<{ name: string; fullDay: string; code: string; masuk: number; keluar: number; rusak: number }> = INDO_MONTHS.map((mName, idx) => {
    const monthCode = `${year}-${String(idx + 1).padStart(2, '0')}`;
    return {
      name: INDO_MONTHS_SHORT[idx],
      fullDay: `${mName} ${year}`,
      code: monthCode,
      masuk: 0,
      keluar: 0,
      rusak: 0,
    };
  });

  return {
    startDate,
    endDate,
    title: `Tahun Ini (${year})`,
    chartSub: `Tren mutasi bulanan sepanjang tahun ${year} (Jan - Des)`,
    periodLabel: 'tahun ini',
    months,
  };
}

/**
 * Compute Custom Period Information
 */
export function getCustomPeriodInfo(customStart: string, customEnd: string) {
  const sDate = customStart ? formatDateIndo(customStart) : 'Awal';
  const eDate = customEnd ? formatDateIndo(customEnd) : 'Akhir';

  return {
    startDate: customStart || '2020-01-01',
    endDate: customEnd || '2099-12-31',
    title: `Periode Kustom (${sDate} s/d ${eDate})`,
    chartSub: `Tren mutasi pada rentang tanggal ${customStart} s/d ${customEnd}`,
    periodLabel: 'periode kustom',
  };
}

/**
 * Helper to parse time string like "08:30", "08:30 WIB", "08:30:00" to minutes from 00:00
 */
export function parseTimeToMinutes(tStr: string): number {
  if (!tStr) return 0;
  const match = tStr.match(/(\d{1,2}):(\d{2})/);
  if (!match) return 0;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

/**
 * Robust Shift Check-In evaluation supporting normal and overnight (cross-midnight) shifts.
 * Handles shifts like 23:30 - 01:00 or 22:00 - 06:00, correctly recognizing check-in at 02:06 as late.
 */
export function evaluateShiftCheckIn(
  jamMasukStr: string,
  jamPulangStr: string,
  toleranceMinutes: number,
  actualTimeStr: string
): { isLate: boolean; lateMinutes: number; scheduledMinutes: number; actualNormalizedMinutes: number } {
  const startMin = parseTimeToMinutes(jamMasukStr);
  const endMin = parseTimeToMinutes(jamPulangStr);
  const actualMin = parseTimeToMinutes(actualTimeStr);
  const scheduledWithTolerance = startMin + (toleranceMinutes || 0);

  // An overnight shift crosses midnight if end time is before or equal to start time,
  // or if shift start is in the late night (>= 20:00)
  const isOvernight = endMin > 0 ? endMin <= startMin : startMin >= 1200;

  let actualNormalized = actualMin;

  if (isOvernight) {
    // If the check-in time is during early morning hours past midnight (00:00 - 12:00 noon),
    // it belongs to the post-midnight portion of the evening shift.
    if (actualMin < startMin && actualMin < 720) {
      actualNormalized = actualMin + 1440;
    }
  } else {
    // For standard daytime shifts: if shift start is late (>= 20:00) and check-in is past midnight (< 12:00)
    if (startMin >= 1200 && actualMin < 720) {
      actualNormalized = actualMin + 1440;
    }
  }

  const isLate = actualNormalized > scheduledWithTolerance;
  const lateMinutes = isLate ? actualNormalized - scheduledWithTolerance : 0;

  return {
    isLate,
    lateMinutes,
    scheduledMinutes: scheduledWithTolerance,
    actualNormalizedMinutes: actualNormalized,
  };
}

/**
 * Robust Shift Check-Out evaluation supporting normal and overnight (cross-midnight) shifts.
 * Determines if current time is still before the scheduled closing time.
 */
export function evaluateShiftCheckOut(
  jamMasukStr: string,
  jamPulangStr: string,
  actualTimeStr: string
): { isBeforeClosing: boolean; scheduledClosingMinutes: number; actualNormalizedMinutes: number } {
  const startMin = parseTimeToMinutes(jamMasukStr);
  const endMin = parseTimeToMinutes(jamPulangStr);
  const actualMin = parseTimeToMinutes(actualTimeStr);

  const isOvernight = endMin > 0 ? endMin <= startMin : false;

  let endNormalized = endMin;
  let actualNormalized = actualMin;

  if (isOvernight) {
    endNormalized = endMin + 1440; // e.g. 01:00 next day = 60 + 1440 = 1500
    if (actualMin < startMin && actualMin < 720) {
      actualNormalized = actualMin + 1440;
    }
  }

  const isBeforeClosing = actualNormalized < endNormalized;
  return {
    isBeforeClosing,
    scheduledClosingMinutes: endNormalized,
    actualNormalizedMinutes: actualNormalized,
  };
}

