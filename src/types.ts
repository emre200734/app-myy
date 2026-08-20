// ============ V1 TYPES (kept intact) ============

export type Category = 'Health' | 'Work' | 'Personal' | 'Study' | 'Fitness';
export type Frequency = 'Daily' | 'Weekly' | 'Weekdays' | 'Weekends' | 'Custom';
export type TimeOfDay = 'Morning' | 'Afternoon' | 'Evening' | 'Anytime';

export interface Habit {
  id: string;
  name: string;
  category: string; // now supports custom categories too
  icon: string;
  frequency: Frequency;
  timeOfDay: TimeOfDay;
  reminderTime?: string;
  targetDays?: number;
  createdAt: string;
  color: string;
  notes?: string;
  archived?: boolean;
  customDays?: number[]; // 0-6 for Custom frequency
  order?: number;
}

export interface HabitCompletion {
  habitId: string;
  date: string; // YYYY-MM-DD
  completedAt: string; // ISO timestamp
}

export interface StreakData {
  habitId: string;
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string;
  freezeUsedThisWeek: boolean;
  freezeWeek: string;
}

// ============ V2 TYPES ============

export interface CustomCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface Challenge {
  id: string;
  name: string;
  emoji: string;
  duration: number; // days
  startDate: string;
  habitIds: string[];
  description?: string;
  isCustom?: boolean;
  completed?: boolean;
}

export interface ThemeUnlock {
  id: string;
  name: string;
  cost: number;
  primary: string;
  secondary: string;
  dark?: boolean;
}

export type Language = 'en' | 'ur' | 'ar';

export interface UserProfile {
  name: string;
  avatar: string;
  darkMode: boolean;
  themeColor: string;
  notifications: boolean;
  // V2
  xp: number;
  coins: number;
  unlockedThemes: string[];
  language: Language;
  // V3 Islamic
  islamicEnabled: boolean;
  prayerMethod: number; // aladhan method id
  madhab: 'Hanafi' | 'Shafi' | 'Maliki' | 'Hanbali';
  latitude?: number;
  longitude?: number;
  locationName?: string;
  adhanNotifications: boolean;
  showHijriDate: boolean;
  islamicQuoteFrequency: 'high' | 'medium' | 'low';
}

// ============ V3 ISLAMIC TYPES ============

export type PrayerName = 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha';

export interface PrayerRecord {
  date: string; // YYYY-MM-DD
  prayer: PrayerName;
  prayed: boolean;
  jamaat: boolean;
  timestamp: string;
}

export interface QazaRecord {
  date: string; // YYYY-MM-DD (the missed date)
  prayer: PrayerName;
  madeUp: boolean;
  madeUpDate?: string;
}

export interface ZikrSession {
  id: string;
  date: string;
  zikrType: string;
  count: number;
  target: number;
  completed: boolean;
  timestamp: string;
}

export interface QuranReadingRecord {
  date: string;
  pages: number;
  rukus: number;
  paras: number;
  timestamp: string;
}

export interface DuaRecitation {
  duaId: string;
  date: string;
  recited: boolean;
}

export interface RamadanDay {
  date: string;
  fasted: boolean;
  sehriTime?: string;
  iftarTime?: string;
  taraweeh: boolean;
}

export interface JumuahRecord {
  date: string;
  surahKahf: boolean;
  ghusl: boolean;
  earlyToMasjid: boolean;
  duroodCount: number;
}

export interface PrayerTimes {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Sunset: string;
  Maghrib: string;
  Isha: string;
  Imsak: string;
  Midnight: string;
}

export interface HijriDate {
  day: string;
  month: { number: number; en: string; ar: string };
  year: string;
  weekday: { en: string };
}

// ============ FULL APP STATE ============

export interface AppState {
  // V1
  habits: Habit[];
  completions: HabitCompletion[];
  streaks: Record<string, StreakData>;
  profile: UserProfile;
  badges: string[];
  // V2
  customCategories: CustomCategory[];
  challenges: Challenge[];
  // V3 Islamic
  prayerRecords: PrayerRecord[];
  qazaRecords: QazaRecord[];
  zikrSessions: ZikrSession[];
  quranReadings: QuranReadingRecord[];
  duaRecitations: DuaRecitation[];
  ramadanDays: RamadanDay[];
  jumuahRecords: JumuahRecord[];
  quranGoal: number; // pages per day
}
