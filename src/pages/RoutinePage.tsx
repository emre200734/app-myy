import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import LinearProgress from '@mui/material/LinearProgress';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { useTheme, alpha } from '@mui/material/styles';
import { motion } from 'framer-motion';
import type { AppState, Habit, TimeOfDay } from '../types';
import { isHabitActiveToday } from '../hooks/useAppState';
import { getTodayString } from '../storage';

const TIME_GROUPS: { label: TimeOfDay | 'Anytime'; emoji: string }[] = [
  { label: 'Morning', emoji: '🌅' },
  { label: 'Afternoon', emoji: '☀️' },
  { label: 'Evening', emoji: '🌙' },
  { label: 'Anytime', emoji: '⏰' },
];

interface Props {
  state: AppState;
  onToggle: (id: string) => void;
}

export default function RoutinePage({ state, onToggle }: Props) {
  const theme = useTheme();
  const [tab, setTab] = useState(0);
  const today = getTodayString();
  const todayCompletions = state.completions.filter(c => c.date === today);
  const todayHabits = state.habits.filter(isHabitActiveToday);

  function getGroupHabits(time: string) {
    return todayHabits.filter(h => h.timeOfDay === time);
  }

  function getGroupProgress(habits: Habit[]) {
    if (habits.length === 0) return 0;
    const done = habits.filter(h => todayCompletions.some(c => c.habitId === h.id)).length;
    return Math.round((done / habits.length) * 100);
  }

  const totalDone = todayHabits.filter(h => todayCompletions.some(c => c.habitId === h.id)).length;
  const totalPct = todayHabits.length > 0 ? Math.round((totalDone / todayHabits.length) * 100) : 0;

  const activeGroup = TIME_GROUPS[tab];
  const groupHabits = getGroupHabits(activeGroup.label);

  return (
    <Box sx={{ pb: 10 }}>
      {/* Header */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, #4F46E5 100%)`,
          pt: 5, pb: 4, px: 2.5,
          borderRadius: '0 0 28px 28px',
          mb: 2,
        }}
      >
        <Typography variant="h5" sx={{ color: 'white', fontWeight: 800 }}>Daily Routine</Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mt: 0.5 }}>
          {totalDone} / {todayHabits.length} completed
        </Typography>
        <LinearProgress
          variant="determinate"
          value={totalPct}
          sx={{
            mt: 1.5,
            bgcolor: 'rgba(255,255,255,0.2)',
            borderRadius: 4,
            height: 6,
            '& .MuiLinearProgress-bar': { bgcolor: 'white', borderRadius: 4 },
          }}
        />
      </Box>

      <Box sx={{ px: 2 }}>
        {/* Category progress summary */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
          {Object.entries(
            todayHabits.reduce<Record<string, { total: number; done: number; color: string }>>((acc, h) => {
              if (!acc[h.category]) acc[h.category] = { total: 0, done: 0, color: h.color };
              acc[h.category].total++;
              if (todayCompletions.some(c => c.habitId === h.id)) acc[h.category].done++;
              return acc;
            }, {})
          ).map(([cat, { total, done, color }]) => (
            <Box key={cat} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, width: 70, flexShrink: 0 }}>{cat}</Typography>
              <LinearProgress
                variant="determinate"
                value={Math.round((done / total) * 100)}
                sx={{
                  flex: 1, height: 8,
                  bgcolor: alpha(color, 0.15),
                  '& .MuiLinearProgress-bar': { bgcolor: color },
                }}
              />
              <Typography variant="caption" sx={{ color: 'text.secondary', width: 36, textAlign: 'right', flexShrink: 0 }}>
                {done}/{total}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Time group tabs */}
        <Tabs
          value={tab}
          onChange={(_e, v) => setTab(v)}
          variant="fullWidth"
          sx={{
            mb: 2,
            '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', minHeight: 44 },
            '& .MuiTabs-indicator': { height: 3, borderRadius: 2 },
          }}
        >
          {TIME_GROUPS.map((g, i) => (
            <Tab key={g.label} label={`${g.emoji} ${g.label}`} value={i} sx={{ fontSize: '0.72rem' }} />
          ))}
        </Tabs>

        {/* Habit checklist */}
        {groupHabits.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Typography sx={{ fontSize: '2.5rem' }}>{activeGroup.emoji}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                No {activeGroup.label.toLowerCase()} habits scheduled
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {/* Group progress */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {groupHabits.filter(h => todayCompletions.some(c => c.habitId === h.id)).length} of {groupHabits.length} done
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
                {getGroupProgress(groupHabits)}%
              </Typography>
            </Box>
            {groupHabits.map(habit => {
              const done = todayCompletions.some(c => c.habitId === habit.id);
              const completion = todayCompletions.find(c => c.habitId === habit.id);
              const streak = state.streaks[habit.id];
              return (
                <motion.div key={habit.id} whileTap={{ scale: 0.97 }} onClick={() => onToggle(habit.id)}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      border: `2px solid ${done ? habit.color : 'transparent'}`,
                      bgcolor: done ? alpha(habit.color, 0.07) : 'background.paper',
                      transition: 'all 0.2s',
                    }}
                  >
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, display: 'flex', alignItems: 'center', gap: 2 }}>
                      <motion.div animate={{ scale: done ? [1, 1.3, 1] : 1 }} transition={{ duration: 0.3 }}>
                        <Avatar sx={{ bgcolor: alpha(habit.color, 0.15), width: 48, height: 48, fontSize: '1.5rem' }}>
                          {habit.icon}
                        </Avatar>
                      </motion.div>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 700, mb: 0.5, textDecoration: done ? 'line-through' : 'none', color: done ? 'text.secondary' : 'text.primary' }}>
                          {habit.name}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Chip label={habit.category} size="small" sx={{ bgcolor: alpha(habit.color, 0.12), color: habit.color, fontWeight: 600, fontSize: '0.65rem', height: 20 }} />
                          {streak && streak.currentStreak > 0 && (
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              🔥 {streak.currentStreak} day streak
                            </Typography>
                          )}
                          {done && completion && (
                            <Typography variant="caption" sx={{ color: 'success.main' }}>
                              ✓ {new Date(completion.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      <motion.div
                        animate={{ scale: done ? [1, 1.2, 1] : 1, rotate: done ? [0, 360] : 0 }}
                        transition={{ duration: 0.4 }}
                      >
                        <Box
                          sx={{
                            width: 32, height: 32, borderRadius: '50%',
                            bgcolor: done ? habit.color : 'transparent',
                            border: `3px solid ${done ? habit.color : theme.palette.divider}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.2s',
                          }}
                        >
                          {done && <Typography sx={{ color: 'white', fontSize: '0.9rem', lineHeight: 1 }}>✓</Typography>}
                        </Box>
                      </motion.div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </Box>
        )}
      </Box>
    </Box>
  );
}
