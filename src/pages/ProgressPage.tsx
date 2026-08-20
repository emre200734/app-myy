import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Avatar from '@mui/material/Avatar';
import LinearProgress from '@mui/material/LinearProgress';
import { useTheme, alpha } from '@mui/material/styles';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell,
} from 'recharts';
import { motion } from 'framer-motion';
import type { AppState } from '../types';
import { getTodayString } from '../storage';
import { isHabitActiveToday, ALL_BADGES } from '../hooks/useAppState';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getLast7Dates(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });
}

function getLast30Dates(): string[] {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return d.toISOString().split('T')[0];
  });
}

interface Props { state: AppState }

export default function ProgressPage({ state }: Props) {
  const theme = useTheme();
  const today = getTodayString();
  const last7 = getLast7Dates();
  const last30 = getLast30Dates();

  // Weekly heatmap data
  const weekData = last7.map(date => {
    const activeHabits = state.habits.filter(h => {
      const d = new Date(date);
      const dow = d.getDay();
      if (h.frequency === 'Daily') return true;
      if (h.frequency === 'Weekdays') return dow >= 1 && dow <= 5;
      if (h.frequency === 'Weekends') return dow === 0 || dow === 6;
      return false;
    });
    const done = activeHabits.filter(h => state.completions.some(c => c.habitId === h.id && c.date === date)).length;
    const pct = activeHabits.length > 0 ? Math.round((done / activeHabits.length) * 100) : 0;
    const d = new Date(date);
    return { date, label: DAYS[d.getDay()], done, total: activeHabits.length, pct, isToday: date === today };
  });

  // Monthly bar chart
  const monthData = last30.map(date => {
    const d = new Date(date);
    const activeHabits = state.habits.filter(h => {
      const dow = d.getDay();
      if (h.frequency === 'Daily') return true;
      if (h.frequency === 'Weekdays') return dow >= 1 && dow <= 5;
      if (h.frequency === 'Weekends') return dow === 0 || dow === 6;
      return false;
    });
    const done = activeHabits.filter(h => state.completions.some(c => c.habitId === h.id && c.date === date)).length;
    return { date: d.getDate().toString(), done, total: activeHabits.length };
  });

  // Best day of week
  const dayStats = DAYS.map((d, i) => {
    const datesForDay = last30.filter(date => new Date(date).getDay() === i);
    const totals = datesForDay.map(date => {
      const activeHabits = state.habits.filter(h => {
        if (h.frequency === 'Daily') return true;
        if (h.frequency === 'Weekdays') return i >= 1 && i <= 5;
        if (h.frequency === 'Weekends') return i === 0 || i === 6;
        return false;
      });
      const done = activeHabits.filter(h => state.completions.some(c => c.habitId === h.id && c.date === date)).length;
      return activeHabits.length > 0 ? done / activeHabits.length : 0;
    });
    const avg = totals.length > 0 ? totals.reduce((a, b) => a + b, 0) / totals.length : 0;
    return { day: d, avg: Math.round(avg * 100) };
  });
  const bestDay = dayStats.reduce((a, b) => b.avg > a.avg ? b : a, dayStats[0]);

  // Per-habit stats
  const habitStats = state.habits.map(h => {
    const completionDates = state.completions.filter(c => c.habitId === h.id).map(c => c.date);
    const streak = state.streaks[h.id];
    const recentDates = last30.filter(date => {
      const d = new Date(date);
      const dow = d.getDay();
      if (h.frequency === 'Daily') return true;
      if (h.frequency === 'Weekdays') return dow >= 1 && dow <= 5;
      if (h.frequency === 'Weekends') return dow === 0 || dow === 6;
      return false;
    });
    const done = recentDates.filter(d => completionDates.includes(d)).length;
    const pct = recentDates.length > 0 ? Math.round((done / recentDates.length) * 100) : 0;
    return { ...h, pct, done, total: recentDates.length, streak };
  }).sort((a, b) => b.pct - a.pct);

  const totalAllTime = state.completions.length;
  const maxStreak = Math.max(0, ...Object.values(state.streaks).map(s => s.currentStreak));
  const maxLongest = Math.max(0, ...Object.values(state.streaks).map(s => s.longestStreak));

  const todayDone = state.habits.filter(h => isHabitActiveToday(h) && state.completions.some(c => c.habitId === h.id && c.date === today)).length;

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
  const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

  return (
    <Box sx={{ pb: 10 }}>
      <Box
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, #4F46E5 100%)`,
          pt: 5, pb: 4, px: 2.5,
          borderRadius: '0 0 28px 28px',
          mb: 2,
        }}
      >
        <Typography variant="h5" sx={{ color: 'white', fontWeight: 800 }}>Progress</Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mt: 0.5 }}>Your journey at a glance</Typography>
      </Box>

      <Box sx={{ px: 2 }}>
        <motion.div variants={container} initial="hidden" animate="show">

          {/* All-time stats */}
          <motion.div variants={item}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5, mb: 2 }}>
              {[
                { label: 'Total Completed', value: totalAllTime, emoji: '✅' },
                { label: 'Today Done', value: todayDone, emoji: '🌟' },
                { label: 'Best Streak', value: `${maxLongest} days`, emoji: '🏆' },
                { label: 'Current Streak', value: `${maxStreak} days`, emoji: '🔥' },
              ].map(s => (
                <Card key={s.label}>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Typography sx={{ fontSize: '1.8rem', lineHeight: 1, mb: 0.5 }}>{s.emoji}</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: theme.palette.primary.main }}>{s.value}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>{s.label}</Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </motion.div>

          {/* Weekly heatmap */}
          <motion.div variants={item}>
            <Card sx={{ mb: 2 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>📅 Weekly Overview</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                  {weekData.map(d => {
                    const pct = d.pct;
                    const bg = pct === 0
                      ? alpha(theme.palette.divider, 0.5)
                      : pct < 50
                      ? alpha(theme.palette.primary.main, 0.3)
                      : pct < 100
                      ? alpha(theme.palette.primary.main, 0.6)
                      : theme.palette.primary.main;
                    return (
                      <Box key={d.date} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                        <Box
                          sx={{
                            width: '100%', aspectRatio: '1',
                            borderRadius: 2, bgcolor: bg,
                            border: d.isToday ? `2px solid ${theme.palette.primary.main}` : '2px solid transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <Typography variant="caption" sx={{ fontWeight: 700, color: pct > 50 ? 'white' : 'text.primary', fontSize: '0.6rem' }}>
                            {pct}%
                          </Typography>
                        </Box>
                        <Typography variant="caption" sx={{ color: d.isToday ? theme.palette.primary.main : 'text.secondary', fontWeight: d.isToday ? 700 : 400, fontSize: '0.65rem' }}>
                          {d.label}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </CardContent>
            </Card>
          </motion.div>

          {/* Monthly bar chart */}
          <motion.div variants={item}>
            <Card sx={{ mb: 2 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>📊 Last 30 Days</Typography>
                <Box sx={{ height: 160 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthData} barSize={6} margin={{ left: -20, right: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.5)} />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: theme.palette.text.secondary }} interval={4} />
                      <YAxis tick={{ fontSize: 9, fill: theme.palette.text.secondary }} />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, fontSize: 12, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}
                        formatter={(val: number) => [val, 'Completed']}
                      />
                      <Bar dataKey="done" radius={[4, 4, 0, 0]}>
                        {monthData.map((_entry, i) => (
                          <Cell key={i} fill={alpha(theme.palette.primary.main, 0.4 + (i / monthData.length) * 0.6)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </motion.div>

          {/* Best day of week */}
          <motion.div variants={item}>
            <Card sx={{ mb: 2 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>📈 Day of Week Stats</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {dayStats.map(d => (
                    <Box key={d.day} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Typography variant="body2" sx={{ width: 32, fontWeight: d.day === bestDay.day ? 700 : 400, color: d.day === bestDay.day ? theme.palette.primary.main : 'text.primary' }}>
                        {d.day}
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={d.avg}
                        sx={{
                          flex: 1, height: 8,
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          '& .MuiLinearProgress-bar': {
                            bgcolor: d.day === bestDay.day ? theme.palette.primary.main : alpha(theme.palette.primary.main, 0.5),
                          },
                        }}
                      />
                      <Typography variant="caption" sx={{ width: 36, textAlign: 'right', fontWeight: d.day === bestDay.day ? 700 : 400, color: d.day === bestDay.day ? theme.palette.primary.main : 'text.secondary' }}>
                        {d.avg}%
                      </Typography>
                      {d.day === bestDay.day && <Typography sx={{ fontSize: '0.9rem' }}>⭐</Typography>}
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </motion.div>

          {/* Per habit stats */}
          <motion.div variants={item}>
            <Card sx={{ mb: 2 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>📋 Habit Performance (30 days)</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {habitStats.map(h => (
                    <Box key={h.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: alpha(h.color, 0.15), fontSize: '0.9rem' }}>{h.icon}</Avatar>
                        <Typography variant="body2" sx={{ flex: 1, fontWeight: 600 }}>{h.name}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: h.color }}>{h.pct}%</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={h.pct}
                        sx={{
                          bgcolor: alpha(h.color, 0.12),
                          '& .MuiLinearProgress-bar': { bgcolor: h.color },
                        }}
                      />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{h.done} / {h.total} days</Typography>
                        {h.streak && <Typography variant="caption" sx={{ color: 'text.secondary' }}>🔥 {h.streak.currentStreak} streak</Typography>}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </motion.div>

          {/* Badges */}
          <motion.div variants={item}>
            <Card>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>🏅 Badge Collection</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {ALL_BADGES.map(badge => {
                    const earned = state.badges.includes(badge.id);
                    return (
                      <Box
                        key={badge.id}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 2, p: 1.5, borderRadius: 3,
                          bgcolor: earned ? alpha(theme.palette.primary.main, 0.08) : alpha(theme.palette.divider, 0.3),
                          border: earned ? `1.5px solid ${alpha(theme.palette.primary.main, 0.3)}` : '1.5px solid transparent',
                          filter: earned ? 'none' : 'grayscale(1)',
                          opacity: earned ? 1 : 0.5,
                        }}
                      >
                        <Typography sx={{ fontSize: '2rem', lineHeight: 1 }}>{badge.emoji}</Typography>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{badge.label}</Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {earned ? 'Earned!' : `Reach a ${badge.days}-day streak`}
                          </Typography>
                        </Box>
                        {earned && <Typography sx={{ ml: 'auto', fontSize: '1.2rem' }}>✅</Typography>}
                      </Box>
                    );
                  })}
                </Box>
              </CardContent>
            </Card>
          </motion.div>

        </motion.div>
      </Box>
    </Box>
  );
}
