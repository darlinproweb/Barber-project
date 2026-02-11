'use server';

import { supabase } from './supabase';
import { validateCompleteServiceInput } from './validation';
import { getAuthenticatedBarber } from './authActions';
import type {
  CallNextResult,
  CompleteServiceResult,
  CancelCustomerResult,
  GetQueueResult,
  GetStatsResult,
  JoinQueueResult,
  QueueItem,
  AdminStats,
} from '@/app/types';

// ─── Auth guard helper ───

async function requireAuth(): Promise<{ authorized: false; error: string } | { authorized: true }> {
  const barber = await getAuthenticatedBarber();
  if (!barber) {
    return { authorized: false, error: 'No autorizado — inicia sesión primero' };
  }
  return { authorized: true };
}

// ─── Helper: recalculate positions atomically ───

async function recalculatePositions(): Promise<void> {
  // Try atomic SQL function first (single query)
  const { error: rpcError } = await supabase.rpc('recalculate_positions');

  if (rpcError) {
    // Fallback to old approach if SQL function doesn't exist
    console.warn('recalculate_positions RPC failed, using fallback:', rpcError.message);

    const { data: queue, error } = await supabase
      .from('queue_positions')
      .select('id')
      .in('status', ['waiting', 'in_service'])
      .order('created_at', { ascending: true });

    if (error || !queue) return;

    for (let i = 0; i < queue.length; i++) {
      await supabase
        .from('queue_positions')
        .update({ position: i + 1 })
        .eq('id', queue[i].id);
    }
  }
}

// ─── Add walk-in customer (barber adds from admin) ───

export async function addWalkInCustomer(
  customerName: string,
  customerPhone: string,
  estimatedServiceTime?: number
): Promise<JoinQueueResult> {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) return { success: false, error: auth.error };

    if (!customerName || customerName.trim().length < 2) {
      return { success: false, error: 'El nombre debe tener al menos 2 caracteres' };
    }

    const cleanName = customerName.trim().substring(0, 100);
    const cleanPhone = (customerPhone || 'walk-in').trim().substring(0, 20);
    const customerId = `walkin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const serviceTime = estimatedServiceTime || 15;

    // Try atomic SQL function first
    const { data, error } = await supabase.rpc('join_queue_atomic', {
      p_customer_id: customerId,
      p_customer_name: cleanName,
      p_customer_phone: cleanPhone,
      p_estimated_service_time: serviceTime,
    });

    if (error) {
      // Fallback if SQL function not deployed
      if (error.message?.includes('function') || error.code === '42883') {
        const { data: lastQueue } = await supabase
          .from('queue_positions')
          .select('position')
          .in('status', ['waiting', 'in_service'])
          .order('position', { ascending: false })
          .limit(1);

        const nextPosition = lastQueue && lastQueue.length > 0 ? lastQueue[0].position + 1 : 1;

        const { error: insertError } = await supabase
          .from('queue_positions')
          .insert([{
            customer_id: customerId,
            customer_name: cleanName,
            customer_phone: cleanPhone,
            position: nextPosition,
            status: 'waiting',
            entry_time: new Date().toISOString(),
            estimated_service_time: serviceTime,
          }]);

        if (insertError) {
          console.error('Error adding walk-in (fallback):', insertError);
          return { success: false, error: 'Error al agregar cliente' };
        }

        return {
          success: true,
          customer_id: customerId,
          position: nextPosition,
          message: `${cleanName} agregado en posición #${nextPosition}`,
        };
      }

      console.error('Error adding walk-in:', error);
      return { success: false, error: 'Error al agregar cliente' };
    }

    const result = Array.isArray(data) ? data[0] : data;

    return {
      success: true,
      customer_id: customerId,
      position: result?.position ?? 1,
      message: `${cleanName} agregado en posición #${result?.position ?? 1}`,
    };
  } catch (error) {
    console.error('Unexpected error in addWalkInCustomer:', error);
    return { success: false, error: 'Error interno del servidor' };
  }
}

// ─── Call next customer ───

export async function callNextCustomer(): Promise<CallNextResult> {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) return { success: false, error: auth.error };
    const { data: next, error: fetchError } = await supabase
      .from('queue_positions')
      .select('*')
      .eq('status', 'waiting')
      .order('position', { ascending: true })
      .limit(1)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return { success: false, error: 'No hay clientes en la cola' };
      }
      console.error('Error fetching next customer:', fetchError);
      return { success: false, error: 'Error al obtener siguiente cliente' };
    }

    const { error: updateError } = await supabase
      .from('queue_positions')
      .update({
        status: 'in_service',
        updated_at: new Date().toISOString(),
      })
      .eq('id', next.id);

    if (updateError) {
      console.error('Error updating status:', updateError);
      return { success: false, error: 'Error al llamar siguiente cliente' };
    }

    return {
      success: true,
      customer: {
        id: next.id,
        customer_id: next.customer_id,
        customer_name: next.customer_name,
        customer_phone: next.customer_phone,
        position: next.position,
      },
      message: `Llamando a ${next.customer_name}`,
    };
  } catch (error) {
    console.error('Unexpected error in callNextCustomer:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error interno',
    };
  }
}

