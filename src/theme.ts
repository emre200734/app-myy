import { createTheme, alpha } from '@mui/material/styles';

export const CATEGORY_COLORS: Record<string, string> = {
  Health: '#0ea5e9',
  Work: '#6366f1',
  Personal: '#a855f7',
  Study: '#f59e0b',
  Fitness: '#22c55e',
};

// Liquid glass background pattern (Islamic geometric-inspired)
export const GLASS_BG_LIGHT = `radial-gradient(circle at 20% 20%, ${alpha('#7C3AED', 0.06)} 0%, transparent 50%),
  radial-gradient(circle at 80% 80%, ${alpha('#10B981', 0.05)} 0%, transparent 50%),
  radial-gradient(circle at 50% 50%, ${alpha('#F59E0B', 0.03)} 0%, transparent 60%),
  #f5f5fa`;

export const GLASS_BG_DARK = `radial-gradient(circle at 20% 20%, ${alpha('#7C3AED', 0.12)} 0%, transparent 50%),
  radial-gradient(circle at 80% 80%, ${alpha('#10B981', 0.1)} 0%, transparent 50%),
  radial-gradient(circle at 50% 50%, ${alpha('#F59E0B', 0.06)} 0%, transparent 60%),
  #0a0a14`;

// Glass card sx helper
export const glassCard = (dark: boolean) => ({
  background: dark
    ? `rgba(255, 255, 255, 0.06)`
    : `rgba(255, 255, 255, 0.65)`,
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)'}`,
  boxShadow: dark
    ? `0 4px 24px ${alpha('#000000', 0.3)}`
    : `0 2px 16px ${alpha('#000000', 0.06)}`,
});

export function buildTheme(primaryColor: string, darkMode: boolean) {
  const isDark = darkMode || (primaryColor === '#6366F1' && false);

  return createTheme({
    palette: {
      mode: isDark ? 'dark' : 'light',
      primary: { main: primaryColor },
      secondary: { main: '#F59E0B' }, // Gold accent
      background: {
        default: isDark ? '#0a0a14' : '#f5f5fa',
        paper: isDark ? 'rgba(26, 26, 46, 0.8)' : 'rgba(255, 255, 255, 0.85)',
      },
      success: { main: '#10B981' },
    },
    shape: { borderRadius: 16 },
    typography: {
      fontFamily: 'Roboto, Inter, system-ui, sans-serif',
      h4: { fontWeight: 700 },
      h5: { fontWeight: 700 },
      h6: { fontWeight: 600 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            background: isDark ? GLASS_BG_DARK : GLASS_BG_LIGHT,
            backgroundAttachment: 'fixed',
            overflowX: 'hidden',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: () => ({
            borderRadius: 20,
            background: isDark
              ? 'rgba(255, 255, 255, 0.06)'
              : 'rgba(255, 255, 255, 0.65)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)'}`,
            boxShadow: isDark
              ? `0 4px 24px ${alpha('#000000', 0.3)}`
              : `0 2px 16px ${alpha('#000000', 0.06)}`,
          }),
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 12, textTransform: 'none', fontWeight: 600 },
          containedPrimary: {
            background: `linear-gradient(135deg, ${primaryColor} 0%, #4F46E5 100%)`,
            boxShadow: `0 4px 15px ${alpha(primaryColor, 0.4)}`,
          },
        },
      },
      MuiBottomNavigation: {
        styleOverrides: {
          root: () => ({
            backgroundColor: isDark ? 'rgba(10,10,20,0.85)' : 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
            height: 64,
          }),
        },
      },
      MuiBottomNavigationAction: {
        styleOverrides: {
          root: { minWidth: 0 },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 8, fontWeight: 600 },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: { borderRadius: 8, height: 8 },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 24,
            background: isDark ? 'rgba(20,20,35,0.95)' : 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: { '& .MuiOutlinedInput-root': { borderRadius: 12 } },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            background: isDark ? 'rgba(10,10,20,0.9)' : 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRight: `1px solid ${alpha(primaryColor, 0.1)}`,
          },
        },
      },
    },
  });
}
