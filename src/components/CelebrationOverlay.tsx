import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

interface Props {
  show: boolean;
  onDone: () => void;
}

export default function CelebrationOverlay({ show, onDone }: Props) {
  const [particles] = useState(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: ['#10B981', '#F59E0B', '#7C3AED', '#22c55e', '#0ea5e9', '#e11d48'][Math.floor(Math.random() * 6)],
      size: 8 + Math.random() * 12,
      delay: Math.random() * 0.5,
    }))
  );

  useEffect(() => {
    if (show) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10B981', '#F59E0B', '#7C3AED', '#22c55e'],
      });
      const t = setTimeout(onDone, 3000);
      return () => clearTimeout(t);
    }
  }, [show, onDone]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="celebration"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, zIndex: 9000, pointerEvents: 'none' }}
        >
          <Box
            sx={{
              height: '100vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.55)',
            }}
          >
            {particles.map(p => (
              <motion.div
                key={p.id}
                initial={{ y: '110vh', x: `${p.x}vw`, opacity: 1 }}
                animate={{ y: '-10vh', opacity: [1, 1, 0] }}
                transition={{ duration: 2.5, delay: p.delay, ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  width: p.size,
                  height: p.size,
                  borderRadius: '50%',
                  backgroundColor: p.color,
                }}
              />
            ))}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.5, delay: 0.3 }}
              style={{ textAlign: 'center' }}
            >
              <Typography sx={{ fontSize: '5rem', lineHeight: 1 }}>🎉</Typography>
              <Typography variant="h4" sx={{ color: 'white', fontWeight: 800, mt: 2 }}>
                All Done!
              </Typography>
              <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)', mt: 1 }}>
                You crushed all your habits today! 🔥
              </Typography>
            </motion.div>
          </Box>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
