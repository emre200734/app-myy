import { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import Fab from '@mui/material/Fab';
import InputAdornment from '@mui/material/InputAdornment';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ArchiveIcon from '@mui/icons-material/Archive';
import SearchIcon from '@mui/icons-material/Search';
import { useTheme, alpha } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import type { AppState, Habit, Frequency, TimeOfDay, CustomCategory } from '../types';
import { getTodayString } from '../storage';
import { isHabitActiveToday } from '../hooks/useAppState';

const ICONS = ['💧', '📚', '🏃', '🧘', '💻', '🥗', '😴', '💪', '🎯', '🧹', '🎨', '🎵', '📝', '🌿', '☕', '🛁', '🚴', '📖', '🧠', '❤️', '🍎', '🏋️', '🌅', '🛌', '📱', '🔑', '🏊', '🤸', '🌱', '🦷', '💊', '🥤', '🌳', '🙏', '📿', '🕌', '🌙'];
const FREQUENCIES: Frequency[] = ['Daily', 'Weekly', 'Weekdays', 'Weekends', 'Custom'];
const TIMES: TimeOfDay[] = ['Morning', 'Afternoon', 'Evening', 'Anytime'];
const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const empty: Omit<Habit, 'id' | 'createdAt'> = {
  name: '', category: 'Health', icon: '💧', frequency: 'Daily',
  timeOfDay: 'Morning', reminderTime: '', targetDays: undefined, color: '#0ea5e9',
};

interface AppActions {
  addHabit: (h: Habit) => void;
  updateHabit: (h: Habit) => void;
  deleteHabit: (id: string) => void;
  duplicateHabit: (id: string) => void;
  archiveHabit: (id: string) => void;
  addCategory: (c: CustomCategory) => void;
  toggleCompletion: (id: string) => boolean;
}

interface Props {
  state: AppState;
  app: AppActions;
  showSnack: (msg: string, sev?: 'success' | 'info') => void;
}

type SortMode = 'order' | 'name' | 'streak' | 'completion';

export default function HabitsPage({ state, app, showSnack }: Props) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('order');
  const [showArchived, setShowArchived] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [customDays, setCustomDays] = useState<number[]>([]);
  const [catOpen, setCatOpen] = useState(false);
  const [newCat, setNewCat] = useState({ name: '', color: '#10B981', icon: '🌟' });

  const today = getTodayString();

  const allCategories = ['All', ...state.customCategories.map(c => c.name)];

  function openAdd() {
    setEditing(null);
    setForm({ ...empty });
    setCustomDays([]);
    setOpen(true);
  }

  function openEdit(h: Habit) {
    setEditing(h);
    setForm({ name: h.name, category: h.category, icon: h.icon, frequency: h.frequency, timeOfDay: h.timeOfDay, reminderTime: h.reminderTime || '', targetDays: h.targetDays, color: h.color, notes: h.notes, customDays: h.customDays });
    setCustomDays(h.customDays || []);
    setOpen(true);
  }

  function handleSave() {
    if (!form.name.trim()) return;
    const finalForm = { ...form, customDays: form.frequency === 'Custom' ? customDays : undefined };
    if (editing) {
      app.updateHabit({ ...editing, ...finalForm });
      showSnack('Habit updated!');
    } else {
      app.addHabit({ ...finalForm, id: `h${Date.now()}`, createdAt: new Date().toISOString() } as Habit);
      showSnack('Habit added!');
    }
    setOpen(false);
  }

  function handleAddCategory() {
    if (!newCat.name.trim()) return;
    app.addCategory({ id: `cat_${Date.now()}`, ...newCat });
    setNewCat({ name: '', color: '#10B981', icon: '🌟' });
    setCatOpen(false);
    showSnack('Category added!');
  }

  const filtered = useMemo(() => {
    let list = state.habits.filter(h => showArchived ? true : !h.archived);
    if (filter !== 'All') list = list.filter(h => h.category === filter);
    if (search.trim()) list = list.filter(h => h.name.toLowerCase().includes(search.toLowerCase()));

    if (sortMode === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    else if (sortMode === 'streak') list = [...list].sort((a, b) => (state.streaks[b.id]?.currentStreak || 0) - (state.streaks[a.id]?.currentStreak || 0));
    else if (sortMode === 'completion') {
      const last30 = Array.from({ length: 30 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (29 - i)); return d.toISOString().split('T')[0]; });
      list = [...list].sort((a, b) => {
        const aCount = last30.filter(d => state.completions.some(c => c.habitId === a.id && c.date === d)).length;
        const bCount = last30.filter(d => state.completions.some(c => c.habitId === b.id && c.date === d)).length;
        return bCount - aCount;
      });
    } else list = [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    return list;
  }, [state.habits, state.completions, state.streaks, filter, search, sortMode, showArchived]);

  const todayCompletions = state.completions.filter(c => c.date === today);

  return (
    <Box sx={{ pb: 12 }}>
      {/* Header */}
      <Box sx={{ background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, #4F46E5 100%)`, pt: 5, pb: 4, px: 2.5, borderRadius: '0 0 28px 28px', mb: 2 }}>
        <Typography variant="h5" sx={{ color: 'white', fontWeight: 800 }}>My Habits</Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mt: 0.5 }}>
          {state.habits.filter(h => !h.archived).length} active habits
        </Typography>
      </Box>

      <Box sx={{ px: 2 }}>
        {/* Search */}
        <TextField
          placeholder="Search habits..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          size="small"
          fullWidth
          sx={{ mb: 1.5 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        />

        {/* Sort + archived toggle */}
        <Box sx={{ display: 'flex', gap: 1, mb: 1.5, alignItems: 'center' }}>
          <ToggleButtonGroup size="small" value={sortMode} exclusive onChange={(_e, v) => v && setSortMode(v)}>
            <ToggleButton value="order">Order</ToggleButton>
            <ToggleButton value="name">A-Z</ToggleButton>
            <ToggleButton value="streak">🔥</ToggleButton>
            <ToggleButton value="completion">%</ToggleButton>
          </ToggleButtonGroup>
          <Chip
            label={showArchived ? 'Show Active' : 'Show Archived'}
            size="small"
            onClick={() => setShowArchived(!showArchived)}
            sx={{ fontWeight: 600, fontSize: '0.7rem' }}
          />
        </Box>

        {/* Filter chips */}
        <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1, mb: 2, scrollbarWidth: 'none' }}>
          {allCategories.map(cat => (
            <Chip key={cat} label={cat} onClick={() => setFilter(cat)} sx={{ fontWeight: 600, flexShrink: 0, bgcolor: filter === cat ? theme.palette.primary.main : alpha(theme.palette.primary.main, 0.1), color: filter === cat ? 'white' : theme.palette.primary.main, '&:hover': { bgcolor: filter === cat ? theme.palette.primary.dark : alpha(theme.palette.primary.main, 0.15) } }} />
          ))}
          <Chip label="+ Add Category" size="small" onClick={() => setCatOpen(true)} sx={{ flexShrink: 0, borderStyle: 'dashed', fontSize: '0.7rem' }} />
        </Box>

        {/* Habits list */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {filtered.length === 0 && (
            <Card><CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Typography sx={{ fontSize: '3rem' }}>🌱</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, mt: 1 }}>No habits found</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>{showArchived ? 'No archived habits' : 'Add your first habit to get started'}</Typography>
              {!showArchived && <Button variant="contained" onClick={openAdd} startIcon={<AddIcon />}>Add Habit</Button>}
            </CardContent></Card>
          )}

          <AnimatePresence>
            {filtered.map(habit => {
              const done = todayCompletions.some(c => c.habitId === habit.id);
              const streak = state.streaks[habit.id];
              const isActiveToday = isHabitActiveToday(habit);
              return (
                <motion.div key={habit.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -100 }} layout>
                  <Card sx={{ border: done ? `2px solid ${habit.color}` : '2px solid transparent', bgcolor: done ? alpha(habit.color, 0.05) : undefined, opacity: habit.archived ? 0.5 : 1 }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ bgcolor: alpha(habit.color, 0.15), width: 44, height: 44, fontSize: '1.4rem', flexShrink: 0 }}>{habit.icon}</Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body1" sx={{ fontWeight: 600, textDecoration: done ? 'line-through' : 'none', color: done ? 'text.secondary' : 'text.primary' }}>{habit.name}</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                          <Chip label={habit.category} size="small" sx={{ bgcolor: alpha(habit.color, 0.12), color: habit.color, fontWeight: 600, fontSize: '0.6rem' }} />
                          <Chip label={habit.frequency} size="small" variant="outlined" sx={{ fontSize: '0.6rem' }} />
                          {streak && streak.currentStreak > 0 && <Chip label={`🔥 ${streak.currentStreak}`} size="small" sx={{ bgcolor: alpha('#F59E0B', 0.15), color: '#F59E0B', fontSize: '0.6rem' }} />}
                          {habit.archived && <Chip label="Archived" size="small" sx={{ fontSize: '0.6rem' }} />}
                        </Box>
                      </Box>
                      {!habit.archived && isActiveToday && (
                        <Box onClick={() => app.toggleCompletion(habit.id)} sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: done ? habit.color : 'transparent', border: `2.5px solid ${done ? habit.color : theme.palette.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0 }}>
                          {done && <Typography sx={{ color: 'white', fontSize: '0.8rem' }}>✓</Typography>}
                        </Box>
                      )}
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                        <IconButton size="small" onClick={() => openEdit(habit)} sx={{ color: theme.palette.primary.main }}><EditIcon fontSize="small" /></IconButton>
                        <IconButton size="small" onClick={() => app.duplicateHabit(habit.id)} sx={{ color: theme.palette.secondary.main }}><ContentCopyIcon fontSize="small" /></IconButton>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                        <IconButton size="small" onClick={() => app.archiveHabit(habit.id)} sx={{ color: 'text.secondary' }}><ArchiveIcon fontSize="small" /></IconButton>
                        <IconButton size="small" onClick={() => setDeleteConfirm(habit.id)} sx={{ color: 'error.main' }}><DeleteIcon fontSize="small" /></IconButton>
                      </Box>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </Box>
      </Box>

      {/* FAB */}
      <Fab color="primary" onClick={openAdd} sx={{ position: 'fixed', bottom: 80, right: 20, background: `linear-gradient(135deg, ${theme.palette.primary.main}, #4F46E5)`, boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.4)}` }}>
        <AddIcon />
      </Fab>

      {/* Add/Edit dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>{editing ? '✏️ Edit Habit' : '✨ New Habit'}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Habit name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} fullWidth autoFocus />
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>Icon</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {ICONS.map(ic => (
                  <Box key={ic} onClick={() => setForm(f => ({ ...f, icon: ic }))} sx={{ width: 40, height: 40, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', cursor: 'pointer', bgcolor: form.icon === ic ? alpha(theme.palette.primary.main, 0.15) : alpha(theme.palette.divider, 0.4), border: form.icon === ic ? `2px solid ${theme.palette.primary.main}` : '2px solid transparent', transition: 'all 0.15s' }}>{ic}</Box>
                ))}
              </Box>
            </Box>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select value={form.category} label="Category" onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {state.customCategories.map(c => <MenuItem key={c.id} value={c.name}>{c.icon} {c.name}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Frequency</InputLabel>
              <Select value={form.frequency} label="Frequency" onChange={e => setForm(f => ({ ...f, frequency: e.target.value as Frequency }))}>
                {FREQUENCIES.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
              </Select>
            </FormControl>
            {form.frequency === 'Custom' && (
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Custom Days</Typography>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {DAYS_OF_WEEK.map((d, i) => (
                    <Chip key={d} label={d} size="small" onClick={() => setCustomDays(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])} sx={{ bgcolor: customDays.includes(i) ? theme.palette.primary.main : alpha(theme.palette.divider, 0.4), color: customDays.includes(i) ? 'white' : 'text.primary', fontSize: '0.7rem' }} />
                  ))}
                </Box>
              </Box>
            )}
            <FormControl fullWidth>
              <InputLabel>Time of Day</InputLabel>
              <Select value={form.timeOfDay} label="Time of Day" onChange={e => setForm(f => ({ ...f, timeOfDay: e.target.value as TimeOfDay }))}>
                {TIMES.map(t => <MenuItem key={t} value={t}>{t === 'Morning' ? '🌅' : t === 'Afternoon' ? '☀️' : t === 'Evening' ? '🌙' : '⏰'} {t}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Reminder time (optional)" type="time" value={form.reminderTime} onChange={e => setForm(f => ({ ...f, reminderTime: e.target.value }))} InputLabelProps={{ shrink: true }} fullWidth />
            <TextField label="Target days (challenge)" type="number" value={form.targetDays ?? ''} onChange={e => setForm(f => ({ ...f, targetDays: e.target.value ? Number(e.target.value) : undefined }))} inputProps={{ min: 1, max: 365 }} fullWidth />
            <TextField label="Notes (optional)" value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} fullWidth multiline rows={2} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setOpen(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={!form.name.trim()}>{editing ? 'Save' : 'Add Habit'}</Button>
        </DialogActions>
      </Dialog>

      {/* Category dialog */}
      <Dialog open={catOpen} onClose={() => setCatOpen(false)} fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Add Category</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="Category name" value={newCat.name} onChange={e => setNewCat(c => ({ ...c, name: e.target.value }))} fullWidth />
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {ICONS.slice(0, 15).map(ic => (
                <Box key={ic} onClick={() => setNewCat(c => ({ ...c, icon: ic }))} sx={{ width: 36, height: 36, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', cursor: 'pointer', bgcolor: newCat.icon === ic ? alpha(theme.palette.primary.main, 0.15) : alpha(theme.palette.divider, 0.4), border: newCat.icon === ic ? `2px solid ${theme.palette.primary.main}` : '2px solid transparent' }}>{ic}</Box>
              ))}
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {['#10B981', '#F59E0B', '#7C3AED', '#0ea5e9', '#e11d48', '#22c55e', '#6366f1'].map(c => (
                <Box key={c} onClick={() => setNewCat(nc => ({ ...nc, color: c }))} sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: c, cursor: 'pointer', border: newCat.color === c ? `3px solid ${theme.palette.text.primary}` : '3px solid transparent' }} />
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setCatOpen(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleAddCategory} variant="contained" disabled={!newCat.name.trim()}>Add</Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Habit?</DialogTitle>
        <DialogContent><Typography>This will permanently delete the habit and all its history.</Typography></DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDeleteConfirm(null)} variant="outlined">Cancel</Button>
          <Button onClick={() => { if (deleteConfirm) { app.deleteHabit(deleteConfirm); setDeleteConfirm(null); } }} variant="contained" color="error">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
