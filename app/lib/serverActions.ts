'use server';

import { supabase } from './supabase';
import { validateQueueJoinInput, sanitizeString } from './validation';
import type { JoinQueueResult, QueuePositionResult } from '@/app/types';

/**
 * Join the queue (customer-facing server action)
 */
export async function joinQueue(
  customerName: string,
  customerPhone: string,
  estimatedServiceTime?: number
): Promise<JoinQueueResult> {
  try {
    const validation = validateQueueJoinInput({
      customer_name: customerName,
      customer_phone: customerPhone,
      estimated_service_time: estimatedServiceTime,
    });

    if (!validation.valid) {
      return { success: false, error: 'Datos inválidos', details: validation.errors };
    }

    const cleanName = sanitizeString(customerName);
    const cleanPhone = sanitizeString(customerPhone, 20);

    const customerId = `customer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Use atomic SQL function — prevents race conditions
    const { data, error } = await supabase.rpc('join_queue_atomic', {
      p_customer_id: customerId,
      p_customer_name: cleanName,
      p_customer_phone: cleanPhone,
      p_estimated_service_time: estimatedServiceTime || 15,
    });

    if (error) {
      console.error('Error in join_queue_atomic:', error);

      // Fallback to direct insert if the RPC function doesn't exist yet
      if (error.message?.includes('function') || error.code === '42883') {
        return await joinQueueFallback(customerId, cleanName, cleanPhone, estimatedServiceTime);
      }

      return { success: false, error: 'Error al unirse a la cola' };
    }

    const result = Array.isArray(data) ? data[0] : data;

    return {
      success: true,
      customer_id: customerId,
      position: result?.position ?? 1,
      message: `Eres el número ${result?.position ?? 1} en la cola`,
    };
  } catch (error) {
    console.error('Unexpected error in joinQueue:', error);
    return { success: false, error: 'Error interno del servidor' };
  }
}

/**
 * Get current queue position for a customer
 */
export async function getQueuePosition(customerId: string): Promise<QueuePositionResult> {
  try {
    if (!customerId || typeof customerId !== 'string' || customerId.length > 100) {
      return { status: 'error', error: 'ID de cliente inválido' };
    }

    const { data, error } = await supabase
      .from('queue_positions')
      .select('*')
      .eq('customer_id', customerId)
      .eq('status', 'waiting')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Check if in service
        const { data: inService, error: inServiceError } = await supabase
          .from('queue_positions')
          .select('*')
          .eq('customer_id', customerId)
          .eq('status', 'in_service')
          .single();

        if (!inServiceError && inService) {
          return {
            status: 'in_service',
            position: inService.position,
            estimated_wait_time: 0,
            message: '¡Es tu turno!',
          };
        }

        // Check if completed
        const { data: completed, error: completedError } = await supabase
          .from('queue_positions')
          .select('*')
          .eq('customer_id', customerId)
          .eq('status', 'completed')
          .single();

        if (!completedError && completed) {
          return {
            status: 'completed',
            message: 'Servicio completado. ¡Gracias!',
          };
        }

        return { status: 'error', error: 'Cliente no encontrado en la cola' };
      }

      console.error('Error fetching position:', error);
      return { status: 'error', error: 'Error al obtener posición' };
    }

    // Count people ahead
    const { data: ahead, error: aheadError } = await supabase
      .from('queue_positions')
      .select('id')
      .eq('status', 'waiting')
      .lt('position', data.position);

    const peopleAhead = !aheadError ? ahead?.length || 0 : 0;
    const estimatedWaitTime = peopleAhead * (data.estimated_service_time || 15);

    return {
      status: 'waiting',
      position: data.position,
      people_ahead: peopleAhead,
      estimated_wait_time: estimatedWaitTime,
      message: `Eres el número ${data.position}. Espera estimada: ${estimatedWaitTime} minutos`,
    };
  } catch (error) {
    console.error('Unexpected error in getQueuePosition:', error);
    return { status: 'error', error: 'Error interno del servidor' };
  }
}

// ─── Fallback: old approach if SQL function not deployed yet ───

async function joinQueueFallback(
  customerId: string,
  cleanName: string,
  cleanPhone: string,
  estimatedServiceTime?: number
): Promise<JoinQueueResult> {
  console.warn('Using joinQueueFallback — deploy supabase_queue_functions.sql for atomic positions');

  const { data: lastQueue } = await supabase
    .from('queue_positions')
    .select('position')
    .in('status', ['waiting', 'in_service'])
    .order('position', { ascending: false })
    .limit(1);

  const nextPosition =
    lastQueue && lastQueue.length > 0 ? lastQueue[0].position + 1 : 1;

  const { error } = await supabase
    .from('queue_positions')
    .insert([
      {
        customer_id: customerId,
        customer_name: cleanName,
        customer_phone: cleanPhone,
        position: nextPosition,
        status: 'waiting',
        entry_time: new Date().toISOString(),
        estimated_service_time: estimatedServiceTime || 15,
      },
    ]);

  if (error) {
    console.error('Error in joinQueueFallback:', error);
    return { success: false, error: 'Error al unirse a la cola' };
  }

  return {
    success: true,
    customer_id: customerId,
    position: nextPosition,
    message: `Eres el número ${nextPosition} en la cola`,
  };
}
