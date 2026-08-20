import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { useTheme, alpha } from '@mui/material/styles';
import { motion } from 'framer-motion';
import type { AppState, UserProfile, Challenge, Language } from '../types';
import { UNLOCKABLE_THEMES, PREBUILT_CHALLENGES, PRAYER_METHODS, MADHABS, getLevelFromXP } from '../islamicData';
import { getTodayString } from '../storage';
import { isHabitActiveToday } from '../hooks/useAppState';

const AVATARS = ['😊', '🦁', '🐯', '🦊', '🐼', '🦋', '🌟', '🚀', '🎯', '💎', '🔥', '⚡', '🌈', '🧠', '💪', '🎨', '🦄', '🐶', '🐱', '🐸'];

interface AppActions {
  updateProfile: (p: UserProfile) => void;
  unlockTheme: (id: string, cost: number) => void;
  addChallenge: (c: Challenge) => void;
  deleteChallenge: (id: string) => void;
  exportState: () => string;
  importState: (json: string) => boolean;
  clearAllData: () => void;
}

interface Props {
  state: AppState;
  app: AppActions;
  showSnack: (msg: string, sev?: 'success' | 'info') => void;
}

export default function ProfilePage({ state, app, showSnack }: Props) {
  const theme = useTheme();
  const [profile, setProfile] = useState<UserProfile>({ ...state.profile });
  const [saved, setSaved] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [challengeDialog, setChallengeDialog] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState(0);
  const [challengeHabits, setChallengeHabits] = useState<string[]>([]);

  const today = getTodayString();
  const todayHabits = state.habits.filter(isHabitActiveToday);
  const todayDone = todayHabits.filter(h => state.completions.some(c => c.habitId === h.id && c.date === today));
  const totalCompletions = state.completions.length;
  const maxStreak = Math.max(0, ...Object.values(state.streaks).map(s => s.currentStreak));
  const longestStreak = Math.max(0, ...Object.values(state.streaks).map(s => s.longestStreak));
  const levelInfo = getLevelFromXP(state.profile.xp);

  function handleSave() {
    app.updateProfile(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    showSnack('Settings saved!');
  }

  function handleExport() {
    const data = app.exportState();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `doneflow_backup_${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showSnack('Data exported!');
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const json = ev.target?.result as string;
      if (app.importState(json)) showSnack('Data imported successfully!');
      else showSnack('Import failed - invalid file', 'info');
    };
    reader.readAsText(file);
  }

  function handleCreateChallenge() {
    if (challengeHabits.length === 0) return;
    const preset = PREBUILT_CHALLENGES[selectedChallenge];
    const challenge: Challenge = {
      id: `ch${Date.now()}`,
      name: preset.name,
      emoji: preset.emoji,
      duration: preset.duration,
      startDate: today,
      habitIds: challengeHabits,
      description: preset.description,
    };
    app.addChallenge(challenge);
    setChallengeDialog(false);
    setChallengeHabits([]);
    showSnack(`Challenge "${preset.name}" started!`);
  }

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
  const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

  return (
    <Box sx={{ pb: 10 }}>
      {/* Header */}
      <Box sx={{ background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, #4F46E5 100%)`, pt: 5, pb: 6, px: 2.5, borderRadius: '0 0 32px 32px', mb: -3, textAlign: 'center' }}>
        <motion.div whileTap={{ scale: 0.9 }}>
          <Avatar sx={{ width: 80, height: 80, fontSize: '3rem', bgcolor: 'rgba(255,255,255,0.2)', mx: 'auto', mb: 1.5 }}>{profile.avatar}</Avatar>
        </motion.div>
        <Typography variant="h5" sx={{ color: 'white', fontWeight: 800 }}>{profile.name}</Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
          {levelInfo.emoji} Level {levelInfo.level} - {levelInfo.name} · {state.badges.length} badges
        </Typography>
      </Box>

      <Box sx={{ px: 2, pt: 5 }}>
        <motion.div variants={container} initial="hidden" animate="show">

          {/* Stats row */}
          <motion.div variants={item}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mb: 2 }}>
              {[
                { label: 'Habits', value: state.habits.filter(h => !h.archived).length },
                { label: 'Done Today', value: todayDone.length },
                { label: 'All Time', value: totalCompletions },
              ].map(s => (
                <Card key={s.label} sx={{ textAlign: 'center' }}>
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: theme.palette.primary.main }}>{s.value}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>{s.label}</Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </motion.div>

          {/* XP & Coins */}
          <motion.div variants={item}>
            <Card sx={{ mb: 2, background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.12)}, ${alpha('#F59E0B', 0.08)})` }}>
              <CardContent sx={{ p: 2.5, display: 'flex', justifyContent: 'center', gap: 4 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography sx={{ fontSize: '1.8rem' }}>⚡</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: theme.palette.primary.main }}>{state.profile.xp}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>XP</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography sx={{ fontSize: '1.8rem' }}>🪙</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#F59E0B' }}>{state.profile.coins}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>Coins</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography sx={{ fontSize: '1.8rem' }}>🔥</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: theme.palette.primary.main }}>{maxStreak}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>Streak</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography sx={{ fontSize: '1.8rem' }}>🏆</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: theme.palette.primary.main }}>{longestStreak}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>Best</Typography>
                </Box>
              </CardContent>
            </Card>
          </motion.div>

          {/* Profile settings */}
          <motion.div variants={item}>
            <Card sx={{ mb: 2 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>👤 Profile</Typography>
                <TextField label="Your name" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} fullWidth sx={{ mb: 2 }} />
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>Avatar</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {AVATARS.map(av => (
                    <Box key={av} onClick={() => setProfile(p => ({ ...p, avatar: av }))} sx={{ width: 44, height: 44, borderRadius: 2, fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', bgcolor: profile.avatar === av ? alpha(theme.palette.primary.main, 0.15) : alpha(theme.palette.divider, 0.4), border: profile.avatar === av ? `2px solid ${theme.palette.primary.main}` : '2px solid transparent', transition: 'all 0.15s' }}>{av}</Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </motion.div>

          {/* Appearance - Theme Store */}
          <motion.div variants={item}>
            <Card sx={{ mb: 2 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>🎨 Theme Store</Typography>
                <FormControlLabel control={<Switch checked={profile.darkMode} onChange={e => setProfile(p => ({ ...p, darkMode: e.target.checked }))} color="primary" />} label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Typography variant="body2" sx={{ fontWeight: 600 }}>Dark Mode</Typography><Typography>{profile.darkMode ? '🌙' : '☀️'}</Typography></Box>} />
                <Divider sx={{ my: 2 }} />
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5 }}>Unlockable Themes</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                  {UNLOCKABLE_THEMES.map(tc => {
                    const unlocked = state.profile.unlockedThemes.includes(tc.id);
                    const canAfford = state.profile.coins >= tc.cost;
                    return (
                      <Box key={tc.id} sx={{ textAlign: 'center' }}>
                        <Box onClick={() => { if (unlocked) setProfile(p => ({ ...p, themeColor: tc.primary })); else if (canAfford) { app.unlockTheme(tc.id, tc.cost); setProfile(p => ({ ...p, themeColor: tc.primary, unlockedThemes: [...p.unlockedThemes, tc.id] })); showSnack(`${tc.name} unlocked!`); } }} sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: tc.primary, cursor: unlocked || canAfford ? 'pointer' : 'default', border: profile.themeColor === tc.primary ? `3px solid ${theme.palette.text.primary}` : '3px solid transparent', boxShadow: profile.themeColor === tc.primary ? `0 0 0 2px ${tc.primary}` : 'none', opacity: unlocked || canAfford ? 1 : 0.4, transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {!unlocked && <Typography sx={{ color: 'white', fontSize: '0.7rem', fontWeight: 700 }}>{tc.cost}🪙</Typography>}
                        </Box>
                        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontSize: '0.65rem', color: unlocked ? 'text.primary' : 'text.secondary' }}>{tc.name}</Typography>
                      </Box>
                    );
                  })}
                </Box>
              </CardContent>
            </Card>
          </motion.div>

          {/* Challenges */}
          <motion.div variants={item}>
            <Card sx={{ mb: 2 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>🏆 Challenges</Typography>
                  <Button size="small" variant="outlined" onClick={() => setChallengeDialog(true)}>Start Challenge</Button>
                </Box>
                {state.challenges.length === 0 ? (
                  <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 2 }}>No active challenges. Start one to push yourself!</Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {state.challenges.map(ch => {
                      const daysElapsed = Math.floor((new Date(today).getTime() - new Date(ch.startDate).getTime()) / 86400000) + 1;
                      const progress = Math.min(100, Math.round((daysElapsed / ch.duration) * 100));
                      return (
                        <Box key={ch.id} sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.06) }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{ch.emoji} {ch.name}</Typography>
                            <Button size="small" onClick={() => app.deleteChallenge(ch.id)} sx={{ color: 'error.main', fontSize: '0.7rem', minWidth: 0 }}>End</Button>
                          </Box>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>Day {daysElapsed} / {ch.duration} · {progress}%</Typography>
                          <Box sx={{ mt: 0.5, height: 6, borderRadius: 3, bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                            <Box sx={{ height: '100%', borderRadius: 3, width: `${progress}%`, background: `linear-gradient(90deg, ${theme.palette.primary.main}, #F59E0B)`, transition: 'width 0.3s' }} />
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Islamic Settings */}
          <motion.div variants={item}>
            <Card sx={{ mb: 2, background: `linear-gradient(135deg, ${alpha('#10B981', 0.06)}, ${alpha('#F59E0B', 0.04)})` }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>🕌 Islamic Settings</Typography>

                <FormControlLabel control={<Switch checked={profile.islamicEnabled} onChange={e => setProfile(p => ({ ...p, islamicEnabled: e.target.checked }))} />} label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Enable Islamic Features</Typography>} />

                {profile.islamicEnabled && (
                  <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Prayer Calculation Method</InputLabel>
                      <Select value={profile.prayerMethod} label="Prayer Calculation Method" onChange={e => setProfile(p => ({ ...p, prayerMethod: e.target.value as number }))}>
                        {PRAYER_METHODS.map(m => <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>)}
                      </Select>
                    </FormControl>

                    <FormControl fullWidth size="small">
                      <InputLabel>Madhab</InputLabel>
                      <Select value={profile.madhab} label="Madhab" onChange={e => setProfile(p => ({ ...p, madhab: e.target.value as typeof profile.madhab }))}>
                        {MADHABS.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                      </Select>
                    </FormControl>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <TextField size="small" type="number" label="Latitude" value={profile.latitude ?? ''} onChange={e => setProfile(p => ({ ...p, latitude: Number(e.target.value) }))} sx={{ flex: 1 }} />
                      <TextField size="small" type="number" label="Longitude" value={profile.longitude ?? ''} onChange={e => setProfile(p => ({ ...p, longitude: Number(e.target.value) }))} sx={{ flex: 1 }} />
                    </Box>
                    <Button size="small" variant="outlined" onClick={() => {
                      if ('geolocation' in navigator) {
                        navigator.geolocation.getCurrentPosition(pos => {
                          setProfile(p => ({ ...p, latitude: pos.coords.latitude, longitude: pos.coords.longitude, locationName: 'Auto-detected' }));
                          showSnack('Location detected!');
                        }, () => showSnack('Location access denied', 'info'));
                      }
                    }}>📍 Auto-detect Location</Button>

                    <FormControlLabel control={<Switch checked={profile.adhanNotifications} onChange={e => setProfile(p => ({ ...p, adhanNotifications: e.target.checked }))} size="small" />} label={<Typography variant="body2">Adhan Notifications</Typography>} />
                    <FormControlLabel control={<Switch checked={profile.showHijriDate} onChange={e => setProfile(p => ({ ...p, showHijriDate: e.target.checked }))} size="small" />} label={<Typography variant="body2">Show Hijri Date</Typography>} />

                    <FormControl fullWidth size="small">
                      <InputLabel>Islamic Quote Frequency</InputLabel>
                      <Select value={profile.islamicQuoteFrequency} label="Islamic Quote Frequency" onChange={e => setProfile(p => ({ ...p, islamicQuoteFrequency: e.target.value as typeof profile.islamicQuoteFrequency }))}>
                        <MenuItem value="high">High (after each prayer)</MenuItem>
                        <MenuItem value="medium">Medium (daily)</MenuItem>
                        <MenuItem value="low">Low (on app open)</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Language */}
          <motion.div variants={item}>
            <Card sx={{ mb: 2 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>🌐 Language</Typography>
                <ToggleButtonGroup value={profile.language} exclusive onChange={(_e, v: Language | null) => v && setProfile(p => ({ ...p, language: v }))} size="small" fullWidth>
                  <ToggleButton value="en">English</ToggleButton>
                  <ToggleButton value="ur">اردو</ToggleButton>
                  <ToggleButton value="ar">العربية</ToggleButton>
                </ToggleButtonGroup>
              </CardContent>
            </Card>
          </motion.div>

          {/* Notifications */}
          <motion.div variants={item}>
            <Card sx={{ mb: 2 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>🔔 Notifications</Typography>
                <FormControlLabel control={<Switch checked={profile.notifications} onChange={e => setProfile(p => ({ ...p, notifications: e.target.checked }))} color="primary" />} label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Enable Notifications</Typography>} />
              </CardContent>
            </Card>
          </motion.div>

          {/* Data management */}
          <motion.div variants={item}>
            <Card sx={{ mb: 2 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>💾 Data Management</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Button variant="outlined" fullWidth onClick={handleExport}>📥 Export Data (JSON)</Button>
                  <Button variant="outlined" fullWidth component="label">📤 Import Data
                    <input type="file" accept="application/json" hidden onChange={handleImport} />
                  </Button>
                  <Button variant="outlined" fullWidth color="error" onClick={() => setConfirmClear(true)}>🗑️ Clear All Data</Button>
                </Box>
              </CardContent>
            </Card>
          </motion.div>

          {/* Badges */}
          {state.badges.length > 0 && (
            <motion.div variants={item}>
              <Card sx={{ mb: 2 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>🏅 My Badges</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {state.badges.map(b => <Chip key={b} label={b} sx={{ fontWeight: 600 }} />)}
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Save button */}
          <motion.div variants={item}>
            <Button variant="contained" fullWidth size="large" onClick={handleSave} sx={{ borderRadius: 3, py: 1.5, fontWeight: 700, background: `linear-gradient(135deg, ${theme.palette.primary.main}, #4F46E5)` }}>
              {saved ? '✅ Saved!' : 'Save Changes'}
            </Button>
          </motion.div>

          {/* Tagline */}
          <motion.div variants={item}>
            <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 3, color: 'text.secondary' }}>
              DoneFlow · Build habits. Strengthen deen. Stay consistent.
            </Typography>
          </motion.div>

        </motion.div>
      </Box>

      {/* Challenge dialog */}
      <Dialog open={challengeDialog} onClose={() => setChallengeDialog(false)} fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>🏆 Start a Challenge</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Challenge</InputLabel>
              <Select value={selectedChallenge} label="Challenge" onChange={e => setSelectedChallenge(e.target.value as number)}>
                {PREBUILT_CHALLENGES.map((ch, i) => <MenuItem key={i} value={i}>{ch.emoji} {ch.name} ({ch.duration} days)</MenuItem>)}
              </Select>
            </FormControl>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>{PREBUILT_CHALLENGES[selectedChallenge]?.description}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Select habits for this challenge:</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {state.habits.filter(h => !h.archived).map(h => {
                const selected = challengeHabits.includes(h.id);
                return <Chip key={h.id} label={`${h.icon} ${h.name}`} onClick={() => setChallengeHabits(prev => selected ? prev.filter(x => x !== h.id) : [...prev, h.id])} sx={{ bgcolor: selected ? alpha(theme.palette.primary.main, 0.2) : alpha(theme.palette.divider, 0.4), border: selected ? `1.5px solid ${theme.palette.primary.main}` : '1.5px solid transparent' }} />;
              })}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setChallengeDialog(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleCreateChallenge} variant="contained" disabled={challengeHabits.length === 0}>Start Challenge</Button>
        </DialogActions>
      </Dialog>

      {/* Clear data confirm */}
      <Dialog open={confirmClear} onClose={() => setConfirmClear(false)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Clear All Data?</DialogTitle>
        <DialogContent><Typography>This will permanently delete all habits, completions, streaks, badges, and Islamic records. This cannot be undone.</Typography></DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setConfirmClear(false)} variant="outlined">Cancel</Button>
          <Button onClick={() => { app.clearAllData(); setConfirmClear(false); showSnack('All data cleared'); }} variant="contained" color="error">Delete Everything</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
