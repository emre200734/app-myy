import { useState, useCallback, useMemo, useEffect, useRef, lazy, Suspense } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import HomeIcon from '@mui/icons-material/Home';
import MosqueIcon from '@mui/icons-material/Mosque';
import ChecklistRtlIcon from '@mui/icons-material/ChecklistRtl';
import BarChartIcon from '@mui/icons-material/BarChart';
import PersonIcon from '@mui/icons-material/Person';
import { buildTheme } from './theme';
import { useAppState } from './hooks/useAppState';
import { getLevelFromXP } from './islamicData';
import SplashScreen from './components/SplashScreen';
import SkeletonCard from './components/SkeletonCard';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const NamazPage = lazy(() => import('./pages/NamazPage'));
const HabitsPage = lazy(() => import('./pages/HabitsPage'));
const StatsPage = lazy(() => import('./pages/StatsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

export default function App() {
  const [splashDone, setSplashDone] = useState(false);
  const [tab, setTab] = useState(0);
  const homeTab = useRef(0);

  useEffect(() => {
    const listener = CapacitorApp.addListener('backButton', () => {
      if (tab !== homeTab.current) {
        setTab(homeTab.current);
      } else {
        CapacitorApp.exitApp();
      }
    });
    return () => {
      listener.then(l => l.remove());
    };
  }, [tab]);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'info' }>({
    open: false, message: '', severity: 'success',
  });

  const app = useAppState();
  const { state } = app;

  const theme = useMemo(
    () => buildTheme(state.profile.themeColor || '#7C3AED', state.profile.darkMode),
    [state.profile.themeColor, state.profile.darkMode]
  );

  const levelInfo = useMemo(() => getLevelFromXP(state.profile.xp), [state.profile.xp]);

  const handleToggle = useCallback((id: string) => {
    const wasCompleted = state.completions.some(c => c.habitId === id && c.date === new Date().toISOString().split('T')[0]);
    app.toggleCompletion(id);
    const habit = state.habits.find(h => h.id === id);
    if (!wasCompleted && habit) {
      setSnack({ open: true, message: `${habit.icon} "${habit.name}" completed! +10 XP`, severity: 'success' });
    }
  }, [state.completions, state.habits, app]);

  const showSnack = useCallback((message: string, severity: 'success' | 'info' = 'success') => {
    setSnack({ open: true, message, severity });
  }, []);

  const islamicEnabled = state.profile.islamicEnabled;

  const TABS = islamicEnabled
    ? [
        { label: 'Home', icon: <HomeIcon /> },
        { label: 'Namaz', icon: <MosqueIcon /> },
        { label: 'Habits', icon: <ChecklistRtlIcon /> },
        { label: 'Stats', icon: <BarChartIcon /> },
        { label: 'Profile', icon: <PersonIcon /> },
      ]
    : [
        { label: 'Home', icon: <HomeIcon /> },
        { label: 'Habits', icon: <ChecklistRtlIcon /> },
        { label: 'Stats', icon: <BarChartIcon /> },
        { label: 'Profile', icon: <PersonIcon /> },
      ];

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}
      <Box sx={{ maxWidth: 480, mx: 'auto', minHeight: '100vh', position: 'relative', bgcolor: 'background.default' }}>
        <Box sx={{ overflowY: 'auto', height: '100vh', pb: 8 }}>
          <Suspense fallback={<SkeletonCard />}>
            {islamicEnabled && tab === 0 && <Dashboard state={state} levelInfo={levelInfo} onToggle={handleToggle} showSnack={showSnack} />}
            {islamicEnabled && tab === 1 && <NamazPage state={state} app={app} showSnack={showSnack} />}
            {islamicEnabled && tab === 2 && <HabitsPage state={state} app={app} showSnack={showSnack} />}
            {islamicEnabled && tab === 3 && <StatsPage state={state} />}
            {islamicEnabled && tab === 4 && <ProfilePage state={state} app={app} showSnack={showSnack} />}

            {!islamicEnabled && tab === 0 && <Dashboard state={state} levelInfo={levelInfo} onToggle={handleToggle} showSnack={showSnack} />}
            {!islamicEnabled && tab === 1 && <HabitsPage state={state} app={app} showSnack={showSnack} />}
            {!islamicEnabled && tab === 2 && <StatsPage state={state} />}
            {!islamicEnabled && tab === 3 && <ProfilePage state={state} app={app} showSnack={showSnack} />}
          </Suspense>
        </Box>

        <Paper sx={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, zIndex: 1100 }} elevation={8}>
          <BottomNavigation value={tab} onChange={(_e, v) => setTab(v)} showLabels>
            {TABS.map((t, i) => (
              <BottomNavigationAction
                key={t.label}
                label={t.label}
                icon={t.icon}
                value={i}
                sx={{
                  '&.Mui-selected': { color: theme.palette.primary.main },
                  '& .MuiBottomNavigationAction-label': { fontSize: '0.62rem', fontWeight: 600 },
                  minWidth: 0,
                  px: 0.5,
                }}
              />
            ))}
          </BottomNavigation>
        </Paper>

        <Snackbar
          open={snack.open}
          autoHideDuration={2500}
          onClose={() => setSnack(s => ({ ...s, open: false }))}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert severity={snack.severity} variant="filled" onClose={() => setSnack(s => ({ ...s, open: false }))} sx={{ borderRadius: 3 }}>
            {snack.message}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}
