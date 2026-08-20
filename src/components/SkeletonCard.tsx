import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import { motion } from 'framer-motion';

export default function SkeletonCard() {
  return (
    <Box sx={{ p: 2, mt: 2 }}>
      <motion.div
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        {[0, 1, 2].map(i => (
          <Card key={i} sx={{ mb: 2 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ height: 24, width: '60%', borderRadius: 2, bgcolor: 'divider', mb: 2 }} />
              <Box sx={{ height: 16, width: '90%', borderRadius: 1, bgcolor: 'divider', mb: 1 }} />
              <Box sx={{ height: 16, width: '70%', borderRadius: 1, bgcolor: 'divider' }} />
            </CardContent>
          </Card>
        ))}
      </motion.div>
    </Box>
  );
}
