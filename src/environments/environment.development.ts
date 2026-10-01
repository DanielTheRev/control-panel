export const environment = {
  production: false,
  // apiUrl: 'https://api.vexx.com.ar',
  // socketUrl: 'https://api.vexx.com.ar',
  // socketPath: '/api/socket.io',
  apiUrl: 'http://localhost:3001/api',
  socketUrl: 'http://localhost:3001',
  socketPath: '/api/socket.io',
  supabaseUrl: 'https://savyruhfhrkjqhtaozae.supabase.co',
  supabasePublishableKey: 'sb_publishable_PNirMf7Zqlq6XceesCDoRg_U0_-th7z',
  realtimeProvider: 'supabase' as 'socketio' | 'supabase',
  tenantSlug: 'vura',
  brandName: 'NexoCommerce',

  MP_MASTER_CLIENT_ID: 8846222731123020,
  appVersion: 'v2.4.1 (dev)',
  buildDate: '27/09/2026'
};
