import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vargen.ec',
  appName: 'Vargen',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
  },
  ios: {
    contentInset: 'automatic',
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