// ─── Complete service ───

export async function completeService(
  customerId: string,
  serviceDuration?: number
): Promise<CompleteServiceResult> {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) return { success: false, error: auth.error };
    const validation = validateCompleteServiceInput({
      customer_id: customerId,
      service_duration: serviceDuration,
    });

    if (!validation.valid) {
      return { success: false, error: 'Entrada inválida', details: validation.errors };
    }

    const { data: customer, error: fetchError } = await supabase
      .from('queue_positions')
      .select('*')
      .eq('id', customerId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return { success: false, error: 'Cliente no encontrado' };
      }
      console.error('Error fetching customer:', fetchError);
      return { success: false, error: 'Error al buscar cliente' };
    }

    const { error: updateError } = await supabase
      .from('queue_positions')
      .update({
        status: 'completed',
        service_duration: serviceDuration || 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', customerId);

    if (updateError) {
      console.error('Error updating status:', updateError);
      return { success: false, error: 'Error al completar servicio' };
    }

    await recalculatePositions();

    return {
      success: true,
      message: `Servicio completado para ${customer.customer_name}`,
      service_duration: serviceDuration || 0,
    };
  } catch (error) {
    console.error('Unexpected error in completeService:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error interno',
    };
  }
}

// ─── Cancel customer ───

export async function cancelCustomer(customerId: string): Promise<CancelCustomerResult> {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) return { success: false, error: auth.error };
    const { data: customer, error: fetchError } = await supabase
      .from('queue_positions')
      .select('*')
      .eq('id', customerId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return { success: false, error: 'Cliente no encontrado' };
      }
      console.error('Error fetching customer:', fetchError);
      return { success: false, error: 'Error al buscar cliente' };
    }

    if (customer.status !== 'waiting') {
      return { success: false, error: 'Solo se pueden cancelar clientes en espera' };
    }

    const { error: deleteError } = await supabase
      .from('queue_positions')
      .delete()
      .eq('id', customerId);

    if (deleteError) {
      console.error('Error deleting customer:', deleteError);
      return { success: false, error: 'Error al cancelar cliente' };
    }

    await recalculatePositions();

    return {
      success: true,
      message: `${customer.customer_name} cancelado de la cola`,
    };
  } catch (error) {
    console.error('Unexpected error in cancelCustomer:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error interno',
    };
  }
}

// ─── Get queue (admin) ───

export async function getAdminQueue(): Promise<GetQueueResult> {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) return { success: false, error: auth.error };
    const { data, error } = await supabase
      .from('queue_positions')
      .select('*')
      .in('status', ['waiting', 'in_service'])
      .order('position', { ascending: true });

    if (error) {
      console.error('Error fetching queue:', error);
      return { success: false, error: 'Error al cargar la cola' };
    }

    const queue = (data || []) as QueueItem[];

    return {
      success: true,
      queue,
      total: queue.length,
    };
  } catch (error) {
    console.error('Unexpected error in getAdminQueue:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error interno',
    };
  }
}

// ─── Get stats (admin) ───

export async function getAdminStats(): Promise<GetStatsResult> {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) return { success: false, error: auth.error };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const { data: completedToday, error: completedError } = await supabase
      .from('queue_positions')
      .select('id, service_duration')
      .eq('status', 'completed')
      .gte('created_at', todayISO);

    const { data: currentQueue, error: queueError } = await supabase
      .from('queue_positions')
      .select('position, estimated_service_time')
      .in('status', ['waiting', 'in_service']);

    if (completedError || queueError) {
      console.error('Error fetching stats:', completedError || queueError);
      return { success: false, error: 'Error al obtener estadísticas' };
    }

    const totalServedToday = completedToday?.length || 0;
    const totalInQueue = currentQueue?.length || 0;

    let avgServiceTime = 15;
    if (completedToday && completedToday.length > 0) {
      const totalServiceTime = completedToday.reduce(
        (sum, item) => sum + ((item as any).service_duration || 15),
        0
      );
      avgServiceTime = Math.round(totalServiceTime / completedToday.length);
    }

    const estimatedWaitTime = totalInQueue > 0 ? totalInQueue * avgServiceTime : 0;

    const stats: AdminStats = {
      total_in_queue: totalInQueue,
      total_served_today: totalServedToday,
      avg_service_time: avgServiceTime,
      estimated_wait_time: estimatedWaitTime,
      shop_is_open: true,
    };

    return { success: true, stats };
  } catch (error) {
    console.error('Unexpected error in getAdminStats:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error interno',
    };
  }
}
