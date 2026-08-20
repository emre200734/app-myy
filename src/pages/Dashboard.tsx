import { useState, useMemo, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import LinearProgress from '@mui/material/LinearProgress';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useTheme, alpha } from '@mui/material/styles';
import { motion } from 'framer-motion';
import type { AppState } from '../types';
import { isHabitActiveToday } from '../hooks/useAppState';
import { getTodayString } from '../storage';
import {
  getDailyIslamicQuote, getRandomQuote, PRAYER_EMOJIS,
  fetchPrayerTimes, fetchHijriDate, getNextPrayer, formatTimeDisplay,
  formatCountdown,
} from '../islamicData';
import type { PrayerTimes, HijriDate } from '../types';
import CelebrationOverlay from '../components/CelebrationOverlay';

interface LevelInfo { level: number; name: string; emoji: string; nextXP: number; progress: number }

interface Props {
  state: AppState;
  levelInfo: LevelInfo;
  onToggle: (id: string) => void;
  showSnack: (msg: string, sev?: 'success' | 'info') => void;
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5) return { text: 'Assalamu Alaikum', emoji: '🌙' };
  if (h < 12) return { text: 'Assalamu Alaikum', emoji: '🌅' };
  if (h < 17) return { text: 'Assalamu Alaikum', emoji: '☀️' };
  return { text: 'Assalamu Alaikum', emoji: '🌆' };
}

