// ============================================
// 🗄️ Supabase Client + Client-side helpers
// Server-side logic lives in serverActions.ts
// ============================================

import { createClient } from '@supabase/supabase-js';
import type { QueueItem } from '@/app/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials are missing. Check .env.local or Netlify settings.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);

// ─── Client-side: get queue position ───

export async function getQueuePosition(customerId: string): Promise<QueueItem | null> {
  try {
    const { data, error } = await supabase
      .from('queue_positions')
      .select('*')
      .eq('customer_id', customerId)
      .eq('status', 'waiting')
      .single();

    if (error) {
      console.error('Error fetching queue position:', error);
      return null;
    }

    return data as QueueItem;
  } catch (error) {
    console.error('Unexpected error:', error);
    return null;
  }
}

// ─── Client-side: subscribe to realtime updates for a customer ───

export function subscribeToQueueUpdates(
  customerId: string,
  callback: (payload: { new?: QueueItem; old?: QueueItem }) => void
) {
  const subscription = supabase
    .channel(`queue_${customerId}`)
    .on(
      'postgres_changes' as any,
      {
        event: '*',
        schema: 'public',
        table: 'queue_positions',
        filter: `customer_id=eq.${customerId}`,
      },
      callback as any
    )
    .subscribe();

  return subscription;
}

// ─── Client-side: cancel own reservation ───

export async function cancelByCustomer(customerId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('queue_positions')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('customer_id', customerId);

    if (error) {
      console.error('Error cancelling by customer:', error);
      return { success: false, error: error.message };
    }

    // Recalculate positions
    await recalculatePositionsClient();

    return { success: true };
  } catch (err) {
    console.error('Unexpected error cancelling by customer:', err);
    return { success: false, error: 'Unexpected error' };
  }
}

// ─── Internal: recalculate positions (client-side fallback) ───

async function recalculatePositionsClient(): Promise<void> {
  try {
    const { data: queue, error: fetchError } = await supabase
      .from('queue_positions')
      .select('id')
      .in('status', ['waiting', 'in_service'])
      .order('created_at', { ascending: true });

    if (fetchError || !queue) return;

    for (let i = 0; i < queue.length; i++) {
      await supabase
        .from('queue_positions')
        .update({ position: i + 1 })
        .eq('id', queue[i].id);
    }
  } catch (error) {
    console.error('Error recalculating positions (client):', error);
  }
}
