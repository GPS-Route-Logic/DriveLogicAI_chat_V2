import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || ''),
      'process.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || ''),
      'process.env.GOOGLE_MAPS_PLATFORM_KEY': JSON.stringify(env.GOOGLE_MAPS_PLATFORM_KEY || env.VITE_MAPS_API_KEY || ''),
      'process.env.VITE_MAPS_API_KEY': JSON.stringify(env.VITE_MAPS_API_KEY || env.GOOGLE_MAPS_PLATFORM_KEY || ''),
      'process.env.VITE_PAYPAL_CLIENT_ID': JSON.stringify(env.VITE_PAYPAL_CLIENT_ID || 'sb-demo-client-id-drivelogicai'),
      'process.env.VITE_PAYPAL_ME_URL': JSON.stringify(env.VITE_PAYPAL_ME_URL || 'https://www.paypal.com/paypalme/drivelogicai'),
      'process.env.VITE_BTC_WALLET_ADDRESS': JSON.stringify(env.VITE_BTC_WALLET_ADDRESS || 'bc1qdrivelogicai99xge8273x0wkw0923kljhx'),
      'process.env.VITE_BTC_WALLET_URI': JSON.stringify(env.VITE_BTC_WALLET_URI || 'bitcoin:bc1qdrivelogicai99xge8273x0wkw0923kljhx?label=DriveLogicAI%20Support'),
      'process.env.CUSTOM_DOMAIN': JSON.stringify(env.CUSTOM_DOMAIN || 'drivelgicaiapp.com'),
      'process.env.AI_STUDIO_DOMAIN': JSON.stringify(env.AI_STUDIO_DOMAIN || 'drivelogicai.ai.studio'),
    },
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname || process.cwd(), '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port,
      // Allow Google AI Studio, custom Squarespace domain, and local hosts
      allowedHosts: [
        'drivelogicai.ai.studio',
        'drivelgicaiapp.com',
        'www.drivelgicaiapp.com',
        'localhost',
        '127.0.0.1',
        '.ai.studio',
        '.run.app'
      ],
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    preview: {
      host: '0.0.0.0',
      port,
      allowedHosts: [
        'drivelogicai.ai.studio',
        'drivelgicaiapp.com',
        'www.drivelgicaiapp.com',
        'localhost',
        '127.0.0.1',
        '.ai.studio',
        '.run.app'
      ],
    }
  };
});
