// ============================================
// 🔌 Admin client-side utilities (Realtime only)
// All CRUD operations are in adminActions.ts (Server Actions)
// ============================================

import { supabase } from './supabase';
import type { RealtimePayload } from '@/app/types';

/**
 * Subscribe to queue changes in realtime (for admin dashboard).
 * Listens to both postgres_changes and broadcast events.
 */
export function subscribeToQueueChanges(callback: (payload: RealtimePayload) => void) {
  const channel = supabase.channel('queue_admin');

  // Listen to database changes
  channel.on(
    'postgres_changes' as any,
    {
      event: '*',
      schema: 'public',
      table: 'queue_positions',
    },
    callback as any
  );

  // Listen to broadcast messages (for immediate updates)
  channel.on(
    'broadcast' as any,
    { event: 'queue_update' },
    (msg: Record<string, unknown>) => {
      try {
        callback({ broadcast: true, payload: msg.payload as RealtimePayload['payload'] });
      } catch (err) {
        console.error('Error handling broadcast message:', err);
      }
    }
  );

  channel.subscribe();

  return channel;
}
