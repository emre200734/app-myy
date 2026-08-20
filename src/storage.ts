import type { AppState, Habit, HabitCompletion, StreakData, UserProfile, CustomCategory } from './types';

const STORAGE_KEY = 'doneflow_state';

const SAMPLE_HABITS: Habit[] = [
  { id: 'h1', name: 'Drink 8 glasses of water', category: 'Health', icon: '💧', frequency: 'Daily', timeOfDay: 'Morning', createdAt: new Date(Date.now() - 7 * 86400000).toISOString(), color: '#0ea5e9', order: 0 },
  { id: 'h2', name: 'Read for 30 minutes', category: 'Study', icon: '📚', frequency: 'Daily', timeOfDay: 'Evening', createdAt: new Date(Date.now() - 7 * 86400000).toISOString(), color: '#f59e0b', order: 1 },
  { id: 'h3', name: 'Morning walk / exercise', category: 'Fitness', icon: '🏃', frequency: 'Daily', timeOfDay: 'Morning', createdAt: new Date(Date.now() - 7 * 86400000).toISOString(), color: '#22c55e', order: 2 },
  { id: 'h4', name: 'Meditation 10 minutes', category: 'Personal', icon: '🧘', frequency: 'Daily', timeOfDay: 'Morning', createdAt: new Date(Date.now() - 7 * 86400000).toISOString(), color: '#a855f7', order: 3 },
  { id: 'h5', name: 'Work on my project', category: 'Work', icon: '💻', frequency: 'Weekdays', timeOfDay: 'Afternoon', createdAt: new Date(Date.now() - 7 * 86400000).toISOString(), color: '#6366f1', order: 4 },
];

function generateSampleCompletions(habits: Habit[]): HabitCompletion[] {
  const completions: HabitCompletion[] = [];
  const today = new Date();
  for (let daysAgo = 6; daysAgo >= 1; daysAgo--) {
    const date = new Date(today);
    date.setDate(today.getDate() - daysAgo);
    const dateStr = date.toISOString().split('T')[0];
    habits.forEach((h, idx) => {
      if (Math.random() > 0.3 || idx < 3) {
        completions.push({ habitId: h.id, date: dateStr, completedAt: new Date(date.setHours(9 + idx)).toISOString() });
      }
    });
  }
  return completions;
}

function computeStreaks(habits: Habit[], completions: HabitCompletion[]): Record<string, StreakData> {
  const streaks: Record<string, StreakData> = {};
  const today = new Date().toISOString().split('T')[0];

  habits.forEach(habit => {
    const habitCompletions = completions
      .filter(c => c.habitId === habit.id)
      .map(c => c.date)
      .sort();

    let current = 0;
    let longest = 0;
    let lastDate = '';

    if (habitCompletions.length > 0) {
      lastDate = habitCompletions[habitCompletions.length - 1];
      current = 1;
      longest = 1;

      for (let i = habitCompletions.length - 2; i >= 0; i--) {
        const diff = daysDiff(habitCompletions[i], habitCompletions[i + 1]);
        if (diff === 1) {
          current++;
          longest = Math.max(longest, current);
        } else {
          break;
        }
      }

      if (daysDiff(lastDate, today) > 1) current = 0;
    }

    streaks[habit.id] = {
      habitId: habit.id,
      currentStreak: current,
      longestStreak: longest,
      lastCompletedDate: lastDate,
      freezeUsedThisWeek: false,
      freezeWeek: getISOWeek(new Date()),
    };
  });

  return streaks;
}

function daysDiff(d1: string, d2: string): number {
  return Math.round((new Date(d2).getTime() - new Date(d1).getTime()) / 86400000);
}

function getISOWeek(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return `${d.getFullYear()}-W${String(1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)).padStart(2, '0')}`;
}

