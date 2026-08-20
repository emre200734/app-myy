import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.swiftqr.studio',
  appName: 'SwiftQR Studio',
  webDir: 'dist',
  android: {
    backgroundColor: '#7C3AED',
    allowMixedContent: false,
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
