import type { PrayerName, PrayerTimes, HijriDate } from './types';

// ============ PRAYER CALCULATION METHODS ============
export const PRAYER_METHODS = [
  { id: 1, name: 'University of Islamic Sciences, Karachi' },
  { id: 2, name: 'Islamic Society of North America (ISNA)' },
  { id: 3, name: 'Muslim World League (MWL)' },
  { id: 4, name: 'Umm Al-Qura University, Makkah' },
  { id: 5, name: 'Egyptian General Authority of Survey' },
  { id: 8, name: 'Gulf Region' },
  { id: 9, name: 'Kuwait' },
  { id: 10, name: 'Qatar' },
  { id: 12, name: 'Union des Organisations Islamiques de France' },
  { id: 13, name: 'Diyanet (Turkey)' },
];

export const MADHABS = ['Hanafi', 'Shafi', 'Maliki', 'Hanbali'] as const;

export const PRAYER_NAMES: PrayerName[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

export const PRAYER_EMOJIS: Record<PrayerName, string> = {
  Fajr: '🌅',
  Dhuhr: '☀️',
  Asr: '🌤️',
  Maghrib: '🌆',
  Isha: '🌙',
};

// ============ PRAYER TIMES API ============
const TIMINGS_CACHE_KEY = 'doneflow_timings_cache';
const HIJRI_CACHE_KEY = 'doneflow_hijri_cache';

export async function fetchPrayerTimes(
  lat: number,
  lng: number,
  method: number,
  madhab: string,
  date?: Date,
): Promise<PrayerTimes | null> {
  const d = date || new Date();
  const dateStr = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
  const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)},${method},${madhab},${dateStr}`;
  const cache = getCache(TIMINGS_CACHE_KEY);
  if (cache[cacheKey]) return cache[cacheKey] as PrayerTimes;

  try {
    const school = madhab === 'Hanafi' ? 1 : 0;
    const url = `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${lat}&longitude=${lng}&method=${method}&school=${school}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const timings = json.data.timings;
    const times: PrayerTimes = {
      Fajr: timings.Fajr,
      Sunrise: timings.Sunrise,
      Dhuhr: timings.Dhuhr,
      Asr: timings.Asr,
      Sunset: timings.Sunset,
      Maghrib: timings.Maghrib,
      Isha: timings.Isha,
      Imsak: timings.Imsak,
      Midnight: timings.Midnight,
    };
    setCache(TIMINGS_CACHE_KEY, cacheKey, times);
    return times;
  } catch {
    return null;
  }
}

