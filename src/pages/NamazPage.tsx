import { useState, useEffect, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import LinearProgress from '@mui/material/LinearProgress';
import TextField from '@mui/material/TextField';
import { useTheme, alpha } from '@mui/material/styles';
import { motion } from 'framer-motion';
import type { AppState, PrayerName, ZikrSession } from '../types';
import { getTodayString } from '../storage';
import {
  PRAYER_NAMES, PRAYER_EMOJIS, fetchPrayerTimes, getNextPrayer, getCurrentPrayer,
  formatTimeDisplay, formatCountdown, ZIKR_PRESETS, COMMON_DUAS, ISLAMIC_BADGES,
  isFriday, isRamadan, PRAYER_METHODS, getRandomQuote, fetchHijriDate,
} from '../islamicData';
import type { PrayerTimes, HijriDate } from '../types';

interface AppActions {
  togglePrayer: (prayer: PrayerName, jamaat?: boolean) => void;
  addQaza: (prayer: PrayerName, date: string) => void;
  makeupQaza: (id: string) => void;
  addZikrSession: (session: ZikrSession) => void;
  addQuranReading: (record: { date: string; pages: number; rukus: number; paras: number; timestamp: string }) => void;
  toggleDuaRecited: (duaId: string) => void;
  toggleRamadanFast: (date: string) => void;
  toggleRamadanTaraweeh: (date: string) => void;
  updateJumuah: (record: { date: string; surahKahf: boolean; ghusl: boolean; earlyToMasjid: boolean; duroodCount: number }) => void;
  setQuranGoal: (pages: number) => void;
}

interface Props {
  state: AppState;
  app: AppActions;
  showSnack: (msg: string, sev?: 'success' | 'info') => void;
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function NamazPage({ state, app, showSnack }: Props) {
  const theme = useTheme();
  const [tab, setTab] = useState(0);
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [hijri, setHijri] = useState<HijriDate | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const today = getTodayString();

  // Tasbih state
  const [zikrType, setZikrType] = useState(ZIKR_PRESETS[0].name);
  const [zikrCount, setZikrCount] = useState(0);
  const [customZikr, setCustomZikr] = useState('');
  const [customTarget, setCustomTarget] = useState(33);

  // Quran state
  const [quranPages, setQuranPages] = useState(1);
  const [quranRukus, setQuranRukus] = useState(0);

  // Jumuah state
  const [duroodCount, setDuroodCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      const lat = state.profile.latitude ?? 24.8607;
      const lng = state.profile.longitude ?? 67.0019;
      const times = await fetchPrayerTimes(lat, lng, state.profile.prayerMethod, state.profile.madhab);
      if (!cancelled && times) setPrayerTimes(times);
      const h = await fetchHijriDate();
      if (!cancelled && h) setHijri(h);
    }
    fetchData();
    return () => { cancelled = true; };
  }, [state.profile.latitude, state.profile.longitude, state.profile.prayerMethod, state.profile.madhab]);

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

  const todayPrayers = state.prayerRecords.filter(r => r.date === today);
  const prayedSet = new Set(todayPrayers.map(r => r.prayer));
  const jamaatSet = new Set(todayPrayers.filter(r => r.jamaat).map(r => r.prayer));
  const nextPrayer = prayerTimes ? getNextPrayer(prayerTimes) : null;
  const currentPrayer = prayerTimes ? getCurrentPrayer(prayerTimes) : null;

  const ramadanActive = hijri ? isRamadan(hijri.month.number) : false;
  const fridayActive = isFriday();

  // Namaz streak
  const namazStreak = useMemo(() => {
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      const dayPrayers = state.prayerRecords.filter(r => r.date === dStr);
      if (dayPrayers.length === 5) streak++;
      else if (i > 0) break;
      else if (i === 0 && dayPrayers.length < 5) continue;
    }
    return streak;
  }, [state.prayerRecords]);

  // Weekly namaz report
  const weeklyReport = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dStr = d.toISOString().split('T')[0];
      const count = state.prayerRecords.filter(r => r.date === dStr).length;
      return { date: dStr, count, label: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()] };
    });
    return days;
  }, [state.prayerRecords]);

  // Missed qaza count
  const missedQaza = state.qazaRecords.filter(q => !q.madeUp).length;

  function handlePrayerToggle(prayer: PrayerName, jamaat: boolean) {
    app.togglePrayer(prayer, jamaat);
    const wasPrayed = prayedSet.has(prayer);
    if (!wasPrayed) {
      showSnack(`${PRAYER_EMOJIS[prayer]} ${prayer} marked as prayed!`);
    }
  }

  function handleZikrTap() {
    const preset = ZIKR_PRESETS.find(z => z.name === zikrType);
    const target = preset ? preset.target : customTarget;
    const newCount = zikrCount + 1;

    if ('vibrate' in navigator) navigator.vibrate(30);

    if (newCount >= target) {
      const session: ZikrSession = {
        id: `z${Date.now()}`,
        date: today,
        zikrType: zikrType === 'Custom' ? customZikr : zikrType,
        count: newCount,
        target,
        completed: true,
        timestamp: new Date().toISOString(),
      };
      app.addZikrSession(session);
      setZikrCount(0);
      showSnack(`📿 ${zikrType} complete! Alhamdulillah! +10 XP`);
    } else {
      setZikrCount(newCount);
    }
  }

  function handleQuranLog() {
    if (quranPages <= 0 && quranRukus <= 0) return;
    app.addQuranReading({
      date: today,
      pages: quranPages,
      rukus: quranRukus,
      paras: quranPages >= 20 ? 1 : 0,
      timestamp: new Date().toISOString(),
    });
    showSnack(`📖 Quran reading logged: ${quranPages} pages`);
    setQuranPages(1);
    setQuranRukus(0);
  }

  function handleDuroodTap() {
    const newCount = duroodCount + 1;
    setDuroodCount(newCount);
    if ('vibrate' in navigator) navigator.vibrate(20);
  }

  function saveJumuah() {
    const existing = state.jumuahRecords.find(r => r.date === today);
    app.updateJumuah({
      date: today,
      surahKahf: existing?.surahKahf ?? false,
      ghusl: existing?.ghusl ?? false,
      earlyToMasjid: existing?.earlyToMasjid ?? false,
      duroodCount,
    });
    showSnack('🕌 Jumu\'ah progress saved!');
  }

  const todayZikrTotal = state.zikrSessions.filter(s => s.date === today).reduce((sum, s) => sum + s.count, 0);
  const totalZikrAllTime = state.zikrSessions.reduce((sum, s) => sum + s.count, 0);
  const totalPagesRead = state.quranReadings.reduce((sum, r) => sum + r.pages, 0);
  const todayQuranPages = state.quranReadings.filter(r => r.date === today).reduce((sum, r) => sum + r.pages, 0);

  const todayRamadan = state.ramadanDays.find(r => r.date === today);
  const fastedCount = state.ramadanDays.filter(r => r.fasted).length;

  const jumuahToday = state.jumuahRecords.find(r => r.date === today);

  return (
    <Box sx={{ pb: 10 }}>
      {/* Header */}
      <Box
        sx={{
          background: `linear-gradient(135deg, #10B981 0%, #0d9488 100%)`,
          pt: 5, pb: 5, px: 2.5,
          borderRadius: '0 0 32px 32px',
          mb: -3,
        }}
      >
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Typography variant="h5" sx={{ color: 'white', fontWeight: 800 }}>🕌 Namaz & Ibadah</Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)', mt: 0.5 }}>
            {prayedSet.size}/5 prayers today · {namazStreak} day streak
          </Typography>
          {nextPrayer && (
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', display: 'block' }}>
              Next: {PRAYER_EMOJIS[nextPrayer.name]} {nextPrayer.name} in {formatCountdown(countdown ?? nextPrayer.inMinutes)}
            </Typography>
          )}
        </motion.div>
      </Box>

      <Box sx={{ px: 2, pt: 5 }}>
        {/* Tab bar */}
        <Tabs value={tab} onChange={(_e, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ mb: 2, '& .MuiTab-root': { minWidth: 72, fontWeight: 600, fontSize: '0.8rem' } }}>
          <Tab label="🕌 Namaz" />
          <Tab label="📿 Tasbih" />
          <Tab label="📖 Quran" />
          <Tab label="🤲 Duas" />
          {ramadanActive && <Tab label="🌙 Ramadan" />}
          {fridayActive && <Tab label="🕌 Jumu'ah" />}
        </Tabs>

        <motion.div variants={container} initial="hidden" animate="show">

          {/* NAMAZ TAB */}
          {tab === 0 && (
            <Box>
              {/* Prayer times card */}
              {prayerTimes && (
                <motion.div variants={item}>
                  <Card sx={{ mb: 2 }}>
                    <CardContent sx={{ p: 2.5 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>⏰ Today's Prayer Times</Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {PRAYER_NAMES.map(p => {
                          const isNext = nextPrayer?.name === p;
                          const isCurrent = currentPrayer === p;
                          return (
                            <Box key={p} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1, borderRadius: 2, bgcolor: isNext ? alpha('#10B981', 0.1) : isCurrent ? alpha('#F59E0B', 0.08) : 'transparent' }}>
                              <Typography sx={{ fontSize: '1.3rem' }}>{PRAYER_EMOJIS[p]}</Typography>
                              <Typography variant="body2" sx={{ flex: 1, fontWeight: 600 }}>{p}</Typography>
                              <Typography variant="body2" sx={{ color: 'text.secondary' }}>{formatTimeDisplay(prayerTimes[p])}</Typography>
                              {isNext && <Chip label="Next" size="small" sx={{ bgcolor: alpha('#10B981', 0.2), color: '#10B981', fontWeight: 700, fontSize: '0.6rem' }} />}
                            </Box>
                          );
                        })}
                      </Box>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
                        Method: {PRAYER_METHODS.find(m => m.id === state.profile.prayerMethod)?.name} · {state.profile.madhab}
                      </Typography>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* 5 prayer toggle cards */}
              <motion.div variants={item}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>Mark Today's Namaz</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {PRAYER_NAMES.map(prayer => {
                    const prayed = prayedSet.has(prayer);
                    const jamaat = jamaatSet.has(prayer);
                    return (
                      <Card key={prayer} sx={{ border: prayed ? `2px solid #10B981` : '2px solid transparent' }}>
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography sx={{ fontSize: '1.8rem' }}>{PRAYER_EMOJIS[prayer]}</Typography>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body1" sx={{ fontWeight: 700 }}>{prayer}</Typography>
                            <Typography variant="caption" sx={{ color: prayed ? '#10B981' : 'text.secondary' }}>
                              {prayed ? (jamaat ? '✅ Prayed (Jamaat)' : '✅ Prayed (Alone)') : 'Not marked yet'}
                            </Typography>
                          </Box>
                          {!prayed ? (
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <Button size="small" variant="outlined" onClick={() => handlePrayerToggle(prayer, false)} sx={{ borderRadius: 2, fontSize: '0.75rem' }}>Alone</Button>
                              <Button size="small" variant="contained" onClick={() => handlePrayerToggle(prayer, true)} sx={{ borderRadius: 2, fontSize: '0.75rem', background: 'linear-gradient(135deg, #10B981, #0d9488)' }}>Jamaat</Button>
                            </Box>
                          ) : (
                            <Button size="small" variant="text" onClick={() => handlePrayerToggle(prayer, jamaat)} sx={{ color: 'error.main', fontSize: '0.75rem' }}>Undo</Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </Box>
              </motion.div>

              {/* Daily badge */}
              {prayedSet.size === 5 && (
                <motion.div variants={item}>
                  <Card sx={{ mt: 2, background: `linear-gradient(135deg, ${alpha('#10B981', 0.15)}, ${alpha('#F59E0B', 0.1)})`, border: `1px solid ${alpha('#10B981', 0.3)}` }}>
                    <CardContent sx={{ textAlign: 'center', p: 2.5 }}>
                      <Typography sx={{ fontSize: '3rem' }}>⭐</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#10B981' }}>5/5 Complete! +50 XP</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>Masha'Allah, all prayers completed today!</Typography>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Weekly report */}
              <motion.div variants={item}>
                <Card sx={{ mt: 2 }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>📊 Weekly Namaz Report</Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 0.5 }}>
                      {weeklyReport.map(d => (
                        <Box key={d.date} sx={{ flex: 1, textAlign: 'center' }}>
                          <Box sx={{ height: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                            <Box sx={{
                              width: '80%',
                              height: `${(d.count / 5) * 100}%`,
                              minHeight: 4,
                              borderRadius: '4px 4px 0 0',
                              background: d.count === 5 ? '#10B981' : d.count > 0 ? alpha('#10B981', 0.5) : alpha(theme.palette.divider, 0.5),
                            }} />
                          </Box>
                          <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>{d.label}</Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700 }}>{d.count}/5</Typography>
                        </Box>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Qaza section */}
              <motion.div variants={item}>
                <Card sx={{ mt: 2 }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Qaza Namaz Tracker</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
                      Missed prayers to make up: <strong>{missedQaza}</strong>
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {PRAYER_NAMES.map(p => (
                        <Button key={p} size="small" variant="outlined" onClick={() => { app.addQaza(p, today); showSnack(`Qaza ${p} added`); }} sx={{ fontSize: '0.75rem' }}>
                          + Qaza {p}
                        </Button>
                      ))}
                    </Box>
                    {missedQaza > 0 && (
                      <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {state.qazaRecords.filter(q => !q.madeUp).slice(0, 5).map((q, i) => (
                          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, borderRadius: 1, bgcolor: alpha(theme.palette.divider, 0.3) }}>
                            <Typography variant="caption" sx={{ flex: 1 }}>{q.prayer} - {q.date}</Typography>
                            <Button size="small" variant="contained" onClick={() => { app.makeupQaza(q.date); showSnack('Qaza made up, Alhamdulillah!'); }} sx={{ fontSize: '0.7rem' }}>Made up</Button>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Islamic badges */}
              <motion.div variants={item}>
                <Card sx={{ mt: 2 }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>🏅 Islamic Badges</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {ISLAMIC_BADGES.map(badge => {
                        const earned = state.badges.includes(badge.id);
                        return (
                          <Box key={badge.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1, borderRadius: 2, bgcolor: earned ? alpha('#10B981', 0.08) : alpha(theme.palette.divider, 0.3), opacity: earned ? 1 : 0.5 }}>
                            <Typography sx={{ fontSize: '1.5rem' }}>{badge.emoji}</Typography>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>{badge.label}</Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>{badge.condition}</Typography>
                            </Box>
                            {earned && <Typography sx={{ ml: 'auto' }}>✅</Typography>}
                          </Box>
                        );
                      })}
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            </Box>
          )}

          {/* TASBIH TAB */}
          {tab === 1 && (
            <Box>
              <motion.div variants={item}>
                <Card sx={{ mb: 2 }}>
                  <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>📿 Digital Tasbih</Typography>
                    {/* Zikr selector */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'center', mb: 2 }}>
                      {ZIKR_PRESETS.map(z => (
                        <Chip key={z.name} label={z.name} size="small" onClick={() => { setZikrType(z.name); setZikrCount(0); }} sx={{ fontWeight: 600, bgcolor: zikrType === z.name ? alpha('#10B981', 0.2) : alpha(theme.palette.divider, 0.3), color: zikrType === z.name ? '#10B981' : 'text.primary', fontSize: '0.7rem' }} />
                      ))}
                    </Box>

                    {/* Arabic display */}
                    {(() => {
                      const preset = ZIKR_PRESETS.find(z => z.name === zikrType);
                      return preset ? (
                        <Typography sx={{ fontFamily: 'serif', fontSize: '1.8rem', direction: 'rtl', mb: 1, color: 'text.primary' }}>{preset.arabic}</Typography>
                      ) : null;
                    })()}

                    {/* Counter */}
                    <Box onClick={handleZikrTap} sx={{ cursor: 'pointer', userSelect: 'none' }}>
                      <motion.div whileTap={{ scale: 0.92 }}>
                        <Box sx={{
                          width: 160, height: 160, mx: 'auto', borderRadius: '50%',
                          background: `linear-gradient(135deg, ${alpha('#10B981', 0.15)}, ${alpha('#F59E0B', 0.1)})`,
                          border: `3px solid ${alpha('#10B981', 0.3)}`,
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Typography variant="h3" sx={{ fontWeight: 800, color: '#10B981' }}>{zikrCount}</Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            / {ZIKR_PRESETS.find(z => z.name === zikrType)?.target ?? customTarget}
                          </Typography>
                        </Box>
                      </motion.div>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>Tap to count</Typography>
                    </Box>

                    <Button size="small" variant="text" onClick={() => setZikrCount(0)} sx={{ mt: 1 }}>Reset</Button>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Custom zikr */}
              <motion.div variants={item}>
                <Card sx={{ mb: 2 }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Custom Zikr</Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      <TextField size="small" label="Zikr name" value={customZikr} onChange={e => setCustomZikr(e.target.value)} sx={{ flex: 1 }} />
                      <TextField size="small" type="number" label="Target" value={customTarget} onChange={e => setCustomTarget(Number(e.target.value))} sx={{ width: 90 }} />
                    </Box>
                    <Button size="small" variant="outlined" fullWidth onClick={() => { if (customZikr) { setZikrType('Custom'); setZikrCount(0); showSnack('Custom zikr set'); } }}>Set Custom Zikr</Button>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Zikr stats */}
              <motion.div variants={item}>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
                  <Card><CardContent sx={{ textAlign: 'center', p: 2 }}>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#10B981' }}>{todayZikrTotal}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Today's Zikr</Typography>
                  </CardContent></Card>
                  <Card><CardContent sx={{ textAlign: 'center', p: 2 }}>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#F59E0B' }}>{totalZikrAllTime}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>All-time Zikr</Typography>
                  </CardContent></Card>
                </Box>
              </motion.div>
            </Box>
          )}

          {/* QURAN TAB */}
          {tab === 2 && (
            <Box>
              <motion.div variants={item}>
                <Card sx={{ mb: 2 }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>📖 Log Today's Quran Reading</Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <TextField size="small" type="number" label="Pages" value={quranPages} onChange={e => setQuranPages(Number(e.target.value))} sx={{ flex: 1 }} inputProps={{ min: 0 }} />
                      <TextField size="small" type="number" label="Rukus" value={quranRukus} onChange={e => setQuranRukus(Number(e.target.value))} sx={{ flex: 1 }} inputProps={{ min: 0 }} />
                    </Box>
                    <Button variant="contained" fullWidth onClick={handleQuranLog} sx={{ background: 'linear-gradient(135deg, #10B981, #0d9488)' }}>Log Reading</Button>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Daily goal */}
              <motion.div variants={item}>
                <Card sx={{ mb: 2 }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Daily Goal: {state.quranGoal} page(s)</Typography>
                    <LinearProgress variant="determinate" value={Math.min(100, (todayQuranPages / state.quranGoal) * 100)} sx={{ mb: 1, '& .MuiLinearProgress-bar': { bgcolor: '#10B981' } }} />
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>{todayQuranPages} / {state.quranGoal} pages today</Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
                      {[1, 2, 5, 10, 20].map(g => (
                        <Chip key={g} label={`${g}p`} size="small" onClick={() => app.setQuranGoal(g)} sx={{ bgcolor: state.quranGoal === g ? alpha('#10B981', 0.2) : alpha(theme.palette.divider, 0.3), fontSize: '0.7rem' }} />
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Quran stats */}
              <motion.div variants={item}>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
                  <Card><CardContent sx={{ textAlign: 'center', p: 2 }}>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#10B981' }}>{totalPagesRead}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Total Pages Read</Typography>
                  </CardContent></Card>
                  <Card><CardContent sx={{ textAlign: 'center', p: 2 }}>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#F59E0B' }}>{Math.round((totalPagesRead / 604) * 100)}%</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Quran Complete</Typography>
                  </CardContent></Card>
                </Box>
              </motion.div>

              {/* Reading streak */}
              <motion.div variants={item}>
                <Card sx={{ mt: 2 }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      🔥 Reading Streak: {(() => {
                        let s = 0;
                        for (let i = 0; i < 365; i++) {
                          const d = new Date(); d.setDate(d.getDate() - i);
                          const dStr = d.toISOString().split('T')[0];
                          if (state.quranReadings.some(r => r.date === dStr && r.pages > 0)) s++;
                          else if (i > 0) break;
                        }
                        return s;
                      })()} days
                    </Typography>
                  </CardContent>
                </Card>
              </motion.div>
            </Box>
          )}

          {/* DUAS TAB */}
          {tab === 3 && (
            <Box>
              <motion.div variants={item}>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, px: 1 }}>
                  Common duas with Arabic, transliteration, and translation. Tap to mark as recited.
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {COMMON_DUAS.map(dua => {
                    const recitedToday = state.duaRecitations.some(d => d.duaId === dua.id && d.date === today);
                    return (
                      <Card key={dua.id} sx={{ border: recitedToday ? `1.5px solid #10B981` : '1.5px solid transparent' }}>
                        <CardContent sx={{ p: 2.5 }} onClick={() => app.toggleDuaRecited(dua.id)}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{dua.name}</Typography>
                            <Chip label={dua.category} size="small" sx={{ fontSize: '0.6rem', height: 20 }} />
                            {recitedToday && <Typography sx={{ fontSize: '0.9rem' }}>✅</Typography>}
                          </Box>
                          <Typography sx={{ fontFamily: 'serif', fontSize: '1.4rem', direction: 'rtl', textAlign: 'right', mb: 1, lineHeight: 1.8 }}>{dua.arabic}</Typography>
                          <Typography variant="caption" sx={{ color: theme.palette.primary.main, display: 'block', mb: 0.5, fontStyle: 'italic' }}>{dua.transliteration}</Typography>
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>"{dua.translation}"</Typography>
                        </CardContent>
                      </Card>
                    );
                  })}
                </Box>
              </motion.div>
            </Box>
          )}

          {/* RAMADAN TAB */}
          {tab === 4 && ramadanActive && (
            <Box>
              <motion.div variants={item}>
                <Card sx={{ mb: 2, background: `linear-gradient(135deg, ${alpha('#10B981', 0.12)}, ${alpha('#0d9488', 0.08)})` }}>
                  <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
                    <Typography sx={{ fontSize: '2.5rem' }}>🌙</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#10B981' }}>Ramadan Mubarak!</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>{fastedCount} / 30 fasts completed</Typography>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={item}>
                <Card sx={{ mb: 2 }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>Today's Fast</Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <Button variant={todayRamadan?.fasted ? 'contained' : 'outlined'} onClick={() => app.toggleRamadanFast(today)} sx={{ flex: 1, background: todayRamadan?.fasted ? 'linear-gradient(135deg, #10B981, #0d9488)' : undefined }}>
                        {todayRamadan?.fasted ? '✅ Fasting' : 'Mark Fasting'}
                      </Button>
                      <Button variant={todayRamadan?.taraweeh ? 'contained' : 'outlined'} onClick={() => app.toggleRamadanTaraweeh(today)} sx={{ flex: 1 }}>
                        {todayRamadan?.taraweeh ? '✅ Taraweeh' : 'Taraweeh'}
                      </Button>
                    </Box>
                    <LinearProgress variant="determinate" value={(fastedCount / 30) * 100} sx={{ '& .MuiLinearProgress-bar': { bgcolor: '#10B981' } }} />
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={item}>
                <Card sx={{ mb: 2 }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>🌙 Laylatul Qadr Reminder</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Seek Laylatul Qadr in the last 10 odd nights of Ramadan (21st, 23rd, 25th, 27th, 29th).
                    </Typography>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={item}>
                <Card>
                  <CardContent sx={{ p: 2.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>✨ Ramadan Wisdom</Typography>
                    <Typography variant="body2" sx={{ fontStyle: 'italic' }}>"{getRandomQuote().text}"</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>— {getRandomQuote().source}</Typography>
                  </CardContent>
                </Card>
              </motion.div>
            </Box>
          )}

          {/* JUMU'AH TAB */}
          {tab === 5 && fridayActive && (
            <Box>
              <motion.div variants={item}>
                <Card sx={{ mb: 2, background: `linear-gradient(135deg, ${alpha('#10B981', 0.12)}, ${alpha('#F59E0B', 0.08)})` }}>
                  <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
                    <Typography sx={{ fontSize: '2.5rem' }}>🕌</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#10B981' }}>Jumu'ah Mubarak!</Typography>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={item}>
                <Card sx={{ mb: 2 }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>Jumu'ah Checklist</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <FormControlLabel control={<Switch checked={jumuahToday?.surahKahf ?? false} onChange={() => app.updateJumuah({ date: today, surahKahf: !(jumuahToday?.surahKahf ?? false), ghusl: jumuahToday?.ghusl ?? false, earlyToMasjid: jumuahToday?.earlyToMasjid ?? false, duroodCount })} />} label="📖 Read Surah Kahf" />
                      <FormControlLabel control={<Switch checked={jumuahToday?.ghusl ?? false} onChange={() => app.updateJumuah({ date: today, surahKahf: jumuahToday?.surahKahf ?? false, ghusl: !(jumuahToday?.ghusl ?? false), earlyToMasjid: jumuahToday?.earlyToMasjid ?? false, duroodCount })} />} label="🚿 Ghusl (ritual bath)" />
                      <FormControlLabel control={<Switch checked={jumuahToday?.earlyToMasjid ?? false} onChange={() => app.updateJumuah({ date: today, surahKahf: jumuahToday?.surahKahf ?? false, ghusl: jumuahToday?.ghusl ?? false, earlyToMasjid: !(jumuahToday?.earlyToMasjid ?? false), duroodCount })} />} label="🕌 Go early to Masjid" />
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={item}>
                <Card sx={{ mb: 2 }}>
                  <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>📿 Durood Counter</Typography>
                    <Box onClick={handleDuroodTap} sx={{ cursor: 'pointer', userSelect: 'none' }}>
                      <motion.div whileTap={{ scale: 0.92 }}>
                        <Box sx={{ width: 120, height: 120, mx: 'auto', borderRadius: '50%', background: `linear-gradient(135deg, ${alpha('#F59E0B', 0.15)}, ${alpha('#10B981', 0.1)})`, border: `3px solid ${alpha('#F59E0B', 0.3)}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Typography variant="h4" sx={{ fontWeight: 800, color: '#F59E0B' }}>{duroodCount}</Typography>
                        </Box>
                      </motion.div>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>Tap to count Durood</Typography>
                    </Box>
                    <Button size="small" variant="text" onClick={() => setDuroodCount(0)} sx={{ mt: 0.5 }}>Reset</Button>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={item}>
                <Button variant="contained" fullWidth onClick={saveJumuah} sx={{ background: 'linear-gradient(135deg, #10B981, #0d9488)' }}>Save Jumu'ah Progress</Button>
              </motion.div>
            </Box>
          )}

        </motion.div>
      </Box>
    </Box>
  );
}