const DEFAULT_PROFILE: UserProfile = {
  name: 'Friend',
  avatar: '😊',
  darkMode: false,
  themeColor: '#7C3AED',
  notifications: true,
  xp: 0,
  coins: 0,
  unlockedThemes: ['purple'],
  language: 'en',
  islamicEnabled: true,
  prayerMethod: 2,
  madhab: 'Hanafi',
  adhanNotifications: false,
  showHijriDate: true,
  islamicQuoteFrequency: 'medium',
};

const DEFAULT_CATEGORIES: CustomCategory[] = [
  { id: 'cat_health', name: 'Health', color: '#0ea5e9', icon: '💧' },
  { id: 'cat_work', name: 'Work', color: '#6366f1', icon: '💻' },
  { id: 'cat_personal', name: 'Personal', color: '#a855f7', icon: '🧘' },
  { id: 'cat_study', name: 'Study', color: '#f59e0b', icon: '📚' },
  { id: 'cat_fitness', name: 'Fitness', color: '#22c55e', icon: '🏃' },
];

function migrateState(raw: Partial<AppState>): AppState {
  // Migrate V1 profile to V2+V3
  const profile = { ...DEFAULT_PROFILE, ...raw.profile };
  if (!profile.unlockedThemes) profile.unlockedThemes = ['purple'];
  if (profile.xp === undefined) profile.xp = 0;
  if (profile.coins === undefined) profile.coins = 0;
  if (profile.language === undefined) profile.language = 'en';
  if (profile.islamicEnabled === undefined) profile.islamicEnabled = true;
  if (profile.prayerMethod === undefined) profile.prayerMethod = 2;
  if (profile.madhab === undefined) profile.madhab = 'Hanafi';
  if (profile.adhanNotifications === undefined) profile.adhanNotifications = false;
  if (profile.showHijriDate === undefined) profile.showHijriDate = true;
  if (profile.islamicQuoteFrequency === undefined) profile.islamicQuoteFrequency = 'medium';

  // Ensure habits have order and archived fields
  const habits = (raw.habits || []).map((h, i) => ({
    ...h,
    order: h.order ?? i,
    archived: h.archived ?? false,
  }));

  return {
    habits,
    completions: raw.completions || [],
    streaks: raw.streaks || computeStreaks(habits, raw.completions || []),
    profile,
    badges: raw.badges || [],
    customCategories: raw.customCategories || DEFAULT_CATEGORIES,
    challenges: raw.challenges || [],
    prayerRecords: raw.prayerRecords || [],
    qazaRecords: raw.qazaRecords || [],
    zikrSessions: raw.zikrSessions || [],
    quranReadings: raw.quranReadings || [],
    duaRecitations: raw.duaRecitations || [],
    ramadanDays: raw.ramadanDays || [],
    jumuahRecords: raw.jumuahRecords || [],
    quranGoal: raw.quranGoal ?? 1,
  };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppState>;
      return migrateState(parsed);
    }
  } catch {
    // corrupted
  }

  const sampleCompletions = generateSampleCompletions(SAMPLE_HABITS);
  const initialState: AppState = {
    habits: SAMPLE_HABITS,
    completions: sampleCompletions,
    streaks: computeStreaks(SAMPLE_HABITS, sampleCompletions),
    profile: DEFAULT_PROFILE,
    badges: [],
    customCategories: DEFAULT_CATEGORIES,
    challenges: [],
    prayerRecords: [],
    qazaRecords: [],
    zikrSessions: [],
    quranReadings: [],
    duaRecitations: [],
    ramadanDays: [],
    jumuahRecords: [],
    quranGoal: 1,
  };
  saveState(initialState);
  return initialState;
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

export function getISOWeekExport(date: Date): string {
  return getISOWeek(date);
}

export function recalcStreaks(habits: Habit[], completions: HabitCompletion[]): Record<string, StreakData> {
  return computeStreaks(habits, completions);
}

export function exportData(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

export function importData(json: string): AppState | null {
  try {
    const parsed = JSON.parse(json) as Partial<AppState>;
    return migrateState(parsed);
  } catch {
    return null;
  }
}