export default function Dashboard({ state, levelInfo, onToggle }: Props) {
  const theme = useTheme();
  const [celebrationKey, setCelebrationKey] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [quote, setQuote] = useState(() => getDailyIslamicQuote());
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [hijri, setHijri] = useState<HijriDate | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [refreshKey] = useState(0);

  const today = getTodayString();
  const greeting = getGreeting();

  // Fetch prayer times and hijri date
  useEffect(() => {
    if (!state.profile.islamicEnabled) return;
    let cancelled = false;

    async function fetchData() {
      const lat = state.profile.latitude ?? 24.8607; // default Karachi
      const lng = state.profile.longitude ?? 67.0019;
      const times = await fetchPrayerTimes(lat, lng, state.profile.prayerMethod, state.profile.madhab);
      if (!cancelled && times) setPrayerTimes(times);

      const h = await fetchHijriDate();
      if (!cancelled && h) setHijri(h);
    }
    fetchData();
    return () => { cancelled = true; };
  }, [state.profile.islamicEnabled, state.profile.latitude, state.profile.longitude, state.profile.prayerMethod, state.profile.madhab, refreshKey]);

  // Countdown timer
  useEffect(() => {
    if (!prayerTimes) return;
    const update = () => {
      const next = getNextPrayer(prayerTimes);
      setCountdown(next ? next.inMinutes : null);
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [prayerTimes]);

  const todayHabits = useMemo(() => state.habits.filter(isHabitActiveToday), [state.habits, state.completions]);
  const todayCompletions = useMemo(() => state.completions.filter(c => c.date === today), [state.completions, today]);
  const completedToday = todayHabits.filter(h => todayCompletions.some(c => c.habitId === h.id));
  const completionPct = todayHabits.length > 0 ? Math.round((completedToday.length / todayHabits.length) * 100) : 0;
  const maxStreak = Math.max(0, ...Object.values(state.streaks).map(s => s.currentStreak));

  const todayPrayers = state.prayerRecords.filter(r => r.date === today);
  const prayedCount = todayPrayers.length;
  const nextPrayer = prayerTimes ? getNextPrayer(prayerTimes) : null;

  const todayZikr = state.zikrSessions.filter(s => s.date === today);
  const zikrTotal = todayZikr.reduce((sum, s) => sum + s.count, 0);
  const zikrGoal = 500;

  function handleToggle(id: string) {
    onToggle(id);
    const habit = state.habits.find(h => h.id === id);
    if (!habit) return;
    const alreadyDone = todayCompletions.some(c => c.habitId === id);
    if (!alreadyDone) {
      const remaining = todayHabits.filter(h => !todayCompletions.some(c => c.habitId === h.id));
      if (remaining.length === 1 && remaining[0].id === id) {
        setCelebrationKey(k => k + 1);
        setShowCelebration(true);
      }
    }
  }

  function refreshQuote() {
    setQuote(getRandomQuote());
  }

  const hijriDisplay = hijri
    ? `${hijri.day} ${hijri.month.en} ${hijri.year} AH`
    : 'Loading...';

  return (
    <Box sx={{ pb: 10 }}>
      <CelebrationOverlay key={celebrationKey} show={showCelebration} onDone={() => setShowCelebration(false)} />

      {/* Header gradient */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, #4F46E5 100%)`,
          pt: 5, pb: 6, px: 2.5,
          borderRadius: '0 0 32px 32px',
          mb: -4,
        }}
      >
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)', mb: 0.5 }}>
            {greeting.emoji} {greeting.text}
          </Typography>
          <Typography variant="h5" sx={{ color: 'white', fontWeight: 800 }}>
            {state.profile.name}!
          </Typography>
          {state.profile.showHijriDate && (
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', display: 'block' }}>
              📅 {hijriDisplay}
            </Typography>
          )}
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Typography>
        </motion.div>
      </Box>

      <Box sx={{ px: 2, pt: 6 }}>
        <motion.div variants={container} initial="hidden" animate="show">

          {/* Level / XP bar */}
          <motion.div variants={item}>
            <Card sx={{ mb: 2 }}>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Typography sx={{ fontSize: '1.8rem' }}>{levelInfo.emoji}</Typography>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>Level {levelInfo.level} - {levelInfo.name}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>{state.profile.xp} XP · {state.profile.coins} coins</Typography>
                  </Box>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={levelInfo.progress}
                  sx={{
                    '& .MuiLinearProgress-bar': {
                      background: `linear-gradient(90deg, ${theme.palette.primary.main}, #F59E0B)`,
                    },
                  }}
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Next Prayer card */}
          {state.profile.islamicEnabled && nextPrayer && (
            <motion.div variants={item}>
              <Card sx={{ mb: 2, background: `linear-gradient(135deg, ${alpha('#10B981', 0.12)}, ${alpha('#F59E0B', 0.08)})`, border: `1px solid ${alpha('#10B981', 0.2)}` }}>
                <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography sx={{ fontSize: '2.5rem' }}>{PRAYER_EMOJIS[nextPrayer.name]}</Typography>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" sx={{ color: '#10B981', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                      Next Prayer
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{nextPrayer.name}</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {formatTimeDisplay(nextPrayer.time)} · in {formatCountdown(countdown ?? nextPrayer.inMinutes)}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Daily Ayah / Quote */}
          {state.profile.islamicEnabled && (
            <motion.div variants={item}>
              <Card sx={{ mb: 2, background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha('#4F46E5', 0.06)})` }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="caption" sx={{ color: theme.palette.primary.main, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                      📖 {quote.category}
                    </Typography>
                    <IconButton size="small" onClick={refreshQuote}>
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  {quote.arabic && (
                    <Typography sx={{ fontFamily: 'serif', fontSize: '1.3rem', textAlign: 'right', direction: 'rtl', mb: 1, color: 'text.primary', lineHeight: 1.8 }}>
                      {quote.arabic}
                    </Typography>
                  )}
                  <Typography variant="body1" sx={{ fontStyle: 'italic', lineHeight: 1.6 }}>
                    "{quote.text}"
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                    — {quote.source}
                  </Typography>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Daily summary: Namaz, Zikr, Habits */}
          {state.profile.islamicEnabled && (
            <motion.div variants={item}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5, mb: 2 }}>
                <Card sx={{ textAlign: 'center' }}>
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography sx={{ fontSize: '1.3rem' }}>🕌</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#10B981' }}>{prayedCount}/5</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Namaz</Typography>
                  </CardContent>
                </Card>
                <Card sx={{ textAlign: 'center' }}>
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography sx={{ fontSize: '1.3rem' }}>📿</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#F59E0B' }}>{zikrTotal}/{zikrGoal}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Zikr</Typography>
                  </CardContent>
                </Card>
                <Card sx={{ textAlign: 'center' }}>
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography sx={{ fontSize: '1.3rem' }}>✅</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: theme.palette.primary.main }}>{completedToday.length}/{todayHabits.length}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Habits</Typography>
                  </CardContent>
                </Card>
              </Box>
            </motion.div>
          )}

          {/* Today's progress card */}
          <motion.div variants={item}>
            <Card sx={{ mb: 2 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>Today's Progress</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: theme.palette.primary.main }}>{completionPct}%</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={completionPct}
                  sx={{ mb: 1.5, '& .MuiLinearProgress-bar': { background: `linear-gradient(90deg, ${theme.palette.primary.main}, #4F46E5)` } }}
                />
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {completedToday.length} of {todayHabits.length} habits completed
                </Typography>
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick stats */}
          <motion.div variants={item}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5, mb: 2 }}>
              {[
                { label: 'Streak', value: `${maxStreak}🔥`, sub: 'days' },
                { label: 'Habits', value: state.habits.length.toString(), sub: 'total' },
                { label: 'Done', value: completedToday.length.toString(), sub: 'today' },
              ].map(stat => (
                <Card key={stat.label} sx={{ textAlign: 'center' }}>
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: theme.palette.primary.main }}>{stat.value}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>{stat.label}</Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </motion.div>

          {/* Today's habits list */}
          <motion.div variants={item}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>Today's Habits</Typography>
            {todayHabits.length === 0 && (
              <Card><CardContent><Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>No habits scheduled today. Add some!</Typography></CardContent></Card>
            )}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {todayHabits.map(habit => {
                const done = todayCompletions.some(c => c.habitId === habit.id);
                const completion = todayCompletions.find(c => c.habitId === habit.id);
                return (
                  <motion.div key={habit.id} whileTap={{ scale: 0.97 }} onClick={() => handleToggle(habit.id)}>
                    <Card sx={{ cursor: 'pointer', border: done ? `2px solid ${habit.color}` : '2px solid transparent', bgcolor: done ? alpha(habit.color, 0.07) : 'background.paper', transition: 'all 0.2s ease' }}>
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: alpha(habit.color, 0.15), width: 44, height: 44, fontSize: '1.4rem' }}>{habit.icon}</Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body1" sx={{ fontWeight: 600, textDecoration: done ? 'line-through' : 'none', color: done ? 'text.secondary' : 'text.primary' }}>{habit.name}</Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {done && completion ? `Done at ${new Date(completion.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : habit.timeOfDay}
                          </Typography>
                        </Box>
                        <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: done ? habit.color : 'transparent', border: `2.5px solid ${done ? habit.color : theme.palette.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                          {done && <Typography sx={{ color: 'white', fontSize: '0.8rem', lineHeight: 1 }}>✓</Typography>}
                        </Box>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </Box>
          </motion.div>

          {/* Badges preview */}
          {state.badges.length > 0 && (
            <motion.div variants={item}>
              <Card sx={{ mt: 2 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>🏅 Recent Badges</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {state.badges.slice(-4).map(b => (
                      <Chip key={b} label={b} sx={{ fontWeight: 600 }} />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          )}

        </motion.div>
      </Box>
    </Box>
  );
}