export async function fetchHijriDate(date?: Date): Promise<HijriDate | null> {
  const d = date || new Date();
  const dateStr = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
  const cacheKey = dateStr;
  const cache = getCache(HIJRI_CACHE_KEY);
  if (cache[cacheKey]) return cache[cacheKey] as HijriDate;

  try {
    const url = `https://api.aladhan.com/v1/gToH/${dateStr}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const h = json.data.hijri;
    const hijri: HijriDate = {
      day: h.day,
      month: { number: h.month.number, en: h.month.en, ar: h.month.ar },
      year: h.year,
      weekday: { en: h.weekday.en },
    };
    setCache(HIJRI_CACHE_KEY, cacheKey, hijri);
    return hijri;
  } catch {
    return null;
  }
}

function getCache(key: string): Record<string, unknown> {
  try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; }
}
function setCache(key: string, entry: string, value: unknown): void {
  const cache = getCache(key);
  cache[entry] = value;
  try { localStorage.setItem(key, JSON.stringify(cache)); } catch { /* quota */ }
}

// ============ NEXT PRAYER CALCULATION ============
export function getNextPrayer(times: PrayerTimes): { name: PrayerName; time: string; inMinutes: number } | null {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const prayers: { name: PrayerName; time: string }[] = [
    { name: 'Fajr', time: times.Fajr },
    { name: 'Dhuhr', time: times.Dhuhr },
    { name: 'Asr', time: times.Asr },
    { name: 'Maghrib', time: times.Maghrib },
    { name: 'Isha', time: times.Isha },
  ];
  for (const p of prayers) {
    const mins = parseTimeToMinutes(p.time);
    if (mins > nowMinutes) {
      return { name: p.name, time: p.time, inMinutes: mins - nowMinutes };
    }
  }
  // Next is tomorrow's Fajr
  return { name: 'Fajr', time: times.Fajr, inMinutes: 1440 - nowMinutes + parseTimeToMinutes(times.Fajr) };
}

export function getCurrentPrayer(times: PrayerTimes): PrayerName | null {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const prayers: { name: PrayerName; time: string }[] = [
    { name: 'Fajr', time: times.Fajr },
    { name: 'Dhuhr', time: times.Dhuhr },
    { name: 'Asr', time: times.Asr },
    { name: 'Maghrib', time: times.Maghrib },
    { name: 'Isha', time: times.Isha },
  ];
  let current: PrayerName | null = null;
  for (const p of prayers) {
    const mins = parseTimeToMinutes(p.time);
    if (mins <= nowMinutes) current = p.name;
  }
  return current;
}

function parseTimeToMinutes(time: string): number {
  const clean = time.replace(/\s.*(AM|PM)/i, '').trim();
  const [h, m] = clean.split(':').map(Number);
  return h * 60 + m;
}

export function formatTimeDisplay(time: string): string {
  const clean = time.replace(/\s.*(AM|PM)/i, '').trim();
  const [h, m] = clean.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export function formatCountdown(minutes: number): string {
  if (minutes < 0) minutes = 0;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ============ QURAN VERSES ============
export interface IslamicQuote {
  text: string;
  source: string;
  category: string;
  arabic?: string;
}

export const QURAN_VERSES: IslamicQuote[] = [
  { text: 'Indeed, with hardship comes ease.', source: 'Quran 94:6', category: 'Patience & Sabr', arabic: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا' },
  { text: 'And whoever puts their trust in Allah, He is sufficient for them.', source: 'Quran 65:3', category: 'Tawakkul', arabic: 'وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ' },
  { text: 'So remember Me; I will remember you. And be grateful to Me and do not deny Me.', source: 'Quran 2:152', category: 'Gratitude & Shukr', arabic: 'فَاذْكُرُونِي أَذْكُرْكُمْ' },
  { text: 'Indeed, Allah does not burden a soul beyond that it can bear.', source: 'Quran 2:286', category: 'Patience & Sabr', arabic: 'لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا' },
  { text: 'And seek help through patience and prayer. It is indeed difficult except for the humble.', source: 'Quran 2:45', category: 'Namaz Importance', arabic: 'وَاسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ' },
  { text: 'Verily, in the remembrance of Allah do hearts find rest.', source: 'Quran 13:28', category: 'Zikr', arabic: 'أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ' },
  { text: 'And establish prayer for My remembrance.', source: 'Quran 20:14', category: 'Namaz Importance', arabic: 'وَأَقِمِ الصَّلَاةَ لِذِكْرِي' },
  { text: 'Whoever does righteousness, whether male or female, while being a believer - We will surely cause them to live a good life.', source: 'Quran 16:97', category: 'Success & Duniya', arabic: 'مَنْ عَمِلَ صَالِحًا مِّن ذَكَرٍ أَوْ أُنثَىٰ' },
  { text: 'And your Lord has decreed that you not worship except Him, and to parents, good treatment.', source: 'Quran 17:23', category: 'Family & Relations', arabic: 'وَقَضَىٰ رَبُّكَ أَلَّا تَعْبُدُوا إِلَّا إِيَّاهُ' },
  { text: 'The competition in worldly increase diverts you.', source: 'Quran 102:1', category: 'Akhirah Reminders', arabic: 'أَلْهَاكُمُ التَّكَاثُرُ' },
  { text: 'Every soul will taste death. And We test you with evil and with good as trial.', source: 'Quran 21:35', category: 'Akhirah Reminders', arabic: 'كُلُّ نَفْسٍ ذَائِقَةُ الْمَوْتِ' },
  { text: 'And be patient, for indeed, Allah does not allow the reward of those who do good to be lost.', source: 'Quran 11:115', category: 'Patience & Sabr', arabic: 'وَاصْبِرْ فَإِنَّ اللَّهَ لَا يُضِيعُ أَجْرَ الْمُحْسِنِينَ' },
];

// ============ HADITH (Sahih) ============
export const HADITHS: IslamicQuote[] = [
  { text: 'The best among you are those who have the best manners and character.', source: 'Sahih Bukhari', category: 'Character' },
  { text: 'Whoever prays Fajr is under the protection of Allah.', source: 'Sahih Muslim', category: 'Namaz Importance' },
  { text: 'The strong believer is better and more beloved to Allah than the weak believer.', source: 'Sahih Muslim', category: 'Success & Duniya' },
  { text: 'Actions are judged by intentions, and every person will have what they intended.', source: 'Sahih Bukhari', category: 'Intention' },
  { text: 'The most beloved of people to Allah are those who are most beneficial to people.', source: 'Sahih Bukhari', category: 'Character' },
  { text: 'Whoever does not abandon false speech and evil deeds, Allah has no need of his leaving food and drink.', source: 'Sahih Bukhari', category: 'Ramadan' },
  { text: 'The believer does not allow a day to pass without giving charity.', source: 'Sahih Bukhari', category: 'Charity' },
  { text: 'There are two blessings which many people lose: health and free time.', source: 'Sahih Bukhari', category: 'Gratitude & Shukr' },
  { text: 'Whoever follows a path seeking knowledge, Allah will make easy for him a path to Paradise.', source: 'Sahih Muslim', category: 'Knowledge' },
  { text: 'The one who looks after a widow and a poor person is like a mujahid in the cause of Allah.', source: 'Sahih Bukhari', category: 'Charity' },
  { text: 'None of you truly believes until he loves for his brother what he loves for himself.', source: 'Sahih Bukhari', category: 'Character' },
  { text: 'The world is the prison of the believer and the paradise of the disbeliever.', source: 'Sahih Muslim', category: 'Akhirah Reminders' },
];

// ============ ISLAMIC WISDOM / SAHABA SAYINGS ============
export const ISLAMIC_WISDOM: IslamicQuote[] = [
  { text: 'The greatest of blessings after Iman is health and free time.', source: 'Umar ibn al-Khattab (RA)', category: 'Gratitude & Shukr' },
  { text: 'Take account of yourselves before you are taken to account.', source: 'Umar ibn al-Khattab (RA)', category: 'Akhirah Reminders' },
  { text: 'Knowledge is not in knowing many things, but knowledge is in acting upon what you know.', source: 'Ali ibn Abi Talib (RA)', category: 'Knowledge' },
  { text: 'Patience is of two types: patience at the time of calamity, and patience in avoiding sin.', source: 'Ali ibn Abi Talib (RA)', category: 'Patience & Sabr' },
  { text: 'The one who is content with what Allah has given him is the richest of people.', source: 'Ali ibn Abi Talib (RA)', category: 'Gratitude & Shukr' },
  { text: 'This world is a place of action; the Hereafter is a place of recompense.', source: 'Hasan al-Basri', category: 'Akhirah Reminders' },
];

export function getDailyIslamicQuote(): IslamicQuote {
  const all = [...QURAN_VERSES, ...HADITHS, ...ISLAMIC_WISDOM];
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return all[dayOfYear % all.length];
}

export function getRandomQuote(): IslamicQuote {
  const all = [...QURAN_VERSES, ...HADITHS, ...ISLAMIC_WISDOM];
  return all[Math.floor(Math.random() * all.length)];
}

// ============ ZIKR PRESETS ============
export interface ZikrPreset {
  name: string;
  arabic: string;
  target: number;
  emoji: string;
}

export const ZIKR_PRESETS: ZikrPreset[] = [
  { name: 'SubhanAllah', arabic: 'سُبْحَانَ اللَّه', target: 33, emoji: '📿' },
  { name: 'Alhamdulillah', arabic: 'الْحَمْدُ لِلَّه', target: 33, emoji: '📿' },
  { name: 'Allahu Akbar', arabic: 'اللَّهُ أَكْبَر', target: 34, emoji: '📿' },
  { name: 'La ilaha illallah', arabic: 'لَا إِلَهَ إِلَّا اللَّه', target: 100, emoji: '📿' },
  { name: 'Astaghfirullah', arabic: 'أَسْتَغْفِرُ اللَّه', target: 100, emoji: '📿' },
  { name: 'Durood Sharif', arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّد', target: 100, emoji: '📿' },
  { name: 'SubhanAllahi wa bihamdihi', arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِه', target: 100, emoji: '📿' },
  { name: 'La hawla wa la quwwata illa billah', arabic: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّه', target: 100, emoji: '📿' },
];

// ============ DUAS ============
export interface Dua {
  id: string;
  name: string;
  arabic: string;
  transliteration: string;
  translation: string;
  category: string;
}

export const COMMON_DUAS: Dua[] = [
  {
    id: 'morning_adhkar',
    name: 'Morning Adhkar',
    arabic: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ',
    transliteration: 'Asbahna wa asbahal-mulku lillah',
    translation: 'We have reached the morning and the dominion belongs to Allah.',
    category: 'Morning',
  },
  {
    id: 'evening_adhkar',
    name: 'Evening Adhkar',
    arabic: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ',
    transliteration: 'Amsayna wa amsal-mulku lillah',
    translation: 'We have reached the evening and the dominion belongs to Allah.',
    category: 'Evening',
  },
  {
    id: 'before_sleep',
    name: 'Before Sleep',
    arabic: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
    transliteration: 'Bismika Allahumma amutu wa ahya',
    translation: 'In Your name O Allah, I die and I live.',
    category: 'Sleep',
  },
  {
    id: 'after_waking',
    name: 'After Waking',
    arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ',
    transliteration: 'Alhamdu lillahil-ladhi ahyana ba\'da ma amatana wa ilayhin-nushur',
    translation: 'Praise be to Allah who gave us life after taking it, and to Him is the resurrection.',
    category: 'Sleep',
  },
  {
    id: 'before_eating',
    name: 'Before Eating',
    arabic: 'بِسْمِ اللَّهِ وَعَلَى بَرَكَةِ اللَّهِ',
    transliteration: 'Bismillahi wa ala barakatillah',
    translation: 'In the name of Allah and with the blessings of Allah.',
    category: 'Food',
  },
  {
    id: 'after_eating',
    name: 'After Eating',
    arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَذَا وَرَزَقَنِيهِ',
    transliteration: 'Alhamdu lillahil-ladhi at\'amani hadha wa razaqanihi',
    translation: 'Praise be to Allah who fed me this and provided it for me.',
    category: 'Food',
  },
  {
    id: 'entering_home',
    name: 'Entering Home',
    arabic: 'بِسْمِ اللَّهِ وَلَجْنَا',
    transliteration: 'Bismillahi walajna',
    translation: 'In the name of Allah we enter.',
    category: 'Home',
  },
  {
    id: 'leaving_home',
    name: 'Leaving Home',
    arabic: 'بِسْمِ اللَّهِ تَوَكَّلْتُ عَلَى اللَّهِ',
    transliteration: 'Bismillahi tawakkaltu alallah',
    translation: 'In the name of Allah, I put my trust in Allah.',
    category: 'Home',
  },
  {
    id: 'travel',
    name: 'Travel Dua',
    arabic: 'سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا',
    transliteration: 'Subhanal-ladhi sakhkhara lana hadha',
    translation: 'Glory to Him who has subjected this to us.',
    category: 'Travel',
  },
];

// ============ ISLAMIC MONTHS ============
export const HIJRI_MONTHS_EN = [
  'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani',
  'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', 'Sha\'ban',
  'Ramadan', 'Shawwal', 'Dhu al-Qi\'dah', 'Dhu al-Hijjah',
];

export const SPECIAL_ISLAMIC_DAYS: Record<string, string> = {
  'Jumu\'ah': 'Jumu\'ah Mubarak 🕌',
  'Ramadan': 'Ramadan Mubarak 🌙',
  'Shawwal-1': 'Eid ul-Fitr 🎉',
  'Dhu al-Hijjah-10': 'Eid ul-Adha 🐑',
  'Muharram-10': 'Day of Ashura',
  'Rajab-27': 'Shab-e-Miraj',
  'Sha\'ban-15': 'Shab-e-Barat',
};

export function isRamadan(hijriMonthNumber: number): boolean {
  return hijriMonthNumber === 9;
}

export function isFriday(): boolean {
  return new Date().getDay() === 5;
}

// ============ ISLAMIC BADGES ============
export const ISLAMIC_BADGES = [
  { id: 'namaz_5_5', label: '5/5 Namaz Daily', emoji: '⭐', condition: 'Complete all 5 prayers in one day' },
  { id: 'namaz_7_day', label: 'Muttaqi (7 Days)', emoji: '🌟', condition: '7 consecutive days of all 5 prayers' },
  { id: 'namaz_30_day', label: 'Momin (30 Days)', emoji: '🕌', condition: '30 consecutive days of all 5 prayers' },
  { id: 'namaz_100_day', label: 'Sabir (100 Days)', emoji: '🏆', condition: '100 consecutive days of all 5 prayers' },
  { id: 'quran_complete', label: 'Quran Complete', emoji: '📖', condition: 'Read the entire Quran' },
  { id: 'ramadan_30', label: '30 Fasts', emoji: '🌙', condition: 'Complete 30 fasts in Ramadan' },
  { id: 'zikr_1000', label: '1000 Zikr', emoji: '📿', condition: 'Complete 1000 zikr counts' },
  { id: 'kahf_reader', label: 'Kahf Reader', emoji: '📚', condition: 'Read Surah Kahf on Friday' },
];

// ============ LEVELS ============
export const LEVELS = [
  { level: 1, name: 'Beginner', emoji: '🌱', xp: 0 },
  { level: 2, name: 'Focused', emoji: '🎯', xp: 100 },
  { level: 3, name: 'Consistent', emoji: '💪', xp: 200 },
  { level: 4, name: 'Warrior', emoji: '⚔️', xp: 300 },
  { level: 5, name: 'Legend', emoji: '🏆', xp: 400 },
  { level: 6, name: 'Master', emoji: '🌟', xp: 500 },
  { level: 7, name: 'Unstoppable', emoji: '🔥', xp: 600 },
];

export function getLevelFromXP(xp: number): { level: number; name: string; emoji: string; nextXP: number; progress: number } {
  let current = LEVELS[0];
  for (const l of LEVELS) {
    if (xp >= l.xp) current = l;
  }
  const next = LEVELS.find(l => l.xp > current.xp);
  const nextXP = next ? next.xp : current.xp;
  const progress = next ? Math.round(((xp - current.xp) / (next.xp - current.xp)) * 100) : 100;
  return { level: current.level, name: current.name, emoji: current.emoji, nextXP, progress };
}

// ============ UNLOCKABLE THEMES ============
export const UNLOCKABLE_THEMES = [
  { id: 'purple', name: 'Purple (Default)', cost: 0, primary: '#7C3AED', secondary: '#4F46E5' },
  { id: 'ocean', name: 'Ocean Blue', cost: 50, primary: '#0284C7', secondary: '#0369A1' },
  { id: 'sunset', name: 'Sunset Orange', cost: 75, primary: '#EA580C', secondary: '#C2410C' },
  { id: 'midnight', name: 'Dark Midnight', cost: 100, primary: '#6366F1', secondary: '#4F46E5', dark: true },
  { id: 'rose', name: 'Rose Pink', cost: 120, primary: '#E11D48', secondary: '#BE123C' },
  { id: 'forest', name: 'Forest Green', cost: 150, primary: '#16A34A', secondary: '#15803D' },
  { id: 'emerald', name: 'Islamic Emerald', cost: 200, primary: '#10B981', secondary: '#F59E0B' },
];

// ============ PRE-BUILT CHALLENGES ============
export const PREBUILT_CHALLENGES = [
  { name: '30 Day Fitness', emoji: '🏋️', duration: 30, description: 'Build a consistent fitness routine' },
  { name: '21 Day Discipline', emoji: '🧘', duration: 21, description: 'Master your daily discipline' },
  { name: '100 Day Productivity', emoji: '💻', duration: 100, description: '100 days of maximum productivity' },
  { name: '7 Day Beginner', emoji: '⭐', duration: 7, description: 'Start your habit journey' },
];
