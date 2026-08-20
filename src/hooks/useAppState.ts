import { useState, useCallback } from 'react';
import { loadState, saveState, getTodayString, recalcStreaks, getISOWeekExport } from '../storage';
import type { AppState, Habit, HabitCompletion, UserProfile, CustomCategory, Challenge, PrayerName, ZikrSession, QuranReadingRecord, DuaRecitation, RamadanDay, JumuahRecord, PrayerRecord, QazaRecord } from '../types';

const MILESTONE_BADGES = [
  { days: 7, id: '7day', label: '7 Day Streak', emoji: '🌟' },
  { days: 21, id: '21day', label: '21 Day Streak', emoji: '🔥' },
  { days: 30, id: '30day', label: '30 Day Streak', emoji: '💎' },
  { days: 60, id: '60day', label: '60 Day Streak', emoji: '👑' },
  { days: 100, id: '100day', label: '100 Day Streak', emoji: '🏆' },
];

export function useAppState() {
  const [state, setStateRaw] = useState<AppState>(() => loadState());

  const setState = useCallback((updater: (prev: AppState) => AppState) => {
    setStateRaw(prev => {
      const next = updater(prev);
      saveState(next);
      return next;
    });
  }, []);

  // ============ V1 HABIT ACTIONS ============

  const addHabit = useCallback((habit: Habit) => {
    setState(prev => {
      const order = prev.habits.length;
      const habits = [...prev.habits, { ...habit, order }];
      const streaks = recalcStreaks(habits, prev.completions);
      return { ...prev, habits, streaks };
    });
  }, [setState]);

  const updateHabit = useCallback((habit: Habit) => {
    setState(prev => {
      const habits = prev.habits.map(h => h.id === habit.id ? habit : h);
      return { ...prev, habits };
    });
  }, [setState]);

  const deleteHabit = useCallback((id: string) => {
    setState(prev => {
      const habits = prev.habits.filter(h => h.id !== id);
      const completions = prev.completions.filter(c => c.habitId !== id);
      const streaks = { ...prev.streaks };
      delete streaks[id];
      return { ...prev, habits, completions, streaks };
    });
  }, [setState]);

  const duplicateHabit = useCallback((id: string) => {
    setState(prev => {
      const orig = prev.habits.find(h => h.id === id);
      if (!orig) return prev;
      const copy: Habit = {
        ...orig,
        id: `h${Date.now()}`,
        name: `${orig.name} (copy)`,
        createdAt: new Date().toISOString(),
        order: prev.habits.length,
      };
      const habits = [...prev.habits, copy];
      const streaks = recalcStreaks(habits, prev.completions);
      return { ...prev, habits, streaks };
    });
  }, [setState]);

  const archiveHabit = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      habits: prev.habits.map(h => h.id === id ? { ...h, archived: !h.archived } : h),
    }));
  }, [setState]);

  const reorderHabits = useCallback((fromId: string, toId: string) => {
    setState(prev => {
      const habits = [...prev.habits];
      const fromIdx = habits.findIndex(h => h.id === fromId);
      const toIdx = habits.findIndex(h => h.id === toId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [moved] = habits.splice(fromIdx, 1);
      habits.splice(toIdx, 0, moved);
      const reordered = habits.map((h, i) => ({ ...h, order: i }));
      return { ...prev, habits: reordered };
    });
  }, [setState]);

  const toggleCompletion = useCallback((habitId: string): boolean => {
    const today = getTodayString();
    let allDone = false;

    setState(prev => {
      const existing = prev.completions.find(c => c.habitId === habitId && c.date === today);
      let completions: HabitCompletion[];
      let xpDelta = 0;
      let coinsDelta = 0;

      if (existing) {
        completions = prev.completions.filter(c => !(c.habitId === habitId && c.date === today));
        xpDelta = -10;
        coinsDelta = -2;
      } else {
        completions = [...prev.completions, { habitId, date: today, completedAt: new Date().toISOString() }];
        xpDelta = 10;
        coinsDelta = 2;
      }

      const streaks = recalcStreaks(prev.habits, completions);

      const badges = [...prev.badges];
      Object.values(streaks).forEach(s => {
        MILESTONE_BADGES.forEach(m => {
          if (s.currentStreak >= m.days && !badges.includes(m.id)) {
            badges.push(m.id);
          }
        });
      });

      const todayHabits = prev.habits.filter(h => isHabitActiveToday(h) && !h.archived);
      const todayDone = todayHabits.filter(h => completions.some(c => c.habitId === h.id && c.date === today));
      allDone = todayHabits.length > 0 && todayDone.length === todayHabits.length;

      return {
        ...prev,
        completions,
        streaks,
        badges,
        profile: {
          ...prev.profile,
          xp: Math.max(0, prev.profile.xp + xpDelta),
          coins: Math.max(0, prev.profile.coins + coinsDelta),
        },
      };
    });

    return allDone;
  }, [setState]);

  const useStreakFreeze = useCallback((habitId: string) => {
    setState(prev => {
      const streak = prev.streaks[habitId];
      if (!streak) return prev;
      const currentWeek = getISOWeekExport(new Date());
      if (streak.freezeUsedThisWeek && streak.freezeWeek === currentWeek) return prev;
      const streaks = {
        ...prev.streaks,
        [habitId]: { ...streak, freezeUsedThisWeek: true, freezeWeek: currentWeek, currentStreak: streak.currentStreak + 1 },
      };
      return { ...prev, streaks };
    });
  }, [setState]);

  const updateProfile = useCallback((profile: UserProfile) => {
    setState(prev => ({ ...prev, profile }));
  }, [setState]);

  // ============ V2 ACTIONS ============

  const addCategory = useCallback((cat: CustomCategory) => {
    setState(prev => ({ ...prev, customCategories: [...prev.customCategories, cat] }));
  }, [setState]);

  const updateCategory = useCallback((cat: CustomCategory) => {
    setState(prev => ({
      ...prev,
      customCategories: prev.customCategories.map(c => c.id === cat.id ? cat : c),
    }));
  }, [setState]);

  const deleteCategory = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      customCategories: prev.customCategories.filter(c => c.id !== id),
    }));
  }, [setState]);

  const unlockTheme = useCallback((themeId: string, cost: number) => {
    setState(prev => {
      if (prev.profile.coins < cost) return prev;
      return {
        ...prev,
        profile: {
          ...prev.profile,
          coins: prev.profile.coins - cost,
          unlockedThemes: [...prev.profile.unlockedThemes, themeId],
        },
      };
    });
  }, [setState]);

  const addChallenge = useCallback((challenge: Challenge) => {
    setState(prev => ({ ...prev, challenges: [...prev.challenges, challenge] }));
  }, [setState]);

  const deleteChallenge = useCallback((id: string) => {
    setState(prev => ({ ...prev, challenges: prev.challenges.filter(c => c.id !== id) }));
  }, [setState]);

  const exportState = useCallback(() => {
    return JSON.stringify(state, null, 2);
  }, [state]);

  const importState = useCallback((json: string): boolean => {
    try {
      const parsed = JSON.parse(json) as AppState;
      setState(() => parsed);
      return true;
    } catch {
      return false;
    }
  }, [setState]);

  const clearAllData = useCallback(() => {
    setState(prev => {
      const cleared: AppState = {
        ...prev,
        habits: [],
        completions: [],
        streaks: {},
        badges: [],
        challenges: [],
        prayerRecords: [],
        qazaRecords: [],
        zikrSessions: [],
        quranReadings: [],
        duaRecitations: [],
        ramadanDays: [],
        jumuahRecords: [],
        profile: { ...prev.profile, xp: 0, coins: 0 },
      };
      return cleared;
    });
  }, [setState]);

  // ============ V3 ISLAMIC ACTIONS ============

  const togglePrayer = useCallback((prayer: PrayerName, jamaat: boolean = false) => {
    const today = getTodayString();
    setState(prev => {
      const existing = prev.prayerRecords.find(r => r.date === today && r.prayer === prayer);
      let prayerRecords: PrayerRecord[];

      if (existing) {
        prayerRecords = prev.prayerRecords.filter(r => !(r.date === today && r.prayer === prayer));
        return { ...prev, prayerRecords };
      }

      prayerRecords = [...prev.prayerRecords, { date: today, prayer, prayed: true, jamaat, timestamp: new Date().toISOString() }];

      // Check 5/5 daily
      const todayPrayers = prayerRecords.filter(r => r.date === today);
      let xpBonus = 0;
      const badges = [...prev.badges];

      if (todayPrayers.length === 5) {
        xpBonus = 50;
        if (!badges.includes('namaz_5_5')) badges.push('namaz_5_5');

        // Check 7-day streak
        let sevenStreak = true;
        for (let i = 1; i <= 7; i++) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dStr = d.toISOString().split('T')[0];
          const dayPrayers = prev.prayerRecords.filter(r => r.date === dStr);
          if (dayPrayers.length < 5) { sevenStreak = false; break; }
        }
        if (sevenStreak && !badges.includes('namaz_7_day')) badges.push('namaz_7_day');

        // Check 30-day streak
        let thirtyStreak = true;
        for (let i = 1; i <= 30; i++) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dStr = d.toISOString().split('T')[0];
          const dayPrayers = prev.prayerRecords.filter(r => r.date === dStr);
          if (dayPrayers.length < 5) { thirtyStreak = false; break; }
        }
        if (thirtyStreak && !badges.includes('namaz_30_day')) badges.push('namaz_30_day');

        // Check 100-day streak
        let hundredStreak = true;
        for (let i = 1; i <= 100; i++) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dStr = d.toISOString().split('T')[0];
          const dayPrayers = prev.prayerRecords.filter(r => r.date === dStr);
          if (dayPrayers.length < 5) { hundredStreak = false; break; }
        }
        if (hundredStreak && !badges.includes('namaz_100_day')) badges.push('namaz_100_day');
      }

      return {
        ...prev,
        prayerRecords,
        badges,
        profile: {
          ...prev.profile,
          xp: prev.profile.xp + 10 + xpBonus,
          coins: prev.profile.coins + 2,
        },
      };
    });
  }, [setState]);

  const addQaza = useCallback((prayer: PrayerName, date: string) => {
    setState(prev => ({
      ...prev,
      qazaRecords: [...prev.qazaRecords, { date, prayer, madeUp: false } as QazaRecord],
    }));
  }, [setState]);

  const makeupQaza = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      qazaRecords: prev.qazaRecords.map(q =>
        q.date === id ? { ...q, madeUp: true, madeUpDate: getTodayString() } : q
      ),
    }));
  }, [setState]);

  const addZikrSession = useCallback((session: ZikrSession) => {
    setState(prev => {
      const zikrSessions = [...prev.zikrSessions, session];
      const badges = [...prev.badges];
      const totalZikr = zikrSessions.reduce((sum, s) => sum + s.count, 0);
      if (totalZikr >= 1000 && !badges.includes('zikr_1000')) badges.push('zikr_1000');
      return {
        ...prev,
        zikrSessions,
        badges,
        profile: {
          ...prev.profile,
          xp: prev.profile.xp + (session.completed ? 10 : 0),
          coins: prev.profile.coins + (session.completed ? 2 : 0),
        },
      };
    });
  }, [setState]);

  const addQuranReading = useCallback((record: QuranReadingRecord) => {
    setState(prev => {
      const quranReadings = [...prev.quranReadings, record];
      const badges = [...prev.badges];
      const totalPages = quranReadings.reduce((sum, r) => sum + r.pages, 0);
      if (totalPages >= 604 && !badges.includes('quran_complete')) badges.push('quran_complete');
      return {
        ...prev,
        quranReadings,
        badges,
        profile: {
          ...prev.profile,
          xp: prev.profile.xp + 10,
          coins: prev.profile.coins + 2,
        },
      };
    });
  }, [setState]);

  const toggleDuaRecited = useCallback((duaId: string) => {
    const today = getTodayString();
    setState(prev => {
      const existing = prev.duaRecitations.find(d => d.duaId === duaId && d.date === today);
      let duaRecitations: DuaRecitation[];
      if (existing) {
        duaRecitations = prev.duaRecitations.filter(d => !(d.duaId === duaId && d.date === today));
      } else {
        duaRecitations = [...prev.duaRecitations, { duaId, date: today, recited: true }];
      }
      return { ...prev, duaRecitations };
    });
  }, [setState]);

  const toggleRamadanFast = useCallback((date: string) => {
    setState(prev => {
      const existing = prev.ramadanDays.find(r => r.date === date);
      let ramadanDays: RamadanDay[];
      if (existing) {
        ramadanDays = prev.ramadanDays.map(r => r.date === date ? { ...r, fasted: !r.fasted } : r);
      } else {
        ramadanDays = [...prev.ramadanDays, { date, fasted: true, taraweeh: false }];
      }
      const badges = [...prev.badges];
      const fastedCount = ramadanDays.filter(r => r.fasted).length;
      if (fastedCount >= 30 && !badges.includes('ramadan_30')) badges.push('ramadan_30');
      return {
        ...prev,
        ramadanDays,
        badges,
        profile: {
          ...prev.profile,
          xp: prev.profile.xp + (existing ? -10 : 10),
          coins: prev.profile.coins + (existing ? -2 : 2),
        },
      };
    });
  }, [setState]);

  const toggleRamadanTaraweeh = useCallback((date: string) => {
    setState(prev => ({
      ...prev,
      ramadanDays: prev.ramadanDays.map(r =>
        r.date === date ? { ...r, taraweeh: !r.taraweeh } : r
      ),
    }));
  }, [setState]);

  const updateJumuah = useCallback((record: JumuahRecord) => {
    setState(prev => {
      const existing = prev.jumuahRecords.find(r => r.date === record.date);
      let jumuahRecords: JumuahRecord[];
      if (existing) {
        jumuahRecords = prev.jumuahRecords.map(r => r.date === record.date ? record : r);
      } else {
        jumuahRecords = [...prev.jumuahRecords, record];
      }
      const badges = [...prev.badges];
      if (record.surahKahf && !badges.includes('kahf_reader')) badges.push('kahf_reader');
      return {
        ...prev,
        jumuahRecords,
        badges,
        profile: {
          ...prev.profile,
          xp: prev.profile.xp + 10,
          coins: prev.profile.coins + 2,
        },
      };
    });
  }, [setState]);

  const setQuranGoal = useCallback((pages: number) => {
    setState(prev => ({ ...prev, quranGoal: pages }));
  }, [setState]);

  return {
    state,
    addHabit,
    updateHabit,
    deleteHabit,
    duplicateHabit,
    archiveHabit,
    reorderHabits,
    toggleCompletion,
    useStreakFreeze,
    updateProfile,
    addCategory,
    updateCategory,
    deleteCategory,
    unlockTheme,
    addChallenge,
    deleteChallenge,
    exportState,
    importState,
    clearAllData,
    togglePrayer,
    addQaza,
    makeupQaza,
    addZikrSession,
    addQuranReading,
    toggleDuaRecited,
    toggleRamadanFast,
    toggleRamadanTaraweeh,
    updateJumuah,
    setQuranGoal,
  };
}

export function isHabitActiveToday(habit: Habit): boolean {
  const day = new Date().getDay();
  if (habit.archived) return false;
  if (habit.frequency === 'Daily') return true;
  if (habit.frequency === 'Weekdays') return day >= 1 && day <= 5;
  if (habit.frequency === 'Weekends') return day === 0 || day === 6;
  if (habit.frequency === 'Weekly') {
    const created = new Date(habit.createdAt);
    return new Date().getDay() === created.getDay();
  }
  if (habit.frequency === 'Custom' && habit.customDays) {
    return habit.customDays.includes(day);
  }
  return true;
}

export const ALL_BADGES = MILESTONE_BADGES;
